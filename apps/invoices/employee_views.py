from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import HasMinimumGrade
from .models import (
    ApprovalAuthority,
    Expense,
    ExpenseApprovalStep,
    ExpenseQuery,
    STEP_TO_STATUS,
)
from .vendor_serializers import VendorBillDetailSerializer, VendorBillListSerializer
from .services import (
    build_action_permissions,
    build_query_ai_suggestion,
    can_user_respond_to_query,
    can_user_take_step_action,
    create_next_approval_step,
    get_approval_limit,
    get_authority_settings,
    get_current_pending_step,
    get_monthly_actor_spend,
    get_settlement_limit,
    transition_expense,
    InvalidTransition,
    SoDViolation,
)


# Fix 1 — FinanceQueueView uses role string check, replace with grade
class FinanceQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # ❌ getattr(user, 'role', '') in ("finance_admin", "finance_manager", "dept_head")
        # ✅ grade 2+ sees all pending bills
        if user.is_superuser or (user.employee_grade or 0) >= 2:
            pending_statuses = [
                "SUBMITTED",
                "PENDING_L1",
                "PENDING_L2",
                "PENDING_HOD",
                "PENDING_FIN_L1",
                "PENDING_FIN_L2",
                "PENDING_FIN_HEAD",
                "QUERY_RAISED",
            ]
            expenses = (
                Expense.objects.filter(_status__in=pending_statuses)
                .select_related("vendor")
                .order_by("-created_at")
            )
            return Response(
                VendorBillListSerializer(expenses, many=True, context={"request": request}).data
            )

        # Grade 1 — only their assigned queue
        pending_steps = (
            ExpenseApprovalStep.objects.filter(assigned_to=user, status="PENDING")
            .select_related("expense", "expense__vendor")
            .order_by("-expense__created_at")
        )
        expenses, seen = [], set()
        for step in pending_steps:
            if STEP_TO_STATUS.get(step.level) != step.expense.status:
                continue
            if step.expense_id not in seen:
                expenses.append(step.expense)
                seen.add(step.expense_id)
        return Response(VendorBillListSerializer(expenses, many=True, context={"request": request}).data)


