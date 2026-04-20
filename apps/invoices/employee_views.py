from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import (
    Expense,
    ExpenseApprovalStep,
    ExpenseQuery,
    STEP_TO_STATUS,
    ROLE_FOR_STEP,
)
from .vendor_serializers import VendorBillDetailSerializer, VendorBillListSerializer
from .services import transition_expense, InvalidTransition, SoDViolation


class FinanceQueueView(APIView):
    """
    GET /api/v1/finance/bills/queue/
    Returns expenses currently awaiting the requesting user's action.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Finance admin / superuser / finance manager / dept_head can see ALL pending bills
        if user.is_superuser or getattr(user, 'role', '') in ("finance_admin", "finance_manager", "dept_head"):
            pending_statuses = [
                "SUBMITTED", "PENDING_L1", "PENDING_L2", "PENDING_HOD",
                "PENDING_FIN_L1", "PENDING_FIN_L2", "PENDING_FIN_HEAD", "QUERY_RAISED",
            ]
            expenses = (
                Expense.objects.filter(_status__in=pending_statuses)
                .select_related("vendor")
                .order_by("-created_at")
            )
            return Response(VendorBillListSerializer(expenses, many=True).data)

        # AP Clerk / employee — only their assigned queue
        pending_steps = (
            ExpenseApprovalStep.objects.filter(assigned_to=user, status="PENDING")
            .select_related("expense", "expense__vendor")
            .order_by("-expense__created_at")
        )
        expenses = []
        seen = set()
        for step in pending_steps:
            if step.expense_id not in seen:
                expenses.append(step.expense)
                seen.add(step.expense_id)
        return Response(VendorBillListSerializer(expenses, many=True).data)


class FinanceBillDetailView(APIView):
    """
    GET /api/v1/finance/bills/<id>/
    Full bill detail with approval steps, OCR data, anomaly flags, timeline.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        return Response(VendorBillDetailSerializer(expense).data)


