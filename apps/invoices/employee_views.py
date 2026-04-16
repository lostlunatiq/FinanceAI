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
        expense = get_object_or_404(Expense, pk=pk)
        reason = request.data.get("reason", "Approved")
        anomaly_override = request.data.get("anomaly_override_reason", "")

        # Require anomaly override for HIGH/CRITICAL
        if expense.anomaly_severity in ("HIGH", "CRITICAL") and not anomaly_override:
            return Response(
                {"error": "anomaly_override_reason required for HIGH/CRITICAL anomaly approvals."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate next status
        current_step = expense.current_step or 1
        next_step = current_step + 1
        new_status = STEP_TO_STATUS.get(next_step, "APPROVED")

        try:
            expense = transition_expense(expense, new_status, request.user, reason)
        except (InvalidTransition, SoDViolation) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Mark approval step
        ExpenseApprovalStep.objects.filter(
            expense=expense, assigned_to=request.user, status="PENDING"
        ).update(
            status="APPROVED",
            actual_actor=request.user,
            decided_at=timezone.now(),
            decision_reason=reason,
            anomaly_override_reason=anomaly_override,
        )

        # If fully approved, auto-transition to PENDING_D365
        if new_status == "APPROVED":
            try:
                expense = transition_expense(
                    expense, "PENDING_D365", request.user, "Auto-transition"
                )
                # In mock mode, simulate D365 booking chain
                from django.conf import settings

                if getattr(settings, "D365_MOCK_MODE", True):
                    expense = transition_expense(
                        expense, "BOOKED_D365", request.user, "D365 mock"
                    )
                    expense = transition_expense(
                        expense, "POSTED_D365", request.user, "D365 mock"
                    )
                    expense = transition_expense(
                        expense, "PAID", request.user, "D365 mock payment"
                    )
                    expense.d365_document_no = f"D365-{expense.ref_no}"
                    expense.d365_posted_at = timezone.now()
                    expense.d365_paid_at = timezone.now()
                    expense.d365_payment_utr = f"UTR-{expense.ref_no}"
                    expense.save()
            except InvalidTransition:
                pass  # Non-critical if D365 transition fails

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

class InternalExpenseListView(APIView):
    """
    GET /api/v1/finance/expenses/
    Returns list of internal expenses (mock filter for now just returns all generic expenses).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        expenses = Expense.objects.all().order_by('-created_at')[:50]
        return Response(VendorBillListSerializer(expenses, many=True).data)

class AnomalyListView(APIView):
    """
    GET /api/v1/finance/anomalies/
    Returns expenses that have an anomaly explicitly flagged.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Fetch expenses with anomalies greater than NONE
        anomalies = Expense.objects.exclude(anomaly_severity__in=["", "NONE", None]).order_by('-created_at')[:50]
        return Response(VendorBillListSerializer(anomalies, many=True).data)
