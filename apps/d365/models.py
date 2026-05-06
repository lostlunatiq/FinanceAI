from django.db import models
from django.utils import timezone


class D365PurchaseOrder(models.Model):
    """
    Local cache of D365 Purchase Order (Table 38 Header)
    """
    bc_document_no = models.CharField(max_length=100, unique=True)  # e.g. "PI-0090"
    bc_document_type = models.IntegerField()  # Always 2 (Purchase Invoice)
    vendor_no = models.CharField(max_length=50)  # BC vendor ID e.g. "10000"
    vendor = models.ForeignKey('core.Vendor', null=True, on_delete=models.SET_NULL, related_name="d365_orders")
    location_code = models.CharField(max_length=20, blank=True)  # e.g. "BLUE"
    posting_date = models.DateField()
    document_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    service_month = models.DateField(null=True, blank=True)
    payment_terms = models.CharField(max_length=50, blank=True)  # e.g. "30 DAYS"
    project = models.CharField(max_length=50, blank=True)  # e.g. "3SC"
    project_location = models.CharField(max_length=100, blank=True)  # e.g. "Gurugram"
    vendor_invoice_no = models.CharField(max_length=100, blank=True)  # Any value
    synced_at = models.DateTimeField(default=timezone.now)  # Last BC sync timestamp
    is_open = models.BooleanField(default=True)  # False once BC closes/posts the PO

    class Meta:
        db_table = "d365_purchase_order"


class D365PurchaseLine(models.Model):
    """
    Local cache of D365 Purchase Line (Table 39 Line)
    """
    purchase_order = models.ForeignKey(D365PurchaseOrder, on_delete=models.CASCADE, related_name="lines")
    bc_line_no = models.IntegerField()  # e.g. 10000
    line_type = models.CharField(max_length=50, blank=True)  # e.g. "g/l account"
    account_no = models.CharField(max_length=50, blank=True)  # e.g. "8430"
    description = models.CharField(max_length=255, blank=True)  # e.g. "Travel"
    quantity = models.DecimalField(max_digits=18, decimal_places=6, blank=True, null=True)
    unit_cost = models.DecimalField(max_digits=18, decimal_places=6, blank=True, null=True)
    gst_group_code = models.CharField(max_length=20, blank=True)  # e.g. "0988"
    hsn_sac = models.CharField(max_length=20, blank=True)  # e.g. "0988001"
    gst_jurisdiction_type = models.CharField(max_length=50, blank=True)  # e.g. "Intrastate"
    gst_credit = models.CharField(max_length=50, blank=True)  # e.g. "Availment"
    project = models.CharField(max_length=50, blank=True)
    project_location = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "d365_purchase_line"
