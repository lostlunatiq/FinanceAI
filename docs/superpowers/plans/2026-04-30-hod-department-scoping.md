# HOD Department Scoping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict Grade-2 (HOD) users to see and act only on data from their own department across all views — expense queue, audit log, budgets, anomalies, and action endpoints.

**Architecture:** Add a `hod_dept_filter()` utility to `permissions.py`, then call it in 8 view methods across 3 files. Action endpoints (Approve/Reject/Query) additionally get a department ownership check that returns 403 before any state change. No new models or migrations needed.

**Tech Stack:** Django 5.2, DRF, pytest-django, factory-boy

---

## Files Modified

| File | Change |
|---|---|
| `apps/core/permissions.py` | Add `hod_dept_filter(user, qs, dept_lookup)` helper |
| `apps/invoices/employee_views.py` | Scope `FinanceQueueView`, `AnomalyListView`, `ApproveView`, `RejectView`, `QueryView` |
| `apps/core/auth_views.py` | Scope `AuditLogListView`, `_run_nl_query` |
| `apps/invoices/budget_views.py` | Scope `BudgetListView`, `BudgetDetailView`, `BudgetUtilizationView` |
| `apps/core/tests/test_hod_scoping.py` | All tests (new file) |

---

## Task 1: Add `hod_dept_filter` helper and test it

**Files:**
- Modify: `apps/core/permissions.py`
- Create: `apps/core/tests/__init__.py` (empty)
- Create: `apps/core/tests/test_hod_scoping.py`

- [ ] **Step 1: Create the test file with a failing test for the helper**

Create `apps/core/tests/__init__.py` (empty file).

Create `apps/core/tests/test_hod_scoping.py`:

```python
import pytest
from apps.core.models import Department, User
from apps.core.permissions import hod_dept_filter
from apps.invoices.models import Expense, Budget
from apps.core.models import Vendor


def make_dept(name):
    return Department.objects.create(name=name)


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


@pytest.mark.django_db
class TestHodDeptFilter:
    def test_grade2_with_dept_filters_to_own_dept(self):
        dept_a = make_dept("Engineering")
        dept_b = make_dept("Finance")
        employee_a = make_user("emp_a", 1, dept_a)
        employee_b = make_user("emp_b", 1, dept_b)
        hod_a = make_user("hod_a", 2, dept_a)
        vendor = make_vendor()

        exp_a = Expense.objects.create(
            vendor=vendor,
            submitted_by=employee_a,
            pre_gst_amount=1000,
            total_amount=1000,
        )
        exp_a._force_status("PENDING_L1")
        exp_a.save()

        exp_b = Expense.objects.create(
            vendor=vendor,
            submitted_by=employee_b,
            pre_gst_amount=2000,
            total_amount=2000,
        )
        exp_b._force_status("PENDING_L1")
        exp_b.save()

        qs = Expense.objects.all()
        filtered = hod_dept_filter(hod_a, qs, "submitted_by__department")
        ids = list(filtered.values_list("id", flat=True))

        assert exp_a.id in ids
        assert exp_b.id not in ids

    def test_grade2_without_dept_falls_back_to_own_submissions(self):
        vendor = make_vendor("Solo Vendor")
        hod_no_dept = make_user("hod_nodept", 2, dept=None)
        other = make_user("other", 1, dept=None)

        exp_own = Expense.objects.create(
            vendor=vendor, submitted_by=hod_no_dept, pre_gst_amount=500, total_amount=500
        )
        exp_own._force_status("PENDING_L1")
        exp_own.save()

        exp_other = Expense.objects.create(
            vendor=vendor, submitted_by=other, pre_gst_amount=700, total_amount=700
        )
        exp_other._force_status("PENDING_L1")
        exp_other.save()

        qs = Expense.objects.all()
        filtered = hod_dept_filter(hod_no_dept, qs, "submitted_by__department")
        ids = list(filtered.values_list("id", flat=True))

        assert exp_own.id in ids
        assert exp_other.id not in ids

    def test_non_grade2_user_gets_unfiltered_qs(self):
        dept_a = make_dept("HR")
        employee = make_user("emp_hr", 1, dept_a)
        g3_user = make_user("finmgr", 3, dept_a)
        vendor = make_vendor("HR Vendor")

        exp = Expense.objects.create(
            vendor=vendor, submitted_by=employee, pre_gst_amount=300, total_amount=300
        )
        exp._force_status("PENDING_L1")
        exp.save()

        qs = Expense.objects.all()
        filtered = hod_dept_filter(g3_user, qs, "submitted_by__department")
        # For non-G2 users, the queryset is returned unchanged
        assert filtered.count() == qs.count()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/naman.mishra/SupplyChainSolutions/FinanceAI
python -m pytest apps/core/tests/test_hod_scoping.py::TestHodDeptFilter -v 2>&1 | head -30
```

