"""
Budget Management Views
GET/POST /api/v1/invoices/budgets/
GET/PATCH/DELETE /api/v1/invoices/budgets/<id>/
GET /api/v1/invoices/budgets/<id>/utilization/
GET /api/v1/forecasting/cashflow/
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Avg
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class BudgetListView(APIView):
    """GET /POST /api/v1/invoices/budgets/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Budget
        budgets = Budget.objects.select_related("department", "created_by").all()
        dept_id = request.query_params.get("department")
        if dept_id:
            budgets = budgets.filter(department_id=dept_id)
        year = request.query_params.get("fiscal_year")
        if year:
            budgets = budgets.filter(fiscal_year=int(year))

        result = []
        for b in budgets:
            spent = b.spent_amount
            util = b.utilization_pct
            result.append({
                "id": str(b.id),
                "name": b.name,
                "department": b.department.name if b.department else None,
                "department_id": str(b.department.id) if b.department else None,
                "fiscal_year": b.fiscal_year,
                "period": b.period,
                "start_date": str(b.start_date),
                "end_date": str(b.end_date),
                "total_amount": float(b.total_amount),
                "spent_amount": spent,
                "remaining_amount": float(b.total_amount) - spent,
                "utilization_pct": util,
                "status": b.status,
                "alert_level": b.alert_level,
                "warning_threshold": b.warning_threshold,
                "critical_threshold": b.critical_threshold,
                "currency": b.currency,
                "notes": b.notes,
                "created_at": b.created_at.isoformat(),
            })
        return Response(result)

    def post(self, request):
        from .models import Budget
        from apps.core.models import Department
        data = request.data

        try:
            dept = None
            if data.get("department_id"):
                dept = Department.objects.get(pk=data["department_id"])

            budget = Budget.objects.create(
                name=data["name"],
                department=dept,
                fiscal_year=int(data.get("fiscal_year", 2026)),
                period=data.get("period", "quarterly"),
                start_date=data["start_date"],
                end_date=data["end_date"],
                total_amount=Decimal(str(data["total_amount"])),
                currency=data.get("currency", "INR"),
                status=data.get("status", "active"),
                warning_threshold=int(data.get("warning_threshold", 80)),
                critical_threshold=int(data.get("critical_threshold", 95)),
                notes=data.get("notes", ""),
                created_by=request.user,
            )
            return Response(_budget_to_dict(budget), status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BudgetDetailView(APIView):
    """GET/PATCH/DELETE /api/v1/invoices/budgets/<id>/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from .models import Budget
        b = get_object_or_404(Budget, pk=pk)
        return Response(_budget_to_dict(b))

    def patch(self, request, pk):
        from .models import Budget
        b = get_object_or_404(Budget, pk=pk)
        data = request.data
        updatable = ["name", "total_amount", "status", "warning_threshold", "critical_threshold", "notes", "end_date"]
        for field in updatable:
            if field in data:
                if field == "total_amount":
                    setattr(b, field, Decimal(str(data[field])))
                else:
                    setattr(b, field, data[field])
        b.save()
        return Response(_budget_to_dict(b))

    def delete(self, request, pk):
        from .models import Budget
        b = get_object_or_404(Budget, pk=pk)
        b.status = "closed"
        b.save()
        return Response({"message": "Budget closed."})


class BudgetUtilizationView(APIView):
    """GET /api/v1/invoices/budgets/<id>/utilization/ — Detailed breakdown"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from .models import Budget, Expense
        b = get_object_or_404(Budget, pk=pk)

        qs = Expense.objects.filter(
            _status__in=["APPROVED", "PENDING_D365", "BOOKED_D365", "POSTED_D365", "PAID"],
            invoice_date__gte=b.start_date,
            invoice_date__lte=b.end_date,
        )
        if b.department:
            qs = qs.filter(submitted_by__department=b.department)

        # Monthly breakdown
        from django.db.models.functions import TruncMonth
        monthly = qs.annotate(month=TruncMonth("invoice_date")).values("month").annotate(
            total=Sum("total_amount"), count=Count("id")
        ).order_by("month")

        # Vendor breakdown
        by_vendor = qs.values("vendor__name").annotate(
            total=Sum("total_amount"), count=Count("id")
        ).order_by("-total")[:10]

        # Employee breakdown
        by_employee = qs.values("submitted_by__first_name", "submitted_by__last_name").annotate(
            total=Sum("total_amount"), count=Count("id")
        ).order_by("-total")[:10]

        return Response({
            "budget": _budget_to_dict(b),
            "monthly_spend": [
                {"month": str(m["month"])[:7], "amount": float(m["total"] or 0), "invoices": m["count"]}
                for m in monthly
            ],
            "top_vendors": [
                {"vendor": v["vendor__name"], "amount": float(v["total"] or 0), "invoices": v["count"]}
                for v in by_vendor
            ],
            "top_employees": [
                {
                    "name": f"{e['submitted_by__first_name']} {e['submitted_by__last_name']}".strip(),
                    "amount": float(e["total"] or 0),
                    "invoices": e["count"]
                }
                for e in by_employee
            ],
            "total_invoices": qs.count(),
        })


def _budget_to_dict(b) -> dict:
    spent = b.spent_amount
    return {
        "id": str(b.id),
        "name": b.name,
        "department": b.department.name if b.department else None,
        "department_id": str(b.department.id) if b.department else None,
        "fiscal_year": b.fiscal_year,
        "period": b.period,
        "start_date": str(b.start_date),
        "end_date": str(b.end_date),
        "total_amount": float(b.total_amount),
        "spent_amount": spent,
        "remaining_amount": float(b.total_amount) - spent,
        "utilization_pct": b.utilization_pct,
        "status": b.status,
        "alert_level": b.alert_level,
        "warning_threshold": b.warning_threshold,
        "critical_threshold": b.critical_threshold,
        "currency": b.currency,
        "notes": b.notes,
        "created_at": b.created_at.isoformat(),
    }


class CashFlowForecastView(APIView):
    """
    GET /api/v1/invoices/forecasting/cashflow/
    Returns 90-day cash flow projection using historical expense data.
    ?days=90&scenario=baseline
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get("days", 90))
        days = max(1, min(days, 180))
        return Response(_build_cashflow_forecast(days))


def _build_cashflow_forecast(days: int = 90) -> dict:
    """Build cash flow forecast from DB expense data."""
    import pandas as pd
    import numpy as np
    from datetime import date, timedelta
    from .models import Expense
    from django.db.models.functions import TruncDate

    today = date.today()

    # Historical outflows (last 12 months)
    hist_start = today - timedelta(days=365)
    outflows = Expense.objects.filter(
        _status__in=["PAID", "BOOKED_D365", "POSTED_D365"],
        invoice_date__gte=hist_start,
        invoice_date__lte=today,
    ).values("invoice_date").annotate(daily_total=Sum("total_amount")).order_by("invoice_date")

    # Known upcoming outflows (approved but not yet paid)
    upcoming = Expense.objects.filter(
        _status__in=["APPROVED", "PENDING_D365"],
        invoice_date__gte=today,
    ).values("invoice_date").annotate(daily_total=Sum("total_amount")).order_by("invoice_date")

    # Build historical series
    hist_data = {row["invoice_date"]: float(row["daily_total"] or 0) for row in outflows}

    # Calculate rolling averages for forecast
    if hist_data:
        hist_amounts = list(hist_data.values())
        avg_daily = np.mean(hist_amounts) if hist_amounts else 50000
        std_daily = np.std(hist_amounts) if len(hist_amounts) > 1 else avg_daily * 0.3
        # Weekly pattern (lower on weekends)
        day_of_week_factor = [1.2, 1.1, 1.0, 1.1, 1.3, 0.3, 0.2]
    else:
        avg_daily = 50000
        std_daily = 15000
        day_of_week_factor = [1.2, 1.1, 1.0, 1.1, 1.3, 0.3, 0.2]

    # Known upcoming map
    upcoming_map = {row["invoice_date"]: float(row["daily_total"] or 0) for row in upcoming}

    # Generate forecast
    forecast_days = []
    running_balance = 0
    opening_balance = 2500000  # Mock opening cash position

    for i in range(days):
        d = today + timedelta(days=i)
        dow = d.weekday()
        factor = day_of_week_factor[dow]

        if d in upcoming_map:
            projected_outflow = upcoming_map[d]
            confidence = 0.95
        else:
            projected_outflow = avg_daily * factor
            confidence = max(0.5, 0.9 - (i / days) * 0.4)

        projected_inflow = avg_daily * factor * 1.1  # Inflows slightly higher (mock AR)
        net = projected_inflow - projected_outflow
        running_balance += net

        forecast_days.append({
            "date": str(d),
            "projected_inflow": round(projected_inflow, 0),
            "projected_outflow": round(projected_outflow, 0),
            "net_cashflow": round(net, 0),
            "running_balance": round(opening_balance + running_balance, 0),
            "confidence": round(confidence, 2),
            "is_known": d in upcoming_map,
        })

    # Build AI narrative
    end_balance = opening_balance + running_balance
    balance_change_pct = (running_balance / opening_balance) * 100 if opening_balance else 0

    # Find critical dates
    min_balance_day = min(forecast_days, key=lambda x: x["running_balance"])
    max_balance_day = max(forecast_days, key=lambda x: x["running_balance"])

    # Summary stats
    total_out = sum(d["projected_outflow"] for d in forecast_days)
    total_in = sum(d["projected_inflow"] for d in forecast_days)

    narrative = _generate_forecast_narrative(
        days=days,
        opening=opening_balance,
        closing=end_balance,
        total_out=total_out,
        total_in=total_in,
        min_day=min_balance_day,
        max_day=max_balance_day,
        upcoming_count=len(upcoming_map),
    )

    return {
        "opening_balance": opening_balance,
        "projected_closing_balance": round(end_balance, 0),
        "forecast_period_days": days,
        "generated_at": str(today),
        "total_projected_inflow": round(total_in, 0),
        "total_projected_outflow": round(total_out, 0),
        "net_cashflow": round(total_in - total_out, 0),
        "known_upcoming_payments": len(upcoming_map),
        "daily_forecast": forecast_days,
        "summary": {
            "min_balance_date": min_balance_day["date"],
            "min_balance_amount": min_balance_day["running_balance"],
            "max_balance_date": max_balance_day["date"],
            "max_balance_amount": max_balance_day["running_balance"],
            "avg_daily_outflow": round(total_out / days, 0),
            "avg_daily_inflow": round(total_in / days, 0),
        },
        "narrative": narrative,
        "risk_highlights": _get_risk_highlights(forecast_days, upcoming_map),
    }


def _generate_forecast_narrative(days, opening, closing, total_out, total_in, min_day, max_day, upcoming_count):
    """Try AI narrative, fall back to rule-based."""
    try:
        from ai.tools.openrouter_client import call_text_model
        prompt = f"""Generate a concise 2-paragraph CFO cash flow narrative for this {days}-day forecast:
- Opening Balance: ₹{opening:,.0f}
- Projected Closing: ₹{closing:,.0f}
- Total Outflows: ₹{total_out:,.0f}
- Total Inflows: ₹{total_in:,.0f}
- Minimum Balance: ₹{min_day['running_balance']:,.0f} on {min_day['date']}
- Maximum Balance: ₹{max_day['running_balance']:,.0f} on {max_day['date']}
- Known upcoming payments: {upcoming_count}

Be direct and actionable. Use Indian financial context. Keep it under 100 words."""
        response = call_text_model(prompt=prompt)
        return response.get("content", "").strip()
    except Exception:
        direction = "improve" if closing > opening else "decline"
        return (
            f"Over the next {days} days, cash position is projected to {direction} from "
            f"₹{opening:,.0f} to ₹{closing:,.0f}. "
            f"Total projected outflows of ₹{total_out:,.0f} against inflows of ₹{total_in:,.0f} "
            f"result in a net {'surplus' if total_in > total_out else 'deficit'} of "
            f"₹{abs(total_in-total_out):,.0f}. "
            f"Monitor cash closely around {min_day['date']} when balance dips to ₹{min_day['running_balance']:,.0f}."
        )


def _get_risk_highlights(forecast_days, upcoming_map):
    risks = []
    for day in forecast_days:
        if day["running_balance"] < 500000:
            risks.append({
                "type": "LOW_CASH",
                "severity": "CRITICAL" if day["running_balance"] < 100000 else "HIGH",
                "date": day["date"],
                "message": f"Cash balance projected at ₹{day['running_balance']:,.0f} — below safe threshold",
            })
    if upcoming_map:
        risks.append({
            "type": "KNOWN_PAYMENTS",
            "severity": "INFO",
            "date": str(min(upcoming_map.keys())),
            "message": f"{len(upcoming_map)} approved invoices pending payment totalling ₹{sum(upcoming_map.values()):,.0f}",
        })
    return risks[:5]