class ApproveView(APIView):
    """
    POST /api/v1/finance/bills/<id>/approve/
    Approve expense at current approval step.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from .services import STATUS_TO_NEXT_STATUS, create_next_approval_step
        expense = get_object_or_404(Expense, pk=pk)
        reason = request.data.get("reason", "Approved")
        anomaly_override = request.data.get("anomaly_override_reason", "")

        if expense.anomaly_severity in ("HIGH", "CRITICAL") and not anomaly_override:
            return Response(
                {"error": "anomaly_override_reason required for HIGH/CRITICAL anomaly approvals."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = STATUS_TO_NEXT_STATUS.get(expense.status, "APPROVED")
        try:
            expense = transition_expense(expense, new_status, request.user, reason, skip_sod=False)
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Mark current approval step as done
        ExpenseApprovalStep.objects.filter(
            expense=expense, assigned_to=request.user, status="PENDING"
        ).update(
            status="APPROVED",
            actual_actor=request.user,
            decided_at=timezone.now(),
            decision_reason=reason,
            anomaly_override_reason=anomaly_override,
        )

        # Create next approval step in chain
        if new_status != "APPROVED":
            create_next_approval_step(expense)

        # When fully approved, auto-advance through D365 mock
        if new_status == "APPROVED":
            try:
                expense = transition_expense(expense, "PENDING_D365", request.user, "Auto-transition", skip_sod=True)
                from django.conf import settings
                if getattr(settings, "D365_MOCK_MODE", True):
                    expense = transition_expense(expense, "BOOKED_D365", request.user, "D365 mock", skip_sod=True)
                    expense = transition_expense(expense, "POSTED_D365", request.user, "D365 mock", skip_sod=True)
                    expense = transition_expense(expense, "PAID", request.user, "D365 mock payment", skip_sod=True)
                    expense.d365_document_no = f"D365-{expense.ref_no}"
                    expense.d365_posted_at = timezone.now()
                    expense.d365_paid_at = timezone.now()
                    expense.d365_payment_utr = f"UTR-{expense.ref_no}"
                    expense.save()
            except InvalidTransition:
                pass

        return Response(VendorBillDetailSerializer(expense).data)


class RejectView(APIView):
    """
    POST /api/v1/finance/bills/<id>/reject/
    Reject expense with mandatory reason.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        reason = request.data.get("reason", "")

        if not reason or len(reason.strip()) < 10:
            return Response(
                {"error": "Rejection reason must be at least 10 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            expense = transition_expense(expense, "REJECTED", request.user, reason)
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Mark approval step
        ExpenseApprovalStep.objects.filter(
            expense=expense, assigned_to=request.user, status="PENDING"
        ).update(
            status="REJECTED",
            actual_actor=request.user,
            decided_at=timezone.now(),
            decision_reason=reason,
        )

        return Response(VendorBillDetailSerializer(expense).data)


class QueryView(APIView):
    """
    POST /api/v1/finance/bills/<id>/query/
    Raise a query on an expense.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        question = request.data.get("question", "")

        if not question or len(question.strip()) < 10:
            return Response(
                {"error": "Query question must be at least 10 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            expense = transition_expense(
                expense, "QUERY_RAISED", request.user, question
            )
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Create query record
        ExpenseQuery.objects.create(
            expense=expense,
            raised_by=request.user,
            raised_at_step=expense.current_step or 1,
            question=question,
        )

        return Response(VendorBillDetailSerializer(expense).data)


class RespondQueryView(APIView):
    """
    POST /api/v1/finance/bills/<id>/respond-query/
    Respond to a query (vendor/filer).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        response_text = request.data.get("response", "")
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

        # Re-route to the step where query was raised
        return_status = STEP_TO_STATUS.get(query.raised_at_step, "PENDING_L1")
        try:
            expense = transition_expense(
                expense, return_status, request.user, "Query responded"
            )
        except (InvalidTransition, SoDViolation):
            pass  # Non-critical

        return Response(VendorBillDetailSerializer(expense).data)

class ScanAnomalyView(APIView):
    """
    POST /api/v1/finance/bills/<id>/scan-anomaly/
    Trigger (or re-run) anomaly detection on a specific expense.
    Returns the updated anomaly result immediately (synchronous in dev).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        try:
            from ai.pipelines.anomaly_pipeline import run_anomaly_checks
            result = run_anomaly_checks(expense)
            expense.anomaly_severity = result["severity"]
            if expense.ocr_raw:
                expense.ocr_raw["anomaly_flags"] = result["flags"]
            else:
                expense.ocr_raw = {"anomaly_flags": result["flags"]}
            expense.save(update_fields=["anomaly_severity", "ocr_raw"])
            return Response({
                "severity": result["severity"],
                "flags": result["flags"],
                "total_score": result["total_score"],
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InternalExpenseListView(APIView):
    """GET /api/v1/finance/expenses/ — All expenses for finance team."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        expenses = Expense.objects.select_related("vendor").order_by('-created_at')[:100]
        return Response(VendorBillListSerializer(expenses, many=True).data)


class AnomalyListView(APIView):
    """GET /api/v1/finance/anomalies/ — Expenses with anomaly flags."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        anomalies = Expense.objects.exclude(
            anomaly_severity__in=["", "NONE", None]
        ).select_related("vendor").order_by('-created_at')[:100]
        return Response(VendorBillListSerializer(anomalies, many=True).data)


class MarkAnomalySafeView(APIView):
    """POST /api/v1/finance/bills/<id>/mark-safe/ — Clear anomaly flag."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        expense.anomaly_severity = "NONE"
        ocr_raw = expense.ocr_raw or {}
        ocr_raw["anomaly_flags"] = []
        ocr_raw["marked_safe_by"] = request.user.username
        expense.ocr_raw = ocr_raw
        expense.save(update_fields=["anomaly_severity", "ocr_raw"])
        return Response({"status": "cleared", "ref_no": expense.ref_no})


class EscalateAnomalyView(APIView):
    """POST /api/v1/finance/bills/<id>/escalate/ — Escalate anomaly to CFO."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        expense.anomaly_severity = "CRITICAL"
        ocr_raw = expense.ocr_raw or {}
        ocr_raw["escalated_by"] = request.user.username
        ocr_raw["escalated_at"] = timezone.now().isoformat()
        expense.ocr_raw = ocr_raw
        expense.save(update_fields=["anomaly_severity", "ocr_raw"])
        return Response({"status": "escalated", "ref_no": expense.ref_no})


class BulkScanAnomalyView(APIView):
    """POST /api/v1/finance/scan-all/ — Scan all unscanned expenses for anomalies."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from ai.pipelines.anomaly_pipeline import run_anomaly_checks
        expenses = Expense.objects.exclude(
            _status__in=["REJECTED", "WITHDRAWN", "AUTO_REJECT"]
        ).order_by('-created_at')[:200]

        updated = 0
        flagged = 0
        for expense in expenses:
            try:
                result = run_anomaly_checks(expense)
                expense.anomaly_severity = result["severity"]
                flags = result.get("flags", [])
                ocr_raw = expense.ocr_raw or {}
                ocr_raw["anomaly_flags"] = flags
                expense.ocr_raw = ocr_raw
                expense.save(update_fields=["anomaly_severity", "ocr_raw"])
                updated += 1
                if result["severity"] not in ("NONE", None):
                    flagged += 1
            except Exception:
                pass

        return Response({
            "scanned": updated,
            "flagged": flagged,
            "message": f"Scanned {updated} bills. {flagged} anomalies detected.",
        })