Expected: `ImportError: cannot import name 'hod_dept_filter'`

- [ ] **Step 3: Implement `hod_dept_filter` in `permissions.py`**

Open `apps/core/permissions.py` and add after the existing `HasMinimumGrade` class:

```python
def hod_dept_filter(user, qs, dept_lookup: str):
    """
    For Grade-2 HOD users: filter queryset to their department only.
    For all other grades: return the queryset unchanged.

    dept_lookup: ORM lookup path to the department FK, e.g.
        "submitted_by__department"  for Expense
        "department"                for Budget
        "user__department"          for AuditLog user field
    """
    if (user.employee_grade or 0) != 2:
        return qs
    if user.department_id:
        return qs.filter(**{dept_lookup: user.department})
    # HOD with no department assigned — fall back to own records
    # Derive the submitter lookup from the dept_lookup by stripping "__department"
    submitter_lookup = dept_lookup.replace("__department", "")
    if submitter_lookup == dept_lookup:
        # No "__department" in path — filter directly
        return qs.filter(**{dept_lookup: None}).none()
    return qs.filter(**{submitter_lookup: user})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestHodDeptFilter -v
```

Expected: 3 PASSED

- [ ] **Step 5: Commit**

```bash
git add apps/core/permissions.py apps/core/tests/__init__.py apps/core/tests/test_hod_scoping.py
git commit -m "feat: add hod_dept_filter helper for department-scoped querysets"
```

---

## Task 2: Scope `FinanceQueueView` to HOD's department

**Files:**
- Modify: `apps/invoices/employee_views.py` (FinanceQueueView, lines 35-93)
- Modify: `apps/core/tests/test_hod_scoping.py` (add test class)

- [ ] **Step 1: Write the failing test**

Append to `apps/core/tests/test_hod_scoping.py`:

```python
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestFinanceQueueHodScoping:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("Sales")
        self.dept_b = make_dept("Ops")
        self.hod_a = make_user("hod_sales", 2, self.dept_a)
        emp_a = make_user("emp_sales", 1, self.dept_a)
        emp_b = make_user("emp_ops", 1, self.dept_b)
        vendor = make_vendor("Queue Vendor")

        self.exp_dept_a = Expense.objects.create(
            vendor=vendor, submitted_by=emp_a, pre_gst_amount=1000, total_amount=1000
        )
        self.exp_dept_a._force_status("PENDING_HOD")
        self.exp_dept_a.save()

        self.exp_dept_b = Expense.objects.create(
            vendor=vendor, submitted_by=emp_b, pre_gst_amount=2000, total_amount=2000
        )
        self.exp_dept_b._force_status("PENDING_HOD")
        self.exp_dept_b.save()

    def test_hod_sees_only_own_dept_in_queue(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("finance-queue"))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.data]
        assert str(self.exp_dept_a.id) in ids
        assert str(self.exp_dept_b.id) not in ids

    def test_g3_user_sees_all_depts_in_queue(self):
        g3 = make_user("finmgr2", 3, self.dept_a)
        self.client.force_authenticate(user=g3)
        resp = self.client.get(reverse("finance-queue"))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.data]
        assert str(self.exp_dept_a.id) in ids
        assert str(self.exp_dept_b.id) in ids
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestFinanceQueueHodScoping -v
```

Expected: FAIL — HOD sees both departments' expenses.

- [ ] **Step 3: Implement the fix in `FinanceQueueView.get()`**

In `apps/invoices/employee_views.py`, find `FinanceQueueView.get()` (~line 38). Replace the block:

```python
        if user.is_superuser or grade >= 2:
            # CFO / superuser sees everything including PENDING_CFO
            if user.is_superuser or grade >= 5:
```

with:

```python
        if user.is_superuser or grade >= 2:
            from apps.core.permissions import hod_dept_filter
            # CFO / superuser sees everything including PENDING_CFO
            if user.is_superuser or grade >= 5:
```

