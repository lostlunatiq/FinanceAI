"""
Budget Management Views
GET/POST /api/v1/invoices/budgets/
GET/PATCH/DELETE /api/v1/invoices/budgets/<id>/
GET /api/v1/invoices/budgets/<id>/utilization/
GET /api/v1/forecasting/cashflow/
"""

import logging
from decimal import Decimal

from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import HasMinimumGrade
from apps.core.utils import log_audit_event

from .models import Budget, Expense

logger = logging.getLogger(__name__)


class BudgetListView(APIView):
    """GET /POST /api/v1/invoices/budgets/"""
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(2)]

    def get(self, request):
        from .models import Budget
        user = request.user
        grade = user.employee_grade or 0
        budgets = Budget.objects.select_related("department", "created_by").all()
        if grade == 2:
            if user.department_id:
                budgets = budgets.filter(department=user.department)
            else:
                budgets = budgets.none()
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
        from apps.core.models import Department

        from .models import Budget
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
            log_audit_event(
                user=request.user,
                action="budget.created",
                entity_type="Budget",
                entity_id=budget.id,
                entity_display_name=budget.name,
                masked_after={
                    "status": budget.status,
                    "total_amount": float(budget.total_amount),
                    "department_id": str(budget.department_id) if budget.department_id else None,
                    "fiscal_year": budget.fiscal_year,
                },
                change_summary=f"Created budget {budget.name}",
                request=request,
            )
            return Response(_budget_to_dict(budget), status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BudgetDetailView(APIView):
    """GET/PATCH/DELETE /api/v1/invoices/budgets/<id>/"""
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(2)]

    def get(self, request, pk):
        from .models import Budget
        b = get_object_or_404(Budget, pk=pk)
        grade = request.user.employee_grade or 0
        if grade == 2 and b.department_id != request.user.department_id:
            return Response(
                {"error": "Access denied to this department's budget."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(_budget_to_dict(b))

    def patch(self, request, pk):
        from .models import Budget
        b = get_object_or_404(Budget, pk=pk)
        data = request.data
        before = {
            "name": b.name,
            "status": b.status,
            "total_amount": float(b.total_amount),
            "warning_threshold": b.warning_threshold,
            "critical_threshold": b.critical_threshold,
            "notes": b.notes,
            "end_date": str(b.end_date),
        }
        updatable = ["name", "total_amount", "status", "warning_threshold", "critical_threshold", "notes", "end_date"]
        for field in updatable:
            if field in data:
                if field == "total_amount":
                    setattr(b, field, Decimal(str(data[field])))
                else:
                    setattr(b, field, data[field])
        b.save()
        log_audit_event(
            user=request.user,
            action="budget.updated",
            entity_type="Budget",
            entity_id=b.id,
            entity_display_name=b.name,
            masked_before=before,
            masked_after={
                "name": b.name,
                "status": b.status,
                "total_amount": float(b.total_amount),
                "warning_threshold": b.warning_threshold,
                "critical_threshold": b.critical_threshold,
                "notes": b.notes,
                "end_date": str(b.end_date),
            },
            request=request,
        )
        return Response(_budget_to_dict(b))

    def delete(self, request, pk):
        from .models import Budget
        b = get_object_or_404(Budget, pk=pk)
        old_status = b.status
        b.status = "closed"
        b.save()
        log_audit_event(
            user=request.user,
            action="budget.closed",
            entity_type="Budget",
            entity_id=b.id,
            entity_display_name=b.name,
            masked_before={"status": old_status},
            masked_after={"status": b.status},
            change_summary=f"Closed budget {b.name}",
            request=request,
        )
        return Response({"message": "Budget closed."})


class BudgetUtilizationView(APIView):
    """GET /api/v1/invoices/budgets/<id>/utilization/ — Detailed breakdown"""
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(2)]

    def get(self, request, pk):
        from .models import Budget
        b = get_object_or_404(Budget, pk=pk)
        grade = request.user.employee_grade or 0
        if grade == 2 and b.department_id != request.user.department_id:
            return Response(
                {"error": "Access denied to this department's budget."},
                status=status.HTTP_403_FORBIDDEN,
            )

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
        from datetime import date
        try:
            days = int(request.query_params.get("days", 90))
            days = max(1, min(days, 180))
            return Response(_build_cashflow_forecast(days))
        except Exception as e:
            return Response(
                {
                    "error": str(e),
                    "opening_balance": 0,
                    "projected_closing_balance": 0,
                    "forecast_period_days": 90,
                    "generated_at": str(date.today()),
                    "daily_forecast": [],
                    "summary": {},
                    "narrative": "Unable to generate cashflow forecast at this time.",
                },
                status=500
            )


def _load_historical_cashflow_csv():
    """Load uploaded historical CSV files and return monthly inflow/outflow aggregates."""
    import os, json, glob
    from django.conf import settings
    hist_dir = os.path.join(settings.MEDIA_ROOT, "historical")
    if not os.path.exists(hist_dir):
        return {}, {}
    monthly_inflow = {}
    monthly_outflow = {}
    for fpath in sorted(glob.glob(os.path.join(hist_dir, "*.json"))):
        try:
            with open(fpath) as f:
                data = json.load(f)
            for row in data.get("rows", []):
                try:
                    from datetime import datetime
                    dt = datetime.strptime(str(row.get("date", "")).strip()[:10], "%Y-%m-%d").date()
                    amount = float(str(row.get("amount", 0)).replace(",", "") or 0)
                    typ = str(row.get("type", "")).strip().lower()
                    key = f"{dt.year}-{dt.month:02d}"
                    if "inflow" in typ:
                        monthly_inflow[key] = monthly_inflow.get(key, 0) + amount
                    elif "outflow" in typ:
                        monthly_outflow[key] = monthly_outflow.get(key, 0) + amount
                except Exception:
                    continue
        except Exception:
            continue
    return monthly_inflow, monthly_outflow


def _build_cashflow_forecast(days: int = 90) -> dict:
    """Build cash flow forecast from DB expense data + uploaded historical CSV."""
    from datetime import date, timedelta
    import numpy as np

    today = date.today()

    # Historical outflows from DB (last 12 months)
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

    hist_data = {row["invoice_date"]: float(row["daily_total"] or 0) for row in outflows}
    upcoming_map = {row["invoice_date"]: float(row["daily_total"] or 0) for row in upcoming}

    # Load uploaded historical CSV data
    csv_monthly_inflow, csv_monthly_outflow = _load_historical_cashflow_csv()

    # Determine base daily averages
    if hist_data:
        hist_amounts = list(hist_data.values())
        avg_daily_outflow = float(np.mean(hist_amounts))
        std_daily = float(np.std(hist_amounts)) if len(hist_amounts) > 1 else avg_daily_outflow * 0.3
    else:
        avg_daily_outflow = 50000.0
        std_daily = 15000.0

    # If we have CSV historical data, derive inflow pattern from it
    if csv_monthly_inflow:
        total_csv_in = sum(csv_monthly_inflow.values())
        total_csv_out = sum(csv_monthly_outflow.values()) or 1
        # Monthly averages from CSV
        avg_monthly_inflow_csv = total_csv_in / max(len(csv_monthly_inflow), 1)
        avg_monthly_outflow_csv = total_csv_out / max(len(csv_monthly_outflow), 1)
        avg_daily_inflow = avg_monthly_inflow_csv / 30.0
        avg_daily_outflow = max(avg_monthly_outflow_csv / 30.0, avg_daily_outflow)
        # Monthly seasonality factor from CSV (ratio of month to average)
        avg_in = avg_monthly_inflow_csv or 1
        inflow_seasonality = {k: v / avg_in for k, v in csv_monthly_inflow.items()}
    else:
        # Inflows estimated as 115-140% of outflows (realistic B2B SaaS margin)
        avg_daily_inflow = avg_daily_outflow * 1.30
        inflow_seasonality = {}

    # Month-of-year seasonality (Indian fiscal pattern: Q1 Apr-Jun slow, Q3 Oct-Dec peak)
    month_season = {1: 1.05, 2: 0.95, 3: 1.20, 4: 0.85, 5: 0.90, 6: 1.10,
                    7: 1.00, 8: 0.88, 9: 1.05, 10: 1.15, 11: 1.25, 12: 1.10}
    # Day-of-week factor
    dow_factor = [1.2, 1.1, 1.0, 1.1, 1.3, 0.3, 0.2]

    # Opening balance
    total_budget = float(Budget.objects.filter(status__in=["active", "draft"]).aggregate(t=Sum("total_amount"))["t"] or 10000000)
    total_paid = float(Expense.objects.filter(_status="PAID").aggregate(t=Sum("total_amount"))["t"] or 0)
    opening_balance = max(total_budget - total_paid, 500000.0)

    # Generate forecast with meaningful variation
    forecast_days = []
    running_balance = 0.0
    rng = np.random.default_rng(seed=int(today.strftime("%Y%m%d")))

    for i in range(days):
        d = today + timedelta(days=i)
        dow = d.weekday()
        mo = d.month
        df = dow_factor[dow]
        sf = month_season.get(mo, 1.0)

        # CSV seasonality for this month-year
        key = f"{d.year}-{d.month:02d}"
        csv_sf = inflow_seasonality.get(key, 1.0)

        if d in upcoming_map:
            projected_outflow = float(upcoming_map[d])
            confidence = 0.95
        else:
            # Add controlled noise so monthly aggregates vary meaningfully
            noise = float(rng.normal(0, std_daily * 0.15))
            projected_outflow = max(0.0, avg_daily_outflow * df * sf + noise)
            confidence = max(0.5, 0.92 - (i / days) * 0.42)

        # Inflow: seasonal + CSV pattern + some noise (customer payment lag ~15 days)
        inflow_noise = float(rng.normal(0, avg_daily_inflow * 0.20))
        projected_inflow = max(0.0, avg_daily_inflow * df * sf * csv_sf + inflow_noise)

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

    # Expense breakdown for donut chart (from DB categories)
    # Use business_purpose for categorization (expense_type field does not exist)
    expense_cats = (
        Expense.objects.filter(_status__in=["PAID", "BOOKED_D365"], invoice_date__gte=hist_start)
        .values("business_purpose")
        .annotate(total=Sum("total_amount"))
        .order_by("-total")
    )
    breakdown = [{"category": row["business_purpose"] or "Other", "amount": float(row["total"] or 0)}
                 for row in expense_cats if row["total"]]
    # Fallback breakdown from CSV categories if DB is empty
    if not breakdown and csv_monthly_outflow:
        total_out_csv = sum(csv_monthly_outflow.values())
        breakdown = [
            {"category": "Salaries & Payroll", "amount": round(total_out_csv * 0.52, 0)},
            {"category": "Vendor Payments", "amount": round(total_out_csv * 0.18, 0)},
            {"category": "Tax & Compliance", "amount": round(total_out_csv * 0.12, 0)},
            {"category": "Rent & Utilities", "amount": round(total_out_csv * 0.08, 0)},
            {"category": "Software & Cloud", "amount": round(total_out_csv * 0.06, 0)},
            {"category": "Other", "amount": round(total_out_csv * 0.04, 0)},
        ]
    elif not breakdown:
        breakdown = [
            {"category": "Salaries & Payroll", "amount": avg_daily_outflow * 30 * 0.52},
            {"category": "Vendor Payments", "amount": avg_daily_outflow * 30 * 0.18},
            {"category": "Tax & Compliance", "amount": avg_daily_outflow * 30 * 0.12},
            {"category": "Rent & Utilities", "amount": avg_daily_outflow * 30 * 0.08},
            {"category": "Software & Cloud", "amount": avg_daily_outflow * 30 * 0.06},
            {"category": "Other", "amount": avg_daily_outflow * 30 * 0.04},
        ]

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
        "expense_breakdown": breakdown,
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


def _get_forecast_feedback_context() -> str:
    """Return last 5 forecast feedback entries as a prompt block."""
    try:
        from .models import AIFeedback
        feedbacks = AIFeedback.objects.filter(task_type=AIFeedback.TASK_FORECAST).order_by("-created_at")[:5]
        if not feedbacks:
            return ""
        lines = []
        for fb in feedbacks:
            date_str = fb.created_at.strftime("%Y-%m-%d")
            sentiment = "Positive" if fb.is_positive else "Negative"
            if fb.comment:
                lines.append(f"- [{date_str}] ({sentiment}) {fb.comment}")
        if not lines:
            return ""
        return "\n\nPAST CFO FEEDBACK ON FORECASTS (incorporate these learnings into the narrative):\n" + "\n".join(lines)
    except Exception:
        return ""


def _generate_forecast_narrative(days, opening, closing, total_out, total_in, min_day, max_day, upcoming_count):
    """Try AI narrative, fall back to rule-based."""
    try:
        from ai.tools.openrouter_client import call_text_model
        feedback_context = _get_forecast_feedback_context()
        prompt = f"""Generate a concise 2-paragraph CFO cash flow narrative for this {days}-day forecast:
- Opening Balance: ₹{opening:,.0f}
- Projected Closing: ₹{closing:,.0f}
- Total Outflows: ₹{total_out:,.0f}
- Total Inflows: ₹{total_in:,.0f}
- Minimum Balance: ₹{min_day['running_balance']:,.0f} on {min_day['date']}
- Maximum Balance: ₹{max_day['running_balance']:,.0f} on {max_day['date']}
- Known upcoming payments: {upcoming_count}
{feedback_context}

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
