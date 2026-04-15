# apps/invoices/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("submit/", views.ExpenseSubmitView.as_view(), name="expense-submit"),
    path("queue/", views.ApprovalQueueView.as_view(), name="approval-queue"),
    path("<uuid:pk>/", views.ExpenseDetailView.as_view(), name="expense-detail"),
    path(
        "<uuid:pk>/action/", views.ApprovalActionView.as_view(), name="approval-action"
    ),
]
