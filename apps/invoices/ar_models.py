# apps/invoices/ar_models.py
# ─── Accounts Receivable Models ───────────────────────────────────────────────

import uuid
from datetime import date

from django.db import models
from django.utils import timezone

from apps.core.models import User, FileRef


class ARCustomer(models.Model):
    """Customer master — companies that OWE US money."""

    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
        ("BLOCKED", "Blocked"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    gstin = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    payment_terms = models.CharField(max_length=20, default="Net 30")
    credit_limit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_ar_customers"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["name"]), models.Index(fields=["status"])]

    def __str__(self):
        return self.name


class ARInvoice(models.Model):
    """Invoice WE raise and send to a customer. They owe us this money."""

    STATUS_CHOICES = [
        ("UNPAID", "Unpaid"),
        ("PARTIALLY_PAID", "Partially Paid"),
        ("PAID", "Paid"),
        ("OVERDUE", "Overdue"),
        ("DISPUTED", "Disputed"),
        ("CANCELLED", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ref_no = models.CharField(max_length=30, unique=True, blank=True)  # AR-2026-00001
    customer = models.ForeignKey(ARCustomer, on_delete=models.PROTECT, related_name="ar_invoices")
    invoice_number = models.CharField(max_length=100, blank=True)  # Our internal invoice number
    issue_date = models.DateField(default=date.today)
    due_date = models.DateField(null=True, blank=True)
    payment_terms = models.CharField(max_length=20, default="Net 30")

    # Amounts
    pre_gst_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    cgst = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)

    description = models.TextField(blank=True)  # What service/product we provided
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="UNPAID")
    paid_at = models.DateTimeField(null=True, blank=True)

    # Uploaded invoice PDF (the invoice document we send to customer)
    invoice_file = models.ForeignKey(
        FileRef, null=True, blank=True, on_delete=models.SET_NULL, related_name="ar_invoices"
    )

    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_ar_invoices"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-issue_date"]
        indexes = [
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["due_date", "status"]),
            models.Index(fields=["issue_date"]),
        ]

    def save(self, *args, **kwargs):
        if not self.ref_no:
            from django.db.models import Max
            year = date.today().year
            last = ARInvoice.objects.filter(ref_no__startswith=f"AR-{year}-").aggregate(Max("ref_no"))["ref_no__max"]
            num = (int(last.split("-")[-1]) + 1) if last else 1
            self.ref_no = f"AR-{year}-{num:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ref_no} — {self.customer.name} — ₹{self.total_amount}"


class ARPayment(models.Model):
    """A payment received FROM a customer against an AR invoice."""

    PAYMENT_METHOD_CHOICES = [
        ("NEFT", "NEFT"),
        ("RTGS", "RTGS"),
        ("IMPS", "IMPS"),
        ("CHEQUE", "Cheque"),
        ("UPI", "UPI"),
        ("CASH", "Cash"),
        ("OTHER", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(ARInvoice, on_delete=models.CASCADE, related_name="payments")
    amount_received = models.DecimalField(max_digits=18, decimal_places=2)
    received_at = models.DateField(default=date.today)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default="NEFT")
    reference_number = models.CharField(max_length=100, blank=True)  # UTR / Cheque number
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="recorded_ar_payments"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self):
        return f"₹{self.amount_received} from {self.invoice.customer.name} on {self.received_at}"