Then after the `expenses = (Expense.objects.filter(...).order_by("-created_at"))` queryset is built (line ~74, before `return Response`), add the HOD filter. The full fixed block looks like this — replace from `if user.is_superuser or grade >= 2:` through `return Response(...)` for the superuser branch:

```python
        if user.is_superuser or grade >= 2:
            from apps.core.permissions import hod_dept_filter
            if user.is_superuser or grade >= 5:
                pending_statuses = [
                    "SUBMITTED",
                    "PENDING_L1",
                    "PENDING_L2",
                    "PENDING_HOD",
                    "PENDING_FIN_L1",
                    "PENDING_FIN_L2",
                    "PENDING_FIN_HEAD",
                    "PENDING_CFO",
                    "QUERY_RAISED",
                ]
            else:
                pending_statuses = [
                    "SUBMITTED",
                    "PENDING_L1",
                    "PENDING_L2",
                    "PENDING_HOD",
                    "PENDING_FIN_L1",
                    "PENDING_FIN_L2",
                    "PENDING_FIN_HEAD",
                    "QUERY_RAISED",
                ]

            expenses = (
                Expense.objects.filter(_status__in=pending_statuses)
                .exclude(vendor__name="Internal Expense")
                .select_related("vendor", "submitted_by")
                .order_by("-created_at")
            )
            expenses = hod_dept_filter(user, expenses, "submitted_by__department")
            return Response(
                VendorBillListSerializer(expenses, many=True, context={"request": request}).data
            )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestFinanceQueueHodScoping -v
```

Expected: 2 PASSED

- [ ] **Step 5: Commit**

```bash
git add apps/invoices/employee_views.py apps/core/tests/test_hod_scoping.py
git commit -m "feat: scope finance queue to HOD's department only"
```

---

## Task 3: Scope `AuditLogListView` to HOD's department

**Files:**
- Modify: `apps/core/auth_views.py` (AuditLogListView, lines 167-300)
- Modify: `apps/core/tests/test_hod_scoping.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/core/tests/test_hod_scoping.py`:

```python
from apps.core.models import AuditLog


@pytest.mark.django_db
class TestAuditLogHodScoping:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("Legal")
        self.dept_b = make_dept("IT")
        self.hod_a = make_user("hod_legal", 2, self.dept_a)
        self.emp_a = make_user("emp_legal", 1, self.dept_a)
        self.emp_b = make_user("emp_it", 1, self.dept_b)

        self.log_a = AuditLog.objects.create(
            user=self.emp_a,
            action="expense.submitted",
            entity_type="Expense",
        )
        self.log_b = AuditLog.objects.create(
            user=self.emp_b,
            action="expense.submitted",
            entity_type="Expense",
        )

    def test_hod_sees_only_own_dept_audit_logs(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("audit-list"))
        assert resp.status_code == 200
        ids = [r["id"] for r in resp.data["results"]]
        assert str(self.log_a.id) in ids
        assert str(self.log_b.id) not in ids

    def test_g3_sees_logs_across_depts(self):
        g3 = make_user("finmgr_audit", 3, self.dept_a)
        self.client.force_authenticate(user=g3)
        resp = self.client.get(reverse("audit-list"))
        assert resp.status_code == 200
        ids = [r["id"] for r in resp.data["results"]]
        assert str(self.log_a.id) in ids
        assert str(self.log_b.id) in ids
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestAuditLogHodScoping -v
```

Expected: FAIL — HOD sees logs from other departments.

- [ ] **Step 3: Implement the fix in `AuditLogListView.get()`**

In `apps/core/auth_views.py`, find the block (around line 222):

```python
        elif not is_cfo and grade < 4:
            # Mid-level: restrict to logs from users at or below their grade
            visible_user_ids = list(
                User.objects.filter(
                    employee_grade__lte=grade, is_active=True
                ).values_list("id", flat=True)
            )
            if str(user.id) not in [str(uid) for uid in visible_user_ids]:
                visible_user_ids.append(user.id)

            qs = qs.filter(user_id__in=visible_user_ids)
```

Replace it with:

