import uuid
import hashlib
import json
from django.db import models
from django.conf import settings


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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
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


class FileRef(models.Model):
    """
    File reference with SHA256 deduplication.
    Based on documentation from docs/plan/03-data-models.md
    """
    STORAGE_CLASS_CHOICES = [
        ('HOT', 'Hot - Frequently accessed'),
        ('WARM', 'Warm - Occasionally accessed'),
        ('COLD', 'Cold - Rarely accessed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sha256 = models.CharField(max_length=64, unique=True, db_index=True)
    bucket = models.CharField(max_length=50)  # 'bills', 'invoices', 'evidence', 'exports'
    key = models.CharField(max_length=500)
    size_bytes = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    original_filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    storage_class = models.CharField(
        max_length=20, 
        choices=STORAGE_CLASS_CHOICES, 
        default='HOT'
    )
    archive_after = models.DateField(null=True, blank=True)
    delete_after = models.DateField(null=True, blank=True)
    
    class Meta:
        db_table = "core_fileref"
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=['sha256']),
            models.Index(fields=['bucket']),
            models.Index(fields=['uploaded_by']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['storage_class']),
        ]
    
    def __str__(self):
        return f"{self.original_filename} ({self.bucket})"
    
    @property
    def file_size_human(self):
        """Return human-readable file size"""
        size = self.size_bytes
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0 or unit == 'GB':
                break
            size /= 1024.0
        return f"{size:.2f} {unit}"
    
    def is_archivable(self):
        """Check if file should be archived"""
        if not self.archive_after:
            return False
        from django.utils import timezone
        return timezone.now().date() >= self.archive_after
    
    def is_deletable(self):
        """Check if file should be deleted"""
        if not self.delete_after:
            return False
        from django.utils import timezone
        return timezone.now().date() >= self.delete_after
