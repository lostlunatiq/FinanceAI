from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("invoices", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="expensequery",
            name="ai_suggestion",
            field=models.TextField(blank=True),
        ),
        migrations.CreateModel(
            name="ApprovalAuthority",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("grade", models.PositiveIntegerField(unique=True)),
                ("label", models.CharField(max_length=100)),
                ("approval_limit", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True)),
                ("settlement_limit", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True)),
                ("monthly_approval_budget", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True)),
                ("monthly_settlement_budget", models.DecimalField(blank=True, decimal_places=2, max_digits=18, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="updated_approval_authorities",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["grade"]},
        ),
    ]
