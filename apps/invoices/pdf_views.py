"""
Annual Report PDF generation view.
POST /api/v1/invoices/analytics/annual-report-pdf/
Body: { year: int, report_type: "investor" | "board" | "internal" }
Returns: application/pdf file download.
"""
import logging
from datetime import date

from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from weasyprint import HTML

from .models import Budget, Expense
from .pdf_charts import (
    fmt_inr, bar_chart_svg, line_chart_svg,
    donut_chart_svg, progress_ring_svg, grouped_bar_chart_svg,
    COLORS, STATUS_COLORS,
)

logger = logging.getLogger(__name__)

PAID_STATUSES   = ["PAID", "APPROVED", "BOOKED_D365", "POSTED_D365"]
PENDING_STATUSES = [
    "PENDING_L1", "PENDING_L2", "PENDING_HOD",
    "PENDING_FIN_L1", "PENDING_FIN_L2", "PENDING_FIN_HEAD",
]

# ── audience-specific AI prompt templates ─────────────────────────────────────

_PROMPTS = {
    'investor': (
        "Write a formal 4-paragraph annual financial report executive summary for FY {year} "
        "in investor-grade language. Use precise financial terminology. "
        "Data: Total spend ₹{total_spend:,.0f} ({yoy:+.1f}% YoY vs ₹{prev_spend:,.0f}), "
        "approved budget ₹{budget:,.0f} ({util:.1f}% utilisation), "
        "{invoices} invoices processed ({rejected} rejected, {flagged_high} high-risk flags, "
        "{flagged_medium} medium-risk). GST obligation ₹{gst:,.0f}, TDS ₹{tds:,.0f}. "
        "Outstanding payables ₹{pending:,.0f} ({pending_cnt} invoices). "
        "Para 1: overall financial performance and YoY trend. "
        "Para 2: operational efficiency — invoice processing throughput, approval cycle, rejection rate. "
        "Para 3: risk management, compliance, fraud detection outcomes. "
        "Para 4: forward outlook and key priorities. "
        "Write for institutional investors, auditors, and regulatory reviewers."
    ),
    'board': (
        "Write a concise 3-paragraph strategic financial briefing for the Board of Directors for FY {year}. "
        "Data: Total spend ₹{total_spend:,.0f} ({yoy:+.1f}% YoY), "
        "budget ₹{budget:,.0f} ({util:.1f}% utilised), "
        "{invoices} invoices processed ({rejected} rejected, {flagged_high} high-risk flags). "
        "Outstanding payables ₹{pending:,.0f}. "
        "Para 1: headline performance — what the board must know about this year's financials. "
        "Para 2: specific risks and departments requiring board-level oversight. "
        "Para 3: clear strategic recommendations for FY {next_year} budget and controls. "
        "Be direct, decisive, and action-oriented. Write for C-suite executives and board directors."
    ),
    'internal': (
        "Write a warm, accessible 3-paragraph annual financial update for company employees for FY {year}. "
        "Data: Company spent ₹{total_spend:,.0f} this year ({yoy:+.1f}% change vs last year). "
        "We processed {invoices} invoices across all teams. "
        "Para 1: celebrate the year — what the company achieved financially, in plain language. "
        "Para 2: explain where we spent money and why it matters for employees and their work. "
        "Para 3: an optimistic, motivating message about what this means for next year. "
        "Tone: warm, transparent, inclusive. Avoid all financial jargon. Write for everyone, not just finance."
    ),
}

_CONFIDENTIALITY = {
    'investor': 'Confidential — For Authorised Investor Distribution Only',
    'board':    'Board Confidential — Strictly Not for External Distribution',
    'internal': 'Internal Use — For Employee Distribution Only',
}

_REPORT_TITLES = {
    'investor': 'Annual Financial Report',
    'board':    'Board Strategic Financial Review',
    'internal': 'Our Year in Numbers',
}

_ACCENT = {
    'investor': '#E8783B',
    'board':    '#1E40AF',
    'internal': '#10B981',
}


def _ai_narrative(prompt: str, fallback: str) -> str:
    try:
        from ai.tools.openrouter_client import call_text_model
        resp = call_text_model(prompt=prompt, max_tokens=700)
        text = (resp.get('content') or '').strip()
        return text if text else fallback
    except Exception:
        return fallback


