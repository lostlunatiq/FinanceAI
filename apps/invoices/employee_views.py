from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import (
    IsInternalUser,
    IsFinanceOrAdmin,
    IsFinanceAdmin,
    CanViewExpense,
    CanActOnExpenseStep,
    CanRespondToQuery,
)
from .models import (
    Expense,
    ExpenseApprovalStep,
    ExpenseQuery,
    STEP_TO_STATUS,
    ROLE_FOR_STEP,
)
from .vendor_serializers import VendorBillDetailSerializer, VendorBillListSerializer
from .services import transition_expense, create_next_step, InvalidTransition, SoDViolation


class FinanceQueueView(APIView):
    """
    GET /api/v1/invoices/finance/bills/queue/
    Returns expenses currently awaiting the requesting user's action.
    Only shows bills where this user is assigned to the CURRENT active step —
    prevents fin_admin seeing bills that are still at step 1/2/3.
    """
    permission_classes = [IsAuthenticated, IsInternalUser]

    def get(self, request):
        pending_steps = (
            ExpenseApprovalStep.objects.filter(
                assigned_to=request.user, status="PENDING"
            )
            .select_related("expense", "expense__vendor")
            .order_by("-expense__created_at")
        )

        expenses = []
        seen = set()
        for step in pending_steps:
            exp = step.expense
            # Only surface this bill if we are the approver for the CURRENT step.
            # current_step on Expense tracks which step is active right now.
            if exp.current_step == step.level and step.expense_id not in seen:
                expenses.append(exp)
                seen.add(step.expense_id)

        return Response(VendorBillListSerializer(expenses, many=True).data)


