"""
Management command to seed demo data for FinanceAI.
Creates demo users, vendors, expenses in various states, approval limits, and payment data.

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

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Wipe all existing expenses and approval steps before seeding (ensures clean consistent state)",
        )

    def handle(self, *args, **options):
        from apps.core.models import User, Department
        from apps.invoices.models import (
            Vendor,
            Expense,
            ExpenseApprovalStep,
            ExpensePolicyLimit,
            VendorL1Mapping,
        )

        self.stdout.write("🌱 Seeding demo data...")

        if options.get("fresh"):
            self.stdout.write("  🗑️  --fresh: wiping all expenses, steps, and vendor mappings...")
            ExpenseApprovalStep.objects.all().delete()
            Expense.objects.all().delete()
            VendorL1Mapping.objects.all().delete()
            self.stdout.write("  ✅ Wiped.")

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
        # Each user has a distinct role in the 7-step approval chain
        users = {}
        user_specs = [
            # username         | Full Name           | role              | dept
            ("vendor1",        "Rajesh Kumar",        "vendor",          None),
            ("vendor2",        "Priya Sharma",        "vendor",          None),
            ("employee1",      "Amit Patel",          "employee",        engineering),
            ("l1_approver",    "Neha Gupta",          "employee",        engineering),
            ("l2_approver",    "Ravi Nair",           "employee",        engineering),
            ("hod",            "Suresh Reddy",        "dept_head",       engineering),
            ("fin_manager",    "Anita Desai",         "finance_manager", finance),
            ("fin_manager2",   "Deepak Joshi",        "finance_manager", finance),
            ("fin_admin",      "Vikram Singh",        "finance_admin",   finance),
            ("cfo",            "Kavita Menon",        "cfo",             finance),
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
                    "employee_grade": "M3" if role in ("finance_admin", "cfo") else "M2",
                    "is_active": True,
                },
            )
            if created:
                user.set_password("demo1234")
                user.save()
                self.stdout.write(f"  ✅ Created user: {username} ({role})")
            else:
                # Update role in case it changed (e.g. cfo was previously finance_admin)
                if user.role != role:
                    user.role = role
                    user.save(update_fields=["role"])
                    self.stdout.write(f"  🔄 Updated role: {username} → {role}")
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

        # ─── Vendor → Approver Mappings ──────────────────────────
        # These ensure bills from each vendor are always routed to the correct
        # L1/L2 approvers instead of relying on fragile UUID-order fallbacks.
        self.stdout.write("🌱 Seeding VendorL1Mappings...")
        from apps.invoices.models import VendorL1Mapping
        for vendor_name, primary_user, secondary_user in [
            ("TechServe Solutions Pvt Ltd",  users["l1_approver"], users["l2_approver"]),
            ("CloudMatrix India Pvt Ltd",    users["l1_approver"], users["l2_approver"]),
            ("SwiftLogistics Co",            users["l1_approver"], users["l2_approver"]),
        ]:
            vendor_obj = Vendor.objects.get(name=vendor_name)
            m1, c1 = VendorL1Mapping.objects.update_or_create(
                vendor=vendor_obj, l1_user=primary_user,
                defaults={"is_primary": True, "assigned_by": users["fin_admin"]},
            )
            m2, c2 = VendorL1Mapping.objects.update_or_create(
                vendor=vendor_obj, l1_user=secondary_user,
                defaults={"is_primary": False, "assigned_by": users["fin_admin"]},
            )
            self.stdout.write(f"  {'✅' if c1 else '⏩'} {vendor_name} → L1={primary_user.username}, L2={secondary_user.username}")

        # ─── Approval Policy Limits ───────────────────────────────
        # IMPORTANT: Only Finance roles have configurable payment-authority limits.
        # L1 (employee), L2 (employee), Dept Head, and Finance L1 are ALWAYS in
        # the approval chain for every bill regardless of amount.
        # Finance L1 always reviews but is never the final payment authority.
        # These limits only control how far up the Finance chain the bill goes.
        self.stdout.write("🌱 Seeding approval policy limits (finance payment authority only)...")

        # First, clean up any stale limits from old incorrect seeding
        from apps.invoices.models import ExpensePolicyLimit
        stale_roles = ["EMP_L1", "EMP_L2", "DEPT_HEAD", "FIN_L1"]
        deleted, _ = ExpensePolicyLimit.objects.filter(role__in=stale_roles).delete()
        if deleted:
            self.stdout.write(f"  🗑️  Removed {deleted} stale non-finance policy limit(s)")

        policy_specs = [
            # role      | max_amount (INR)  | notes
            ("FIN_L2",  Decimal("25000"),   "Finance L2 is final payment authority for bills ≤ ₹25,000"),
            ("FIN_HEAD",Decimal("200000"),  "Finance Admin is final payment authority for bills ≤ ₹2,00,000"),
            ("CFO",     Decimal("99999999"),"CFO is final payment authority for bills > ₹2,00,000"),
        ]
        for role, max_amt, notes in policy_specs:
            lim, created = ExpensePolicyLimit.objects.update_or_create(
                role=role,
                defaults={
                    "max_amount": max_amt,
                    "is_active": True,
                    "notes": notes,
                    "set_by": users["cfo"],
                },
            )
            action = "✅ Created" if created else "⏩ Updated"
            self.stdout.write(f"  {action} policy limit: {role} → ₹{max_amt:,.0f}")

        # ─── Sample Expenses ─────────────────────────────────────
        techserve = vendors["TechServe Solutions Pvt Ltd"]
        cloudmatrix = vendors["CloudMatrix India Pvt Ltd"]

        # Default step assignments for each level
        step_users_map = {
            1: users["l1_approver"],
            2: users["l2_approver"],
            3: users["hod"],
            4: users["fin_manager"],
            5: users["fin_manager2"],
            6: users["fin_admin"],
            7: users["cfo"],
        }

        # ── Step assignment helper ──────────────────────────────────────────
        # All bills always run through: L1→L2→HOD→FIN_L1 (operational + first finance review)
        # Then finance chain extends based on amount:
        #   ≤ ₹25k  → stops at FIN_L2  (Finance L2 is final payer)
        #   ≤ ₹2L   → stops at FIN_HEAD (Finance Admin is final payer)
        #   > ₹2L   → goes to CFO      (CFO is final payer)
        FIN_L2_LIMIT  = Decimal("25000")
        FIN_HEAD_LIMIT = Decimal("200000")

        def steps_for_amount(total_amount):
            base = [(1,"EMP_L1"),(2,"EMP_L2"),(3,"DEPT_HEAD"),(4,"FIN_L1")]
            if total_amount <= FIN_L2_LIMIT:
                return base + [(5,"FIN_L2")]
            elif total_amount <= FIN_HEAD_LIMIT:
                return base + [(5,"FIN_L2"),(6,"FIN_HEAD")]
            else:
                return base + [(5,"FIN_L2"),(6,"FIN_HEAD"),(7,"CFO")]

        expense_specs = [
            # ── 1. PAID — ₹5,900 (≤₹25k → L1+L2+HOD+FIN_L1+FIN_L2, Finance L2 was final) ──
            {
                "vendor": techserve,
                "ref_no": "BILL-2026-00001",
                "invoice_number": "TS-INV-2026-001",
                "invoice_date": date(2026, 3, 1),
                "pre_gst_amount": Decimal("5000.00"),
                "cgst": Decimal("450.00"),
                "sgst": Decimal("450.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("5900.00"),
                "business_purpose": "Office stationery supplies",
                "status": "PAID",
                "submitted_by": users["employee1"],
                "steps": steps_for_amount(Decimal("5900")),
                "step_statuses": {1:"APPROVED",2:"APPROVED",3:"APPROVED",4:"APPROVED",5:"APPROVED"},
                "d365_payment_utr": "UTR202603150001",
                "payment_due_date": date(2026, 3, 18),
            },
            # ── 2. PAID — ₹11,80,000 (>₹2L → full chain to Finance Admin, < CFO threshold) ──
            {
                "vendor": techserve,
                "ref_no": "BILL-2026-00002",
                "invoice_number": "TS-INV-2026-042",
                "invoice_date": date(2026, 3, 15),
                "pre_gst_amount": Decimal("1000000.00"),
                "cgst": Decimal("90000.00"),
                "sgst": Decimal("90000.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("1180000.00"),
                "business_purpose": "Annual enterprise software licence renewal",
                "status": "PAID",
                "submitted_by": users["employee1"],
                "steps": steps_for_amount(Decimal("1180000")),
                "step_statuses": {1:"APPROVED",2:"APPROVED",3:"APPROVED",4:"APPROVED",5:"APPROVED",6:"APPROVED",7:"APPROVED"},
                "d365_payment_utr": "UTR202603200042",
                "payment_due_date": date(2026, 3, 23),
            },
            # ── 3. PENDING_L1 — ₹2,95,000 (>₹2L → L1+L2+HOD+FIN_L1+FIN_L2+FIN_HEAD) ──
            {
                "vendor": cloudmatrix,
                "ref_no": "BILL-2026-00005",
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
                "steps": steps_for_amount(Decimal("295000")),
            },
            # ── 4. PENDING_HOD — ₹2,06,500 filed on behalf by L1; L1+L2 approved ──
            {
                "vendor": techserve,
                "ref_no": "BILL-2026-00008",
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
                "filed_on_behalf": True,
                "filer_on_behalf": users["l1_approver"],
                "steps": steps_for_amount(Decimal("206500")),
                "step_statuses": {1:"APPROVED", 2:"APPROVED"},
            },
            # ── 5. PENDING_CFO — ₹1,47,50,000 (>₹2L, needs Finance Admin + CFO) ──
            {
                "vendor": cloudmatrix,
                "ref_no": "BILL-2026-00015",
                "invoice_number": "CM-INV-2026-200",
                "invoice_date": date(2026, 4, 12),
                "pre_gst_amount": Decimal("12500000.00"),
                "cgst": Decimal("1125000.00"),
                "sgst": Decimal("1125000.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("14750000.00"),
                "business_purpose": "3-year cloud infrastructure contract — Data Centre migration",
                "status": "PENDING_CFO",
                "submitted_by": users["employee1"],
                "steps": steps_for_amount(Decimal("14750000")),
                "step_statuses": {1:"APPROVED",2:"APPROVED",3:"APPROVED",4:"APPROVED",5:"APPROVED",6:"APPROVED"},
            },
            # ── 6. APPROVED — ₹94,400 (>₹25k ≤₹2L), Finance Admin approved, payment pending ──
            {
                "vendor": techserve,
                "ref_no": "BILL-2026-00020",
                "invoice_number": "TS-INV-2026-080",
                "invoice_date": date(2026, 4, 14),
                "pre_gst_amount": Decimal("80000.00"),
                "cgst": Decimal("7200.00"),
                "sgst": Decimal("7200.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("94400.00"),
                "business_purpose": "Security audit consulting services",
                "status": "APPROVED",
                "submitted_by": users["employee1"],
                "steps": steps_for_amount(Decimal("94400")),
                "step_statuses": {1:"APPROVED",2:"APPROVED",3:"APPROVED",4:"APPROVED",5:"APPROVED",6:"APPROVED"},
            },
            # ── 7. PAYMENT_INITIATED — ₹17,700 (≤₹25k, Finance L2 approved, payment in flight) ──
            {
                "vendor": cloudmatrix,
                "ref_no": "BILL-2026-00021",
                "invoice_number": "CM-INV-2026-110",
                "invoice_date": date(2026, 4, 1),
                "pre_gst_amount": Decimal("15000.00"),
                "cgst": Decimal("1350.00"),
                "sgst": Decimal("1350.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("17700.00"),
                "business_purpose": "Cloud consulting services — April 2026",
                "status": "PAYMENT_INITIATED",
                "submitted_by": users["vendor2"],
                "steps": steps_for_amount(Decimal("17700")),
                "step_statuses": {1:"APPROVED",2:"APPROVED",3:"APPROVED",4:"APPROVED",5:"APPROVED"},
                "payment_initiated_by": users["fin_admin"],
                "payment_due_date": date(2026, 4, 21),
            },
            # ── 8. REJECTED — ₹5,90,000 (>₹2L, HOD rejected after L1 approved) ──
            {
                "vendor": techserve,
                "ref_no": "BILL-2026-00003",
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
                "steps": steps_for_amount(Decimal("590000")),
                "step_statuses": {1:"APPROVED", 2:"APPROVED", 3:"REJECTED"},
            },
            # ── 9. HOD submits on behalf — skips L1/L2, starts at HOD step ──
            # ₹53,100 (>₹25k ≤₹2L → Finance Admin is final payer)
            # Since HOD filed on behalf, operational chain starts at HOD (level 3)
            {
                "vendor": cloudmatrix,
                "ref_no": "BILL-2026-00025",
                "invoice_number": "CM-INV-2026-300",
                "invoice_date": date(2026, 4, 16),
                "pre_gst_amount": Decimal("45000.00"),
                "cgst": Decimal("4050.00"),
                "sgst": Decimal("4050.00"),
                "igst": Decimal("0.00"),
                "total_amount": Decimal("53100.00"),
                "business_purpose": "Team offsite event — venue & catering",
                "status": "PENDING_HOD",
                "submitted_by": users["hod"],
                "filed_on_behalf": True,
                "filer_on_behalf": users["hod"],
                # L1/L2 skipped; HOD+FIN_L1+FIN_L2+FIN_HEAD (≤₹2L)
                "steps": [(3,"DEPT_HEAD"),(4,"FIN_L1"),(5,"FIN_L2"),(6,"FIN_HEAD")],
            },
        ]

        for spec in expense_specs:
            steps_config = spec.pop("steps")
            step_statuses = spec.pop("step_statuses", {})
            d365_utr = spec.pop("d365_payment_utr", "")
            payment_due = spec.pop("payment_due_date", None)
            payment_initiated_by = spec.pop("payment_initiated_by", None)
            submitted_by = spec.pop("submitted_by")
            target_status = spec.pop("status")
            filed_on_behalf = spec.pop("filed_on_behalf", False)
            filer_on_behalf = spec.pop("filer_on_behalf", None)

            is_paid = target_status == "PAID"

            expense, created = Expense.objects.get_or_create(
                ref_no=spec.pop("ref_no"),
                defaults={
                    **spec,
                    "submitted_by": submitted_by,
                    "_status": target_status,
                    "filed_on_behalf": filed_on_behalf,
                    "filer_on_behalf": filer_on_behalf,
                    "version": 1,
                    "submitted_at": timezone.now() - timedelta(days=10),
                    "approved_at": timezone.now() - timedelta(days=3) if is_paid or target_status == "APPROVED" else None,
                    "payment_initiated_by": payment_initiated_by,
                    "payment_initiated_at": timezone.now() - timedelta(days=1) if payment_initiated_by else None,
                    "payment_due_date": payment_due,
                    "d365_document_no": f"D365-{spec.get('invoice_number', '')}" if is_paid else "",
                    "d365_posted_at": timezone.now() - timedelta(days=2) if is_paid else None,
                    "d365_paid_at": timezone.now() - timedelta(days=1) if is_paid else None,
                    "d365_payment_utr": d365_utr if is_paid else "",
                },
            )

            if created:
                for level, role_tag in steps_config:
                    assigned = step_users_map.get(level)
                    if not assigned:
                        continue
                    lvl_status = step_statuses.get(level, "PENDING")
                    ExpenseApprovalStep.objects.create(
                        expense=expense,
                        level=level,
                        role_required=role_tag,
                        assigned_to=assigned,
                        status=lvl_status,
                        actual_actor=assigned if lvl_status in ("APPROVED", "REJECTED") else None,
                        decided_at=timezone.now() - timedelta(days=5) if lvl_status != "PENDING" else None,
                        decision_reason="Approved" if lvl_status == "APPROVED" else (
                            "Insufficient documentation" if lvl_status == "REJECTED" else ""
                        ),
                    )
                    # Set current_step to first PENDING level
                if target_status not in ("PAID", "REJECTED", "APPROVED", "PAYMENT_INITIATED"):
                    first_pending = min(
                        (lvl for lvl, _ in steps_config if step_statuses.get(lvl, "PENDING") == "PENDING"),
                        default=steps_config[0][0] if steps_config else 1,
                    )
                    expense.current_step = first_pending
                    expense.save(update_fields=["current_step"])

                self.stdout.write(f"  ✅ Created expense: {expense.ref_no} ({target_status})")
            else:
                self.stdout.write(f"  ⏩ Expense exists: {expense.ref_no}")

        # ─── Budgets ──────────────────────────────────────────────
        self.stdout.write("🌱 Seeding budgets...")
        from apps.invoices.models import Budget
        from datetime import date as dt_date

        budget_specs = [
            {
                "name": "Engineering Q2 2026",
                "department": engineering,
                "fiscal_year": 2026,
                "period": "quarterly",
                "start_date": dt_date(2026, 4, 1),
                "end_date": dt_date(2026, 6, 30),
                "total_amount": Decimal("2400000.00"),
                "warning_threshold": 80,
                "critical_threshold": 95,
            },
            {
                "name": "Marketing H1 2026",
                "department": operations,
                "fiscal_year": 2026,
                "period": "semi_annual",
                "start_date": dt_date(2026, 1, 1),
                "end_date": dt_date(2026, 6, 30),
                "total_amount": Decimal("1200000.00"),
                "warning_threshold": 75,
                "critical_threshold": 90,
            },
            {
                "name": "Operations Annual 2026",
                "department": operations,
                "fiscal_year": 2026,
                "period": "annual",
                "start_date": dt_date(2026, 1, 1),
                "end_date": dt_date(2026, 12, 31),
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

        # ─── Audit Log entries ────────────────────────────────────
        from apps.core.models import AuditLog
        if AuditLog.objects.count() == 0:
            self.stdout.write("🌱 Creating audit log entries...")
            sample_actions = [
                ("expense.submitted", "Expense", "Vendor submitted BILL-2026-00002", users["vendor1"]),
                ("expense.approved_l1", "Expense", "L1 approved BILL-2026-00002", users["l1_approver"]),
                ("expense.approved_hod", "Expense", "HoD approved BILL-2026-00002", users["hod"]),
                ("expense.approved_fin_head", "Expense", "Finance Admin approved BILL-2026-00002", users["fin_admin"]),
                ("expense.payment_initiated", "Expense", "Finance Admin initiated payment for BILL-2026-00002", users["fin_admin"]),
                ("expense.paid", "Expense", "BILL-2026-00002 payment confirmed UTR202603200042", users["fin_admin"]),
                ("vendor.created", "Vendor", "Admin created TechServe Solutions Pvt Ltd", users["fin_admin"]),
                ("policy_limit.set", "PolicyLimit", "CFO set FIN_HEAD limit to ₹1,00,00,000", users["cfo"]),
                ("user.login", "User", "CFO logged in", users["cfo"]),
            ]
            for action, entity, desc, actor in sample_actions:
                AuditLog.objects.create(
                    user=actor,
                    action=action,
                    entity_type=entity,
                    masked_after={"description": desc},
                )
            self.stdout.write("  ✅ Created audit log entries")

        self.stdout.write(self.style.SUCCESS("\n🎉 Demo data seeded successfully!"))
        self.stdout.write("\n" + "═" * 60)
        self.stdout.write("📋 LOGIN CREDENTIALS (all passwords: demo1234)")
        self.stdout.write("═" * 60)
        self.stdout.write("  ROLE          | USERNAME      | NAME")
        self.stdout.write("  ──────────────────────────────────────────")
        self.stdout.write("  Vendor        | vendor1       | Rajesh Kumar")
        self.stdout.write("  Vendor        | vendor2       | Priya Sharma")
        self.stdout.write("  Employee      | employee1     | Amit Patel (submitter)")
        self.stdout.write("  L1 Approver   | l1_approver   | Neha Gupta")
        self.stdout.write("  L2 Approver   | l2_approver   | Ravi Nair")
        self.stdout.write("  Dept Head     | hod           | Suresh Reddy")
        self.stdout.write("  Finance Mgr   | fin_manager   | Anita Desai (FIN_L1)")
        self.stdout.write("  Finance Mgr   | fin_manager2  | Deepak Joshi (FIN_L2)")
        self.stdout.write("  Finance Admin | fin_admin     | Vikram Singh")
        self.stdout.write("  CFO           | cfo           | Kavita Menon")
        self.stdout.write("═" * 60)
        self.stdout.write("\n📊 HOW APPROVAL CHAINS WORK:")
        self.stdout.write("  ALL bills always go through: L1 → L2 → Dept Head → Finance L1 (fixed)")
        self.stdout.write("  Finance L2, Finance Admin, CFO have configurable payment-authority limits:")
        self.stdout.write("  ─────────────────────────────────────────────────────────────")
        self.stdout.write("  ≤ ₹25,000          L1→L2→HOD→FinL1→FinL2 (Finance L2 pays)")
        self.stdout.write("  ≤ ₹2,00,000        L1→L2→HOD→FinL1→FinL2→FinAdmin (Fin Admin pays)")
        self.stdout.write("  > ₹2,00,000        Full chain + CFO approval → CFO/FinAdmin pays")
        self.stdout.write("  Configurable by Finance Admin or CFO via Approval Limits tab.")
        self.stdout.write("")