def _build_fallback(year, total_spend, prev_spend, yoy_pct, total_budget, util_pct,
                    total_invoices, rejected, flagged_high, gst_total, tds_total,
                    pending_amount, report_type):
    if report_type == 'investor':
        return (
            f"FY {year} Annual Financial Summary — Tijori AI\n\n"
            f"The organisation recorded total operational expenditure of {fmt_inr(total_spend)}, "
            f"representing a {abs(yoy_pct):.1f}% {'increase' if yoy_pct >= 0 else 'decrease'} "
            f"compared to FY {year - 1} ({fmt_inr(prev_spend)}). Budget utilisation stood at "
            f"{util_pct:.1f}% of the approved {fmt_inr(total_budget)} allocation, reflecting "
            f"disciplined cost management across all departments.\n\n"
            f"A total of {total_invoices:,} invoices were processed through the Tijori AI platform, "
            f"with {rejected} rejections ({rejected / total_invoices * 100:.1f}% rejection rate) "
            f"and {flagged_high} high-severity risk flags identified by the AI fraud detection engine. "
            f"Automated three-level approval workflows ensured compliance with internal procurement policies.\n\n"
            f"Estimated tax obligations for the period include GST of {fmt_inr(gst_total)} and "
            f"TDS of {fmt_inr(tds_total)}, both calculated on vendor-paid expenditure. "
            f"Outstanding payables of {fmt_inr(pending_amount)} remain in the approval pipeline "
            f"and are expected to settle in the near term.\n\n"
            f"Looking ahead to FY {year + 1}, the organisation is well-positioned to maintain "
            f"expenditure discipline while investing in strategic growth initiatives. "
            f"Continued deployment of AI-driven financial controls will further strengthen "
            f"compliance and reduce processing cycle times."
        )
    if report_type == 'board':
        return (
            f"FY {year} Board Financial Briefing\n\n"
            f"Total expenditure for FY {year} was {fmt_inr(total_spend)} "
            f"({yoy_pct:+.1f}% vs prior year), against a budget of {fmt_inr(total_budget)} "
            f"({util_pct:.1f}% utilised). The board's attention is drawn to the "
            f"{flagged_high} high-risk invoice flags and {fmt_inr(pending_amount)} in "
            f"outstanding payables that require prompt resolution.\n\n"
            f"Risk exposure remains a key concern: {flagged_high} high-severity anomalies "
            f"were detected, requiring immediate review by the Finance and Audit committee. "
            f"Departments with budget overruns should present corrective action plans "
            f"at the next board meeting.\n\n"
            f"The board is recommended to approve a revised procurement policy for FY {year + 1} "
            f"with tighter vendor concentration limits and mandatory dual-approval for transactions "
            f"above the ₹5L threshold. AI-assisted budget forecasting should be embedded in "
            f"the annual planning cycle to improve utilisation accuracy."
        )
    return (
        f"How Did We Do in FY {year}?\n\n"
        f"This year, our company invested {fmt_inr(total_spend)} to keep the business running "
        f"and growing — that's every server, every supplier, every resource your teams rely on. "
        f"Compared to last year, our spending {'went up' if yoy_pct >= 0 else 'came down'} "
        f"by {abs(yoy_pct):.1f}%, which reflects the company's growth and increased activity.\n\n"
        f"We processed {total_invoices:,} invoices this year — that's roughly "
        f"{total_invoices // 52} per week, reviewed and approved through our finance system. "
        f"Every rupee was tracked, and our AI system helped catch {flagged_high} unusual "
        f"transactions to keep our finances clean and trustworthy.\n\n"
        f"As we head into FY {year + 1}, the company is in a strong position. "
        f"We've built better financial systems, our teams are more efficient, "
        f"and we're investing in the right places. Thank you for being part of this journey."
    )


