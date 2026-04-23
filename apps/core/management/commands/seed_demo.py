"""
Management command to seed demo data for FinanceAI.

Usage:
    python manage.py seed_demo
"""

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Seed demo data for FinanceAI"

    def handle(self, *args, **options):
        from apps.core.models import User, Department, AuditLog
        from apps.invoices.models import (
            Expense,
            ExpenseApprovalStep,
            Budget,
        )
        from apps.core.models import Vendor

        self.stdout.write("🌱 Seeding demo data...")

        # ─── Departments ──────────────────────────────────────────────────────
        # ✅ Department has only id + name — no budget_annual or head
        engineering, _ = Department.objects.get_or_create(name="Engineering")
        finance, _ = Department.objects.get_or_create(name="Finance")
        operations, _ = Department.objects.get_or_create(name="Operations")
        self.stdout.write("  ✅ Departments ready")

        # ─── Users ───────────────────────────────────────────────────────────
        # ✅ employee_grade is an integer (1–4), no role field
        # Grade map:
        #   1 = Employee
        #   2 = Dept Head
        #   3 = Finance Manager
        #   4 = Finance Admin
        user_specs = [
            # username         full_name              grade  dept          superuser
            ("vendor1", "Rajesh Kumar", 1, None, False),
            ("vendor2", "Priya Sharma", 1, None, False),
            ("employee1", "Amit Patel", 1, engineering, False),
            ("l1_approver", "Neha Gupta", 1, engineering, False),
            ("hod", "Suresh Reddy", 2, engineering, False),
            ("fin_manager", "Anita Desai", 3, finance, False),
            ("fin_admin", "Vikram Singh", 4, finance, False),
            ("cfo", "Kavita Menon", 4, finance, True),
        ]

        users = {}
        for username, full_name, grade, dept, is_super in user_specs:
            first, last = full_name.split(" ", 1)
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@demo.financeai.in",
                    "first_name": first,
                    "last_name": last,
                    "employee_grade": grade,  # ✅ integer, not string
                    "department": dept,
                    "is_active": True,
                    "is_superuser": is_super,
                    "is_staff": is_super,
                },
            )
            if created:
                user.set_password("demo1234")
                user.save()
                self.stdout.write(f"  ✅ Created user: {username} (G{grade})")
            else:
                # Ensure superuser flag is always correct even if already existed
                if is_super and not user.is_superuser:
                    user.is_superuser = True
                    user.is_staff = True
                    user.save(update_fields=["is_superuser", "is_staff"])
                self.stdout.write(f"  ⏩ User exists: {username}")
            users[username] = user

        # ─── Vendors ─────────────────────────────────────────────────────────
        # ✅ no name_normalized, status uses ACTIVE not PENDING_APPROVAL
        vendor_specs = [
            {
                "name": "TechServe Solutions Pvt Ltd",
                "gstin": "27AABCT1234A1Z5",
                "pan": "AABCT1234A",
                "email": "billing@techserve.in",
                "vendor_type": "saas",
                "avg_invoice_amount": Decimal("150000.00"),
                "is_approved": True,
                "status": "ACTIVE",
                "user": users["vendor1"],
            },
            {
                "name": "CloudMatrix India Pvt Ltd",
                "gstin": "06AABCC5678D1Z9",
                "pan": "AABCC5678D",
                "email": "accounts@cloudmatrix.in",
                "vendor_type": "cloud_infra",
                "avg_invoice_amount": Decimal("350000.00"),
                "is_approved": True,
                "status": "ACTIVE",
                "user": users["vendor2"],
            },
            {
                "name": "SwiftLogistics Co",
                "gstin": "09AABCS9012F1Z3",
                "pan": "AABCS9012F",
                "email": "finance@swiftlogistics.in",
                "vendor_type": "logistics",
                "avg_invoice_amount": Decimal("75000.00"),
                "is_approved": False,
                "status": "PENDING",  # ✅ valid choice from VENDOR_STATUS_CHOICES
                "user": None,
            },
        ]

        vendors = {}
        for spec in vendor_specs:
            vendor_user = spec.pop("user")
            vendor, created = Vendor.objects.get_or_create(
                name=spec["name"],
                defaults={
                    **spec,
                    "user": vendor_user,
                    "msme_registered": True,
                    "bank_account_name": spec["name"],
                    "bank_account_number": f"XXXX{str(uuid4())[:4].upper()}",
                    "bank_ifsc": "SBIN0001234",
                },
            )
            if created:
                self.stdout.write(f"  ✅ Created vendor: {vendor.name}")
            else:
                self.stdout.write(f"  ⏩ Vendor exists: {vendor.name}")
            vendors[spec["name"]] = vendor

        # ─── Expenses ────────────────────────────────────────────────────────
        techserve = vendors["TechServe Solutions Pvt Ltd"]
        cloudmatrix = vendors["CloudMatrix India Pvt Ltd"]

        expense_specs = [
            {
                "ref_no": "BILL-2026-00001",
                "vendor": techserve,
                "invoice_number": "TS-INV-2026-042",
                "invoice_date": date(2026, 3, 15),
                "pre_gst_amount": Decimal("100000.00"),
                "cgst": Decimal("9000.00"),
                "sgst": Decimal("9000.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("118000.00"),
                "business_purpose": "Annual SaaS licence renewal — DevOps monitoring suite",
                "target_status": "PAID",
                "submitted_by": users["employee1"],
            },
            {
                "ref_no": "BILL-2026-00005",
                "vendor": cloudmatrix,
                "invoice_number": "CM-INV-2026-101",
                "invoice_date": date(2026, 4, 10),
                "pre_gst_amount": Decimal("250000.00"),
                "cgst": Decimal("22500.00"),
                "sgst": Decimal("22500.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("295000.00"),
                "business_purpose": "AWS infrastructure — Q2 2026 compute & storage",
                "target_status": "PENDING_L1",
                "submitted_by": users["employee1"],
            },
            {
                "ref_no": "BILL-2026-00008",
                "vendor": techserve,
                "invoice_number": "TS-INV-2026-056",
                "invoice_date": date(2026, 4, 5),
                "pre_gst_amount": Decimal("175000.00"),
                "cgst": Decimal("15750.00"),
                "sgst": Decimal("15750.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("206500.00"),
                "business_purpose": "Custom API integration development",
                "target_status": "PENDING_HOD",
                "submitted_by": users["employee1"],
            },
            {
                "ref_no": "BILL-2026-00012",
                "vendor": cloudmatrix,
                "invoice_number": "CM-INV-2026-115",
                "invoice_date": date.today(),
                "pre_gst_amount": Decimal("50000.00"),
                "cgst": Decimal("4500.00"),
                "sgst": Decimal("4500.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("59000.00"),
                "business_purpose": "Cloud consulting services",
                "target_status": "SUBMITTED",
                "submitted_by": users["vendor2"],
            },
            {
                "ref_no": "BILL-2026-00003",
                "vendor": techserve,
                "invoice_number": "TS-INV-2026-039",
                "invoice_date": date(2026, 2, 20),
                "pre_gst_amount": Decimal("500000.00"),
                "cgst": Decimal("45000.00"),
                "sgst": Decimal("45000.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("590000.00"),
                "business_purpose": "Hardware procurement — servers",
                "target_status": "REJECTED",
                "submitted_by": users["employee1"],
            },
        ]

        # Approval step config — (level, assigned_user, grade_required)
        # ✅ grade_required is integer, not role_required string
        def get_step_configs(users):
            return [
                (1, users["l1_approver"], 1),
                (2, users["l1_approver"], 1),
                (3, users["hod"], 2),
                (4, users["fin_manager"], 3),
                (5, users["fin_manager"], 3),
                (6, users["fin_admin"], 4),
            ]

        for spec in expense_specs:
            target_status = spec.pop("target_status")

            expense, created = Expense.objects.get_or_create(
                ref_no=spec["ref_no"],
                defaults={
                    **{k: v for k, v in spec.items() if k != "ref_no"},
                    "_status": target_status,
                    "version": 1,
                    "submitted_at": timezone.now() - timedelta(days=5),
                    "approved_at": timezone.now() if target_status == "PAID" else None,
                    "d365_document_no": f"D365-{spec['invoice_number']}"
                    if target_status == "PAID"
                    else "",
                    "d365_paid_at": timezone.now() if target_status == "PAID" else None,
                    "d365_payment_utr": f"UTR-{spec['invoice_number']}"
                    if target_status == "PAID"
                    else "",
                },
            )

            if created:
                for level, assigned, grade_req in get_step_configs(users):
                    # Determine step status based on expense's target state
                    if target_status in ("PAID", "APPROVED"):
                        step_status = "APPROVED"
                    elif target_status == "REJECTED":
                        # Level 1 approved, level 2 rejected, rest pending
                        step_status = (
                            "APPROVED" if level == 1 else "REJECTED" if level == 2 else "PENDING"
                        )
                    elif target_status == "PENDING_HOD":
                        step_status = "APPROVED" if level <= 2 else "PENDING"
                    elif target_status == "PENDING_L1":
                        step_status = "PENDING"
                    else:
                        step_status = "PENDING"

                    ExpenseApprovalStep.objects.create(
                        expense=expense,
                        level=level,
                        grade_required=grade_req,  # ✅ integer, was role_required=string
                        assigned_to=assigned,
                        status=step_status,
                        decided_at=timezone.now() if step_status != "PENDING" else None,
                    )

                self.stdout.write(f"  ✅ Created expense: {expense.ref_no} ({target_status})")
            else:
                self.stdout.write(f"  ⏩ Expense exists: {expense.ref_no}")

        # ─── Budgets ─────────────────────────────────────────────────────────
        self.stdout.write("🌱 Seeding budgets...")

        budget_specs = [
            {
                "name": "Engineering Q2 2026",
                "department": engineering,
                "fiscal_year": 2026,
                "period": "quarterly",
                "start_date": date(2026, 4, 1),
                "end_date": date(2026, 6, 30),
                "total_amount": Decimal("2400000.00"),
                "warning_threshold": 80,
                "critical_threshold": 95,
            },
            {
                "name": "Marketing H1 2026",
                "department": operations,
                "fiscal_year": 2026,
                "period": "semi_annual",
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 6, 30),
                "total_amount": Decimal("1200000.00"),
                "warning_threshold": 75,
                "critical_threshold": 90,
            },
            {
                "name": "Operations Annual 2026",
                "department": operations,
                "fiscal_year": 2026,
                "period": "annual",
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 12, 31),
                "total_amount": Decimal("3000000.00"),
                "warning_threshold": 80,
                "critical_threshold": 95,
            },
        ]

        for spec in budget_specs:
            b, created = Budget.objects.get_or_create(
                name=spec["name"],
                defaults={**spec, "status": "active", "created_by": users["fin_admin"]},
            )
            if created:
                self.stdout.write(f"  ✅ Created budget: {b.name}")
            else:
                self.stdout.write(f"  ⏩ Budget exists: {b.name}")

        # ─── Audit Log ───────────────────────────────────────────────────────
        from apps.core.models import AuditLog

        if AuditLog.objects.count() == 0:
            self.stdout.write("🌱 Creating audit log entries...")
            sample_actions = [
                (
                    "expense.submitted",
                    "Expense",
                    users["vendor1"],
                    {"ref_no": "BILL-2026-00001", "status": "SUBMITTED"},
                ),
                (
                    "expense.approved",
                    "Expense",
                    users["l1_approver"],
                    {"ref_no": "BILL-2026-00001", "status": "PENDING_HOD"},
                ),
                (
                    "expense.approved",
                    "Expense",
                    users["hod"],
                    {"ref_no": "BILL-2026-00001", "status": "PENDING_FIN_L1"},
                ),
                (
                    "expense.approved",
                    "Expense",
                    users["fin_manager"],
                    {"ref_no": "BILL-2026-00001", "status": "APPROVED"},
                ),
                (
                    "expense.paid",
                    "Expense",
                    users["fin_admin"],
                    {"ref_no": "BILL-2026-00001", "status": "PAID"},
                ),
                (
                    "vendor.created",
                    "Vendor",
                    users["fin_admin"],
                    {"name": "TechServe Solutions Pvt Ltd"},
                ),
                (
                    "vendor.activated",
                    "Vendor",
                    users["fin_admin"],
                    {"name": "TechServe Solutions Pvt Ltd"},
                ),
                (
                    "expense.rejected",
                    "Expense",
                    users["l1_approver"],
                    {"ref_no": "BILL-2026-00003", "reason": "Duplicate invoice"},
                ),
                ("user.login", "User", users["cfo"], {"ip": "10.0.0.1"}),
            ]
            for action, entity_type, actor, after in sample_actions:
                AuditLog.objects.create(
                    user=actor,
                    action=action,
                    entity_type=entity_type,
                    masked_after=after,
                )
            self.stdout.write("  ✅ Created audit log entries")

        # ─── Summary ─────────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS("\n🎉 Demo data seeded successfully!"))
        self.stdout.write("\n📋 Login Credentials (password: demo1234):")
        self.stdout.write("  vendor1      — Rajesh Kumar     (G1 · Employee)")
        self.stdout.write("  vendor2      — Priya Sharma     (G1 · Employee)")
        self.stdout.write("  employee1    — Amit Patel       (G1 · Employee)")
        self.stdout.write("  l1_approver  — Neha Gupta       (G1 · Employee)")
        self.stdout.write("  hod          — Suresh Reddy     (G2 · Dept Head)")
        self.stdout.write("  fin_manager  — Anita Desai      (G3 · Finance Manager)")
        self.stdout.write("  fin_admin    — Vikram Singh     (G4 · Finance Admin)")
        self.stdout.write("  cfo          — Kavita Menon     (G4 · Finance Admin + Superuser)")