class FinanceBillDetailView(APIView):
    """
    GET /api/v1/invoices/finance/bills/<id>/
    Full bill detail — only internal users; vendors may not call this endpoint.
    """
    permission_classes = [IsAuthenticated, IsInternalUser]

    def get(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        self.check_object_permissions(request, expense)
        return Response(VendorBillDetailSerializer(expense).data)

    def get_permissions(self):
        perms = super().get_permissions()
        perms.append(CanViewExpense())
        return perms


class ApproveView(APIView):
    """
    POST /api/v1/invoices/finance/bills/<id>/approve/
    Approve expense at current approval step.

    SECURITY: user must be the assigned approver on the current PENDING step.
    Anomaly override reason must be ≥ 10 non-whitespace characters.
    """
    permission_classes = [IsAuthenticated, IsInternalUser]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)

        # Object-level: only assigned approver (or finance_admin override)
        can_act = CanActOnExpenseStep()
        if not can_act.has_object_permission(request, self, expense):
            return Response(
                {"error": can_act.message},
                status=status.HTTP_403_FORBIDDEN,
            )

        reason = request.data.get("reason", "Approved")
        anomaly_override = request.data.get("anomaly_override_reason", "").strip()

        # Require meaningful anomaly override for HIGH/CRITICAL
        if expense.anomaly_severity in ("HIGH", "CRITICAL"):
            if len(anomaly_override) < 10:
                return Response(
                    {"error": "anomaly_override_reason must be at least 10 characters for HIGH/CRITICAL anomalies."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        current_step = expense.current_step or 1

        # Find the NEXT pending step actually in this expense's approval chain.
        # CRITICAL: do NOT blindly add +1 to current_step — the chain may stop
        # earlier (e.g. ≤₹25k bills end at FIN_L2 level 5, not FIN_HEAD level 6).
        next_step_obj = (
            ExpenseApprovalStep.objects.filter(
                expense=expense,
                level__gt=current_step,
                status="PENDING",
            )
            .order_by("level")
            .first()
        )

        if next_step_obj:
            new_status = STEP_TO_STATUS.get(next_step_obj.level, "APPROVED")
            next_step_level = next_step_obj.level
        else:
            # No further pending steps in this chain — fully approved
            new_status = "APPROVED"
            next_step_level = None

        try:
            expense = transition_expense(expense, new_status, request.user, reason)
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Mark current step as approved
        ExpenseApprovalStep.objects.filter(
            expense=expense, level=current_step, assigned_to=request.user, status="PENDING"
        ).update(
            status="APPROVED",
            actual_actor=request.user,
            decided_at=timezone.now(),
            decision_reason=reason,
            anomaly_override_reason=anomaly_override,
        )

        # Activate the next step so the next approver sees it in their queue
        if next_step_level and new_status in STEP_TO_STATUS.values():
            create_next_step(expense, next_step_level)

        # APPROVED: stop here — Finance Admin must explicitly initiate payment

        return Response(VendorBillDetailSerializer(expense).data)


class RejectView(APIView):
    """
    POST /api/v1/invoices/finance/bills/<id>/reject/
    Reject expense with mandatory reason (≥ 10 characters).

    SECURITY: user must be the assigned approver on the current PENDING step.
    """
    permission_classes = [IsAuthenticated, IsInternalUser]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)

        can_act = CanActOnExpenseStep()
        if not can_act.has_object_permission(request, self, expense):
            return Response({"error": can_act.message}, status=status.HTTP_403_FORBIDDEN)

        reason = request.data.get("reason", "").strip()
        if len(reason) < 10:
            return Response(
                {"error": "Rejection reason must be at least 10 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_step = expense.current_step or 1

        try:
            expense = transition_expense(expense, "REJECTED", request.user, reason)
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        ExpenseApprovalStep.objects.filter(
            expense=expense, level=current_step, assigned_to=request.user, status="PENDING"
        ).update(
            status="REJECTED",
            actual_actor=request.user,
            decided_at=timezone.now(),
            decision_reason=reason,
        )

        return Response(VendorBillDetailSerializer(expense).data)


class QueryView(APIView):
    """
    POST /api/v1/invoices/finance/bills/<id>/query/
    Raise a query on an expense (pauses workflow until vendor responds).

    SECURITY: user must be the assigned approver on the current PENDING step.
    """
    permission_classes = [IsAuthenticated, IsInternalUser]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)

        can_act = CanActOnExpenseStep()
        if not can_act.has_object_permission(request, self, expense):
            return Response({"error": can_act.message}, status=status.HTTP_403_FORBIDDEN)

        question = request.data.get("question", "").strip()
        if len(question) < 10:
            return Response(
                {"error": "Query question must be at least 10 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            expense = transition_expense(expense, "QUERY_RAISED", request.user, question)
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        ExpenseQuery.objects.create(
            expense=expense,
            raised_by=request.user,
            raised_at_step=expense.current_step or 1,
            question=question,
        )

        return Response(VendorBillDetailSerializer(expense).data)


class RespondQueryView(APIView):
    """
    POST /api/v1/invoices/finance/bills/<id>/respond-query/
    Respond to a query — only the expense submitter or linked vendor.

    SECURITY: enforced via CanRespondToQuery object-level permission.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)

        can_respond = CanRespondToQuery()
        if not can_respond.has_object_permission(request, self, expense):
            return Response({"error": can_respond.message}, status=status.HTTP_403_FORBIDDEN)

        response_text = request.data.get("response", "").strip()
        query_id = request.data.get("query_id")

        if not response_text:
            return Response(
                {"error": "Response text required."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Find the open query
        query_qs = ExpenseQuery.objects.filter(expense=expense, response="")
        if query_id:
            query_qs = query_qs.filter(pk=query_id)

        query = query_qs.first()
        if not query:
            return Response(
                {"error": "No open query found."}, status=status.HTTP_404_NOT_FOUND
            )

        query.response = response_text
        query.responded_by = request.user
        query.responded_at = timezone.now()
        query.save()

        # Re-route back to the step where query was raised and create a fresh pending step
        return_status = STEP_TO_STATUS.get(query.raised_at_step, "PENDING_L1")
        try:
            expense = transition_expense(expense, return_status, request.user, "Query responded")
            # Recreate the step so the approver sees it again
            create_next_step(expense, query.raised_at_step)
        except (InvalidTransition, SoDViolation):
            pass  # Non-critical — status re-route best-effort

        return Response(VendorBillDetailSerializer(expense).data)


class InternalExpenseListView(APIView):
    """
    GET /api/v1/invoices/finance/expenses/
    Returns paginated internal expenses. Finance team only.
    """
    permission_classes = [IsAuthenticated, IsInternalUser]

    def get(self, request):
        expenses = Expense.objects.select_related("vendor", "submitted_by").order_by("-created_at")

        # Optional filters
        status_filter = request.query_params.get("status")
        if status_filter:
            expenses = expenses.filter(_status__in=status_filter.split(","))

        dept_id = request.query_params.get("department")
        if dept_id:
            expenses = expenses.filter(submitted_by__department_id=dept_id)

        limit = min(int(request.query_params.get("limit", 50)), 200)
        offset = int(request.query_params.get("offset", 0))

        total = expenses.count()
        page = expenses[offset: offset + limit]

        return Response({
            "total": total,
            "limit": limit,
            "offset": offset,
            "results": VendorBillListSerializer(page, many=True).data,
        })


class FinanceAllBillsView(APIView):
    """
    GET /api/v1/invoices/finance/bills/all/
    Finance admin / CFO view — all expenses regardless of current step,
    with optional status, vendor, and search filters.
    """
    permission_classes = [IsAuthenticated, IsFinanceOrAdmin]

    def get(self, request):
        expenses = Expense.objects.select_related("vendor", "submitted_by").order_by("-created_at")

        status_filter = request.query_params.get("status")
        if status_filter:
            expenses = expenses.filter(_status__in=status_filter.split(","))

        vendor_id = request.query_params.get("vendor")
        if vendor_id:
            expenses = expenses.filter(vendor_id=vendor_id)

        search = request.query_params.get("search", "").strip()[:100]
        if search:
            from django.db.models import Q
            expenses = expenses.filter(
                Q(invoice_number__icontains=search) |
                Q(vendor__name__icontains=search) |
                Q(ref_no__icontains=search)
            )

        limit = min(int(request.query_params.get("limit", 50)), 200)
        offset = int(request.query_params.get("offset", 0))
        total = expenses.count()

        return Response({
            "total": total,
            "limit": limit,
            "offset": offset,
            "results": VendorBillListSerializer(expenses[offset: offset + limit], many=True).data,
        })


class PaymentInitiateView(APIView):
    """
    POST /api/v1/invoices/finance/bills/<id>/initiate-payment/
    Finance Admin initiates payment for a fully approved bill.
    Sets payment_due_date = today + 3 business days.
    Body: { "notes": "..." }
    """
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request, pk):
        from datetime import date, timedelta as tdelta
        expense = get_object_or_404(Expense, pk=pk)

        if expense.status != "APPROVED":
            return Response(
                {"error": f"Payment can only be initiated for APPROVED bills. Current status: '{expense.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get("notes", "Payment initiated").strip()

        # Calculate P+3 business days
        due = date.today()
        business_days_added = 0
        while business_days_added < 3:
            due += tdelta(days=1)
            if due.weekday() < 5:  # Mon–Fri
                business_days_added += 1

        try:
            expense = transition_expense(expense, "PAYMENT_INITIATED", request.user, notes)
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        expense.payment_initiated_by = request.user
        expense.payment_initiated_at = timezone.now()
        expense.payment_due_date = due
        expense.save(update_fields=["payment_initiated_by", "payment_initiated_at", "payment_due_date"])

        return Response(VendorBillDetailSerializer(expense).data)


class MarkPaidView(APIView):
    """
    POST /api/v1/invoices/finance/bills/<id>/mark-paid/
    Finance Admin confirms actual payment and records UTR.
    Works in both mock and real D365 mode.
    Body: { "utr": "UTR123456789", "notes": "..." }
    """
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)

        if expense.status not in ("APPROVED", "PAYMENT_INITIATED", "PENDING_D365", "BOOKED_D365", "POSTED_D365"):
            return Response(
                {"error": f"Cannot mark as paid from status '{expense.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        utr = request.data.get("utr", "").strip()
        notes = request.data.get("notes", "Payment confirmed").strip()

        if not utr:
            return Response(
                {"error": "UTR (Unique Transaction Reference) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Drive through intermediate states to PAID
            status_chain = {
                "APPROVED": ["PAYMENT_INITIATED", "PENDING_D365", "BOOKED_D365", "POSTED_D365", "PAID"],
                "PAYMENT_INITIATED": ["PENDING_D365", "BOOKED_D365", "POSTED_D365", "PAID"],
                "PENDING_D365": ["BOOKED_D365", "POSTED_D365", "PAID"],
                "BOOKED_D365": ["POSTED_D365", "PAID"],
                "POSTED_D365": ["PAID"],
            }
            chain = status_chain.get(expense.status, ["PAID"])
            for s in chain:
                expense = transition_expense(expense, s, request.user, notes)

            expense.d365_payment_utr = utr
            expense.d365_paid_at = timezone.now()
            expense.d365_document_no = expense.d365_document_no or f"D365-{expense.ref_no}"
            expense.d365_posted_at = expense.d365_posted_at or timezone.now()
            expense.save(update_fields=["d365_payment_utr", "d365_paid_at", "d365_document_no", "d365_posted_at"])

        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(VendorBillDetailSerializer(expense).data)


class AnomalyListView(APIView):
    """
    GET /api/v1/invoices/finance/anomalies/
    Returns expenses with anomaly flags. Finance team only.
    """
    permission_classes = [IsAuthenticated, IsFinanceOrAdmin]

    def get(self, request):
        severity = request.query_params.get("severity")
        qs = Expense.objects.exclude(
            anomaly_severity__in=["", "NONE", None]
        ).order_by("-created_at")

        if severity:
            qs = qs.filter(anomaly_severity=severity.upper())

        limit = min(int(request.query_params.get("limit", 50)), 200)
        offset = int(request.query_params.get("offset", 0))

        total = qs.count()
        return Response({
            "total": total,
            "results": VendorBillListSerializer(qs[offset: offset + limit], many=True).data,
        })
