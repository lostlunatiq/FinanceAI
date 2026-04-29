from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import HasMinimumGrade

from .models import Expense, ExpenseApprovalStep, STEP_TO_STATUS, VALID_TRANSITIONS, Vendor
from .serializers import (
    ExpenseSubmitSerializer,
    ExpenseDetailSerializer,
    ApprovalActionSerializer,
    VendorSerializer,
)
from .services import transition_expense, InvalidTransition, SoDViolation


class ExpenseSubmitView(APIView):
    """
    POST /api/v1/invoices/submit/
    Vendor or L1 submits a new expense/bill.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data.copy()
        if (data.get("vendor_name") or "").strip().lower() == "internal expense":
            return Response(
                {
                    "error": "Use /api/v1/invoices/finance/expenses/ for internal employee expenses."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not data.get("vendor"):
            vendor_name = data.get("vendor_name") or "Internal Expense"
            vendor, _ = Vendor.objects.get_or_create(
                name=vendor_name,
                defaults={"is_approved": True, "status": "ACTIVE"},
            )
            if not vendor.is_approved or vendor.status != "ACTIVE":
                vendor.is_approved = True
                vendor.status = "ACTIVE"
                vendor.save(update_fields=["is_approved", "status"])
            data["vendor"] = str(vendor.id)

        if not data.get("pre_gst_amount"):
            total = float(data.get("total_amount") or 0)
            cgst = float(data.get("cgst") or 0)
            sgst = float(data.get("sgst") or 0)
            igst = float(data.get("igst") or 0)
            data["pre_gst_amount"] = str(round(total - cgst - sgst - igst, 2))

        serializer = ExpenseSubmitSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        expense = serializer.save(submitted_by=request.user)

        # Transition DRAFT → SUBMITTED
        try:
            expense = transition_expense(expense, "SUBMITTED", request.user)
        except InvalidTransition as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .services import create_initial_approval_step

            expense = transition_expense(
                expense, "PENDING_L1", request.user, "Auto-started approval", skip_sod=True
            )
            create_initial_approval_step(expense)
        except Exception:
            pass

        if expense.invoice_file:
            try:
                from .tasks import run_ocr_pipeline

                task = run_ocr_pipeline.delay(str(expense.id))
                expense.ocr_task_id = task.id
                expense.save(update_fields=["ocr_task_id"])
            except Exception:
                pass

        return Response(ExpenseDetailSerializer(expense).data, status=status.HTTP_201_CREATED)


class ExpenseDetailView(APIView):
    """
    GET /api/v1/invoices/<id>/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        return Response(ExpenseDetailSerializer(expense).data)


class ApprovalQueueView(APIView):
    """
    GET /api/v1/invoices/queue/
    Returns expenses currently awaiting the requesting user's action.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending_steps = ExpenseApprovalStep.objects.filter(
            assigned_to=request.user, status="PENDING"
        ).select_related("expense")

        expenses = [step.expense for step in pending_steps]
        return Response(ExpenseDetailSerializer(expenses, many=True).data)


class ApprovalActionView(APIView):
    """
    POST /api/v1/invoices/<id>/action/
    Approver takes action: approve / reject / query.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        serializer = ApprovalActionSerializer(data=request.data, context={"expense": expense})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        decision = serializer.validated_data["decision"]
        reason = serializer.validated_data.get("reason", "")

        if decision == "APPROVED":
            current_step = expense.current_step or 1
            next_step = current_step + 1
            new_status = STEP_TO_STATUS.get(next_step, "APPROVED")
            
            # --- New Feature: TDS/GST Policy Compliance Check ---
            # If the vendor has a TDS section, the invoice should have TDS deducted.
            if expense.vendor.tds_section and float(expense.tds_amount) <= 0:
                # TDS is applicable but not deducted! Flag as anomaly.
                expense.anomaly_severity = "HIGH"
                expense.save(update_fields=["anomaly_severity"])

        elif decision == "REJECTED":
            new_status = "REJECTED"
        else:  # QUERY_RAISED
            new_status = "QUERY_RAISED"

        try:
            expense = transition_expense(expense, new_status, request.user, reason)
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Mark the current approval step as decided
        ExpenseApprovalStep.objects.filter(
            expense=expense, assigned_to=request.user, status="PENDING"
        ).update(
            status=decision,
            actual_actor=request.user,
            decided_at=timezone.now(),
            decision_reason=reason,
            anomaly_override_reason=serializer.validated_data.get("anomaly_override_reason", ""),
        )

        return Response(ExpenseDetailSerializer(expense).data)
