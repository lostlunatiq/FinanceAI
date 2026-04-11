from django.db import models
from django.contrib.auth.models import AbstractUser
from clickhouse_backend import models as ch_models


class Department(models.Model):
    name = models.CharField(max_length=50, unique=True)


class Employee(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    level = models.IntegerField(default=1)


class Invoice(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        PENDING_D365 = "PENDING_D365", "Pending D365 Integration"

    submitter = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="submitted_invoices"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUBMITTED
    )
    current_step_index = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class InvoiceEvent(ch_models.ClickhouseModel):
    class Action(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved Step"
        REJECTED = "REJECTED", "Rejected"
        DELEGATED = "DELEGATED", "Delegated"
        D365_SYNC = "D365_SYNC", "D365 Sync Attempt"

    invoice = ch_models.UInt64Field(db_index=True)
    actor = ch_models.UInt64Field(null=True)

    action = models.CharField(max_length=20, choices=Action.choices)
    idempotency_key = models.CharField(max_length=256, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Invoice Event"
        engine = ch_models.MergeTree(order_by=("timestamp",))
