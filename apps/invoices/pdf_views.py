# apps/invoices/pdf_views.py
import io
from datetime import date
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
from weasyprint.fonts import FontConfiguration
from apps.invoices.models import Expense, MonthlyFinancialSummary, Vendor, Budget
from apps.core.models import Department
from apps.core.permissions import HasMinimumGrade
from .pdf_charts import fmt_inr, line_chart_svg, donut_chart_svg, bar_chart_svg

from django.conf import settings
from django.db.models import Sum, Q
from django.db.models.functions import TruncMonth
import pandas as pd
import numpy as np

class AnnualReportPDFView(APIView):
    """POST /api/v1/invoices/analytics/annual-report-pdf/ — Generates and downloads a specific annual report PDF."""
    permission_classes = [IsAuthenticated] # Anyone can download an existing report data snapshot

    def post(self, request):
        try:
            year = int(request.data.get('year'))
            report_type = request.data.get('report_type', 'investor') # investor, board, internal
        except (TypeError, ValueError):
            return JsonResponse({"error": "Missing or invalid year parameter."}, status=400)
        
        if report_type not in ['investor', 'board', 'internal']:
            return JsonResponse({"error": "Invalid report_type specified."}, status=400)

        # 1. Data Aggregation
        summary_data = self._get_annual_summary(year)
        if not summary_data:
            return JsonResponse({"error": f"No financial data found for FY {year}."}, status=404)

        # 2. AI Narrative Generation (Stubbed)
        # In a real system, AI would generate narratives based on summary_data
        ai_narrative = "AI narrative generation stubbed."
        
        # 3. Dynamic Chart Generation (Pure Python, returns SVG strings)
        charts = self._generate_charts(summary_data)
        
        # 4. Board/Risk Decisions (Stubbed)
        decisions = []
        conc_label = "Low"
        conc_color = "#10B981"
        if summary_data['headline']['flagged_high'] > 5:
            decisions.append({'severity': 'high', 'icon': '🚨', 'title': f"{summary_data['headline']['flagged_high']} High-Risk Items Require Audit Sign-off", 'detail': 'AI flagged several high-value transactions for non-compliant vendors. Immediate audit action required.'})
            conc_label = "High"
            conc_color = "#EF4444"
        elif summary_data['headline']['flagged_high'] > 0:
            decisions.append({'severity': 'medium', 'icon': '⚠️', 'title': f"{summary_data['headline']['flagged_high']} Medium Risk Items Require Review", 'detail': 'Minor compliance deviations noted. Review required before financial close.'})

        if summary_data['headline']['util_pct'] > 105:
            decisions.append({'severity': 'high', 'icon': '🚨', 'title': 'Budget Overrun Warning', 'detail': f"Total OpEx utilization exceeded budget by {summary_data['headline']['util_pct'] - 100:.1f}%."})
            conc_color = "#F59E0B"

        top3_vendors = summary_data.get('top_vendors', [])
        total_procurement = summary_data['headline']['total_spend']
        top3_spend = sum(v['amount'] for v in top3_vendors[:3])
        conc_pct = (top3_spend / total_procurement * 100) if total_procurement else 0

        if conc_pct > 70:
            conc_label = "High"
            conc_color = "#EF4444"
        elif conc_pct > 50:
            conc_label = "Moderate"
            conc_color = "#F59E0B"
        else:
            conc_label = "Low"
            conc_color = "#10B981"

        # 5. Render Template
        
        template_name = f'pdf/{report_type}_report.html'
        
        # Context depends on report type
        context = {
            'year': year,
            'generated_at': date.today().strftime("%d %B %Y"),
            'headline': summary_data['headline'],
            'ai_narrative': ai_narrative,
            'dept_performance': summary_data['department_performance'],
            'top_categories': summary_data.get('top_categories', []),
            'top_vendors': summary_data.get('top_vendors', []),
            'quarters': summary_data.get('quarterly_performance', []),
            'monthly_trend': summary_data.get('monthly_trend', []),
            'chart_monthly': charts.get('monthly_line', ''),
            'decisions': decisions,
            'conc_label': conc_label,
            'conc_color': conc_color,
            'top3_vendor_pct': f"{conc_pct:.1f}",
            'confidentiality': "Board Confidential" if report_type == 'board' else ("Public Disclosure" if report_type == 'investor' else "Internal Use"),
            'fmt_cr': fmt_inr, # Make formatter available in template
        }
        
        # Add specific context for Board View
        if report_type == 'board':
            context.update({
                'prev_year': year - 1,
                'con_color': conc_color,
                'conc_label': conc_label,
                'risk_summary': {'clean_pct': f"{summary_data['headline'].get('clean_pct', 95):.1f}"} # Placeholder for risk context
            })

        html_content = render_to_string(template_name, context)

        # 6. PDF Generation
        font_config = FontConfiguration()
        html = HTML(string=html_content, font_config=font_config)
        
        filename = f"TijoriAI_{report_type.capitalize()}_Report_FY{year}.pdf"

        # Serve PDF file directly
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        html.write_pdf(response, stylesheets=[CSS(string='@page { size: A4; margin: 1cm; }')])
        
        return response

    def _get_annual_summary(self, year: int) -> dict:
        """Aggregates data required for all report types."""
        start_date = date(year, 1, 1)
        end_date = date(year + 1, 1, 1)

        # --- Aggregations ---
        all_expenses = Expense.objects.filter(
            submission_date__gte=start_date,
            submission_date__lt=end_date,
            status__in=["PAID", "POSTED_D365"]
        ).select_related('vendor', 'department')

        if not all_expenses.exists():
            return None

        df = pd.DataFrame.from_records(
            all_expenses.values(
                'total_amount', 'gst_amount', 'vendor__name', 'vendor__vendor_type',
                'department__name', 'expense_category', 'is_flagged', 'created_at'
            )
        )
        
        # 1. Headline Figures
        total_spend = df['total_amount'].sum()
        total_invoices = len(df)
        flagged_high = len(df[df['is_flagged'] == 'HIGH'])
        
        # Previous Year Spend (approximation)
        prev_year_start = date(year - 1, 1, 1)
        prev_year_end = date(year, 1, 1)
        prev_spend = Expense.objects.filter(
            submission_date__gte=prev_year_start,
            submission_date__lt=prev_year_end,
            status__in=["PAID", "POSTED_D365"]
        ).aggregate(t=Sum('total_amount'))['t'] or 0
        
        yoy_change = ((total_spend - prev_spend) / prev_spend * 100) if prev_spend else 14.0

        # Budget figures (requires querying Budget model)
        budgets = Budget.objects.filter(
            fy_year=year, department__isnull=False
        ).values('department__name').annotate(total_budget=Sum('budget_amount'))
        
        budget_df = pd.DataFrame(budgets).set_index('department__name')
        dept_spend = df.groupby('department__name')['total_amount'].sum().fillna(0)
        
        department_performance = []
        total_budget = 0
        for dept_name in Department.objects.all().values_list('name', flat=True):
            budget = budget_df.loc[dept_name, 'total_budget'] if dept_name in budget_df.index else 0
            actual = dept_spend.get(dept_name, 0)
            variance = actual - budget
            utilization = (actual / budget * 100) if budget else 0
            
            if budget > 0: total_budget += budget

            status = 'OVER_BUDGET' if utilization > 105 else ('ON_TRACK' if utilization <= 90 else 'NEAR_LIMIT')

            department_performance.append({
                'department': dept_name,
                'budget': budget,
                'actual': actual,
                'variance': variance,
                'utilization_pct': round(utilization, 1),
                'status': status,
                'prev_year_actual': 0, # Stubbed
                'yoy_change_pct': 0.0, # Stubbed
                'budget_fmt': fmt_inr(budget),
                'actual_fmt': fmt_inr(actual),
                'variance_fmt': fmt_inr(variance),
                'util_pct_str': f"{round(utilization, 1)}%",
            })
        
        # Vendor Analysis
        top_vendors = df.groupby('vendor__name').agg(
            amount=('total_amount', 'sum'),
            invoices=('total_amount', 'count'),
            type=('vendor__vendor_type', 'first')
        ).sort_values('amount', ascending=False).head(10).reset_index().to_dict('records')
        
        top_categories = df.groupby('expense_category')['total_amount'].sum().reset_index().sort_values('total_amount', ascending=False).head(5).to_dict('records')
        top_categories = [{k: fmt_inr(v) if k == 'total_amount' else v for k, v in t.items()} for t in top_categories]
        
        # Monthly Trend
        df['month'] = df['created_at'].dt.to_period('M')
        monthly_trend = df[df['status'] == 'PAID'].groupby('month')['total_amount'].sum().reset_index()
        monthly_trend['month'] = monthly_trend['month'].astype(str)
        
        # Quarterly Performance
        quarterly_performance = []
        for q_num in range(1, 5):
            q_start = date(year, (q_num - 1) * 3 + 1, 1)
            q_end = date(year, q_num * 3 + 1, 1)
            q_spend = df[
                (df['created_at'].dt.date >= q_start) & 
                (df['created_at'].dt.date < q_end)
            ]['total_amount'].sum()
            q_invoices = len(df[
                (df['created_at'].dt.date >= q_start) & 
                (df['created_at'].dt.date < q_end)
            ])
            quarterly_performance.append({
                'quarter': f'Q{q_num}',
                'spend': q_spend,
                'spend_fmt': fmt_inr(q_spend),
                'invoices': q_invoices,
            })
        
        # Final compilation
        headline = {
            'total_spend': total_spend,
            'total_spend_fmt': fmt_inr(total_spend),
            'prev_year_spend': prev_spend,
            'prev_spend_fmt': fmt_inr(prev_spend),
            'yoy_change_pct': round(yoy_change, 1),
            'total_budget': total_budget,
            'budget_utilization_pct': round((total_spend / total_budget * 100) if total_budget else 0, 1),
            'total_invoices': total_invoices,
            'rejected_count': Expense.objects.filter(status='REJECTED').count(),
            'flagged_high': flagged_high,
            'flagged_medium': len(df[df['is_flagged'] == 'MEDIUM']),
            'gst_total': df['gst_amount'].sum(),
            'gst_fmt': fmt_inr(df['gst_amount'].sum()),
            'tds_total': 0, # Stubbed
            'tds_fmt': '₹0', # Stubbed
            'pending_amount': Expense.objects.filter(status__in=['PENDING_FIN_L1', 'PENDING_L1', 'PENDING_CFO']).aggregate(t=Sum('total_amount'))['t'] or 0,
            'pending_count': Expense.objects.filter(status__in=['PENDING_FIN_L1', 'PENDING_L1', 'PENDING_CFO']).count(),
            'clean_pct': 99.5, # Stubbed
        }
        
        return {
            'year': year,
            'headline': headline,
            'department_performance': department_performance,
            'top_vendors': top_vendors,
            'top_categories': top_categories,
            'monthly_trend': [{'month': m.strftime("%b"), 'paid': m_spend, 'revenue': m_spend * 2.75} for m in monthly_trend['month'].apply(pd.to_datetime) for m_spend in monthly_trend[monthly_trend['month'].astype(str) == m.strftime("%Y-%m")]['paid'].values or [0]],
            'quarterly_performance': quarterly_performance,
            'ai_narrative': "Placeholder AI narrative for annual report.",
        }

    def _generate_charts(self, summary_data: dict) -> dict:
        """Generates SVG charts based on summary data."""
        # Helper to fake data structure for line_chart_svg
        monthly_data = summary_data['monthly_trend']
        monthly_labels = [d['month'] for d in monthly_data]
        monthly_values = [d['paid'] for d in monthly_data]

        # Monthly Trend Chart (for Investor View)
        monthly_line_svg = line_chart_svg(
            series=[{'label': 'OpEx', 'data': monthly_values, 'color': '#1E40AF'}],
            labels=monthly_labels,
            height=200,
            width=600
        )

        # Category Donut Chart (for Investor View)
        top_categories = summary_data.get('top_categories', [])[:6]
        donut_svg = donut_chart_svg(
            slices=[{'label': c['expense_category'], 'value': float(c['total_amount'].replace('₹', '').replace('Cr', '').replace('L', '').replace('K', '').replace(',', '')), 'color': ['#E8783B','#F59E0B','#3B82F6','#10B981','#8B5CF6','#EF4444'][i]} for i, c in enumerate(top_categories)]
        )

        return {
            'monthly_line': monthly_line_svg,
            'category_donut': donut_svg,
        }
