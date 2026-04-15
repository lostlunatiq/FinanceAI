import uuid
from django.db import models
from apps.core.models import User, Department, AuditLog


EXPENSE_STATUS_CHOICES = [
    ("DRAFT", "Draft"),
    ("SUBMITTED", "Submitted"),
    ("AUTO_REJECT", "Auto Reject"),
    ("PENDING_L1", "Pending L1"),
    ("PENDING_L2", "Pending L2"),
    ("PENDING_HOD", "Pending HoD"),
    ("PENDING_FIN_L1", "Pending Finance L1"),
    ("PENDING_FIN_L2", "Pending Finance L2"),
    ("PENDING_FIN_HEAD", "Pending Finance Head"),
    ("QUERY_RAISED", "Query Raised"),
    ("REJECTED", "Rejected"),
    ("APPROVED", "Approved"),
    ("PENDING_D365", "Pending D365"),
    ("BOOKED_D365", "Booked in D365"),
    ("POSTED_D365", "Posted in D365"),
    ("PAID", "Paid"),
    ("WITHDRAWN", "Withdrawn"),
    ("EXPIRED", "Expired"),
]

VALID_TRANSITIONS = {
    "DRAFT": {"SUBMITTED", "WITHDRAWN"},
    "SUBMITTED": {"PENDING_L1", "AUTO_REJECT"},
    "PENDING_L1": {"PENDING_L2", "REJECTED", "QUERY_RAISED"},
    "PENDING_L2": {"PENDING_HOD", "REJECTED", "QUERY_RAISED"},
    "PENDING_HOD": {"PENDING_FIN_L1", "REJECTED", "QUERY_RAISED"},
    "PENDING_FIN_L1": {"PENDING_FIN_L2", "REJECTED", "QUERY_RAISED"},
    "PENDING_FIN_L2": {"PENDING_FIN_HEAD", "REJECTED", "QUERY_RAISED"},
    "PENDING_FIN_HEAD": {"APPROVED", "REJECTED", "QUERY_RAISED"},
    "QUERY_RAISED": {
        "PENDING_L1",
        "PENDING_L2",
        "PENDING_HOD",
        "PENDING_FIN_L1",
        "PENDING_FIN_L2",
        "PENDING_FIN_HEAD",
    },
    "APPROVED": {"PENDING_D365"},
    "PENDING_D365": {"BOOKED_D365"},
    "BOOKED_D365": {"POSTED_D365"},
    "POSTED_D365": {"PAID"},
    # Terminal states — no outbound transitions
    "AUTO_REJECT": set(),
    "REJECTED": set(),
    "PAID": set(),
    "WITHDRAWN": set(),
    "EXPIRED": set(),
}

STEP_TO_STATUS = {
    1: "PENDING_L1",
    2: "PENDING_L2",
    3: "PENDING_HOD",
    4: "PENDING_FIN_L1",
    5: "PENDING_FIN_L2",
    6: "PENDING_FIN_HEAD",
}

ROLE_FOR_STEP = {
    1: "EMP_L1",
    2: "EMP_L2",
    3: "DEPT_HEAD",
    4: "FIN_L1",
    5: "FIN_L2",
    6: "FIN_HEAD",
}


class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    name_normalized = models.CharField(
        max_length=200
    )  # lowercased+stripped, for fuzzy match
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    is_approved = models.BooleanField(default=False)
    vendor_type = models.CharField(max_length=30)  # saas, cloud_infra, logistics, etc.
    avg_invoice_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    invoice_count = models.IntegerField(default=0)
    last_renewal_date = models.DateField(null=True)
    last_seat_count = models.IntegerField(null=True)
    tds_section = models.CharField(max_length=10, blank=True)
    msme_registered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.name_normalized = self.name.lower().strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class FileRef(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    path = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ref_no = models.CharField(max_length=30, unique=True, blank=True)  # BILL-2026-00042
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    submitted_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="submitted_expenses"
    )
    filed_on_behalf = models.BooleanField(default=False)
    filer_on_behalf = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="filed_on_behalf_expenses",
    )

    # Invoice data
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField()
    pre_gst_amount = models.DecimalField(max_digits=18, decimal_places=2)
    cgst = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)
    tds_section = models.CharField(max_length=10, blank=True)
    tds_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    business_purpose = models.TextField()

    # State
    _status = models.CharField(
        max_length=30,
        choices=EXPENSE_STATUS_CHOICES,
        default="DRAFT",
        db_column="status",
    )
    current_step = models.IntegerField(null=True, blank=True)
    anomaly_severity = models.CharField(max_length=10, null=True, blank=True)

    # Files
    invoice_file = models.ForeignKey(
        FileRef,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invoice_for",
    )
    evidence_files = models.ManyToManyField(
        FileRef, related_name="evidence_for", blank=True
    )

    # D365
    d365_document_no = models.CharField(max_length=100, blank=True)
    d365_posted_at = models.DateTimeField(null=True)
    d365_paid_at = models.DateTimeField(null=True)
    d365_payment_utr = models.CharField(max_length=100, blank=True)

    replaces_bill = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL
    )

    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True)
    approved_at = models.DateTimeField(null=True)

    @property
    def status(self):
        return self._status

    @status.setter
    def status(self, value):
        raise AttributeError(
            "Do not set status directly. Use transition_to() in services.py."
        )

    def _force_status(self, value):
        """Internal only — called by transition_to() service."""
        self._status = value

    def save(self, *args, **kwargs):
        if not self.ref_no:
            # Auto-generate ref_no on first save
            count = Expense.objects.count() + 1
            self.ref_no = f"BILL-2026-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ref_no} — {self.vendor.name}"


class ExpenseApprovalStep(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense = models.ForeignKey(
        Expense, on_delete=models.CASCADE, related_name="approval_steps"
    )
    level = models.IntegerField()  # 1..6
    role_required = models.CharField(max_length=20)  # EMP_L1, EMP_L2, etc.
    assigned_to = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="assigned_steps"
    )
    actual_actor = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="acted_steps",
    )
    delegated_from = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="delegated_steps",
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("APPROVED", "Approved"),
            ("REJECTED", "Rejected"),
            ("QUERIED", "Queried"),
        ],
        default="PENDING",
    )
    sla_due_at = models.DateTimeField()
    decided_at = models.DateTimeField(null=True)
    decision_reason = models.TextField(blank=True)
    anomaly_override_reason = models.TextField(blank=True)


class ExpenseQuery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense = models.ForeignKey(
        Expense, on_delete=models.CASCADE, related_name="queries"
    )
    raised_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="raised_queries"
    )
    raised_at_step = models.IntegerField()
    question = models.TextField()
    response = models.TextField(blank=True)
    responded_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="responded_queries",
    )
    raised_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True)
    attachments = models.ManyToManyField(FileRef, blank=True)


class VendorL1Mapping(models.Model):
    vendor = models.ForeignKey(
        Vendor, on_delete=models.CASCADE, related_name="l1_mappings"
    )
    l1_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="vendor_mappings"
    )
    is_primary = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_mappings"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("vendor", "l1_user")
