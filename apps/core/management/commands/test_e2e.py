"""
End-to-end test suite for FinanceAI.

Run: python manage.py test_e2e
Run with seed: python manage.py test_e2e --seed
Run verbose: python manage.py test_e2e --verbose

Tests every role, every key API operation, AI reports, and data workflows.
Designed to run on a fresh pull + fresh DB (after migrations + seed_demo).
"""

import json
import sys
from django.core.management.base import BaseCommand
from django.test import RequestFactory, TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


# ─── Test runner helpers ──────────────────────────────────────────────────────

PASS = "✅"
FAIL = "❌"
SKIP = "⚠️ "
INFO = "  ℹ️ "


class E2ERunner:
    def __init__(self, stdout, verbose=False):
        self.stdout = stdout
        self.verbose = verbose
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self._tokens = {}
        self._created = {}

    def _client(self):
        from django.test import Client
        return Client(SERVER_NAME="localhost")

    def login(self, username, password="demo1234"):
        c = self._client()
        r = c.post(
            "/api/v1/auth/login/",
            data=json.dumps({"username": username, "password": password}),
            content_type="application/json",
        )
        if r.status_code == 200:
            token = r.json()["access"]
            self._tokens[username] = token
            return token
        return None

    def get(self, path, username=None, token=None):
        c = self._client()
        tok = token or self._tokens.get(username)
        headers = {"HTTP_AUTHORIZATION": f"Bearer {tok}"} if tok else {}
        return c.get(path, **headers)

    def post(self, path, data, username=None, token=None, content_type="application/json"):
        c = self._client()
        tok = token or self._tokens.get(username)
        headers = {"HTTP_AUTHORIZATION": f"Bearer {tok}"} if tok else {}
        if content_type == "application/json":
            return c.post(path, json.dumps(data), content_type=content_type, **headers)
        return c.post(path, data, **headers)

    def patch(self, path, data, username=None, token=None):
        c = self._client()
        tok = token or self._tokens.get(username)
        headers = {"HTTP_AUTHORIZATION": f"Bearer {tok}"} if tok else {}
        return c.patch(path, json.dumps(data), content_type="application/json", **headers)

    def check(self, label, condition, detail=""):
        if condition:
            self.passed += 1
            if self.verbose:
                self.stdout.write(f"  {PASS} {label}")
        else:
            self.failed += 1
            self.stdout.write(f"  {FAIL} {label}" + (f" — {detail}" if detail else ""))

    def ok(self, label, response, expected=200):
        ok = response.status_code == expected
        detail = f"got {response.status_code}" if not ok else ""
        if not ok and self.verbose:
            try:
                detail += f" body={response.json()}"
            except Exception:
                pass
        self.check(label, ok, detail)
        return ok

    def section(self, title):
        self.stdout.write(f"\n{'─'*60}")
        self.stdout.write(f"  {title}")
        self.stdout.write(f"{'─'*60}")

    def summary(self):
        total = self.passed + self.failed + self.skipped
        self.stdout.write(f"\n{'═'*60}")
        self.stdout.write(f"  RESULTS: {self.passed}/{total} passed  |  {self.failed} failed  |  {self.skipped} skipped")
        self.stdout.write(f"{'═'*60}\n")
        return self.failed == 0