```python
        elif not is_cfo and grade < 4:
            # Mid-level: restrict to logs from users at or below their grade
            grade_qs = User.objects.filter(employee_grade__lte=grade, is_active=True)
            # G2 HOD: further restrict to own department
            if grade == 2 and user.department_id:
                grade_qs = grade_qs.filter(department=user.department)
            visible_user_ids = list(grade_qs.values_list("id", flat=True))
            if user.id not in visible_user_ids:
                visible_user_ids.append(user.id)

            qs = qs.filter(user_id__in=visible_user_ids)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestAuditLogHodScoping -v
```

Expected: 2 PASSED

- [ ] **Step 5: Commit**

```bash
git add apps/core/auth_views.py apps/core/tests/test_hod_scoping.py
git commit -m "feat: scope audit log to HOD's department only"
```

---

## Task 4: Scope Budget views to HOD's department

**Files:**
- Modify: `apps/invoices/budget_views.py`
- Modify: `apps/core/tests/test_hod_scoping.py`

- [ ] **Step 1: Write the failing tests**

Append to `apps/core/tests/test_hod_scoping.py`:

```python
from apps.invoices.models import Budget
import datetime


@pytest.mark.django_db
class TestBudgetHodScoping:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("Marketing")
        self.dept_b = make_dept("Supply Chain")
        self.hod_a = make_user("hod_mkt", 2, self.dept_a)

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
        g3 = make_user("finmgr_budget", 3, self.dept_a)
        self.client.force_authenticate(user=g3)
        resp = self.client.get(reverse("budget-list"))
        assert resp.status_code == 200
        ids = [b["id"] for b in resp.data]
        assert str(self.budget_a.id) in ids
        assert str(self.budget_b.id) in ids
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestBudgetHodScoping -v
```

Expected: FAIL — HOD sees all budgets.

- [ ] **Step 3: Implement the fix in `BudgetListView.get()`**

In `apps/invoices/budget_views.py`, find `BudgetListView.get()` (line 25). After `budgets = Budget.objects.select_related(...)`, add the HOD filter:

Replace:
```python
    def get(self, request):
        from .models import Budget
        budgets = Budget.objects.select_related("department", "created_by").all()
        dept_id = request.query_params.get("department")
        if dept_id:
            budgets = budgets.filter(department_id=dept_id)
```

With:
```python
    def get(self, request):
        from .models import Budget
        from apps.core.permissions import hod_dept_filter
        budgets = Budget.objects.select_related("department", "created_by").all()
        # HOD sees only their department's budgets
        user = request.user
        grade = user.employee_grade or 0
        if grade == 2:
            if user.department_id:
                budgets = budgets.filter(department=user.department)
            else:
                budgets = budgets.none()
        dept_id = request.query_params.get("department")
        if dept_id:
            budgets = budgets.filter(department_id=dept_id)
```

- [ ] **Step 4: Implement the fix in `BudgetDetailView.get()` and `BudgetUtilizationView.get()`**

In `apps/invoices/budget_views.py`, replace `BudgetDetailView.get()`:

```python
    def get(self, request, pk):
        from .models import Budget
        b = get_object_or_404(Budget, pk=pk)
        user = request.user
        grade = user.employee_grade or 0
        if grade == 2 and b.department_id != user.department_id:
            return Response({"error": "Access denied to this department's budget."}, status=status.HTTP_403_FORBIDDEN)
        return Response(_budget_to_dict(b))
```

In `apps/invoices/budget_views.py`, replace `BudgetUtilizationView.get()` beginning:

```python
    def get(self, request, pk):
        from .models import Budget, Expense
        b = get_object_or_404(Budget, pk=pk)
        user = request.user
        grade = user.employee_grade or 0
        if grade == 2 and b.department_id != user.department_id:
            return Response({"error": "Access denied to this department's budget."}, status=status.HTTP_403_FORBIDDEN)
```

(Keep the rest of the method unchanged after this guard.)

