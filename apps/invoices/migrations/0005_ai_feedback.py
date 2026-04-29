import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("invoices", "0004_expense_gstin"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AIFeedback",
            fields=[
                (
                    "id",
                    models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
                ),
                (
                    "task_type",
                    models.CharField(
                        choices=[
                            ("OCR", "OCR Extraction"),
                            ("ANOMALY", "Anomaly Detection"),
                            ("FORECAST", "Cash Flow Forecast"),
                        ],
                        max_length=10,
                    ),
                ),
                ("vendor_name", models.CharField(blank=True, max_length=255)),
                ("is_positive", models.BooleanField()),
                ("comment", models.TextField(blank=True)),
                ("field_corrections", models.JSONField(blank=True, null=True)),
                ("disputed_flags", models.JSONField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="ai_feedbacks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "expense",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="ai_feedbacks",
                        to="invoices.expense",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["task_type", "vendor_name"],
                        name="invoices_ai_task_ty_475c89_idx",
                    ),
                    models.Index(
                        fields=["task_type", "created_at"],
                        name="invoices_ai_task_ty_1d5b7d_idx",
                    ),
                ],
            },
        ),
    ]