class FinanceBillDetailView(APIView):
    """
    GET /api/v1/finance/bills/<id>/
    Full bill detail with approval steps, OCR data, anomaly flags, timeline.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        return Response(VendorBillDetailSerializer(expense, context={"request": request}).data)


class ApproveView(APIView):
    """
    POST /api/v1/finance/bills/<id>/approve/
    Approve expense at current approval step.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from .services import STATUS_TO_NEXT_STATUS

        expense = get_object_or_404(Expense, pk=pk)
        reason = request.data.get("reason", "Approved")
        anomaly_override = request.data.get("anomaly_override_reason", "")
        pending_step = get_current_pending_step(expense)

        if not can_user_take_step_action(request.user, expense):
            return Response(
                {"error": "You cannot approve this bill at the current step."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if expense.anomaly_severity in ("HIGH", "CRITICAL") and not anomaly_override:
            return Response(
                {"error": "anomaly_override_reason required for HIGH/CRITICAL anomaly approvals."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_grade = request.user.employee_grade or 1
        is_superuser = request.user.is_superuser
        bill_amount = float(expense.total_amount or 0)
        user_limit = float("inf") if is_superuser else get_approval_limit(user_grade)
        monthly_budget = None if is_superuser else get_authority_settings(user_grade)["monthly_approval_budget"]

        if bill_amount > user_limit:
            final_target = None
        else:
            current_month_spend = get_monthly_actor_spend(request.user, "total_amount")
            if monthly_budget is not None and (current_month_spend + bill_amount) > float(monthly_budget):
                return Response(
                    {"error": "Monthly approval budget exceeded for your authority level."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            final_target = "APPROVED"

        while True:
            current_status = expense.status
            new_status = STATUS_TO_NEXT_STATUS.get(current_status, "APPROVED")
            try:
                expense = transition_expense(expense, new_status, request.user, reason, skip_sod=True)
            except (InvalidTransition, SoDViolation) as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

            # Mark current approval step as done
            if pending_step:
                ExpenseApprovalStep.objects.filter(pk=pending_step.pk).update(
                    status="APPROVED",
                    actual_actor=request.user,
                    decided_at=timezone.now(),
                    decision_reason=reason,
                    anomaly_override_reason=anomaly_override,
                )

            if new_status == "APPROVED":
                break

            # Create next approval step in chain (amount-aware)
            next_step = create_next_approval_step(expense)
            if not next_step:
                break

            if final_target == "APPROVED" and (
                request.user.is_superuser or (request.user.employee_grade or 1) >= next_step.grade_required
            ):
                pending_step = next_step
                continue

            if current_status == "QUERY_RAISED":
                pending_step = next_step
                continue

            if final_target != "APPROVED":
                break

            pending_step = next_step
            break

        return Response(VendorBillDetailSerializer(expense, context={"request": request}).data)


class RejectView(APIView):
    """
    POST /api/v1/finance/bills/<id>/reject/
    Reject expense with mandatory reason.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        reason = request.data.get("reason", "")
        pending_step = get_current_pending_step(expense)

        if not can_user_take_step_action(request.user, expense):
            return Response(
                {"error": "You cannot reject this bill at the current step."},
                status=status.HTTP_403_FORBIDDEN,
            )

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
        if pending_step:
            ExpenseApprovalStep.objects.filter(pk=pending_step.pk).update(
                status="REJECTED",
                actual_actor=request.user,
                decided_at=timezone.now(),
                decision_reason=reason,
            )

        return Response(VendorBillDetailSerializer(expense, context={"request": request}).data)


class QueryView(APIView):
    """
    POST /api/v1/finance/bills/<id>/query/
    Raise a query on an expense.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        question = request.data.get("question", "")
        pending_step = get_current_pending_step(expense)

        if not can_user_take_step_action(request.user, expense):
            return Response(
                {"error": "You cannot raise a query on this bill at the current step."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not question or len(question.strip()) < 10:
            return Response(
                {"error": "Query question must be at least 10 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            expense = transition_expense(expense, "QUERY_RAISED", request.user, question)
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Create query record
        try:
            query = ExpenseQuery.objects.create(
                expense=expense,
                raised_by=request.user,
                raised_at_step=pending_step.level if pending_step else (expense.current_step or 1),
                question=question,
                ai_suggestion=build_query_ai_suggestion(expense, question),
            )
        except Exception:
            query = ExpenseQuery.objects.create(
                expense=expense,
                raised_by=request.user,
                raised_at_step=pending_step.level if pending_step else (expense.current_step or 1),
                question=question,
            )

        if pending_step:
            ExpenseApprovalStep.objects.filter(pk=pending_step.pk).update(
                status="QUERIED",
                actual_actor=request.user,
                decided_at=timezone.now(),
                decision_reason=question,
            )

        return Response(VendorBillDetailSerializer(expense, context={"request": request}).data)


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

        if not can_user_respond_to_query(request.user, expense):
            return Response(
                {"error": "Only the bill submitter or vendor can respond to this query."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Find the open query
        query_qs = ExpenseQuery.objects.filter(expense=expense, response="")
        if query_id:
            query_qs = query_qs.filter(pk=query_id)

        query = query_qs.first()
        if not query:
            return Response({"error": "No open query found."}, status=status.HTTP_404_NOT_FOUND)

        query.response = response_text
        query.responded_by = request.user
        query.responded_at = timezone.now()
        query.save()

        # Re-route to the step where query was raised
        return_status = STEP_TO_STATUS.get(query.raised_at_step, "PENDING_L1")
        try:
            expense = transition_expense(expense, return_status, request.user, "Query responded")
        except (InvalidTransition, SoDViolation):
            pass  # Non-critical
        reroute_step = expense.approval_steps.filter(level=query.raised_at_step).first()
        if reroute_step:
            reroute_step.status = "PENDING"
            reroute_step.actual_actor = None
            reroute_step.decided_at = None
            reroute_step.decision_reason = ""
            reroute_step.anomaly_override_reason = ""
            reroute_step.save(
                update_fields=[
                    "status",
                    "actual_actor",
                    "decided_at",
                    "decision_reason",
                    "anomaly_override_reason",
                ]
            )

        return Response(VendorBillDetailSerializer(expense, context={"request": request}).data)


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
            return Response(
                {
                    "severity": result["severity"],
                    "flags": result["flags"],
                    "total_score": result["total_score"],
                }
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InternalExpenseListView(APIView):
    """GET /api/v1/finance/expenses/ — All expenses for finance team."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        expenses = Expense.objects.select_related("vendor").order_by("-created_at")[:100]
        return Response(VendorBillListSerializer(expenses, many=True, context={"request": request}).data)


class AnomalyListView(APIView):
    """GET /api/v1/finance/anomalies/ — Expenses with anomaly flags."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        anomalies = (
            Expense.objects.exclude(anomaly_severity__in=["", "NONE", None])
            .select_related("vendor")
            .order_by("-created_at")[:100]
        )
        return Response(VendorBillListSerializer(anomalies, many=True, context={"request": request}).data)


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
        ).order_by("-created_at")[:200]

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

        return Response(
            {
                "scanned": updated,
                "flagged": flagged,
                "message": f"Scanned {updated} bills. {flagged} anomalies detected.",
            }
        )


class ApprovalAuthorityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = []
        grades = sorted({1, 2, 3, 4})
        for grade in grades:
            data = get_authority_settings(grade)
            rows.append(data)
        if request.user.is_superuser:
            rows.append(get_authority_settings(5))
        return Response(rows)

    def post(self, request):
        if not (request.user.is_superuser or (request.user.employee_grade or 0) >= 4):
            return Response(
                {"error": "Only Finance Admin or CFO can update approval limits."},
                status=status.HTTP_403_FORBIDDEN,
            )

        grade = int(request.data.get("grade") or 0)
        if grade <= 0 or grade >= 5:
            return Response(
                {"error": "Only grades 1-4 are configurable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        defaults = get_authority_settings(grade)
        try:
            authority, _ = ApprovalAuthority.objects.get_or_create(
                grade=grade,
                defaults={"label": defaults["label"]},
            )
        except Exception:
            return Response(
                {"error": "Approval authority table is not migrated yet."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        for field in [
            "label",
            "approval_limit",
            "settlement_limit",
            "monthly_approval_budget",
            "monthly_settlement_budget",
        ]:
            if field in request.data:
                value = request.data.get(field)
                setattr(authority, field, value or None)
        authority.updated_by = request.user
        authority.save()
        return Response(get_authority_settings(grade))


class SettlePaymentView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(3)]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        if expense.status != "APPROVED":
            return Response(
                {"error": "Only approved bills can be settled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        bill_amount = float(expense.total_amount or 0)
        settlement_limit = float("inf") if user.is_superuser else get_settlement_limit(user.employee_grade or 1)
        monthly_budget = None if user.is_superuser else get_authority_settings(user.employee_grade or 1)["monthly_settlement_budget"]
        current_month_spend = get_monthly_actor_spend(user, "total_amount")

        if bill_amount > settlement_limit:
            return Response(
                {"error": "This bill exceeds your settlement limit."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if monthly_budget is not None and (current_month_spend + bill_amount) > float(monthly_budget):
            return Response(
                {"error": "Monthly settlement budget exceeded for your authority level."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            expense = transition_expense(expense, "PENDING_D365", user, "Payment settlement started", skip_sod=True)
            expense = transition_expense(expense, "BOOKED_D365", user, "Payment booked", skip_sod=True)
            expense = transition_expense(expense, "POSTED_D365", user, "Payment posted", skip_sod=True)
            expense = transition_expense(expense, "PAID", user, "Payment settled", skip_sod=True)
        except InvalidTransition as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        expense.d365_document_no = expense.d365_document_no or f"D365-{expense.ref_no}"
        expense.d365_posted_at = expense.d365_posted_at or timezone.now()
        expense.d365_paid_at = timezone.now()
        expense.d365_payment_utr = request.data.get("payment_utr") or f"UTR-{expense.ref_no}"
        expense.save(
            update_fields=["d365_document_no", "d365_posted_at", "d365_paid_at", "d365_payment_utr"]
        )
        return Response(VendorBillDetailSerializer(expense, context={"request": request}).data)