class AnnualReportPDFView(APIView):
    """
    POST /api/v1/invoices/analytics/annual-report-pdf/
    Returns a WeasyPrint-generated PDF for the requested report type.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        year        = int(request.data.get('year', date.today().year))
        report_type = request.data.get('report_type', 'investor')
        if report_type not in ('investor', 'board', 'internal'):
            report_type = 'investor'

        prev_year  = year - 1
        year_start = date(year, 1, 1)
        year_end   = date(year, 12, 31)
        prev_start = date(prev_year, 1, 1)
        prev_end   = date(prev_year, 12, 31)

        all_exp = Expense.objects

        # ── spend totals ──────────────────────────────────────────────────────
        ytd      = all_exp.filter(invoice_date__year=year, _status__in=PAID_STATUSES)
        prev_ytd = all_exp.filter(invoice_date__year=prev_year, _status__in=PAID_STATUSES)

        total_spend = float(ytd.aggregate(t=Sum('total_amount'))['t'] or 0)
        prev_spend  = float(prev_ytd.aggregate(t=Sum('total_amount'))['t'] or 0)
        yoy_pct     = round((total_spend - prev_spend) / prev_spend * 100, 1) if prev_spend else 0

        # ── department performance ────────────────────────────────────────────
        dept_performance = []
        total_budget     = 0.0
        try:
            from apps.core.models import Department
            depts = Department.objects.all()
            for dept in depts:
                bq  = Budget.objects.filter(department=dept, fiscal_year=year, status='active')
                bmt = float(bq.aggregate(t=Sum('total_amount'))['t'] or 0)
                act = float(ytd.filter(submitted_by__department=dept).aggregate(t=Sum('total_amount'))['t'] or 0)
                prv = float(prev_ytd.filter(submitted_by__department=dept).aggregate(t=Sum('total_amount'))['t'] or 0)
                if bmt == 0 and act == 0:
                    continue
                var     = act - bmt
                util_d  = round(act / bmt * 100, 1) if bmt else 0
                yoy_d   = round((act - prv) / prv * 100, 1) if prv else 0
                status  = 'OVER_BUDGET' if var > 0 else ('ON_TRACK' if var == 0 else 'UNDER_BUDGET')
                total_budget += bmt
                dept_performance.append({
                    'department':        dept.name,
                    'budget':            round(bmt, 0),
                    'budget_fmt':        fmt_inr(bmt),
                    'actual':            round(act, 0),
                    'actual_fmt':        fmt_inr(act),
                    'variance':          round(var, 0),
                    'variance_fmt':      fmt_inr(abs(var)),
                    'variance_sign':     '+' if var > 0 else ('-' if var < 0 else ''),
                    'variance_color':    '#EF4444' if var > 0 else '#10B981',
                    'variance_pct':      round(var / bmt * 100, 1) if bmt else 0,
                    'prev_year_actual':  round(prv, 0),
                    'prev_fmt':          fmt_inr(prv),
                    'yoy_change_pct':    yoy_d,
                    'yoy_sign':          '+' if yoy_d >= 0 else '',
                    'yoy_color':         '#EF4444' if yoy_d > 5 else ('#10B981' if yoy_d < -5 else '#F59E0B'),
                    'status':            status,
                    'status_label':      status.replace('_', ' ').title(),
                    'status_color':      STATUS_COLORS.get(status, '#64748B'),
                    'status_bg':         '#FEE2E2' if status == 'OVER_BUDGET' else ('#D1FAE5' if status == 'ON_TRACK' else '#DBEAFE'),
                    'utilization_pct':   util_d,
                    'util_color':        '#EF4444' if util_d > 100 else ('#F59E0B' if util_d > 80 else '#10B981'),
                })
            dept_performance.sort(key=lambda x: x['actual'], reverse=True)
        except Exception as e:
            logger.warning('Dept performance error: %s', e)

        util_pct = round(total_spend / total_budget * 100, 1) if total_budget else 0

        # ── monthly trend ─────────────────────────────────────────────────────
        monthly_qs = (
            all_exp.filter(invoice_date__year=year)
            .annotate(month=TruncMonth('invoice_date'))
            .values('month')
            .annotate(
                paid=Sum('total_amount', filter=Q(_status__in=PAID_STATUSES)),
                pending=Sum('total_amount', filter=Q(_status__in=PENDING_STATUSES)),
                cnt=Count('id'),
            )
            .order_by('month')
        )
        monthly_labels = [r['month'].strftime('%b') for r in monthly_qs]
        monthly_paid   = [float(r['paid'] or 0) for r in monthly_qs]
        monthly_pending = [float(r['pending'] or 0) for r in monthly_qs]

        prev_monthly_qs = (
            all_exp.filter(invoice_date__year=prev_year)
            .annotate(month=TruncMonth('invoice_date'))
            .values('month')
            .annotate(paid=Sum('total_amount', filter=Q(_status__in=PAID_STATUSES)))
            .order_by('month')
        )
        prev_monthly_paid = [float(r['paid'] or 0) for r in prev_monthly_qs]
        # pad prior year to same length
        while len(prev_monthly_paid) < len(monthly_paid):
            prev_monthly_paid.append(0)
        prev_monthly_paid = prev_monthly_paid[:len(monthly_paid)]

        # ── quarterly breakdown ───────────────────────────────────────────────
        import calendar
        quarters = []
        prev_quarters = []
        for q in range(1, 5):
            qsm = (q - 1) * 3 + 1
            qs  = date(year, qsm, 1)
            _, ld = calendar.monthrange(year, qsm + 2)
            qe  = date(year, qsm + 2, ld)
            qsp = float(ytd.filter(invoice_date__gte=qs, invoice_date__lte=qe).aggregate(t=Sum('total_amount'))['t'] or 0)
            qcnt = ytd.filter(invoice_date__gte=qs, invoice_date__lte=qe).count()
            quarters.append({'quarter': f'Q{q}', 'spend': round(qsp, 0), 'spend_fmt': fmt_inr(qsp), 'invoices': qcnt})

            pqs  = date(prev_year, qsm, 1)
            _, pld = calendar.monthrange(prev_year, qsm + 2)
            pqe  = date(prev_year, qsm + 2, pld)
            pqsp = float(prev_ytd.filter(invoice_date__gte=pqs, invoice_date__lte=pqe).aggregate(t=Sum('total_amount'))['t'] or 0)
            prev_quarters.append(pqsp)

        # ── vendors ───────────────────────────────────────────────────────────
        top_vendors_qs = (
            ytd.exclude(vendor__isnull=True)
            .values('vendor__name', 'vendor__vendor_type')
            .annotate(total=Sum('total_amount'), cnt=Count('id'))
            .order_by('-total')[:10]
        )
        top_vendors = [
            {
                'name':    v['vendor__name'] or 'Unknown',
                'type':    v['vendor__vendor_type'] or 'General',
                'amount':  float(v['total'] or 0),
                'amount_fmt': fmt_inr(float(v['total'] or 0)),
                'invoices': v['cnt'],
                'pct':     round(float(v['total'] or 0) / total_spend * 100, 1) if total_spend else 0,
            }
            for v in top_vendors_qs
        ]

        # ── categories ────────────────────────────────────────────────────────
        top_cats_qs = (
            ytd.values('vendor__vendor_type')
            .annotate(total=Sum('total_amount'), cnt=Count('id'))
            .order_by('-total')[:8]
        )
        top_categories = [
            {
                'category': c['vendor__vendor_type'] or 'General',
                'amount':   float(c['total'] or 0),
                'amount_fmt': fmt_inr(float(c['total'] or 0)),
                'invoices': c['cnt'],
                'pct':      round(float(c['total'] or 0) / total_spend * 100, 1) if total_spend else 0,
            }
            for c in top_cats_qs
        ]

        # ── risk / compliance ─────────────────────────────────────────────────
        total_invoices = all_exp.filter(invoice_date__year=year).count()
        flagged_high   = all_exp.filter(invoice_date__year=year, anomaly_severity__in=['HIGH', 'CRITICAL']).count()
        flagged_medium = all_exp.filter(invoice_date__year=year, anomaly_severity='MEDIUM').count()
        rejected       = all_exp.filter(invoice_date__year=year, _status__in=['REJECTED', 'AUTO_REJECT']).count()
        pending_count  = all_exp.filter(invoice_date__year=year, _status__in=PENDING_STATUSES).count()
        pending_amount = float(
            all_exp.filter(invoice_date__year=year, _status__in=PENDING_STATUSES)
            .aggregate(t=Sum('total_amount'))['t'] or 0
        )

        # ── tax estimates ─────────────────────────────────────────────────────
        gst_total = (
            float(ytd.aggregate(t=Sum('cgst'))['t'] or 0) +
            float(ytd.aggregate(t=Sum('sgst'))['t'] or 0) +
            float(ytd.aggregate(t=Sum('igst'))['t'] or 0)
        )
        tds_total = float(ytd.aggregate(t=Sum('tds_amount'))['t'] or 0)
        if gst_total == 0:
            gst_total = total_spend * 0.18
        if tds_total == 0:
            tds_total = total_spend * 0.10

        clean_pct = round(
            (total_invoices - flagged_high - flagged_medium) / total_invoices * 100, 1
        ) if total_invoices else 100

        rejection_rate = round(rejected / total_invoices * 100, 1) if total_invoices else 0

        # ── board: decisions required ─────────────────────────────────────────
        decisions = []
        for d in dept_performance:
            if d['status'] == 'OVER_BUDGET':
                decisions.append({
                    'severity': 'high',
                    'title': f"{d['department']} — Over Budget",
                    'detail': (
                        f"Actual spend {d['actual_fmt']} exceeded budget {d['budget_fmt']} "
                        f"by {d['variance_fmt']} ({d['variance_pct']:+.1f}%). "
                        f"Requires budget review and variance justification."
                    ),
                })
        if pending_amount > total_spend * 0.10:
            decisions.append({
                'severity': 'medium',
                'title': f'Pending Payables — {fmt_inr(pending_amount)}',
                'detail': (
                    f"{pending_count} invoices totalling {fmt_inr(pending_amount)} are awaiting "
                    f"approval. Delayed settlement may impact vendor relationships and incur "
                    f"late payment charges."
                ),
            })
        if flagged_high > 0:
            decisions.append({
                'severity': 'high',
                'title': f'High-Risk Flags — {flagged_high} invoices',
                'detail': (
                    f"AI fraud detection identified {flagged_high} high-severity and "
                    f"{flagged_medium} medium-severity anomalies. Audit committee review "
                    f"and sign-off is required before year-end close."
                ),
            })
        if top_vendors:
            top3_pct = sum(v['pct'] for v in top_vendors[:3])
            if top3_pct > 60:
                decisions.append({
                    'severity': 'medium',
                    'title': f'Vendor Concentration Risk — {top3_pct:.1f}% in top 3',
                    'detail': (
                        f"Top 3 vendors account for {top3_pct:.1f}% of total procurement. "
                        f"This level of concentration poses supply chain and pricing risk. "
                        f"Recommend diversification strategy for FY {year + 1}."
                    ),
                })

        # ── internal: most efficient department (largest positive saving) ──────
        efficient_dept = None
        if dept_performance:
            under = [d for d in dept_performance if d['status'] == 'UNDER_BUDGET']
            if under:
                efficient_dept = max(under, key=lambda d: abs(d['variance']))
            else:
                efficient_dept = dept_performance[-1]

        # ── internal: health score ────────────────────────────────────────────
        score_components = [
            min(100, util_pct) if util_pct <= 100 else max(0, 200 - util_pct),
            clean_pct,
            max(0, 100 - rejection_rate * 5),
        ]
        health_score = round(sum(score_components) / len(score_components))
        health_color = '#10B981' if health_score >= 75 else ('#F59E0B' if health_score >= 50 else '#EF4444')
        health_label = 'Excellent' if health_score >= 85 else ('Good' if health_score >= 70 else ('Fair' if health_score >= 50 else 'Needs Attention'))

        # ── AI narrative ──────────────────────────────────────────────────────
        prompt_tpl = _PROMPTS[report_type]
        prompt = prompt_tpl.format(
            year=year,
            next_year=year + 1,
            total_spend=total_spend,
            prev_spend=prev_spend,
            yoy=yoy_pct,
            budget=total_budget,
            util=util_pct,
            invoices=total_invoices,
            rejected=rejected,
            flagged_high=flagged_high,
            flagged_medium=flagged_medium,
            gst=gst_total,
            tds=tds_total,
            pending=pending_amount,
            pending_cnt=pending_count,
        )
        fallback = _build_fallback(
            year, total_spend, prev_spend, yoy_pct, total_budget, util_pct,
            total_invoices, rejected, flagged_high, gst_total, tds_total,
            pending_amount, report_type,
        )
        ai_narrative = _ai_narrative(prompt, fallback)

        # ── build SVG charts ──────────────────────────────────────────────────
        chart_monthly = line_chart_svg(
            monthly_labels, monthly_paid, prev_monthly_paid,
            width=500, height=190, color='#E8783B',
        )
        chart_quarterly = grouped_bar_chart_svg(
            [q['quarter'] for q in quarters],
            [[q['spend'] for q in quarters], prev_quarters],
            series_colors=['#E8783B', '#CBD5E1'],
            width=340, height=190,
            series_labels=[f'FY {year}', f'FY {prev_year}'],
        )
        chart_dept = bar_chart_svg(
            [{'label': d['department'], 'value': d['actual'], 'color': '#3B82F6'}
             for d in dept_performance[:8]],
            width=360, label_width=120,
        )
        chart_vendors = bar_chart_svg(
            [{'label': v['name'], 'value': v['amount'], 'color': '#8B5CF6'}
             for v in top_vendors[:8]],
            width=460, label_width=150,
        )
        cat_colors = ['#E8783B', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16']
        chart_categories = donut_chart_svg(
            [{'label': c['category'], 'value': c['amount'],
              'color': cat_colors[i % len(cat_colors)]}
             for i, c in enumerate(top_categories[:6])],
            size=180,
        )
        risk_slices = [
            {'label': 'High Risk',   'value': flagged_high,   'color': '#EF4444'},
            {'label': 'Medium Risk', 'value': flagged_medium, 'color': '#F59E0B'},
            {'label': 'Clean',
             'value': max(0, total_invoices - flagged_high - flagged_medium),
             'color': '#10B981'},
        ]
        chart_risk = donut_chart_svg(risk_slices, size=160)

        dept_rings = [
            {
                'name': d['department'],
                'ring': progress_ring_svg(d['utilization_pct'], size=80, color=d['util_color']),
                'pct':  d['utilization_pct'],
                'status_color': d['status_color'],
            }
            for d in dept_performance[:6]
        ]

        health_ring = progress_ring_svg(health_score, size=120, color=health_color, label=health_label)

        # ── assemble context ──────────────────────────────────────────────────
        headline = {
            'total_spend':       round(total_spend, 0),
            'total_spend_fmt':   fmt_inr(total_spend),
            'prev_spend_fmt':    fmt_inr(prev_spend),
            'yoy_pct':           yoy_pct,
            'yoy_sign':          '+' if yoy_pct >= 0 else '',
            'yoy_color':         '#EF4444' if yoy_pct > 10 else ('#10B981' if yoy_pct < -5 else '#F59E0B'),
            'total_budget_fmt':  fmt_inr(total_budget),
            'util_pct':          util_pct,
            'util_color':        '#EF4444' if util_pct > 100 else ('#F59E0B' if util_pct > 85 else '#10B981'),
            'total_invoices':    total_invoices,
            'rejected_count':    rejected,
            'rejection_rate':    rejection_rate,
            'pending_count':     pending_count,
            'pending_amount_fmt': fmt_inr(pending_amount),
            'flagged_high':      flagged_high,
            'flagged_medium':    flagged_medium,
            'gst_fmt':           fmt_inr(gst_total),
            'tds_fmt':           fmt_inr(tds_total),
            'clean_pct':         clean_pct,
        }

        top3_vendor_pct = sum(v['pct'] for v in top_vendors[:3]) if top_vendors else 0
        conc_color = '#EF4444' if top3_vendor_pct > 60 else ('#F59E0B' if top3_vendor_pct > 40 else '#10B981')
        conc_label = 'High' if top3_vendor_pct > 60 else ('Moderate' if top3_vendor_pct > 40 else 'Low')

        context = {
            'year':               year,
            'prev_year':          prev_year,
            'generated_at':       date.today().strftime('%-d %B %Y'),
            'report_type':        report_type,
            'report_title':       _REPORT_TITLES[report_type],
            'confidentiality':    _CONFIDENTIALITY[report_type],
            'accent_color':       _ACCENT[report_type],
            'headline':           headline,
            'dept_performance':   dept_performance,
            'top_vendors':        top_vendors,
            'top_categories':     top_categories,
            'quarters':           quarters,
            'monthly_labels':     monthly_labels,
            'ai_narrative':       ai_narrative,
            'risk': {
                'total_invoices': total_invoices,
                'high_risk':      flagged_high,
                'medium_risk':    flagged_medium,
                'rejected':       rejected,
                'clean_pct':      clean_pct,
            },
            'decisions':          decisions,
            'efficient_dept':     efficient_dept,
            'health_score':       health_score,
            'health_label':       health_label,
            'health_color':       health_color,
            'health_ring':        health_ring,
            'top3_vendor_pct':    round(top3_vendor_pct, 1),
            'conc_color':         conc_color,
            'conc_label':         conc_label,
            # charts
            'chart_monthly':      chart_monthly,
            'chart_quarterly':    chart_quarterly,
            'chart_dept':         chart_dept,
            'chart_vendors':      chart_vendors,
            'chart_categories':   chart_categories,
            'chart_risk':         chart_risk,
            'dept_rings':         dept_rings,
        }

        template_map = {
            'investor': 'pdf/investor_report.html',
            'board':    'pdf/board_report.html',
            'internal': 'pdf/internal_report.html',
        }

        try:
            html_string = render_to_string(template_map[report_type], context)
            pdf = HTML(
                string=html_string,
                base_url=request.build_absolute_uri('/'),
            ).write_pdf()
        except Exception as e:
            logger.exception('WeasyPrint PDF generation failed: %s', e)
            return HttpResponse(
                f'PDF generation failed: {e}',
                status=500, content_type='text/plain',
            )

        filename = f'TijoriAI_{report_type.capitalize()}_Report_FY{year}.pdf'
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
