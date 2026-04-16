import uuid
import hashlib
import json
from django.contrib.auth.models import AbstractUser
from django.db import models


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    cost_centre_code = models.CharField(max_length=20, blank=True)
    head = models.ForeignKey(
        "User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="headed_dept",
    )
    budget_annual = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    budget_q1 = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    budget_q2 = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    budget_q3 = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    budget_q4 = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return str(self.name)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    azure_oid = models.CharField(max_length=100, unique=True, null=True, blank=True)
    role = models.CharField(
        max_length=30,
        choices=[
            ("finance_admin", "Finance Admin"),
            ("finance_manager", "Finance Manager"),
            ("dept_head", "Department Head"),
            ("employee", "Employee"),
            ("vendor", "Vendor"),
        ],
        default="employee",
    )

    @property
    def is_vendor(self):
        return self.role == "vendor"

    @property
    def is_finance(self):
        return self.role in ("finance_admin", "finance_manager")
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.SET_NULL
    )
    manager = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL
    )
    employee_grade = models.CharField(max_length=10, default="L1")

    class Meta:
        db_table = "core_user"


class AuditLogManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset()

    def create(self, **kwargs):
        # Compute hash chain: SHA256(prev_hash + this entry's content)
        last = self.order_by("-created_at").first()
        prev_hash = last.entry_hash if last else "0" * 64

        # Build deterministic content string before saving
        content = json.dumps(
            {
                "action": kwargs.get("action"),
                "entity_type": kwargs.get("entity_type"),
                "entity_id": str(kwargs.get("entity_id", "")),
                "masked_after": kwargs.get("masked_after"),
            },
            sort_keys=True,
        )

        entry_hash = hashlib.sha256(f"{prev_hash}{content}".encode()).hexdigest()

        kwargs["prev_hash"] = prev_hash
        kwargs["entry_hash"] = entry_hash
        return super().create(**kwargs)


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=80)  # e.g. 'expense.submitted'
    entity_type = models.CharField(max_length=60)
    entity_id = models.UUIDField(null=True)
    masked_before = models.JSONField(null=True)  # NEVER plaintext financial data
    masked_after = models.JSONField(null=True)
    ip_address = models.GenericIPAddressField(null=True)
    prev_hash = models.CharField(max_length=64, default="0" * 64)
    entry_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = AuditLogManager()

    def save(self, *args, **kwargs):
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise PermissionError("AuditLog entries are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("AuditLog entries cannot be deleted.")

    class Meta:
        db_table = "core_auditlog"
        ordering = ["created_at"]
