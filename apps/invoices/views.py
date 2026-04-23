from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import HasMinimumGrade

from .models import Expense, ExpenseApprovalStep, STEP_TO_STATUS, VALID_TRANSITIONS
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
        serializer = ExpenseSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        expense = serializer.save(submitted_by=request.user)

        # Transition DRAFT → SUBMITTED
        try:
            expense = transition_expense(expense, "SUBMITTED", request.user)
        except InvalidTransition as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # TODO: enqueue OCR + anomaly Celery tasks here
        # from .tasks import run_ocr_and_anomaly
        # run_ocr_and_anomaly.delay(str(expense.id))

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

        # Map decision to FSM transition
        if decision == "APPROVED":
            current_step = expense.current_step or 1
            next_step = current_step + 1
            new_status = STEP_TO_STATUS.get(next_step, "APPROVED")
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
