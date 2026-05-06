"""
Seed realistic invoice and expense data for demo/reporting purposes.

Creates:
  - 6 departments with annual budgets
  - 10 vendors across different categories
  - ~220 expenses spanning Jan 2025 – May 2026
  - Realistic GST / TDS amounts
  - Mixed statuses: PAID, APPROVED, PENDING, REJECTED
  - Some high/medium anomaly flags

Usage:
    python manage.py seed_invoices
"""

import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed realistic invoice + expense data for reports demo"

    def handle(self, *args, **options):
        random.seed(42)

        from apps.core.models import User, Department, Vendor
        from apps.invoices.models import Expense, Budget

        self.stdout.write("🌱 Seeding invoice demo data…")

        # ── Departments ────────────────────────────────────────────────────────
        dept_specs = [
            ("Engineering",      8_500_000),
            ("Finance",          2_800_000),
            ("Operations",       5_200_000),
            ("HR & Admin",       3_600_000),
            ("Marketing",        6_000_000),
            ("IT Infrastructure",7_200_000),
        ]
        depts = {}
        for name, budget_amt in dept_specs:
            d, _ = Department.objects.get_or_create(name=name)
            depts[name] = d

        self.stdout.write("  ✅ 6 departments ready")

        # ── Budgets ────────────────────────────────────────────────────────────
        fin_admin = User.objects.filter(username="fin_admin").first()
        for name, budget_amt in dept_specs:
            for yr in (2025, 2026):
                Budget.objects.get_or_create(
                    name=f"{name} Annual {yr}",
                    defaults={
                        "department":          depts[name],
                        "fiscal_year":         yr,
                        "period":              "annual",
                        "start_date":          date(yr, 1, 1),
                        "end_date":            date(yr, 12, 31),
                        "total_amount":        Decimal(str(budget_amt)),
                        "warning_threshold":   80,
                        "critical_threshold":  95,
                        "status":              "active",
                        "created_by":          fin_admin,
                    },
                )

        self.stdout.write("  ✅ Budgets seeded for FY 2025 & 2026")

        # ── Vendors ────────────────────────────────────────────────────────────
        vendor_specs = [
            ("Amazon Web Services India", "Cloud Infrastructure",    "Large",   "27AABCA1234A1Z5"),
            ("Infosys BPM Limited",        "Professional Services",   "Large",   "29AABCI0187A1ZV"),
            ("QuickPrint Solutions",       "Office Supplies",         "MSME",    "07AADCQ0456B1Z3"),
            ("TravelEase Corporate",       "Travel & Accommodation",  "MSME",    "19AABCT0789C1Z1"),
            ("Salesforce India Pvt Ltd",   "Software Licenses",       "Large",   "29AACCS3397H1ZC"),
            ("FreshMeals Catering",        "Pantry & Refreshments",   "MSME",    "27AADCF1122D1Z9"),
            ("SecureNet Technologies",     "Security Services",       "MSME",    "07AABCS2233E1Z4"),
            ("Adobe Systems India",        "Creative Software",       "Large",   "29AACCA4455F1ZB"),
            ("BlueDart Express",           "Courier & Logistics",     "Large",   "27AABCB5566G1Z2"),
            ("Facility Masters",           "Facility Management",     "MSME",    "19AADCF6677H1Z8"),
        ]
        vendors = {}
        for vname, vtype, size, gstin in vendor_specs:
            v, _ = Vendor.objects.get_or_create(
                name=vname,
                defaults={
                    "vendor_type": vtype,
                    "gstin":       gstin,
                    "status":             "active",
                    "pan":                "AABCA1234A",
                    "bank_account_number": "000000000000",
                    "bank_ifsc":          "HDFC0000001",
                    "bank_account_name":  vname,
                },
            )
            vendors[vname] = v

        self.stdout.write(f"  ✅ {len(vendors)} vendors ready")

        # ── Submitter users (one per dept) ─────────────────────────────────────
        submitters = {}
        submitter_specs = [
            ("eng_emp",   "Arjun",   "Sharma",   1, depts["Engineering"]),
            ("fin_emp",   "Priya",   "Iyer",     1, depts["Finance"]),
            ("ops_emp",   "Rohit",   "Verma",    1, depts["Operations"]),
            ("hr_emp",    "Smita",   "Kulkarni", 1, depts["HR & Admin"]),
            ("mkt_emp",   "Deepak",  "Nair",     1, depts["Marketing"]),
            ("it_emp",    "Meera",   "Pillai",   1, depts["IT Infrastructure"]),
        ]
        for uname, fn, ln, grade, dept in submitter_specs:
            u, created = User.objects.get_or_create(
                username=uname,
                defaults={
                    "email": f"{uname}@demo.financeai.in",
                    "first_name": fn, "last_name": ln,
                    "employee_grade": grade,
                    "department": dept,
                    "is_active": True,
                },
            )
            if created:
                u.set_password("demo1234")
                u.save()
            submitters[dept.name] = u

        self.stdout.write("  ✅ Submitter users ready")

        # ── Expense generation ─────────────────────────────────────────────────
        # Mapping: dept -> preferred vendors + typical amounts
        dept_vendor_map = {
            "Engineering":       [("Amazon Web Services India", 180_000, 420_000),
                                   ("Infosys BPM Limited",       250_000, 600_000),
                                   ("SecureNet Technologies",     80_000, 180_000)],
            "Finance":           [("QuickPrint Solutions",        15_000, 40_000),
                                   ("TravelEase Corporate",        30_000, 90_000),
                                   ("FreshMeals Catering",         8_000, 22_000)],
            "Operations":        [("BlueDart Express",            25_000, 80_000),
                                   ("Facility Masters",            60_000, 150_000),
                                   ("TravelEase Corporate",        40_000, 120_000)],
            "HR & Admin":        [("FreshMeals Catering",         20_000, 60_000),
                                   ("QuickPrint Solutions",        12_000, 35_000),
                                   ("TravelEase Corporate",        50_000, 130_000)],
            "Marketing":         [("Adobe Systems India",          80_000, 200_000),
                                   ("TravelEase Corporate",        60_000, 180_000),
                                   ("Infosys BPM Limited",        150_000, 350_000)],
            "IT Infrastructure": [("Amazon Web Services India",  300_000, 700_000),
                                   ("Salesforce India Pvt Ltd",   200_000, 500_000),
                                   ("Adobe Systems India",         60_000, 160_000)],
        }

        # Monthly volume multipliers (seasonality)
        month_multiplier = {
            1: 0.85, 2: 0.90, 3: 1.10, 4: 1.00, 5: 0.95, 6: 1.05,
            7: 0.90, 8: 0.95, 9: 1.10, 10: 1.15, 11: 1.20, 12: 1.25,
        }

        # Status distribution weights
        STATUS_WEIGHTS = {
            "PAID":         50,
            "APPROVED":     15,
            "POSTED_D365":  10,
            "PENDING_FIN_L1": 8,
            "PENDING_L1":   7,
            "REJECTED":     7,
            "AUTO_REJECT":  3,
        }
        statuses = list(STATUS_WEIGHTS.keys())
        weights  = list(STATUS_WEIGHTS.values())

        ANOMALY_WEIGHTS = [("NONE", 78), ("LOW", 10), ("MEDIUM", 8), ("HIGH", 3), ("CRITICAL", 1)]
        anom_vals   = [a[0] for a in ANOMALY_WEIGHTS]
        anom_wts    = [a[1] for a in ANOMALY_WEIGHTS]

        existing_refs = set(Expense.objects.values_list("ref_no", flat=True))
        created_count = 0
        bill_counter  = Expense.objects.count() + 1

        for yr in (2025, 2026):
            months = range(1, 13) if yr == 2025 else range(1, 6)
            for month in months:
                mult = month_multiplier[month]
                for dept_name, vendor_list in dept_vendor_map.items():
                    dept    = depts[dept_name]
                    submitter = submitters[dept_name]
                    # 2–4 invoices per dept per month
                    n_inv = random.randint(2, 4)
                    for _ in range(n_inv):
                        vname, lo, hi = random.choice(vendor_list)
                        vendor = vendors[vname]

                        base_amt = random.randint(int(lo * mult), int(hi * mult))
                        # GST at 18%
                        pre_gst = Decimal(str(base_amt))
                        cgst    = (pre_gst * Decimal("0.09")).quantize(Decimal("0.01"))
                        sgst    = (pre_gst * Decimal("0.09")).quantize(Decimal("0.01"))
                        total   = pre_gst + cgst + sgst
                        tds     = (pre_gst * Decimal("0.10")).quantize(Decimal("0.01"))

                        inv_day  = random.randint(1, 28)
                        inv_date = date(yr, month, inv_day)

                        status = random.choices(statuses, weights=weights, k=1)[0]
                        anom   = random.choices(anom_vals, weights=anom_wts, k=1)[0]
                        anom_db = None if anom == "NONE" else anom

                        # Force anomaly to NONE for PAID/APPROVED majority
                        if status in ("PAID", "APPROVED", "POSTED_D365") and random.random() > 0.12:
                            anom_db = None

                        ref_no = f"BILL-{yr}-{bill_counter:05d}"
                        while ref_no in existing_refs:
                            bill_counter += 1
                            ref_no = f"BILL-{yr}-{bill_counter:05d}"
                        existing_refs.add(ref_no)

                        Expense.objects.create(
                            ref_no           = ref_no,
                            vendor           = vendor,
                            submitted_by     = submitter,
                            invoice_number   = f"INV-{yr}{month:02d}-{bill_counter:04d}",
                            invoice_date     = inv_date,
                            pre_gst_amount   = pre_gst,
                            cgst             = cgst,
                            sgst             = sgst,
                            igst             = Decimal("0"),
                            total_amount     = total,
                            tds_amount       = tds,
                            tds_section      = "194C",
                            gstin            = vendor.gstin,
                            business_purpose = f"{vname} services for {dept_name} — {inv_date.strftime('%B %Y')}",
                            _status          = status,
                            anomaly_severity = anom_db,
                            current_step     = None,
                        )
                        bill_counter  += 1
                        created_count += 1

        self.stdout.write(f"  ✅ {created_count} expenses created across FY 2025–2026")

        # ── Summary ────────────────────────────────────────────────────────────
        from django.db.models import Sum, Count
        total_val = Expense.objects.aggregate(t=Sum("total_amount"))["t"] or 0
        paid_val  = Expense.objects.filter(_status="PAID").aggregate(t=Sum("total_amount"))["t"] or 0
        n_anom    = Expense.objects.exclude(anomaly_severity=None).count()

        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 Seed complete!\n"
            f"   Total invoices : {Expense.objects.count()}\n"
            f"   Total value    : ₹{float(total_val):,.0f}\n"
            f"   Paid value     : ₹{float(paid_val):,.0f}\n"
            f"   Anomaly flags  : {n_anom}\n"
            f"   Departments    : {Department.objects.count()}\n"
            f"   Vendors        : {Vendor.objects.count()}\n"
        ))
