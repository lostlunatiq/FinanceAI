"""
Management command to seed REAL company data for FinanceAI demo.

Company: Technovance Solutions Pvt. Ltd.
Creates: users (with hierarchy), 2 vendors, 2 employees, budgets, invoices from real PDFs.

Usage:
    python manage.py seed_real
    python manage.py seed_real --flush   # clears existing data first
"""

import os
import uuid
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Seed real company data for Technovance Solutions Pvt. Ltd."

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Clear existing demo data first")

    def handle(self, *args, **options):
        from apps.core.models import User, Department, Vendor, FileRef
        from apps.invoices.models import Expense, ExpenseApprovalStep, Budget

        if options["flush"]:
            self.stdout.write("🗑️  Flushing existing data...")
            Expense.objects.all().delete()
            Budget.objects.all().delete()
            Vendor.objects.filter(is_demo=False).delete() if hasattr(Vendor, 'is_demo') else None
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write("  ✅ Flush complete")

        # ─── 1. Departments ───────────────────────────────────────────────────
        self.stdout.write("🏢 Setting up Technovance Solutions Pvt. Ltd. departments...")

        depts = {}
        dept_list = [
            "Engineering",
            "Finance",
            "Operations",
            "Human Resources",
            "Marketing",
            "Legal & Compliance",
            "Procurement",
        ]
        for name in dept_list:
            d, _ = Department.objects.get_or_create(name=name)
            depts[name] = d
        self.stdout.write("  ✅ 7 departments ready")

        # ─── 2. Company Hierarchy Users ───────────────────────────────────────
        self.stdout.write("👥 Creating company hierarchy...")

        # Grade 5 / CFO
        cfo, _ = self._make_user(
            "arjun.sharma", "Arjun", "Sharma", "arjun.sharma@technovance.in",
            grade=5, dept=depts["Finance"], is_super=True, password="Techno@2026"
        )

        # Grade 4 — Finance Admin
        fin_admin, _ = self._make_user(
            "priya.nair", "Priya", "Nair", "priya.nair@technovance.in",
            grade=4, dept=depts["Finance"], is_super=False, password="Techno@2026"
        )

        # Grade 3 — Finance Manager
        fin_mgr, _ = self._make_user(
            "vikram.mehta", "Vikram", "Mehta", "vikram.mehta@technovance.in",
            grade=3, dept=depts["Finance"], is_super=False, password="Techno@2026"
        )

        # Grade 2 — HODs
        eng_hod, _ = self._make_user(
            "divya.krishnan", "Divya", "Krishnan", "divya.krishnan@technovance.in",
            grade=2, dept=depts["Engineering"], is_super=False, password="Techno@2026"
        )
        ops_hod, _ = self._make_user(
            "rohit.kapoor", "Rohit", "Kapoor", "rohit.kapoor@technovance.in",
            grade=2, dept=depts["Operations"], is_super=False, password="Techno@2026"
        )
        hr_hod, _ = self._make_user(
            "sunita.rao", "Sunita", "Rao", "sunita.rao@technovance.in",
            grade=2, dept=depts["Human Resources"], is_super=False, password="Techno@2026"
        )
        mkt_hod, _ = self._make_user(
            "anil.desai", "Anil", "Desai", "anil.desai@technovance.in",
            grade=2, dept=depts["Marketing"], is_super=False, password="Techno@2026"
        )

        # Grade 1 — Employees (2 main employees as required)
        emp1, _ = self._make_user(
            "neha.gupta", "Neha", "Gupta", "neha.gupta@technovance.in",
            grade=1, dept=depts["Engineering"], is_super=False, password="Techno@2026"
        )
        emp2, _ = self._make_user(
            "rahul.joshi", "Rahul", "Joshi", "rahul.joshi@technovance.in",
            grade=1, dept=depts["Operations"], is_super=False, password="Techno@2026"
        )

        # Additional employees for richer data
        emp3, _ = self._make_user(
            "kavita.iyer", "Kavita", "Iyer", "kavita.iyer@technovance.in",
            grade=1, dept=depts["Marketing"], is_super=False, password="Techno@2026"
        )
        emp4, _ = self._make_user(
            "sanjay.reddy", "Sanjay", "Reddy", "sanjay.reddy@technovance.in",
            grade=1, dept=depts["Engineering"], is_super=False, password="Techno@2026"
        )

        self.stdout.write("  ✅ 11 users created (CFO → Finance Admin → Finance Manager → 4 HODs → 4 Employees)")

        # ─── 3. Vendors ────────────────────────────────────────────────────────
        self.stdout.write("🏭 Creating 2 real vendors...")

        # Vendor 1: IT Services vendor
        vendor1, v1_created = Vendor.objects.get_or_create(
            name="Infosys BPM Limited",
            defaults={
                "gstin": "29AAACI1681G1ZS",
                "pan": "AAACI1681G",
                "email": "accounts@infosysbpm.in",
                "phone": "080-41091234",
                "bank_account_name": "Infosys BPM Limited",
                "bank_account_number": "37509876543210",
                "bank_ifsc": "SBIN0040182",
                "status": "APPROVED",
                "vendor_type": "Large",
                "is_approved": True,
                "tds_section": "194J",
            },
        )
        if v1_created:
            self.stdout.write("  ✅ Vendor 1: Infosys BPM Limited (IT Services)")

        # Create vendor portal user for vendor 1
        v1_user, v1_u_created = self._make_user(
            "vendor.infosys", "Infosys BPM", "Accounts", "accounts@infosysbpm.in",
            grade=1, dept=None, is_super=False, password="Vendor@2026"
        )
        if v1_u_created:
            vendor1.user = v1_user
            vendor1.save()

        # Vendor 2: Office supplies vendor
        vendor2, v2_created = Vendor.objects.get_or_create(
            name="Staples India Pvt. Ltd.",
            defaults={
                "gstin": "27AAGCS5166K1Z7",
                "pan": "AAGCS5166K",
                "email": "billing@staples.in",
                "phone": "022-61234567",
                "bank_account_name": "Staples India Pvt Ltd",
                "bank_account_number": "1234500098765",
                "bank_ifsc": "HDFC0001234",
                "status": "APPROVED",
                "vendor_type": "MSME",
                "is_approved": True,
                "msme_registered": True,
                "tds_section": "194C",
            },
        )
        if v2_created:
            self.stdout.write("  ✅ Vendor 2: Staples India Pvt. Ltd. (Office Supplies)")

        # Create vendor portal user for vendor 2
        v2_user, v2_u_created = self._make_user(
            "vendor.staples", "Staples India", "Billing", "billing@staples.in",
            grade=1, dept=None, is_super=False, password="Vendor@2026"
        )
        if v2_u_created:
            vendor2.user = v2_user
            vendor2.save()

        # ─── 4. Budgets ────────────────────────────────────────────────────────
        self.stdout.write("💰 Creating department budgets for FY2026...")

        today = date.today()
        fy_start = date(2026, 4, 1)
        fy_end = date(2027, 3, 31)

        budget_data = [
            ("Engineering Annual Budget FY2026",    depts["Engineering"],        Decimal("8500000"),  Decimal("70"), Decimal("90")),
            ("Finance Dept Budget FY2026",          depts["Finance"],            Decimal("3200000"),  Decimal("75"), Decimal("90")),
            ("Operations Budget FY2026",            depts["Operations"],         Decimal("5600000"),  Decimal("70"), Decimal("85")),
            ("HR & Recruitment FY2026",             depts["Human Resources"],    Decimal("2800000"),  Decimal("70"), Decimal("90")),
            ("Marketing & Events FY2026",           depts["Marketing"],          Decimal("4200000"),  Decimal("65"), Decimal("85")),
            ("Legal & Compliance FY2026",           depts["Legal & Compliance"], Decimal("1500000"),  Decimal("80"), Decimal("95")),
            ("Procurement Ops FY2026",              depts["Procurement"],        Decimal("6000000"),  Decimal("70"), Decimal("90")),
        ]

        for bname, bdept, btotal, bwarn, bcrit in budget_data:
            Budget.objects.get_or_create(
                name=bname,
                defaults={
                    "department": bdept,
                    "total_amount": btotal,
                    "warning_threshold": bwarn,
                    "critical_threshold": bcrit,
                    "fiscal_year": 2026,
                    "period": "annual",
                    "start_date": fy_start,
                    "end_date": fy_end,
                    "status": "active",
                },
            )
        self.stdout.write("  ✅ 7 budgets created")

        # ─── 5. Invoice Expenses from real PDF files ───────────────────────────
        self.stdout.write("📄 Creating expenses from real invoice PDFs...")

        media_dir = Path("/app/media/invoices") if os.path.exists("/app/media") else \
                    Path("/home/bunesh-athankar/Desktop/Hackathon 2k26/FinanceAI/media/invoices")

        pdf_files = sorted(media_dir.glob("*.pdf")) if media_dir.exists() else []
        self.stdout.write(f"  Found {len(pdf_files)} PDF files in media/invoices/")

        # Invoice data tied to real PDFs (rotate if more/fewer PDFs)
        invoice_specs = [
            {
                "vendor": vendor1,
                "submitted_by": emp1,
                "total_amount": Decimal("147500.00"),
                "invoice_number": "INF/2026/03/0142",
                "description": "Cloud infrastructure management and DevOps support services - March 2026",
                "status": "APPROVED",
            },
            {
                "vendor": vendor1,
                "submitted_by": emp4,
                "total_amount": Decimal("285000.00"),
                "invoice_number": "INF/2026/04/0198",
                "description": "Software development outsourcing - Q1 FY2026",
                "status": "PENDING_FIN_L1",
            },
            {
                "vendor": vendor2,
                "submitted_by": ops_hod,
                "total_amount": Decimal("38750.00"),
                "invoice_number": "STP/2026/0089",
                "description": "Office supplies: stationery, printer cartridges, and consumables - April 2026",
                "status": "PAID",
            },
            {
                "vendor": vendor2,
                "submitted_by": emp3,
                "total_amount": Decimal("12400.00"),
                "invoice_number": "STP/2026/0094",
                "description": "Marketing collateral printing and branded merchandise",
                "status": "PENDING_HOD",
            },
            {
                "vendor": vendor1,
                "submitted_by": fin_mgr,
                "total_amount": Decimal("520000.00"),
                "invoice_number": "INF/2026/04/0215",
                "description": "ERP system customization and integration with D365 Finance - Phase 2",
                "status": "PENDING_CFO",
            },
            {
                "vendor": vendor2,
                "submitted_by": emp2,
                "total_amount": Decimal("8900.00"),
                "invoice_number": "STP/2026/0101",
                "description": "Operations team safety equipment and PPE kits",
                "status": "SUBMITTED",
            },
            {
                "vendor": vendor1,
                "submitted_by": fin_admin,
                "total_amount": Decimal("95000.00"),
                "invoice_number": "INF/2026/03/0133",
                "description": "IT security audit and vulnerability assessment services",
                "status": "REJECTED",
            },
            {
                "vendor": vendor2,
                "submitted_by": hr_hod,
                "total_amount": Decimal("24600.00"),
                "invoice_number": "STP/2026/0078",
                "description": "HR training materials and employee onboarding kits - Batch 7",
                "status": "PAID",
            },
        ]

        created_count = 0
        for i, spec in enumerate(invoice_specs):
            if Expense.objects.filter(invoice_number=spec["invoice_number"]).exists():
                continue

            file_ref = None
            if pdf_files:
                pdf = pdf_files[i % len(pdf_files)]
                rel_path = f"invoices/{pdf.name}"
                file_ref, _ = FileRef.objects.get_or_create(
                    path=rel_path,
                    defaults={
                        "original_filename": f"invoice_{spec['invoice_number'].replace('/', '_')}.pdf",
                        "uploaded_by": spec["submitted_by"],
                    },
                )

            net_amount = spec["total_amount"] / Decimal("1.18")
            gst_amount = spec["total_amount"] - net_amount
            exp = Expense(
                vendor=spec["vendor"],
                submitted_by=spec["submitted_by"],
                total_amount=spec["total_amount"],
                pre_gst_amount=net_amount.quantize(Decimal("0.01")),
                igst=gst_amount.quantize(Decimal("0.01")),
                invoice_number=spec["invoice_number"],
                invoice_date=date.today() - timedelta(days=i * 4 + 2),
                business_purpose=spec["description"],
                invoice_file=file_ref,
            )
            exp._status = spec["status"]
            exp.save()
            created_count += 1

        self.stdout.write(f"  ✅ {created_count} invoices created (with PDF file references)")

        # ─── 6. Print Login Summary ────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write("=" * 65)
        self.stdout.write("  TECHNOVANCE SOLUTIONS — LOGIN CREDENTIALS")
        self.stdout.write("=" * 65)
        self.stdout.write("")
        self.stdout.write("  ROLE              | USERNAME           | PASSWORD")
        self.stdout.write("  ─────────────────────────────────────────────────")
        self.stdout.write("  CFO (G5)          | arjun.sharma       | Techno@2026")
        self.stdout.write("  Finance Admin (G4)| priya.nair         | Techno@2026")
        self.stdout.write("  Finance Mgr (G3)  | vikram.mehta       | Techno@2026")
        self.stdout.write("  Engg HOD (G2)     | divya.krishnan     | Techno@2026")
        self.stdout.write("  Ops HOD (G2)      | rohit.kapoor       | Techno@2026")
        self.stdout.write("  HR HOD (G2)       | sunita.rao         | Techno@2026")
        self.stdout.write("  Mkt HOD (G2)      | anil.desai         | Techno@2026")
        self.stdout.write("  Employee 1 (G1)   | neha.gupta         | Techno@2026")
        self.stdout.write("  Employee 2 (G1)   | rahul.joshi        | Techno@2026")
        self.stdout.write("  Employee 3 (G1)   | kavita.iyer        | Techno@2026")
        self.stdout.write("  Employee 4 (G1)   | sanjay.reddy       | Techno@2026")
        self.stdout.write("  Vendor 1 (Portal) | vendor.infosys     | Vendor@2026")
        self.stdout.write("  Vendor 2 (Portal) | vendor.staples     | Vendor@2026")
        self.stdout.write("")
        self.stdout.write("  VENDORS:")
        self.stdout.write("  - Infosys BPM Limited (IT Services) — GSTIN: 29AAACI1681G1ZS")
        self.stdout.write("  - Staples India Pvt. Ltd. (Office Supplies) — GSTIN: 27AAGCS5166K1Z7")
        self.stdout.write("")
        self.stdout.write("  BUDGETS: 7 departments, FY2026 (₹1.5L – ₹85L range)")
        self.stdout.write(f"  INVOICES: {created_count} created with real PDF references")
        self.stdout.write("=" * 65)
        self.stdout.write("")
        self.stdout.write("✅ Seed complete! Real data loaded.")

    def _make_user(self, username, first, last, email, grade, dept, is_super, password):
        from apps.core.models import User
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
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
            user.set_password(password)
            user.save()
        else:
            # Always update password for demo resets
            user.set_password(password)
            if dept:
                user.department = dept
            user.employee_grade = grade
            if is_super:
                user.is_superuser = True
                user.is_staff = True
            user.save()
        return user, created
