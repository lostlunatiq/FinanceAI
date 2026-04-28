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
        grade = user.employee_grade or 0

        if user.is_superuser or grade >= 2:
            # CFO / superuser sees everything including PENDING_CFO
            if user.is_superuser or grade >= 5:
                pending_statuses = [
                    "SUBMITTED",
                    "PENDING_L1",
                    "PENDING_L2",
                    "PENDING_HOD",
                    "PENDING_FIN_L1",
                    "PENDING_FIN_L2",
                    "PENDING_FIN_HEAD",
                    "PENDING_CFO",
                    "QUERY_RAISED",
                ]
            else:
                # G2 / G3 / G4 Finance Admin — PENDING_CFO is CFO-only, excluded
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
                .exclude(vendor__name="Internal Expense")
                .select_related("vendor")
                .order_by("-created_at")
            )
            return Response(
                VendorBillListSerializer(expenses, many=True, context={"request": request}).data
            )

        # Grade 1 — only their assigned queue
        pending_steps = (
            ExpenseApprovalStep.objects.filter(assigned_to=user, status="PENDING")
            .exclude(expense__vendor__name="Internal Expense")
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
    """
    GET  /api/v1/invoices/finance/expenses/ — RBAC-scoped expense list.
    POST /api/v1/invoices/finance/expenses/ — Submit internal employee expense.

    Visibility:
      G1 Employee   : only own submissions
      G2 Dept Head  : own + all in same department
      G3 Fin Manager: own + all grades <= 3
      G4+ Admin/CFO : everything
    """

    permission_classes = [IsAuthenticated]

    # ── Grade-based daily/trip limits per category (₹) ──────────────────────
    GRADE_LIMITS = {
        1: {"Travel": 5000,  "Food": 1000,  "Stay": 3000,  "Training": 10000, "Office": 2000,  "Misc": 1000},
        2: {"Travel": 15000, "Food": 3000,  "Stay": 8000,  "Training": 25000, "Office": 5000,  "Misc": 3000},
        3: {"Travel": 50000, "Food": 10000, "Stay": 25000, "Training": 75000, "Office": 15000, "Misc": 10000},
        4: {"Travel": 150000,"Food": 30000, "Stay": 75000, "Training": 200000,"Office": 50000, "Misc": 30000},
        5: {"Travel": 999999,"Food": 99999, "Stay": 999999,"Training": 999999,"Office": 999999,"Misc": 99999},
    }

    def _scoped_qs(self, user):
        from django.db.models import Q
        grade = user.employee_grade or 1
        qs = Expense.objects.filter(vendor__name="Internal Expense").select_related("vendor", "submitted_by").order_by("-created_at")
        if user.is_superuser or grade >= 4:
            return qs  # full access
        if grade == 3:
            # Finance Manager sees grades 1-3
            return qs.filter(submitted_by__employee_grade__lte=3)
        if grade == 2:
            # Dept Head sees own department
            if user.department_id:
                return qs.filter(submitted_by__department=user.department)
            return qs.filter(submitted_by=user)
        # Grade 1: own only
        return qs.filter(submitted_by=user)

    def get(self, request):
        qs = self._scoped_qs(request.user)
        # Optional filters
        cat = request.query_params.get("category")
        if cat:
            qs = qs.filter(ocr_raw__expense_category=cat)
        status_f = request.query_params.get("status")
        if status_f:
            qs = qs.filter(_status=status_f.upper())
        expenses = qs[:200]
        data = []
        for exp in expenses:
            ocr = exp.ocr_raw or {}
            grade = exp.submitted_by.employee_grade or 1
            category = ocr.get("expense_category", "Misc")
            limit = self.GRADE_LIMITS.get(grade, {}).get(category, 0)
            data.append({
                "id": str(exp.id),
                "ref_no": exp.ref_no,
                "submitted_by": exp.submitted_by.get_full_name() or exp.submitted_by.username,
                "submitted_by_grade": grade,
                "department": exp.submitted_by.department.name if exp.submitted_by.department_id else "—",
                "vendor_name": exp.vendor.name if exp.vendor_id else "Internal",
                "expense_category": category,
                "description": ocr.get("expense_description", exp.business_purpose or ""),
                "total_amount": float(exp.total_amount or 0),
                "grade_limit": limit,
                "over_limit": float(exp.total_amount or 0) > limit > 0,
                "status": exp._status,
                "created_at": exp.created_at.isoformat(),
                "submitted_at": exp.submitted_at.isoformat() if exp.submitted_at else None,
                "invoice_file": str(exp.invoice_file_id) if exp.invoice_file_id else None,
                "invoice_file_url": request.build_absolute_uri(f"/api/v1/files/{exp.invoice_file_id}/") if exp.invoice_file_id else None,
            })
        return Response(data)

    def post(self, request):
        """Submit internal employee expense (no external vendor needed)."""
        from .models import Vendor
        from datetime import date
        from decimal import Decimal, InvalidOperation
        from apps.core.models import FileRef

        user = request.user
        grade = user.employee_grade or 1

        category = request.data.get("expense_category", "Misc")
        description = request.data.get("description", "")
        amount_raw = request.data.get("amount", "0")
        try:
            amount = Decimal(str(amount_raw))
        except InvalidOperation:
            return Response({"error": "Invalid amount."}, status=400)

        if amount <= 0:
            return Response({"error": "Amount must be greater than zero."}, status=400)

        # Grade limit check
        limit = self.GRADE_LIMITS.get(grade, {}).get(category, 0)
        over_limit = limit > 0 and float(amount) > limit
        # Don't block submission — just flag it

        # Find or create INTERNAL system vendor
        internal_vendor, _ = Vendor.objects.get_or_create(
            name="Internal Expense",
            defaults={"status": "ACTIVE", "is_approved": True, "vendor_type": "internal"}
        )

        ocr_raw = {
            "expense_category": category,
            "expense_description": description,
            "grade_at_submission": grade,
            "grade_limit": limit,
            "over_limit": over_limit,
            "internal_expense": True,
        }
        if request.data.get("file_id"):
            ocr_raw["file_id"] = request.data["file_id"]
        invoice_file = None
        if request.data.get("file_id"):
            invoice_file = FileRef.objects.filter(pk=request.data["file_id"]).first()

        invoice_date = timezone.now().date()
        if request.data.get("invoice_date"):
            try:
                invoice_date = date.fromisoformat(request.data["invoice_date"])
            except ValueError:
                return Response({"error": "Invalid invoice_date."}, status=400)

        expense = Expense(
            vendor=internal_vendor,
            submitted_by=user,
            invoice_number=f"EXP-{user.username.upper()[:6]}",
            invoice_date=invoice_date,
            pre_gst_amount=amount,
            total_amount=amount,
            business_purpose=description,
            ocr_raw=ocr_raw,
            invoice_file=invoice_file,
        )
        expense._force_status("SUBMITTED")
        expense.submitted_at = timezone.now()
        expense.save()

        # Write audit log
        from apps.core.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action="expense.submitted",
            entity_type="Expense",
            entity_id=expense.id,
            masked_after={
                "category": category,
                "amount": float(amount),
                "over_limit": over_limit,
                "submitted_by_grade": grade,
            },
        )

        return Response({
            "id": str(expense.id),
            "ref_no": expense.ref_no,
            "expense_category": category,
            "total_amount": float(amount),
            "over_limit": over_limit,
            "grade_limit": limit,
            "status": expense._status,
        }, status=201)


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


