import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_alter_user_role"),
        ("invoices", "0005_add_budget_model"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Add cfo to User.role choices (AlterField on core_user)
        migrations.RunSQL(
            "SELECT 1",  # no-op: Django stores choices only in Python; column type is varchar
            reverse_sql="SELECT 1",
        ),

        # 2. Add payment fields to Expense
        migrations.AddField(
            model_name="expense",
            name="payment_initiated_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="initiated_payments",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="expense",
            name="payment_initiated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="expense",
            name="payment_due_date",
            field=models.DateField(blank=True, null=True),
        ),

        # 3. Add PENDING_CFO and PAYMENT_INITIATED to _status choices
        migrations.AlterField(
            model_name="expense",
            name="_status",
            field=models.CharField(
                choices=[
                    ("DRAFT", "Draft"),
                    ("SUBMITTED", "Submitted"),
                    ("AUTO_REJECT", "Auto Reject"),
                    ("PENDING_L1", "Pending L1"),
                    ("PENDING_L2", "Pending L2"),
                    ("PENDING_HOD", "Pending HoD"),
                    ("PENDING_FIN_L1", "Pending Finance L1"),
                    ("PENDING_FIN_L2", "Pending Finance L2"),
                    ("PENDING_FIN_HEAD", "Pending Finance Head"),
                    ("PENDING_CFO", "Pending CFO"),
                    ("QUERY_RAISED", "Query Raised"),
                    ("REJECTED", "Rejected"),
                    ("APPROVED", "Approved"),
                    ("PAYMENT_INITIATED", "Payment Initiated"),
                    ("PENDING_D365", "Pending D365"),
                    ("BOOKED_D365", "Booked in D365"),
                    ("POSTED_D365", "Posted in D365"),
                    ("PAID", "Paid"),
                    ("WITHDRAWN", "Withdrawn"),
                    ("EXPIRED", "Expired"),
                ],
                db_column="status",
                default="DRAFT",
                max_length=30,
            ),
        ),

        # 4. Create ExpensePolicyLimit model
        migrations.CreateModel(
            name="ExpensePolicyLimit",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("EMP_L1", "L1 Employee Approver"),
                            ("EMP_L2", "L2 Employee Approver"),
                            ("DEPT_HEAD", "Department Head"),
                            ("FIN_L1", "Finance L1 (Manager)"),
                            ("FIN_L2", "Finance L2 (Sr. Manager)"),
                            ("FIN_HEAD", "Finance Head / Admin"),
                            ("CFO", "CFO"),
                        ],
                        max_length=20,
                        unique=True,
                    ),
                ),
                (
                    "max_amount",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Maximum amount (INR) this role can be the final approver for.",
                        max_digits=18,
                    ),
                ),
                ("currency", models.CharField(default="INR", max_length=3)),
                ("is_active", models.BooleanField(default=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "set_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="set_policy_limits",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["role"]},
        ),
    ]
