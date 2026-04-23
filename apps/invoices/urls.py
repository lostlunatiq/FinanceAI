# apps/invoices/urls.py
from django.urls import path
from . import views, vendor_views, employee_views, budget_views, analytics_views

urlpatterns = [
    # ─── Original expense endpoints ──────────────────────────────
    path("submit/", views.ExpenseSubmitView.as_view(), name="expense-submit"),
    path("queue/", views.ApprovalQueueView.as_view(), name="approval-queue"),
    path("<uuid:pk>/", views.ExpenseDetailView.as_view(), name="expense-detail"),
    path("<uuid:pk>/action/", views.ApprovalActionView.as_view(), name="approval-action"),
    # ─── Vendor CRUD (Admin/Finance) ─────────────────────────────
    path("vendors/", vendor_views.VendorListView.as_view(), name="vendor-list"),
    path("vendors/create/", vendor_views.VendorCreateView.as_view(), name="vendor-create"),
    path("vendors/<uuid:pk>/", vendor_views.VendorDetailView.as_view(), name="vendor-detail"),
    path(
        "vendors/<uuid:pk>/activate/",
        vendor_views.VendorActivateView.as_view(),
        name="vendor-activate",
    ),
    # ─── Vendor Self-Service Portal ──────────────────────────────
    path("vendor/profile/", vendor_views.VendorProfileView.as_view(), name="vendor-profile"),
    path("vendor/bills/extract/", vendor_views.OCRExtractView.as_view(), name="ocr-extract"),
    path(
        "vendor/bills/extract/<str:task_id>/",
        vendor_views.OCRResultView.as_view(),
        name="ocr-result",
    ),
    path("vendor/bills/", vendor_views.VendorBillsView.as_view(), name="vendor-bills"),
    path(
        "vendor/bills/<uuid:pk>/",
        vendor_views.VendorBillDetailView.as_view(),
        name="vendor-bill-detail",
    ),
    # ─── Finance / Employee Approval ─────────────────────────────
    path("finance/bills/queue/", employee_views.FinanceQueueView.as_view(), name="finance-queue"),
    path(
        "finance/bills/<uuid:pk>/",
        employee_views.FinanceBillDetailView.as_view(),
        name="finance-bill-detail",
    ),
    path(
        "finance/bills/<uuid:pk>/approve/",
        employee_views.ApproveView.as_view(),
        name="finance-approve",
    ),
    path(
        "finance/bills/<uuid:pk>/reject/",
        employee_views.RejectView.as_view(),
        name="finance-reject",
    ),
    path(
        "finance/bills/<uuid:pk>/query/", employee_views.QueryView.as_view(), name="finance-query"
    ),
    path(
        "finance/bills/<uuid:pk>/respond-query/",
        employee_views.RespondQueryView.as_view(),
        name="finance-respond-query",
    ),
    path(
        "finance/bills/<uuid:pk>/settle/",
        employee_views.SettlePaymentView.as_view(),
        name="finance-settle-payment",
    ),
    path(
        "finance/bills/<uuid:pk>/scan-anomaly/",
        employee_views.ScanAnomalyView.as_view(),
        name="finance-scan-anomaly",
    ),
    path(
        "finance/scan-all/", employee_views.BulkScanAnomalyView.as_view(), name="finance-scan-all"
    ),
    # ─── Dashboard & Extra Modules ───────────────────────────────
    path("dashboard/stats/", vendor_views.DashboardStatsView.as_view(), name="dashboard-stats"),
    path(
        "finance/expenses/",
        employee_views.InternalExpenseListView.as_view(),
        name="finance-expenses",
    ),
    path("finance/anomalies/", employee_views.AnomalyListView.as_view(), name="finance-anomalies"),
    path(
        "finance/approval-authority/",
        employee_views.ApprovalAuthorityView.as_view(),
        name="finance-approval-authority",
    ),
    # ─── Budget Management ────────────────────────────────────────
    path("budgets/", budget_views.BudgetListView.as_view(), name="budget-list"),
    path("budgets/<uuid:pk>/", budget_views.BudgetDetailView.as_view(), name="budget-detail"),
    path(
        "budgets/<uuid:pk>/utilization/",
        budget_views.BudgetUtilizationView.as_view(),
        name="budget-utilization",
    ),
    # ─── Cash Flow Forecasting ───────────────────────────────────
    path(
        "forecasting/cashflow/",
        budget_views.CashFlowForecastView.as_view(),
        name="cashflow-forecast",
    ),
    path(
        "finance/bills/<uuid:pk>/mark-safe/",
        employee_views.MarkAnomalySafeView.as_view(),
        name="finance-mark-safe",
    ),
    path(
        "finance/bills/<uuid:pk>/escalate/",
        employee_views.EscalateAnomalyView.as_view(),
        name="finance-escalate",
    ),
    # ─── New Finance Automation Analytics ────────────────────────
    path("analytics/spend-intelligence/", analytics_views.SpendIntelligenceView.as_view(), name="spend-intelligence"),
    path("analytics/vendor-risk/",        analytics_views.VendorRiskScoreView.as_view(),   name="vendor-risk"),
    path("analytics/payment-prediction/", analytics_views.PaymentPredictionView.as_view(), name="payment-prediction"),
    path("analytics/budget-health/",      analytics_views.BudgetHealthView.as_view(),      name="budget-health"),
    path("analytics/gst-recon/",          analytics_views.GSTReconciliationView.as_view(), name="gst-recon"),
    path("analytics/tds-compliance/",     analytics_views.TDSComplianceView.as_view(),     name="tds-compliance"),
    path("analytics/working-capital/",    analytics_views.WorkingCapitalView.as_view(),    name="working-capital"),
    path("analytics/spend-velocity/",     analytics_views.SpendVelocityView.as_view(),     name="spend-velocity"),
    path("analytics/policy-compliance/",  analytics_views.PolicyComplianceView.as_view(),  name="policy-compliance"),
    path("analytics/supplier-scorecard/", analytics_views.SupplierScorecardView.as_view(), name="supplier-scorecard"),
    path("analytics/dept-variance/",      analytics_views.DepartmentVarianceView.as_view(),name="dept-variance"),
    path("analytics/po-match/",           analytics_views.POMatchStatusView.as_view(),     name="po-match"),
]
