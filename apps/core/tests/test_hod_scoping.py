import datetime
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.core.models import AuditLog, Department, User
from apps.core.permissions import hod_dept_filter
from apps.invoices.models import Budget, Expense, ExpenseApprovalStep
from apps.core.models import Vendor


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_dept(name):
    return Department.objects.get_or_create(name=name)[0]


def make_user(username, grade, dept=None):
    u = User.objects.create_user(username=username, password="pass")
    u.employee_grade = grade
    u.department = dept
    u.save()
    return u


def make_vendor(name="Test Vendor"):
    v, _ = Vendor.objects.get_or_create(
        name=name,
        defaults={"status": "ACTIVE", "is_approved": True},
    )
    return v


def make_expense(vendor, submitter, amount=1000, dept_status="PENDING_HOD", anomaly=None):
    exp = Expense.objects.create(
        vendor=vendor,
        submitted_by=submitter,
        pre_gst_amount=amount,
        total_amount=amount,
        anomaly_severity=anomaly,
    )
    exp._force_status(dept_status)
    exp.save()
    return exp


# ── Task 1: hod_dept_filter helper ───────────────────────────────────────────

@pytest.mark.django_db
class TestHodDeptFilter:
    def test_grade2_with_dept_filters_to_own_dept(self):
        dept_a = make_dept("Engineering")
        dept_b = make_dept("Finance")
        emp_a = make_user("filter_emp_a", 1, dept_a)
        emp_b = make_user("filter_emp_b", 1, dept_b)
        hod_a = make_user("filter_hod_a", 2, dept_a)
        vendor = make_vendor("Filter Vendor")

        exp_a = make_expense(vendor, emp_a)
        exp_b = make_expense(vendor, emp_b)

        qs = Expense.objects.filter(id__in=[exp_a.id, exp_b.id])
        filtered = hod_dept_filter(hod_a, qs, "submitted_by__department")
        ids = list(filtered.values_list("id", flat=True))

        assert exp_a.id in ids
        assert exp_b.id not in ids

    def test_grade2_without_dept_falls_back_to_own_submissions(self):
        vendor = make_vendor("Solo Vendor")
        hod_no_dept = make_user("filter_hod_nodept", 2, dept=None)
        other = make_user("filter_other", 1, dept=None)

        exp_own = make_expense(vendor, hod_no_dept, amount=500)
        exp_other = make_expense(vendor, other, amount=700)

        qs = Expense.objects.filter(id__in=[exp_own.id, exp_other.id])
        filtered = hod_dept_filter(hod_no_dept, qs, "submitted_by__department")
        ids = list(filtered.values_list("id", flat=True))

        assert exp_own.id in ids
        assert exp_other.id not in ids

    def test_non_grade2_user_gets_unfiltered_qs(self):
        dept_a = make_dept("HR")
        emp_a = make_user("filter_emp_hr", 1, dept_a)
        g3_user = make_user("filter_finmgr", 3, dept_a)
        vendor = make_vendor("HR Vendor")

        exp = make_expense(vendor, emp_a, amount=300)

        qs = Expense.objects.filter(id=exp.id)
        filtered = hod_dept_filter(g3_user, qs, "submitted_by__department")
        assert filtered.count() == qs.count()


# ── Task 2: FinanceQueueView ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestFinanceQueueHodScoping:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("Sales")
        self.dept_b = make_dept("Ops")
        self.hod_a = make_user("queue_hod_sales", 2, self.dept_a)
        emp_a = make_user("queue_emp_sales", 1, self.dept_a)
        emp_b = make_user("queue_emp_ops", 1, self.dept_b)
        vendor = make_vendor("Queue Vendor")

        self.exp_dept_a = make_expense(vendor, emp_a, dept_status="PENDING_HOD")
        self.exp_dept_b = make_expense(vendor, emp_b, dept_status="PENDING_HOD")

    def test_hod_sees_only_own_dept_in_queue(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("finance-queue"))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.data]
        assert str(self.exp_dept_a.id) in ids
        assert str(self.exp_dept_b.id) not in ids

    def test_g3_user_sees_all_depts_in_queue(self):
        g3 = make_user("queue_finmgr", 3, self.dept_a)
        self.client.force_authenticate(user=g3)
        resp = self.client.get(reverse("finance-queue"))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.data]
        assert str(self.exp_dept_a.id) in ids
        assert str(self.exp_dept_b.id) in ids


