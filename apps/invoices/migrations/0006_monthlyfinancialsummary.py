from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("invoices", "0005_ai_feedback"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MonthlyFinancialSummary",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("month_key", models.CharField(db_index=True, max_length=7, unique=True)),
                ("month_start", models.DateField()),
                ("summary_payload", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("generated_at", models.DateTimeField(auto_now=True)),
                (
                    "generated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="generated_monthly_summaries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-month_start"],
                "indexes": [models.Index(fields=["month_start"], name="invoices_mo_month_s_e26ff5_idx")],
            },
        ),
    ]