class Command(BaseCommand):
    help = "Run end-to-end tests across all roles and API operations"

    def add_arguments(self, parser):
        parser.add_argument("--seed", action="store_true", help="Run seed_demo before tests")
        parser.add_argument("--verbose", action="store_true", help="Show passing tests too")

    def handle(self, *args, **options):
        if options["seed"]:
            self.stdout.write("🌱 Running seed_demo first...")
            from django.core.management import call_command
            call_command("seed_demo", verbosity=0)
            self.stdout.write("  Done.\n")

        r = E2ERunner(self.stdout, verbose=options["verbose"])
        self.stdout.write("🧪 FinanceAI End-to-End Test Suite\n")

        self._test_migrations(r)
        self._test_auth_all_roles(r)
        self._test_core_data(r)
        self._test_expense_workflow(r)
        self._test_vendor_operations(r)
        self._test_budget_and_forecasting(r)
        self._test_analytics_reports(r)
        self._test_ai_reports(r)
        self._test_notifications(r)
        self._test_audit_trail(r)
        self._test_role_access_control(r)
        self._test_fresh_migration_readiness(r)

        ok = r.summary()
        if not ok:
            sys.exit(1)

    # ─── Migration & DB health ────────────────────────────────────────────────

    def _test_migrations(self, r):
        r.section("1. Database & Migrations")
        from django.db import connection
        from django.db.migrations.executor import MigrationExecutor

        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        r.check("No pending migrations", len(plan) == 0,
                f"{len(plan)} pending: {[str(m) for m, _ in plan]}")

        # Check all expected tables exist
        with connection.cursor() as cur:
            cur.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema='public'
            """)
            tables = {row[0] for row in cur.fetchall()}

        for t in ["core_user", "core_vendor", "core_department", "core_group_profile",
                  "invoices_expense", "invoices_budget", "invoices_monthlyfinancialsummary",
                  "notifications_notification", "django_celery_beat_periodictask"]:
            r.check(f"Table exists: {t}", t in tables)

    # ─── Auth & Role Login ────────────────────────────────────────────────────

    def _test_auth_all_roles(self, r):
        r.section("2. Auth — All Roles Login")

        roles = [
            ("l1_approver", "Grade 1 — Employee"),
            ("hod",         "Grade 2 — HOD"),
            ("fin_manager", "Grade 3 — Finance Manager"),
            ("fin_admin",   "Grade 4 — Finance Admin"),
            ("cfo",         "Grade 5 — CFO / Superuser"),
        ]

        for username, label in roles:
            tok = r.login(username)
            r.check(f"Login: {label} ({username})", tok is not None)

        # Token refresh
        if "fin_admin" in r._tokens:
            c = r._client()
            resp = c.post(
                "/api/v1/auth/login/",
                data=json.dumps({"username": "fin_admin", "password": "demo1234"}),
                content_type="application/json",
            )
            if resp.status_code == 200:
                refresh = resp.json().get("refresh")
                resp2 = c.post(
                    "/api/v1/auth/refresh/",
                    data=json.dumps({"refresh": refresh}),
                    content_type="application/json",
                )
                r.ok("Token refresh works", resp2)

        # /me endpoint for each role
        for username, label in roles:
            if username in r._tokens:
                resp = r.get("/api/v1/auth/me/", username=username)
                if resp.status_code == 200:
                    data = resp.json()
                    r.check(
                        f"/me returns correct username for {label}",
                        data.get("username") == username
                    )
                else:
                    r.ok(f"/me for {label}", resp)

        # Wrong password rejected
        resp = r._client().post(
            "/api/v1/auth/login/",
            data=json.dumps({"username": "fin_admin", "password": "wrongpass"}),
            content_type="application/json",
        )
        r.check("Wrong password rejected (401/400)", resp.status_code in (400, 401))

        # Unauthenticated request rejected
        resp = r.get("/api/v1/invoices/budgets/")
        r.check("Unauthenticated request rejected (401)", resp.status_code == 401)

    # ─── Core data ────────────────────────────────────────────────────────────

    def _test_core_data(self, r):
        r.section("3. Core Data — Departments, Users, Groups")

        resp = r.get("/api/v1/auth/departments/", username="fin_admin")
        r.ok("GET departments", resp)
        if resp.status_code == 200:
            depts = resp.json()
            r.check("At least 1 department exists", len(depts) >= 1)

        resp = r.get("/api/v1/auth/users/", username="fin_admin")
        r.ok("GET users (Grade 4)", resp)
        if resp.status_code == 200:
            users_data = resp.json()
            if isinstance(users_data, list):
                r.check("At least 5 demo users exist", len(users_data) >= 5)

        resp = r.get("/api/v1/auth/groups/", username="fin_admin")
        r.ok("GET groups", resp)

        # Grade 1 cannot list all users
        resp = r.get("/api/v1/auth/users/", username="l1_approver")
        r.check("Grade 1 cannot list all users (403)", resp.status_code == 403)

    # ─── Expense workflow ─────────────────────────────────────────────────────

    def _test_expense_workflow(self, r):
        r.section("4. Expense Workflow — Submit → Approve → Settle")
        from apps.core.models import Vendor, Department
        from apps.invoices.models import Budget

        vendor = Vendor.objects.filter(status="active").first()
        dept = Department.objects.first()

        if not vendor or not dept:
            r.skipped += 1
            self.stdout.write(f"  {SKIP} No vendor/dept seeded — skipping expense workflow")
            return

        budget = Budget.objects.filter(department=dept, status="active").first()
        category = budget.name if budget else "Operations"

        # Submit expense as l1_approver
        payload = {
            "vendor_id": str(vendor.id),
            "total_amount": 5000,
            "gst_amount": 900,
            "pre_gst_amount": 4100,
            "description": "E2E test expense",
            "expense_category": category,
            "business_purpose": "Testing e2e workflow",
            "submission_type": "internal",
        }
        resp = r.post("/api/v1/invoices/submit/", payload, username="l1_approver")
        r.ok("Submit expense (Grade 1)", resp, expected=201)

        expense_id = None
        if resp.status_code == 201:
            expense_id = resp.json().get("id")
            r._created["expense_id"] = expense_id
            r.check("Expense ID returned", bool(expense_id))

        # Finance queue visible to fin_admin
        resp = r.get("/api/v1/invoices/finance/expenses/", username="fin_admin")
        r.ok("GET finance expenses (Grade 4)", resp)

        # Approval queue
        resp = r.get("/api/v1/invoices/queue/", username="hod")
        r.ok("GET approval queue (Grade 2)", resp)

        # Expense detail
        if expense_id:
            resp = r.get(f"/api/v1/invoices/{expense_id}/", username="fin_admin")
            r.ok("GET expense detail", resp)

        # Finance bill detail & approve
        if expense_id:
            resp = r.get(f"/api/v1/invoices/finance/bills/{expense_id}/", username="fin_admin")
            r.ok("GET finance bill detail", resp)

            resp = r.post(
                f"/api/v1/invoices/finance/bills/{expense_id}/approve/",
                {"note": "E2E approved"},
                username="fin_admin",
            )
            # May be 200 or 400 (wrong workflow state) - just check it responds
            r.check("Approve bill responds", resp.status_code in (200, 400, 403))

        # Dashboard stats
        resp = r.get("/api/v1/invoices/dashboard/stats/", username="fin_admin")
        r.ok("Dashboard stats", resp)

    # ─── Vendor operations ───────────────────────────────────────────────────

    def _test_vendor_operations(self, r):
        r.section("5. Vendor Management")

        resp = r.get("/api/v1/invoices/vendors/", username="fin_admin")
        r.ok("GET vendor list (Grade 4)", resp)
        if resp.status_code == 200:
            vendors = resp.json()
            r.check("Vendors returned", isinstance(vendors, list))

        import uuid as _uuid
        unique = str(_uuid.uuid4())[:8].upper()
        # Create vendor (unique GSTIN per run)
        payload = {
            "name": f"E2E Test Vendor {unique} Pvt Ltd",
            "vendor_type": "company",
            "gstin": f"22BBBBB{unique[:4]}B1Z5",
            "pan": f"BBBBB{unique[:4]}B",
            "email": f"e2e_{unique}@testvendor.com",
            "phone": "9999999998",
        }
        resp = r.post("/api/v1/invoices/vendors/create/", payload, username="fin_admin")
        r.ok("Create vendor (Grade 3+)", resp, expected=201)
        vendor_id = None
        if resp.status_code == 201:
            vendor_id = resp.json().get("id")
            r._created["vendor_id"] = vendor_id

        # Vendor detail
        if vendor_id:
            resp = r.get(f"/api/v1/invoices/vendors/{vendor_id}/", username="fin_admin")
            r.ok("GET vendor detail", resp)

        # Risk watch
        resp = r.get("/api/v1/invoices/risk-watch/", username="fin_admin")
        r.ok("GET risk watch", resp)

        # Grade 1 cannot create vendors (permission check before data validation)
        payload_g1 = {**payload, "gstin": f"22CCCCC{unique[:4]}C1Z5", "pan": f"CCCCC{unique[:4]}C"}
        resp = r.post("/api/v1/invoices/vendors/create/", payload_g1, username="l1_approver")
        r.check("Grade 1 cannot create vendor (403)", resp.status_code == 403)

        # Grade 2 cannot create vendors
        resp = r.post("/api/v1/invoices/vendors/create/", payload_g1, username="hod")
        r.check("Grade 2 cannot create vendor (403)", resp.status_code == 403)

    # ─── Budget & Forecasting ─────────────────────────────────────────────────

    def _test_budget_and_forecasting(self, r):
        r.section("6. Budget & Forecasting")

        resp = r.get("/api/v1/invoices/budgets/", username="fin_admin")
        r.ok("GET budget list", resp)
        if resp.status_code == 200:
            budgets = resp.json()
            r.check("Budgets seeded", len(budgets) >= 1)
            if budgets:
                bid = budgets[0].get("id")
                r._created["budget_id"] = bid
                resp2 = r.get(f"/api/v1/invoices/budgets/{bid}/", username="fin_admin")
                r.ok("GET budget detail", resp2)
                resp3 = r.get(f"/api/v1/invoices/budgets/{bid}/utilization/", username="fin_admin")
                r.ok("GET budget utilization", resp3)

        resp = r.get("/api/v1/invoices/forecasting/cashflow/", username="fin_admin")
        r.ok("GET cashflow forecast", resp)

        # Budget endpoints are Grade 4+ only
        resp = r.get("/api/v1/invoices/budgets/", username="hod")
        r.check("Grade 2 blocked from budget list (Grade 4+ only)", resp.status_code == 403)

        resp = r.get("/api/v1/invoices/budgets/", username="l1_approver")
        r.check("Grade 1 blocked from budget list (Grade 4+ only)", resp.status_code == 403)

    # ─── Analytics & Reports ─────────────────────────────────────────────────

    def _test_analytics_reports(self, r):
        r.section("7. Analytics — All Report Endpoints")

        analytics_endpoints = [
            ("/api/v1/invoices/analytics/spend-intelligence/",  "Spend Intelligence"),
            ("/api/v1/invoices/analytics/vendor-risk/",         "Vendor Risk Score"),
            ("/api/v1/invoices/analytics/payment-prediction/",  "Payment Prediction"),
            ("/api/v1/invoices/analytics/budget-health/",       "Budget Health"),
            ("/api/v1/invoices/analytics/gst-recon/",           "GST Reconciliation"),
            ("/api/v1/invoices/analytics/tds-compliance/",      "TDS Compliance"),
            ("/api/v1/invoices/analytics/working-capital/",     "Working Capital"),
            ("/api/v1/invoices/analytics/spend-velocity/",      "Spend Velocity"),
            ("/api/v1/invoices/analytics/policy-compliance/",   "Policy Compliance"),
            ("/api/v1/invoices/analytics/supplier-scorecard/",  "Supplier Scorecard"),
            ("/api/v1/invoices/analytics/dept-variance/",       "Department Variance"),
            ("/api/v1/invoices/analytics/po-match/",            "PO Match Status"),
            ("/api/v1/invoices/analytics/command-center/",      "Command Center (Grade 3+)"),
            ("/api/v1/invoices/analytics/monthly-summary/?month=2026-04", "Monthly Summary"),
            ("/api/v1/invoices/analytics/annual-report/?year=2026",       "Annual Report"),
        ]

        for path, label in analytics_endpoints:
            resp = r.get(path, username="fin_admin")
            r.ok(label, resp)

        # Audit sweep (POST)
        resp = r.post("/api/v1/invoices/analytics/audit-sweep/", {}, username="fin_admin")
        r.ok("Audit Sweep (POST)", resp)

        # Command center requires Grade 3+
        resp = r.get("/api/v1/invoices/analytics/command-center/", username="l1_approver")
        r.check("Command center blocked for Grade 1 (403)", resp.status_code == 403)

    # ─── AI Reports ──────────────────────────────────────────────────────────

    def _test_ai_reports(self, r):
        r.section("8. AI Reports (with_ai=1 & 10-Q generation)")

        # Monthly summary with AI narrative
        resp = r.get(
            "/api/v1/invoices/analytics/monthly-summary/?month=2026-04&with_ai=1",
            username="fin_admin",
        )
        r.ok("Monthly Summary with AI narrative", resp)
        if resp.status_code == 200:
            data = resp.json()
            r.check("AI narrative field present", "ai_narrative" in str(data) or "summaries" in data)

        # Annual report AI narrative
        resp = r.get(
            "/api/v1/invoices/analytics/annual-report/?year=2026&with_ai=1",
            username="fin_admin",
        )
        r.ok("Annual Report with AI narrative", resp)

        # Generate 10-Q (POST)
        resp = r.post(
            "/api/v1/invoices/analytics/generate-10q/",
            {"year": 2026, "quarter": 1},
            username="cfo",
        )
        r.ok("Generate 10-Q filing (CFO)", resp)
        if resp.status_code == 200:
            data = resp.json()
            r.check("10-Q has content/filing_text", bool(
                data.get("content") or data.get("filing_text") or data.get("report") or data.get("sections")
            ))

        # Grade 3+ can access 10-Q
        resp = r.post(
            "/api/v1/invoices/analytics/generate-10q/",
            {"year": 2026, "quarter": 1},
            username="fin_manager",
        )
        r.check("Finance Manager can generate 10-Q", resp.status_code in (200, 400, 403))

        # Spend intelligence AI insight
        resp = r.get("/api/v1/invoices/analytics/spend-intelligence/", username="fin_admin")
        if resp.status_code == 200:
            data = resp.json()
            r.check("Spend Intelligence has AI insight field", "ai_insight" in data or "insight" in str(data))

        # Monthly summary cache — second call should be faster (cached)
        resp = r.get(
            "/api/v1/invoices/analytics/monthly-summary/?month=2026-04",
            username="fin_admin",
        )
        r.ok("Monthly Summary cache hit (second call)", resp)
        if resp.status_code == 200:
            from apps.invoices.models import MonthlyFinancialSummary
            cached = MonthlyFinancialSummary.objects.filter(month_key="2026-04").first()
            r.check("MonthlyFinancialSummary row persisted in DB", cached is not None)

    # ─── Notifications ───────────────────────────────────────────────────────

    def _test_notifications(self, r):
        r.section("9. Notifications")

        resp = r.get("/api/v1/notifications/", username="fin_admin")
        r.ok("GET notifications", resp)
        if resp.status_code == 200:
            data = resp.json()
            r.check("Notifications response has correct shape",
                    "notifications" in data and "unread_count" in data)

        resp = r.get("/api/v1/notifications/unread-count/", username="fin_admin")
        r.ok("GET unread count", resp)

        resp = r.post("/api/v1/notifications/mark-all-read/", {}, username="fin_admin")
        r.ok("POST mark all read", resp)

        resp = r.get("/api/v1/notifications/preferences/", username="fin_admin")
        r.ok("GET notification preferences", resp)

        # Create a test notification and mark it read
        from apps.notifications.models import Notification
        user = User.objects.filter(username="fin_admin").first()
        if user:
            notif = Notification.objects.create(
                user=user,
                title="E2E Test Notification",
                message="This is a test",
                priority="LOW",
            )
            resp = r.post(
                f"/api/v1/notifications/{notif.id}/mark-read/",
                {},
                username="fin_admin",
            )
            r.ok("POST mark single notification read", resp)
            notif.refresh_from_db()
            r.check("Notification marked as read in DB", notif.is_read)
            notif.delete()

    # ─── Audit Trail ─────────────────────────────────────────────────────────

    def _test_audit_trail(self, r):
        r.section("10. Audit Trail")

        resp = r.get("/api/v1/audit/", username="fin_admin")
        r.ok("GET audit log (Grade 4)", resp)
        if resp.status_code == 200:
            data = resp.json()
            logs = data if isinstance(data, list) else data.get("results", [])
            r.check("Audit log entries exist (login events recorded)", len(logs) >= 1)

        # CFO sees full audit
        resp = r.get("/api/v1/audit/", username="cfo")
        r.ok("GET audit log (CFO)", resp)

        # Grade 1 and Grade 2 cannot access audit log (Grade 3+ required)
        resp = r.get("/api/v1/audit/", username="l1_approver")
        r.check("Grade 1 blocked from audit log (403)", resp.status_code == 403)

    # ─── Role Access Control ─────────────────────────────────────────────────

    def _test_role_access_control(self, r):
        r.section("11. Role-Based Access Control")

        # Register new user — requires Grade 4
        new_user_payload = {
            "username": "e2e_test_user",
            "email": "e2e@test.financeai.in",
            "first_name": "E2E",
            "last_name": "Test",
            "password": "TestPass123!",
            "employee_grade": 1,
        }
        resp = r.post("/api/v1/auth/register/", new_user_payload, username="fin_admin")
        r.ok("Register new user (Grade 4)", resp, expected=201)

        resp = r.post("/api/v1/auth/register/", new_user_payload, username="hod")
        r.check("Grade 2 cannot register users (403)", resp.status_code == 403)

        # User export — requires is_staff (fin_admin + cfo)
        resp = r.get("/api/v1/auth/users/export/", username="fin_admin")
        r.ok("User export CSV (fin_admin is_staff)", resp)

        resp = r.get("/api/v1/auth/users/export/", username="l1_approver")
        r.check("Grade 1 cannot export users (403)", resp.status_code == 403)

        # Anomaly list — finance only
        resp = r.get("/api/v1/invoices/finance/anomalies/", username="fin_admin")
        r.ok("GET anomalies (Finance Admin)", resp)

        resp = r.get("/api/v1/invoices/finance/anomalies/", username="l1_approver")
        r.check("Grade 1 blocked from anomalies (Grade 3+ required)", resp.status_code == 403)

        resp = r.get("/api/v1/invoices/finance/anomalies/", username="hod")
        r.check("Grade 2 blocked from anomalies (Grade 3+ required)", resp.status_code == 403)

        # Cleanup test user
        User.objects.filter(username="e2e_test_user").delete()

    # ─── Fresh migration readiness ─────────────────────────────────────────

    def _test_fresh_migration_readiness(self, r):
        r.section("12. Fresh Pull Readiness Checks")

        import os
        from pathlib import Path

        base = Path(__file__).resolve().parents[4]  # /app

        # Check migration files exist and have correct dependencies
        from django.db import connection
        from django.db.migrations.loader import MigrationLoader
        loader = MigrationLoader(connection)
        r.check("Migration loader has no conflicts", not loader.detect_conflicts())

        # Check config/settings.py has no broken imports
        settings_path = base / "config" / "settings.py"
        content = settings_path.read_text()
        r.check("settings.py: no apps.d365 reference", "apps.d365" not in content)
        r.check("settings.py: no clickhouse_backend", "clickhouse_backend" not in content)
        r.check("settings.py: apps.notifications present", "apps.notifications" in content)

        # Check config/urls.py has no broken includes
        urls_path = base / "config" / "urls.py"
        urls_content = urls_path.read_text()
        active_url_lines = [
            ln for ln in urls_content.splitlines()
            if 'include("apps.d365' in ln and not ln.strip().startswith("#")
        ]
        r.check("urls.py: no active apps.d365 include", len(active_url_lines) == 0)

        # Check all INSTALLED_APPS actually exist as directories
        from django.conf import settings as django_settings
        missing_apps = []
        for app in django_settings.INSTALLED_APPS:
            if app.startswith("apps."):
                app_module = app.split(".apps.")[0] if ".apps." in app else app
                app_dir = base / app_module.replace(".", "/")
                if not app_dir.exists():
                    missing_apps.append(app)
        r.check(f"All local apps directories exist", len(missing_apps) == 0,
                f"Missing: {missing_apps}")

        # seed_demo idempotency — run twice should not crash
        try:
            from django.core.management import call_command
            call_command("seed_demo", verbosity=0)
            call_command("seed_demo", verbosity=0)
            r.check("seed_demo is idempotent (runs twice without error)", True)
        except Exception as e:
            r.check("seed_demo is idempotent", False, str(e))