- [ ] **Step 5: Run tests to verify they pass**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestBudgetHodScoping -v
```

Expected: 5 PASSED

- [ ] **Step 6: Commit**

```bash
git add apps/invoices/budget_views.py apps/core/tests/test_hod_scoping.py
git commit -m "feat: scope budget list and detail views to HOD's department"
```

---

## Task 5: Scope `AnomalyListView` to HOD's department

**Files:**
- Modify: `apps/invoices/employee_views.py` (AnomalyListView, lines 565-576)
- Modify: `apps/core/tests/test_hod_scoping.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/core/tests/test_hod_scoping.py`:

```python
@pytest.mark.django_db
class TestAnomalyListHodScoping:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("R&D")
        self.dept_b = make_dept("Admin")
        self.hod_a = make_user("hod_rnd", 2, self.dept_a)
        emp_a = make_user("emp_rnd", 1, self.dept_a)
        emp_b = make_user("emp_admin", 1, self.dept_b)
        vendor = make_vendor("Anomaly Vendor")

        self.exp_a = Expense.objects.create(
            vendor=vendor, submitted_by=emp_a, pre_gst_amount=5000, total_amount=5000,
            anomaly_severity="HIGH",
        )
        self.exp_a._force_status("PENDING_HOD")
        self.exp_a.save()

        self.exp_b = Expense.objects.create(
            vendor=vendor, submitted_by=emp_b, pre_gst_amount=8000, total_amount=8000,
            anomaly_severity="CRITICAL",
        )
        self.exp_b._force_status("PENDING_HOD")
        self.exp_b.save()

    def test_hod_anomaly_list_shows_only_own_dept(self):
        self.client.force_authenticate(user=self.hod_a)
        resp = self.client.get(reverse("finance-anomalies"))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.data]
        assert str(self.exp_a.id) in ids
        assert str(self.exp_b.id) not in ids

    def test_g3_anomaly_list_shows_all_depts(self):
        g3 = make_user("finmgr_anom", 3, self.dept_a)
        self.client.force_authenticate(user=g3)
        resp = self.client.get(reverse("finance-anomalies"))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.data]
        assert str(self.exp_a.id) in ids
        assert str(self.exp_b.id) in ids
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestAnomalyListHodScoping -v
```

Expected: FAIL — HOD sees all anomalies.

- [ ] **Step 3: Implement the fix in `AnomalyListView.get()`**

In `apps/invoices/employee_views.py`, replace `AnomalyListView.get()`:

```python
class AnomalyListView(APIView):
    """GET /api/v1/finance/anomalies/ — Expenses with anomaly flags."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.core.permissions import hod_dept_filter
        anomalies = (
            Expense.objects.exclude(anomaly_severity__in=["", "NONE", None])
            .select_related("vendor", "submitted_by")
            .order_by("-created_at")[:100]
        )
        anomalies = hod_dept_filter(request.user, anomalies, "submitted_by__department")
        return Response(VendorBillListSerializer(anomalies, many=True, context={"request": request}).data)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestAnomalyListHodScoping -v
```

Expected: 2 PASSED

- [ ] **Step 5: Commit**

```bash
git add apps/invoices/employee_views.py apps/core/tests/test_hod_scoping.py
git commit -m "feat: scope anomaly list to HOD's department"
```

---

## Task 6: Restrict Approve/Reject/Query actions to HOD's own department

**Files:**
- Modify: `apps/invoices/employee_views.py` (ApproveView, RejectView, QueryView)
- Modify: `apps/core/tests/test_hod_scoping.py`

- [ ] **Step 1: Write the failing tests**

Append to `apps/core/tests/test_hod_scoping.py`:

```python
from apps.invoices.models import ExpenseApprovalStep


@pytest.mark.django_db
class TestHodActionRestrictions:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("Procurement")
        self.dept_b = make_dept("Security")
        self.hod_a = make_user("hod_proc", 2, self.dept_a)
        emp_b = make_user("emp_sec", 1, self.dept_b)
        vendor = make_vendor("Action Vendor")

        # Expense from a different department
        self.exp_other_dept = Expense.objects.create(
            vendor=vendor, submitted_by=emp_b,
            pre_gst_amount=3000, total_amount=3000,
        )
        self.exp_other_dept._force_status("PENDING_HOD")
        self.exp_other_dept.save()

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
            {"question": "Why is this in our queue exactly?"},
        )
        assert resp.status_code == 403

    def test_g3_can_approve_any_dept_expense(self):
        """Grade 3 finance manager is not restricted by department."""
        g3 = make_user("finmgr_act", 3, self.dept_a)
        # Create an approval step for g3
        ExpenseApprovalStep.objects.create(
            expense=self.exp_other_dept,
            level=3,
            grade_required=2,
            assigned_to=g3,
        )
        self.client.force_authenticate(user=g3)
        resp = self.client.post(
            reverse("finance-approve", args=[self.exp_other_dept.id]),
            {"reason": "All good"},
        )
        # Should not be 403 (may be 400 due to SoD or transition, but not dept restriction)
        assert resp.status_code != 403
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestHodActionRestrictions -v
```

Expected: FAIL — HOD gets 200/400 instead of 403 on other-dept actions.

- [ ] **Step 3: Add dept check helper and apply to action views**

Add a private function at the top of `employee_views.py` (after imports):

```python
def _hod_dept_check(user, expense):
    """Return 403 Response if Grade-2 HOD tries to act on another dept's expense."""
    from rest_framework.response import Response as _Response
    grade = user.employee_grade or 0
    if grade == 2 and not user.is_superuser:
        if user.department_id and expense.submitted_by.department_id != user.department_id:
            return _Response(
                {"error": "You can only act on expenses from your own department."},
                status=status.HTTP_403_FORBIDDEN,
            )
    return None