# ── Task 3: AuditLogListView ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestAuditLogHodScoping:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("Legal")
        self.dept_b = make_dept("IT")
        self.hod_a = make_user("audit_hod_legal", 2, self.dept_a)
        self.emp_a = make_user("audit_emp_legal", 1, self.dept_a)
        self.emp_b = make_user("audit_emp_it", 1, self.dept_b)

        self.log_a = AuditLog.objects.create(
            user=self.emp_a, action="expense.submitted", entity_type="Expense"
        )
        self.log_b = AuditLog.objects.create(
            user=self.emp_b, action="expense.submitted", entity_type="Expense"
        )

    def test_hod_sees_only_own_dept_audit_logs(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("audit-list"))
        assert resp.status_code == 200
        ids = [r["id"] for r in resp.data["results"]]
        assert str(self.log_a.id) in ids
        assert str(self.log_b.id) not in ids

    def test_g3_sees_logs_across_depts(self):
        g3 = make_user("audit_finmgr", 3, self.dept_a)
        self.client.force_authenticate(user=g3)
        resp = self.client.get(reverse("audit-list"))
        assert resp.status_code == 200
        ids = [r["id"] for r in resp.data["results"]]
        assert str(self.log_a.id) in ids
        assert str(self.log_b.id) in ids


# ── Task 4: Budget views ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBudgetHodScoping:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("Marketing")
        self.dept_b = make_dept("Supply Chain")
        self.hod_a = make_user("budget_hod_mkt", 2, self.dept_a)

        self.budget_a = Budget.objects.create(
            name="Marketing Q1",
            department=self.dept_a,
            fiscal_year=2026,
            start_date=datetime.date(2026, 1, 1),
            end_date=datetime.date(2026, 3, 31),
            total_amount=500000,
        )
        self.budget_b = Budget.objects.create(
            name="Supply Chain Q1",
            department=self.dept_b,
            fiscal_year=2026,
            start_date=datetime.date(2026, 1, 1),
            end_date=datetime.date(2026, 3, 31),
            total_amount=300000,
        )

    def test_hod_budget_list_shows_only_own_dept(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("budget-list"))
        assert resp.status_code == 200
        ids = [b["id"] for b in resp.data]
        assert str(self.budget_a.id) in ids
        assert str(self.budget_b.id) not in ids

    def test_hod_budget_detail_own_dept_allowed(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("budget-detail", args=[self.budget_a.id]))
        assert resp.status_code == 200

    def test_hod_budget_detail_other_dept_forbidden(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("budget-detail", args=[self.budget_b.id]))
        assert resp.status_code == 403

    def test_hod_budget_utilization_other_dept_forbidden(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("budget-utilization", args=[self.budget_b.id]))
        assert resp.status_code == 403

    def test_g3_sees_all_budgets(self):
        g3 = make_user("budget_finmgr", 3, self.dept_a)
        self.client.force_authenticate(user=g3)
        resp = self.client.get(reverse("budget-list"))
        assert resp.status_code == 200
        ids = [b["id"] for b in resp.data]
        assert str(self.budget_a.id) in ids
        assert str(self.budget_b.id) in ids


# ── Task 5: AnomalyListView ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestAnomalyListHodScoping:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("R&D")
        self.dept_b = make_dept("Admin")
        self.hod_a = make_user("anom_hod_rnd", 2, self.dept_a)
        emp_a = make_user("anom_emp_rnd", 1, self.dept_a)
        emp_b = make_user("anom_emp_admin", 1, self.dept_b)
        vendor = make_vendor("Anomaly Vendor")

        self.exp_a = make_expense(vendor, emp_a, amount=5000, anomaly="HIGH")
        self.exp_b = make_expense(vendor, emp_b, amount=8000, anomaly="CRITICAL")

    def test_hod_anomaly_list_shows_only_own_dept(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("finance-anomalies"))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.data]
        assert str(self.exp_a.id) in ids
        assert str(self.exp_b.id) not in ids

    def test_g3_anomaly_list_shows_all_depts(self):
        g3 = make_user("anom_finmgr", 3, self.dept_a)
        self.client.force_authenticate(user=g3)
        resp = self.client.get(reverse("finance-anomalies"))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.data]
        assert str(self.exp_a.id) in ids
        assert str(self.exp_b.id) in ids


# ── Task 6: HOD action restrictions ─────────────────────────────────────────

@pytest.mark.django_db
class TestHodActionRestrictions:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("Procurement")
        self.dept_b = make_dept("Security")
        self.hod_a = make_user("act_hod_proc", 2, self.dept_a)
        emp_b = make_user("act_emp_sec", 1, self.dept_b)
        vendor = make_vendor("Action Vendor")

        self.exp_other_dept = make_expense(vendor, emp_b, amount=3000, dept_status="PENDING_HOD")

    def test_hod_cannot_approve_other_dept_expense(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.post(
            reverse("finance-approve", args=[self.exp_other_dept.id]),
            {"reason": "Approved"},
        )
        assert resp.status_code == 403

    def test_hod_cannot_reject_other_dept_expense(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.post(
            reverse("finance-reject", args=[self.exp_other_dept.id]),
            {"reason": "Not valid for our dept at all."},
        )
        assert resp.status_code == 403

    def test_hod_cannot_query_other_dept_expense(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.post(
            reverse("finance-query", args=[self.exp_other_dept.id]),
            {"question": "Why is this in our queue exactly please?"},
        )
        assert resp.status_code == 403
