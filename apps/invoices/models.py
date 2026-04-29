import uuid
from django.db import models
from apps.core.models import User, Department, AuditLog, Vendor, FileRef, VENDOR_STATUS_CHOICES


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
    "PENDING_L1": {"PENDING_L2", "PENDING_HOD", "REJECTED", "QUERY_RAISED"},
    "PENDING_L2": {"PENDING_HOD", "REJECTED", "QUERY_RAISED"},
    "PENDING_HOD": {"PENDING_FIN_L1", "PENDING_FIN_L2", "REJECTED", "QUERY_RAISED"},
    "PENDING_FIN_L1": {"PENDING_FIN_L2", "REJECTED", "QUERY_RAISED"},
    "PENDING_FIN_L2": {"PENDING_FIN_HEAD", "REJECTED", "QUERY_RAISED"},
    "PENDING_FIN_HEAD": {"APPROVED", "PENDING_CFO", "REJECTED", "QUERY_RAISED"},
    "PENDING_CFO": {"APPROVED", "REJECTED", "QUERY_RAISED"},
    "QUERY_RAISED": {
        "PENDING_L1",
        "PENDING_L2",
        "PENDING_HOD",
        "PENDING_FIN_L1",
        "PENDING_FIN_L2",
        "PENDING_FIN_HEAD",
        "PENDING_CFO",
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

GRADE_FOR_STEP = {
    1: 1,  # any employee
    2: 1,  # any employee
    3: 2,  # dept head equivalent
    4: 3,  # finance manager equivalent
    5: 3,  # finance manager equivalent
    6: 4,  # finance admin equivalent
}


class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ref_no = models.CharField(max_length=30, unique=True, blank=True)  # BILL-2026-00042
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="expenses")
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
    invoice_number = models.CharField(max_length=100, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    pre_gst_amount = models.DecimalField(max_digits=18, decimal_places=2)
    cgst = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)
    gstin = models.CharField(max_length=15, blank=True)
    tds_section = models.CharField(max_length=10, blank=True)
    tds_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    business_purpose = models.TextField(blank=True)

    # State
    _status = models.CharField(
        max_length=30,
        choices=EXPENSE_STATUS_CHOICES,
        default="DRAFT",
        db_column="status",
    )
    current_step = models.IntegerField(null=True, blank=True)
    anomaly_severity = models.CharField(max_length=10, null=True, blank=True)

    # Version tracking
    version = models.IntegerField(default=1)

    # Files
    invoice_file = models.ForeignKey(
        FileRef,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invoice_for",
    )
    evidence_files = models.ManyToManyField(FileRef, related_name="evidence_for", blank=True)

    # OCR data
    ocr_raw = models.JSONField(null=True, blank=True)
    ocr_confidence = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    ocr_task_id = models.CharField(max_length=100, blank=True)

    # D365
    d365_document_no = models.CharField(max_length=100, blank=True)
    d365_posted_at = models.DateTimeField(null=True)
    d365_paid_at = models.DateTimeField(null=True)
    d365_payment_utr = models.CharField(max_length=100, blank=True)

    replaces_bill = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True)
    approved_at = models.DateTimeField(null=True)

    @property
    def status(self):
        return self._status

    @status.setter
    def status(self, value):
        raise AttributeError("Do not set status directly. Use transition_to() in services.py.")

    def _force_status(self, value):
        """Internal only — called by transition_to() service."""
        self._status = value

    def save(self, *args, **kwargs):
        if not self.ref_no:
            from django.db.models import Max
            from django.utils import timezone
            year = timezone.now().year
            last = Expense.objects.filter(
                ref_no__startswith=f"BILL-{year}-"
            ).aggregate(Max("ref_no"))["ref_no__max"]
            num = (int(last.split("-")[-1]) + 1) if last else 1
            self.ref_no = f"BILL-{year}-{num:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ref_no} — {self.vendor.name}"


class ExpenseApprovalStep(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name="approval_steps")
    level = models.IntegerField()  # 1..6
    grade_required = models.PositiveIntegerField(default=1)
    assigned_to = models.ForeignKey(User, on_delete=models.PROTECT, related_name="assigned_steps")
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
    sla_due_at = models.DateTimeField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True)
    decision_reason = models.TextField(blank=True)
    anomaly_override_reason = models.TextField(blank=True)


class ExpenseQuery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name="queries")
    raised_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="raised_queries")
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
    ai_suggestion = models.TextField(blank=True)


class ApprovalAuthority(models.Model):
    """
    Per-grade approval and settlement controls.
    Finance Admin (grade 4) and CFO manage these values.
    """

    grade = models.PositiveIntegerField(unique=True)
    label = models.CharField(max_length=100)
    approval_limit = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    settlement_limit = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    monthly_approval_budget = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    monthly_settlement_budget = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    updated_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_approval_authorities",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["grade"]

    def __str__(self):
        return f"{self.label} (G{self.grade})"


class Budget(models.Model):
    """Department / project budget with threshold alerts."""

    PERIOD_CHOICES = [
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("semi_annual", "Semi-Annual"),
        ("annual", "Annual"),
    ]
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("locked", "Locked"),
        ("closed", "Closed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    department = models.ForeignKey(
        "core.Department", null=True, blank=True, on_delete=models.SET_NULL
    )
    fiscal_year = models.IntegerField(default=2026)
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES, default="quarterly")
    start_date = models.DateField()
    end_date = models.DateField()
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    warning_threshold = models.IntegerField(default=80)  # % at which amber alert fires
    critical_threshold = models.IntegerField(default=95)  # % at which red alert fires
    created_by = models.ForeignKey(
        "core.User", null=True, on_delete=models.SET_NULL, related_name="created_budgets"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.fiscal_year})"

    @property
    def spent_amount(self):
        """Calculate actual spend from approved/paid expenses for this dept+period."""
        from django.db.models import Sum

        qs = Expense.objects.filter(
            _status__in=["APPROVED", "PENDING_D365", "BOOKED_D365", "POSTED_D365", "PAID"],
            invoice_date__gte=self.start_date,
            invoice_date__lte=self.end_date,
        )
        if self.department:
            qs = qs.filter(submitted_by__department=self.department)
        result = qs.aggregate(total=Sum("total_amount"))["total"]
        return float(result or 0)

    @property
    def utilization_pct(self):
        if float(self.total_amount) <= 0:
            return 0
        return round((self.spent_amount / float(self.total_amount)) * 100, 1)

    @property
    def alert_level(self):
        pct = self.utilization_pct
        if pct >= self.critical_threshold:
            return "CRITICAL"
        elif pct >= self.warning_threshold:
            return "WARNING"
        return "OK"


class VendorL1Mapping(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="l1_mappings")
    l1_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="vendor_mappings")
    is_primary = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_mappings"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("vendor", "l1_user")
