import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    """
    Replaces Django's default User.
    Auth is driven purely by employee_grade (integer) — no role strings.
    Grade map (convention, not enforced here):
        1 = employee
        2 = dept head
        3 = finance manager
        4 = finance admin
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="users"
    )
    employee_grade = models.PositiveIntegerField(default=1)

    # AbstractUser already provides:
    # username, email, first_name, last_name, password
    # is_active, is_staff, is_superuser
    # check_password(), set_password(), get_full_name()

    class Meta:
        ordering = ["first_name", "last_name"]
        db_table = "core_user"

    def __str__(self):
        return f"{self.get_full_name() or self.username} (G{self.employee_grade})"

    @property
    def grade_label(self) -> str:
        return {
            1: "Employee",
            2: "Department Head",
            3: "Finance Manager",
            4: "Finance Admin",
        }.get(self.employee_grade, f"Grade {self.employee_grade}")


# ─────────────────────────────────────────────
# Vendor
# ─────────────────────────────────────────────

VENDOR_STATUS_CHOICES = [
    ("PENDING", "Pending Approval"),
    ("ACTIVE", "Active"),
    ("SUSPENDED", "Suspended"),
    ("BLACKLISTED", "Blacklisted"),
]


class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    name_normalized = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    gstin = models.CharField(max_length=15, blank=True, unique=True, null=True)
    pan = models.CharField(max_length=10, blank=True)
    vendor_type = models.CharField(max_length=50, blank=True)  # e.g. MSME, Large, Foreign
    msme_registered = models.BooleanField(default=False)
    tds_section = models.CharField(max_length=10, blank=True)

    # Bank details
    bank_account_name = models.CharField(max_length=255, blank=True)
    bank_account_number = models.CharField(max_length=30, blank=True)
    bank_ifsc = models.CharField(max_length=15, blank=True)

    # Status
    is_approved = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=VENDOR_STATUS_CHOICES, default="PENDING")

    # Analytics — updated by signals or periodic tasks
    avg_invoice_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, null=True, blank=True)
    invoice_count = models.IntegerField(default=0)

    # Optional portal user link
    user = models.OneToOneField(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="vendor_profile"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.name_normalized = self.name.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.status}]"


# ─────────────────────────────────────────────
# FileRef
# ─────────────────────────────────────────────


class FileRef(models.Model):
    """
    Single table for all uploaded files.
    Linked from Expense.invoice_file, Expense.evidence_files, ExpenseQuery.attachments.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    path = models.CharField(max_length=500)  # relative to MEDIA_ROOT
    original_filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="uploaded_files"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_filename


# ─────────────────────────────────────────────
# AuditLog
# ─────────────────────────────────────────────


class AuditLog(models.Model):
    """
    Immutable audit trail for all state changes across the system.
    Written by services.py transition_expense() and auth views.
    Never deleted — append only.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs"
    )
    action = models.CharField(max_length=100)  # e.g. "expense.approved"
    entity_type = models.CharField(max_length=50)  # e.g. "Expense", "Vendor", "User"
    entity_id = models.UUIDField(null=True, blank=True)
    entity_display_name = models.CharField(max_length=255, blank=True, default="")

    # Snapshot of before/after state — masked of sensitive fields
    masked_before = models.JSONField(null=True, blank=True)
    masked_after = models.JSONField(null=True, blank=True)
    change_summary = models.CharField(max_length=500, blank=True, default="")

    # Request context for forensic tracing
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    request_id = models.CharField(max_length=64, blank=True, default="")

    # Flexible metadata for action-specific context (approval comments, export filters, etc.)
    metadata = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action"]),
            models.Index(fields=["request_id"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]

    def __str__(self):
        actor = self.user.get_full_name() if self.user else "System"
        return f"{actor} — {self.action} on {self.entity_type} [{self.created_at:%Y-%m-%d %H:%M}]"

    @property
    def diff(self) -> dict:
        """Return a simple field-level diff between masked_before and masked_after."""
        before = self.masked_before or {}
        after = self.masked_after or {}
        all_keys = set(before.keys()) | set(after.keys())
        result = {}
        for key in sorted(all_keys):
            b, a = before.get(key), after.get(key)
            if b != a:
                result[key] = {"before": b, "after": a}
        return result


class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_sessions")
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user.username} — {self.title or 'Untitled'} ({self.created_at:%Y-%m-%d %H:%M})"


class AICopilotLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ai_copilot_logs")
    session = models.ForeignKey(
        ChatSession, on_delete=models.CASCADE, null=True, blank=True, related_name="messages"
    )
    prompt = models.TextField()
    response = models.TextField()
    insight = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