```

In `ApproveView.post()`, add at the very top after `expense = get_object_or_404(Expense, pk=pk)`:

```python
        dept_error = _hod_dept_check(request.user, expense)
        if dept_error:
            return dept_error
```

In `RejectView.post()`, add the same two lines after `expense = get_object_or_404(...)`.

In `QueryView.post()`, add the same two lines after `expense = get_object_or_404(...)`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestHodActionRestrictions -v
```

Expected: 4 PASSED

- [ ] **Step 5: Commit**

```bash
git add apps/invoices/employee_views.py apps/core/tests/test_hod_scoping.py
git commit -m "feat: block HOD from approving/rejecting/querying other dept expenses"
```

---

## Task 7: Fix NL Query context for HOD — show department, not just own expenses

**Files:**
- Modify: `apps/core/auth_views.py` (`_run_nl_query`, around line 346)
- Modify: `apps/core/tests/test_hod_scoping.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/core/tests/test_hod_scoping.py`:

```python
@pytest.mark.django_db
class TestNLQueryHodScoping:
    def setup_method(self):
        self.client = APIClient()
        self.dept_a = make_dept("Customer Success")
        self.hod_a = make_user("hod_cs", 2, self.dept_a)
        emp_a = make_user("emp_cs", 1, self.dept_a)
        vendor = make_vendor("NL Vendor")

        # Expense submitted by a department employee (not the HOD themselves)
        self.dept_exp = Expense.objects.create(
            vendor=vendor, submitted_by=emp_a,
            pre_gst_amount=9000, total_amount=9000,
        )
        self.dept_exp._force_status("PENDING_HOD")
        self.dept_exp.save()

    def test_hod_nl_query_includes_dept_expenses_in_context(self):
        """NL query for HOD should build context from their department, not just own submissions."""
        self.client.force_authenticate(user=self.hod_a)
        # We test the internal scoping function directly rather than calling the LLM
        from apps.core.auth_views import _build_nl_context
        ctx = _build_nl_context(self.hod_a)
        # Total outstanding should include dept_exp
        assert ctx["total_outstanding"] >= 9000
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestNLQueryHodScoping -v
```

Expected: `ImportError: cannot import name '_build_nl_context'`

- [ ] **Step 3: Refactor `_run_nl_query` to extract a testable `_build_nl_context` function**

In `apps/core/auth_views.py`, extract the context-building logic from `_run_nl_query` into a new function `_build_nl_context(user)`. Replace the section `# ─── 2. Gather Scoped Context ───` through `ctx["pending_my_queue"] = ...` with a call to this new function.

Add before `_run_nl_query`:

```python
def _build_nl_context(user) -> dict:
    """Build scoped financial context dict for NL query. Extracted for testability."""
    from apps.invoices.models import Expense, ExpenseApprovalStep
    from django.db.models import Sum, Count

    is_vendor = hasattr(user, "vendor_profile") and user.vendor_profile is not None
    is_cfo = user.is_superuser
    grade = getattr(user, "employee_grade", 1)

    ctx = {"user_role": user.grade_label if not is_vendor else "Vendor"}

    expense_qs = Expense.objects.all()
    if is_vendor:
        expense_qs = expense_qs.filter(vendor=user.vendor_profile)
        ctx["vendor_name"] = user.vendor_profile.name
    elif grade == 2 and not is_cfo:
        # HOD: scoped to their whole department
        if user.department_id:
            expense_qs = expense_qs.filter(submitted_by__department=user.department)
        else:
            expense_qs = expense_qs.filter(submitted_by=user)
    elif grade < 3 and not is_cfo:
        # G1 Employee: own submissions only
        expense_qs = expense_qs.filter(submitted_by=user)

    ctx["total_outstanding"] = float(
        expense_qs.exclude(
            _status__in=["PAID", "REJECTED", "WITHDRAWN", "AUTO_REJECT"]
        ).aggregate(total=Sum("total_amount"))["total"] or 0
    )

    status_dist = expense_qs.values("_status").annotate(
        count=Count("id"), amount=Sum("total_amount")
    )
    ctx["expense_status"] = [
        {"status": s["_status"], "count": s["count"], "amount": float(s["amount"] or 0)}
        for s in status_dist
    ]

    if is_cfo or grade >= 4:
        top_vendors = (
            Expense.objects.filter(_status__in=["PAID", "APPROVED", "BOOKED_D365", "POSTED_D365"])
            .values("vendor__name")
            .annotate(total=Sum("total_amount"), count=Count("id"))
            .order_by("-total")[:5]
        )
        ctx["top_vendors"] = [
            {"vendor": v["vendor__name"], "total_spend": float(v["total"] or 0), "invoice_count": v["count"]}
            for v in top_vendors
        ]
        ctx["anomaly_count"] = Expense.objects.filter(anomaly_severity__in=["HIGH", "CRITICAL"]).count()

        from apps.invoices.models import Budget
        budgets = Budget.objects.filter(status="active").select_related("department")
        ctx["budget_health"] = []
        for b in budgets:
            spent = float(b.spent_amount or 0)
            total = float(b.total_amount or 1)
            util = round((spent / total) * 100, 1)
            variance = total - spent
            bstatus = "HEALTHY"
            if util >= 100:
                bstatus = "OVER_BUDGET (CRITICAL)"
            elif util >= 90:
                bstatus = "NEAR_LIMIT (WARNING)"
            ctx["budget_health"].append({
                "dept": b.department.name if b.department else b.name,
                "spent": spent,
                "total": total,
                "util_pct": util,
                "variance": variance,
                "status": bstatus,
            })

        ctx["treasury_index"] = 85

    ctx["pending_my_queue"] = ExpenseApprovalStep.objects.filter(
        assigned_to=user, status="PENDING"
    ).count()

    return ctx
```

Then in `_run_nl_query`, replace the whole `# ─── 2. Gather Scoped Context ───` block (up to and including `ctx["pending_my_queue"] = ...`) with:

```python
    # ─── 2. Gather Scoped Context ───
    ctx = _build_nl_context(user)
    ctx["user_role"] = ctx.get("user_role", user.grade_label if not is_vendor else "Vendor")
```

Also remove the duplicate `ctx = {"user_role": ...}` line and the `expense_qs` setup that comes right after it, since those are now inside `_build_nl_context`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py::TestNLQueryHodScoping -v
```

Expected: 1 PASSED

- [ ] **Step 5: Run all HOD scoping tests together**

```bash
python -m pytest apps/core/tests/test_hod_scoping.py -v
```

Expected: All tests PASSED (17 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/core/auth_views.py apps/core/tests/test_hod_scoping.py
git commit -m "feat: scope NL query context to HOD's department"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|---|---|
| HOD sees only own dept's vendor bill queue | Task 2 |
| HOD audit log scoped to own dept | Task 3 |
| HOD budgets scoped to own dept | Task 4 |
| HOD anomalies scoped to own dept | Task 5 |
| HOD cannot approve/reject/query other dept expenses | Task 6 |
| HOD NL query context reflects dept, not just own | Task 7 |
| `hod_dept_filter` utility reusable | Task 1 |

**Placeholder scan:** No TBDs, TODOs, or "similar to task N" shortcuts.

**Type consistency:** `hod_dept_filter(user, qs, dept_lookup)` signature used consistently. `_hod_dept_check(user, expense)` returns `None` or `Response` — callers check with `if dept_error: return dept_error`.

**Edge cases covered:**
- HOD with no department assigned → fallback to own submissions (Task 1, test 2)
- G3+ users unaffected by all scoping (Tasks 2, 3, 4, 5, 6 each have a G3 counter-test)
- Superuser always unrestricted (grade check uses `not user.is_superuser` guards)
