from django.urls import path

from .views import InvoiceRetryView, PurchaseOrdersView

urlpatterns = [
    path('purchase-orders/', PurchaseOrdersView.as_view(), name='d365-purchase-orders'),
    path('invoices/<uuid:expense_id>/retry/', InvoiceRetryView.as_view(), name='d365-invoice-retry'),
]