class SuperiorOverrideApproveView(APIView):
    """
    POST /api/v1/invoices/finance/bills/<pk>/superior-approve/
    CFO / Finance Admin directly approves the expense, auto-clearing all
    intermediate pending steps with "Skipped via Higher Authority" markers.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from .services import superior_override_approve, InsufficientRole

        expense = get_object_or_404(Expense, pk=pk)
        reason = request.data.get("reason", "Approved by superior authority")
        anomaly_override = request.data.get("anomaly_override_reason", "")

        if expense.anomaly_severity in ("HIGH", "CRITICAL") and not anomaly_override:
            return Response(
                {"error": "anomaly_override_reason required for HIGH/CRITICAL anomaly approvals."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            expense = superior_override_approve(expense, request.user, reason)
        except (InvalidTransition, InsufficientRole) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(VendorBillDetailSerializer(expense, context={"request": request}).data)


class RiskWatchView(APIView):
    """
    GET /api/v1/invoices/risk-watch/
    Returns prioritized anomaly alerts for Finance Admin / CFO (grade >= 2).
    Scoped by grade:
      - G2 HOD: sees their department's anomalies
      - G3+ Finance: sees all anomalies
    """

    permission_classes = [IsAuthenticated, HasMinimumGrade.make(2)]

    def get(self, request):
        user = request.user
        grade = user.employee_grade or 1

        # High-risk invoices not yet resolved
        terminal = ["PAID", "REJECTED", "WITHDRAWN", "AUTO_REJECT", "EXPIRED"]
        qs = (
            Expense.objects.filter(anomaly_severity__in=["HIGH", "CRITICAL"])
            .exclude(_status__in=terminal)
            .select_related("vendor", "submitted_by")
            .order_by("-updated_at")
        )

        if not user.is_superuser and grade < 3 and user.department_id:
            qs = qs.filter(submitted_by__department=user.department)

        alerts = []
        for exp in qs[:20]:
            flags = []
            if exp.ocr_raw and isinstance(exp.ocr_raw, dict):
                flags = exp.ocr_raw.get("anomaly_flags", [])
            score = 92 if exp.anomaly_severity == "CRITICAL" else 75
            alerts.append({
                "id": str(exp.id),
                "ref_no": exp.ref_no,
                "vendor": exp.vendor.name,
                "amount": float(exp.total_amount or 0),
                "severity": exp.anomaly_severity,
                "score": score,
                "status": exp.status,
                "flags": flags,
                "updated_at": exp.updated_at.isoformat(),
            })

        # Low-risk: pending without anomalies but overdue SLA
        low_risk = (
            Expense.objects.filter(
                anomaly_severity__in=["LOW", "MEDIUM", None, ""],
                _status__in=["PENDING_L1", "PENDING_L2", "PENDING_HOD", "PENDING_FIN_L1", "PENDING_FIN_L2"],
            )
            .select_related("vendor")
            .order_by("created_at")[:5]
        )
        for exp in low_risk:
            alerts.append({
                "id": str(exp.id),
                "ref_no": exp.ref_no,
                "vendor": exp.vendor.name,
                "amount": float(exp.total_amount or 0),
                "severity": exp.anomaly_severity or "LOW",
                "score": 30,
                "status": exp.status,
                "flags": [],
                "updated_at": exp.updated_at.isoformat(),
            })

        return Response({
            "total_high_risk": len([a for a in alerts if a["severity"] in ("HIGH", "CRITICAL")]),
            "total_alerts": len(alerts),
            "alerts": alerts,
        })
