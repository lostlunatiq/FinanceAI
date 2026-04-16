"""
Management command to seed demo data for FinanceAI.
Creates demo users, vendors, and sample expenses in various states.

Usage:
    python manage.py seed_demo
"""

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Seed demo data for FinanceAI hackathon demo"

    def handle(self, *args, **options):
        from apps.core.models import User, Department
        from apps.invoices.models import (
            Vendor,
            Expense,
            ExpenseApprovalStep,
        )

        self.stdout.write("🌱 Seeding demo data...")

        # ─── Departments ─────────────────────────────────────────
        engineering, _ = Department.objects.get_or_create(
            name="Engineering",
            defaults={"budget_annual": Decimal("5000000.00"), "head": None},
        )
        finance, _ = Department.objects.get_or_create(
            name="Finance",
            defaults={"budget_annual": Decimal("10000000.00"), "head": None},
        )
        operations, _ = Department.objects.get_or_create(
            name="Operations",
            defaults={"budget_annual": Decimal("3000000.00"), "head": None},
        )

        # ─── Users ───────────────────────────────────────────────
        users = {}
        user_specs = [
            ("vendor1", "Rajesh Kumar", "vendor", None),
            ("vendor2", "Priya Sharma", "vendor", None),
            ("employee1", "Amit Patel", "employee", engineering),
            ("l1_approver", "Neha Gupta", "employee", engineering),
            ("hod", "Suresh Reddy", "dept_head", engineering),
            ("fin_manager", "Anita Desai", "finance_manager", finance),
            ("fin_admin", "Vikram Singh", "finance_admin", finance),
            ("cfo", "Kavita Menon", "finance_admin", finance),
        ]

        for username, full_name, role, dept in user_specs:
            first, last = full_name.split(" ", 1)
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@demo.3sc.co",
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "department": dept,
                    "employee_grade": "M3" if role in ("finance_admin",) else "M2",
                    "is_active": True,
                },
            )
            if created:
                user.set_password("demo1234")
                user.save()
                self.stdout.write(f"  ✅ Created user: {username} ({role})")
            else:
                self.stdout.write(f"  ⏩ User exists: {username}")
            users[username] = user

        # ─── Vendors ─────────────────────────────────────────────
        vendors = {}
        vendor_specs = [
            {
                "name": "TechServe Solutions Pvt Ltd",
                "gstin": "27AABCT1234A1Z5",
                "pan": "AABCT1234A",
                "email": "billing@techserve.in",
                "vendor_type": "saas",
                "avg_invoice_amount": Decimal("150000.00"),
                "user": users["vendor1"],
                "status": "ACTIVE",
                "is_approved": True,
            },
            {
                "name": "CloudMatrix India Pvt Ltd",
                "gstin": "06AABCC5678D1Z9",
                "pan": "AABCC5678D",
                "email": "accounts@cloudmatrix.in",
                "vendor_type": "cloud_infra",
                "avg_invoice_amount": Decimal("350000.00"),
                "user": users["vendor2"],
                "status": "ACTIVE",
                "is_approved": True,
            },
            {
                "name": "SwiftLogistics Co",
                "gstin": "09AABCS9012F1Z3",
                "pan": "AABCS9012F",
                "email": "finance@swiftlogistics.in",
                "vendor_type": "logistics",
                "avg_invoice_amount": Decimal("75000.00"),
                "user": None,
                "status": "PENDING_APPROVAL",
                "is_approved": False,
            },
        ]

        for spec in vendor_specs:
            vendor_user = spec.pop("user")
            vendor, created = Vendor.objects.get_or_create(
                name=spec["name"],
                defaults={
                    **spec,
                    "user": vendor_user,
                    "name_normalized": spec["name"].lower().strip(),
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

        # ─── Sample Expenses ─────────────────────────────────────
        techserve = vendors["TechServe Solutions Pvt Ltd"]
        cloudmatrix = vendors["CloudMatrix India Pvt Ltd"]

        expense_specs = [
            # PAID expense (complete flow)
            {
                "vendor": techserve,
                "ref_prefix": "BILL-2026-0001",
                "invoice_number": "TS-INV-2026-042",
                "invoice_date": date(2026, 3, 15),
                "pre_gst_amount": Decimal("100000.00"),
                "cgst": Decimal("9000.00"),
                "sgst": Decimal("9000.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("118000.00"),
                "business_purpose": "Annual SaaS licence renewal — DevOps monitoring suite",
                "status": "PAID",
                "submitted_by": users["employee1"],
            },
            # PENDING_L1 (awaiting first approval)
            {
                "vendor": cloudmatrix,
                "ref_prefix": "BILL-2026-0005",
                "invoice_number": "CM-INV-2026-101",
                "invoice_date": date(2026, 4, 10),
                "pre_gst_amount": Decimal("250000.00"),
                "cgst": Decimal("22500.00"),
                "sgst": Decimal("22500.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("295000.00"),
                "business_purpose": "AWS infrastructure — Q2 2026 compute & storage",
                "status": "PENDING_L1",
                "submitted_by": users["employee1"],
            },
            # PENDING_HOD (waiting for department head)
            {
                "vendor": techserve,
                "ref_prefix": "BILL-2026-0008",
                "invoice_number": "TS-INV-2026-056",
                "invoice_date": date(2026, 4, 5),
                "pre_gst_amount": Decimal("175000.00"),
                "cgst": Decimal("15750.00"),
                "sgst": Decimal("15750.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("206500.00"),
                "business_purpose": "Custom API integration development",
                "status": "PENDING_HOD",
                "submitted_by": users["employee1"],
            },
            # SUBMITTED (just submitted, not yet OCR'd)
            {
                "vendor": cloudmatrix,
                "ref_prefix": "BILL-2026-0012",
                "invoice_number": "CM-INV-2026-115",
                "invoice_date": date.today(),
                "pre_gst_amount": Decimal("50000.00"),
                "cgst": Decimal("4500.00"),
                "sgst": Decimal("4500.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("59000.00"),
                "business_purpose": "Cloud consulting services",
                "status": "SUBMITTED",
                "submitted_by": users["vendor2"],
            },
            # REJECTED
            {
                "vendor": techserve,
                "ref_prefix": "BILL-2026-0003",
                "invoice_number": "TS-INV-2026-039",
                "invoice_date": date(2026, 2, 20),
                "pre_gst_amount": Decimal("500000.00"),
                "cgst": Decimal("45000.00"),
                "sgst": Decimal("45000.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("590000.00"),
                "business_purpose": "Hardware procurement — servers",
                "status": "REJECTED",
                "submitted_by": users["employee1"],
            },
        ]

        for spec in expense_specs:
            submitted_by = spec.pop("submitted_by")
            target_status = spec.pop("status")

            expense, created = Expense.objects.get_or_create(
                ref_no=spec.pop("ref_prefix"),
                defaults={
                    **spec,
                    "submitted_by": submitted_by,
                    "_status": target_status,
                    "version": 1,
                    "submitted_at": timezone.now() - timedelta(days=5),
                    "approved_at": timezone.now() if target_status == "PAID" else None,
                    "d365_document_no": f"D365-{spec.get('invoice_number', '')}" if target_status == "PAID" else "",
                    "d365_paid_at": timezone.now() if target_status == "PAID" else None,
                    "d365_payment_utr": f"UTR-{spec.get('invoice_number', '')}" if target_status == "PAID" else "",
                },
            )

            if created:
                # Create approval steps
                step_users = [
                    (1, users["l1_approver"]),
                    (2, users["l1_approver"]),
                    (3, users["hod"]),
                    (4, users["fin_manager"]),
                    (5, users["fin_manager"]),
                    (6, users["fin_admin"]),
                ]

                for level, assigned in step_users:
                    step_status = "PENDING"
                    if target_status in ("PAID", "APPROVED"):
                        step_status = "APPROVED"
                    elif target_status == "REJECTED" and level <= 2:
                        step_status = "REJECTED" if level == 2 else "APPROVED"

                    ExpenseApprovalStep.objects.create(
                        expense=expense,
                        level=level,
                        role_required=assigned.role,
                        assigned_to=assigned,
                        status=step_status,
                        decided_at=timezone.now() if step_status != "PENDING" else None,
                    )

                self.stdout.write(
                    f"  ✅ Created expense: {expense.ref_no} ({target_status})"
                )
            else:
                self.stdout.write(f"  ⏩ Expense exists: {expense.ref_no}")

        self.stdout.write(self.style.SUCCESS("\n🎉 Demo data seeded successfully!"))
        self.stdout.write("\n📋 Login Credentials:")
        self.stdout.write("  Vendor:           vendor1 / demo1234")
        self.stdout.write("  Vendor 2:         vendor2 / demo1234")
        self.stdout.write("  Employee:         employee1 / demo1234")
        self.stdout.write("  L1 Approver:      l1_approver / demo1234")
        self.stdout.write("  Dept Head:        hod / demo1234")
        self.stdout.write("  Finance Manager:  fin_manager / demo1234")
        self.stdout.write("  Finance Admin:    fin_admin / demo1234")
        self.stdout.write("  CFO:              cfo / demo1234")
