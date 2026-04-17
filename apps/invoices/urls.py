# apps/invoices/urls.py
from django.urls import path
from . import views, vendor_views, employee_views, budget_views

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
    path("vendors/<uuid:pk>/activate/", vendor_views.VendorActivateView.as_view(), name="vendor-activate"),

    # ─── Vendor Self-Service Portal ──────────────────────────────
    path("vendor/profile/", vendor_views.VendorProfileView.as_view(), name="vendor-profile"),
    path("vendor/bills/", vendor_views.VendorBillsView.as_view(), name="vendor-bills"),
    path("vendor/bills/<uuid:pk>/", vendor_views.VendorBillDetailView.as_view(), name="vendor-bill-detail"),
    path("vendor/bills/extract/", vendor_views.OCRExtractView.as_view(), name="ocr-extract"),
    path("vendor/bills/extract/<str:task_id>/", vendor_views.OCRResultView.as_view(), name="ocr-result"),

    # ─── Finance / Employee Approval ─────────────────────────────
    path("finance/bills/queue/", employee_views.FinanceQueueView.as_view(), name="finance-queue"),
    path("finance/bills/all/", employee_views.FinanceAllBillsView.as_view(), name="finance-all-bills"),
    path("finance/bills/<uuid:pk>/", employee_views.FinanceBillDetailView.as_view(), name="finance-bill-detail"),
    path("finance/bills/<uuid:pk>/approve/", employee_views.ApproveView.as_view(), name="finance-approve"),
    path("finance/bills/<uuid:pk>/reject/", employee_views.RejectView.as_view(), name="finance-reject"),
    path("finance/bills/<uuid:pk>/query/", employee_views.QueryView.as_view(), name="finance-query"),
    path("finance/bills/<uuid:pk>/respond-query/", employee_views.RespondQueryView.as_view(), name="finance-respond-query"),
    path("finance/bills/<uuid:pk>/mark-paid/", employee_views.MarkPaidView.as_view(), name="finance-mark-paid"),

    # ─── Dashboard & Extra Modules ───────────────────────────────
    path("dashboard/stats/", vendor_views.DashboardStatsView.as_view(), name="dashboard-stats"),
    path("finance/expenses/", employee_views.InternalExpenseListView.as_view(), name="finance-expenses"),
    path("finance/anomalies/", employee_views.AnomalyListView.as_view(), name="finance-anomalies"),

    # ─── Budget Management ────────────────────────────────────────
    path("budgets/", budget_views.BudgetListView.as_view(), name="budget-list"),
    path("budgets/<uuid:pk>/", budget_views.BudgetDetailView.as_view(), name="budget-detail"),
    path("budgets/<uuid:pk>/utilization/", budget_views.BudgetUtilizationView.as_view(), name="budget-utilization"),

    # ─── Cash Flow Forecasting ───────────────────────────────────
    path("forecasting/cashflow/", budget_views.CashFlowForecastView.as_view(), name="cashflow-forecast"),
]
