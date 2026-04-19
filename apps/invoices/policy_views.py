from decimal import Decimal, InvalidOperation
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.core.permissions import IsFinanceAdmin
from .models import ExpensePolicyLimit


class PolicyLimitListView(APIView):
    """
    GET  /api/v1/invoices/policy-limits/    — list all limits
    POST /api/v1/invoices/policy-limits/    — create or update a limit for a role
    Finance Admin / CFO only.
    """
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def get(self, request):
        limits = ExpensePolicyLimit.objects.all()
        data = [
            {
                "id": str(lim.id),
                "role": lim.role,
                "role_display": lim.get_role_display(),
                "max_amount": str(lim.max_amount),
                "currency": lim.currency,
                "is_active": lim.is_active,
                "notes": lim.notes,
                "set_by": lim.set_by.get_full_name() if lim.set_by else None,
                "updated_at": lim.updated_at.isoformat(),
            }
            for lim in limits
        ]
        return Response(data)

    def post(self, request):
        role = request.data.get("role", "").strip()
        max_amount_raw = request.data.get("max_amount")
        notes = request.data.get("notes", "").strip()
        is_active = request.data.get("is_active", True)

        # Only finance roles that represent payment authority can have limits.
        # L1, L2, Dept Head, and Finance L1 always review every bill.
        valid_roles = [r for r, _ in ExpensePolicyLimit.ROLE_CHOICES]
        if role not in valid_roles:
            return Response(
                {"error": f"Invalid role. Only finance payment-authority roles can have limits: {valid_roles}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            max_amount = Decimal(str(max_amount_raw))
            if max_amount <= 0:
                raise ValueError("Amount must be positive")
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {"error": "max_amount must be a positive number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lim, created = ExpensePolicyLimit.objects.update_or_create(
            role=role,
            defaults={
                "max_amount": max_amount,
                "is_active": is_active,
                "notes": notes,
                "set_by": request.user,
            },
        )

        return Response(
            {
                "id": str(lim.id),
                "role": lim.role,
                "role_display": lim.get_role_display(),
                "max_amount": str(lim.max_amount),
                "is_active": lim.is_active,
                "notes": lim.notes,
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PolicyLimitDetailView(APIView):
    """
    GET    /api/v1/invoices/policy-limits/<role>/
    PUT    /api/v1/invoices/policy-limits/<role>/
    DELETE /api/v1/invoices/policy-limits/<role>/
    Finance Admin / CFO only.
    """
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def get(self, request, role):
        lim = get_object_or_404(ExpensePolicyLimit, role=role)
        return Response({
            "id": str(lim.id),
            "role": lim.role,
            "role_display": lim.get_role_display(),
            "max_amount": str(lim.max_amount),
            "currency": lim.currency,
            "is_active": lim.is_active,
            "notes": lim.notes,
            "set_by": lim.set_by.get_full_name() if lim.set_by else None,
            "updated_at": lim.updated_at.isoformat(),
        })

    def put(self, request, role):
        lim = get_object_or_404(ExpensePolicyLimit, role=role)

        max_amount_raw = request.data.get("max_amount", lim.max_amount)
        try:
            max_amount = Decimal(str(max_amount_raw))
            if max_amount <= 0:
                raise ValueError()
        except (InvalidOperation, ValueError):
            return Response({"error": "max_amount must be a positive number."}, status=status.HTTP_400_BAD_REQUEST)

        lim.max_amount = max_amount
        lim.is_active = request.data.get("is_active", lim.is_active)
        lim.notes = request.data.get("notes", lim.notes)
        lim.set_by = request.user
        lim.save()

        return Response({"id": str(lim.id), "role": lim.role, "max_amount": str(lim.max_amount), "is_active": lim.is_active})

    def delete(self, request, role):
        lim = get_object_or_404(ExpensePolicyLimit, role=role)
        lim.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
