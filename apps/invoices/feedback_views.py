from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import AIFeedback, Expense


class AIFeedbackView(APIView):
    permission_classes = [IsAuthenticated]

    def _can_access_expense_feedback(self, user, expense) -> bool:
        if user.is_superuser or (getattr(user, "employee_grade", 1) or 1) >= 4:
            return True
        if expense.submitted_by_id == user.id:
            return True
        vendor_profile = getattr(user, "vendor_profile", None)
        return bool(vendor_profile and expense.vendor_id == vendor_profile.id)

    def post(self, request):
        data = request.data
        task_type = data.get("task_type", "").upper()
        if task_type not in (AIFeedback.TASK_OCR, AIFeedback.TASK_ANOMALY, AIFeedback.TASK_FORECAST):
            return Response({"error": "Invalid task_type."}, status=status.HTTP_400_BAD_REQUEST)

        expense = None
        vendor_name = data.get("vendor_name", "")
        expense_id = data.get("expense_id")
        if expense_id:
            try:
                expense = Expense.objects.get(pk=expense_id)
                if not vendor_name and expense.vendor_id:
                    vendor_name = expense.vendor.name
            except Expense.DoesNotExist:
                return Response({"error": "Expense not found."}, status=status.HTTP_404_NOT_FOUND)
            if not self._can_access_expense_feedback(request.user, expense):
                return Response({"error": "Not allowed for this expense."}, status=status.HTTP_403_FORBIDDEN)

        fb = AIFeedback.objects.create(
            task_type=task_type,
            expense=expense,
            vendor_name=vendor_name,
            is_positive=bool(data.get("is_positive", False)),
            comment=data.get("comment", ""),
            field_corrections=data.get("field_corrections") or None,
            disputed_flags=data.get("disputed_flags") or None,
            created_by=request.user,
        )
        return Response({"id": str(fb.id), "status": "saved"}, status=status.HTTP_201_CREATED)

    def get(self, request):
        task = request.query_params.get("task", "").upper()
        expense_id = request.query_params.get("expense_id")
        grade = getattr(request.user, "employee_grade", 1) or 1

        qs = AIFeedback.objects.all()
        if not (request.user.is_superuser or grade >= 4):
            qs = qs.filter(created_by=request.user)
        if task:
            qs = qs.filter(task_type=task)
        if expense_id:
            try:
                expense = Expense.objects.get(pk=expense_id)
            except Expense.DoesNotExist:
                return Response({"error": "Expense not found."}, status=status.HTTP_404_NOT_FOUND)
            if not self._can_access_expense_feedback(request.user, expense):
                return Response({"error": "Not allowed for this expense."}, status=status.HTTP_403_FORBIDDEN)
            qs = qs.filter(expense_id=expense_id)

        data = list(qs.values(
            "id", "task_type", "expense_id", "vendor_name",
            "is_positive", "comment", "field_corrections",
            "disputed_flags", "created_at",
        )[:50])
        return Response(data)
