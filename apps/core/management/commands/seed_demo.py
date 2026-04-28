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

        self.stdout.write("🌱 Seeding core structure (Users, Departments, Budgets, Auth)...")

        # ─── Departments ──────────────────────────────────────────────────────
        engineering, _ = Department.objects.get_or_create(name="Engineering")
        finance, _ = Department.objects.get_or_create(name="Finance")
        operations, _ = Department.objects.get_or_create(name="Operations")
        self.stdout.write("  ✅ Departments ready")

        # ─── Users ───────────────────────────────────────────────────────────
        user_specs = [
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
                    "employee_grade": grade,
                    "department": dept,
                    "is_active": True,
                    "is_superuser": is_super,
                    "is_staff": is_super,
                },
            )
            if created:
                user.set_password("demo1234")
                user.save()
            else:
                if is_super and not user.is_superuser:
                    user.is_superuser = True
                    user.is_staff = True
                    user.save(update_fields=["is_superuser", "is_staff"])
                user.set_password("demo1234")
                user.save()
            users[username] = user
        self.stdout.write("  ✅ Core users ready")

        # ─── Budgets ─────────────────────────────────────────────────────────
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

        self.stdout.write("  ✅ Budgets seeded")

        # ─── Approval Authorities ────────────────────────────────────────────
        from apps.invoices.models import ApprovalAuthority
        auth_specs = [
            {"grade": 1, "label": "L1 Approver",     "approval_limit": Decimal("50000"),   "settlement_limit": Decimal("0")},
            {"grade": 2, "label": "HOD",              "approval_limit": Decimal("500000"),  "settlement_limit": Decimal("100000")},
            {"grade": 3, "label": "Finance Manager",  "approval_limit": Decimal("2000000"), "settlement_limit": Decimal("500000")},
            {"grade": 4, "label": "Finance Admin",    "approval_limit": None,               "settlement_limit": None},
        ]
        for spec in auth_specs:
            ApprovalAuthority.objects.get_or_create(grade=spec["grade"], defaults={**spec, "updated_by": users["fin_admin"]})
        self.stdout.write("  ✅ Approval authorities seeded")
        
        self.stdout.write(self.style.SUCCESS("\n🎉 Core structure seeded successfully! Removed dummy vendors and expenses."))

