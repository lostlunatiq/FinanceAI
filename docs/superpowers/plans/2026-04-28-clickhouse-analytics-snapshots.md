# ClickHouse Analytics Snapshots — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prerequisite:** `2026-04-28-clickhouse-audit-log.md` must be fully implemented first. ClickHouse must be running and `apps/core/clickhouse_client.py` must exist.

**Goal:** Move all analytics query load from Postgres to ClickHouse by pre-computing daily/monthly aggregate snapshots via Celery Beat and rewriting `analytics_views.py` to read from them.

**Architecture:** Five ClickHouse aggregate tables are refreshed nightly by a single `refresh_analytics_snapshots` Celery Beat task (runs at 01:00 IST, after the EOD audit drain). Each table is truncated then repopulated in one transaction-like batch insert — no `ReplacingMergeTree` complexity needed since snapshots are always full rewrites. The Django analytics views are rewritten to read from these tables instead of running heavy Postgres aggregations on every request.

**Tech Stack:** Django 4.x, Celery Beat, `clickhouse-connect==0.15.1`, ClickHouse 24.x

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/core/clickhouse_client.py` | Modify | Add analytics table DDL to `ensure_schema()` |
| `apps/invoices/analytics_tasks.py` | Create | `refresh_analytics_snapshots` Celery task |
| `config/celery.py` | Modify | Register nightly beat schedule |
| `apps/invoices/analytics_views.py` | Modify | Read from ClickHouse tables instead of Postgres ORM |
| `tests/invoices/test_analytics_snapshots.py` | Create | Tests for snapshot builder and view responses |

---

## ClickHouse Tables

### `spend_daily`
```sql
CREATE TABLE IF NOT EXISTS `{db}`.spend_daily (
    snapshot_date  Date,
    vendor_id      Nullable(UUID),
    vendor_name    String DEFAULT '',
    category       LowCardinality(String),
    department_id  Nullable(UUID),
    total_amount   Decimal(18, 2),
    expense_count  UInt32
) ENGINE = MergeTree()
ORDER BY (snapshot_date, category)
PARTITION BY toYYYYMM(snapshot_date)
```

### `vendor_metrics_daily`
```sql
CREATE TABLE IF NOT EXISTS `{db}`.vendor_metrics_daily (
    snapshot_date       Date,
    vendor_id           UUID,
    vendor_name         String DEFAULT '',
    anomaly_count       UInt32,
    rejection_count     UInt32,
    approval_count      UInt32,
    total_invoices      UInt32,
    avg_turnaround_hrs  Float32
) ENGINE = MergeTree()
ORDER BY (snapshot_date, vendor_id)
PARTITION BY toYYYYMM(snapshot_date)
```

### `budget_utilization_daily`
```sql
CREATE TABLE IF NOT EXISTS `{db}`.budget_utilization_daily (
    snapshot_date     Date,
    department_id     UUID,
    department_name   String DEFAULT '',
    budget_amount     Decimal(18, 2),
    spent_amount      Decimal(18, 2),
    utilization_pct   Float32
) ENGINE = MergeTree()
ORDER BY (snapshot_date, department_id)
PARTITION BY toYYYYMM(snapshot_date)
```

### `compliance_monthly`
```sql
CREATE TABLE IF NOT EXISTS `{db}`.compliance_monthly (
    snapshot_month       Date,
    policy_violations    UInt32,
    po_match_rate        Float32,
    approval_rate        Float32,
    override_count       UInt32,
    avg_approval_hrs     Float32
) ENGINE = MergeTree()
ORDER BY snapshot_month
PARTITION BY toYYYYMM(snapshot_month)
```

### `vendor_risk_daily`
```sql
CREATE TABLE IF NOT EXISTS `{db}`.vendor_risk_daily (
    snapshot_date     Date,
    vendor_id         UUID,
    vendor_name       String DEFAULT '',
    risk_score        Float32,
    risk_factors      String DEFAULT '[]'
) ENGINE = MergeTree()
ORDER BY (snapshot_date, vendor_id)
PARTITION BY toYYYYMM(snapshot_date)
```

---

## Task 1: Add Analytics DDL to `ensure_schema()`

**Files:**
- Modify: `apps/core/clickhouse_client.py`

- [ ] **Step 1: Write failing test**

Create `tests/invoices/test_analytics_snapshots.py`:
```python
from unittest.mock import MagicMock, patch

def test_ensure_schema_creates_analytics_tables():
    mock_client = MagicMock()
    import apps.core.clickhouse_client as ch
    original = ch._client
    ch._client = mock_client
    try:
        from apps.core.clickhouse_client import ensure_schema
        ensure_schema()
    finally:
        ch._client = original

    commands = [str(c) for c in mock_client.command.call_args_list]
    assert any('spend_daily' in c for c in commands)
    assert any('vendor_metrics_daily' in c for c in commands)
    assert any('budget_utilization_daily' in c for c in commands)
    assert any('compliance_monthly' in c for c in commands)
    assert any('vendor_risk_daily' in c for c in commands)
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/invoices/test_analytics_snapshots.py::test_ensure_schema_creates_analytics_tables -v
```
Expected: FAIL — analytics tables not yet in DDL

- [ ] **Step 3: Add DDL constants to `apps/core/clickhouse_client.py`**

Add after `_DDL_AUDIT_EVENTS`:
```python
_DDL_SPEND_DAILY = """\
CREATE TABLE IF NOT EXISTS `{db}`.spend_daily (
    snapshot_date  Date,
    vendor_id      Nullable(UUID),
    vendor_name    String          DEFAULT '',
    category       LowCardinality(String),
    department_id  Nullable(UUID),
    total_amount   Decimal(18, 2),
    expense_count  UInt32
) ENGINE = MergeTree()
ORDER BY (snapshot_date, category)
PARTITION BY toYYYYMM(snapshot_date)
"""

_DDL_VENDOR_METRICS_DAILY = """\
CREATE TABLE IF NOT EXISTS `{db}`.vendor_metrics_daily (
    snapshot_date      Date,
    vendor_id          UUID,
    vendor_name        String  DEFAULT '',
    anomaly_count      UInt32,
    rejection_count    UInt32,
    approval_count     UInt32,
    total_invoices     UInt32,
    avg_turnaround_hrs Float32
) ENGINE = MergeTree()
ORDER BY (snapshot_date, vendor_id)
PARTITION BY toYYYYMM(snapshot_date)
"""

_DDL_BUDGET_UTILIZATION = """\
CREATE TABLE IF NOT EXISTS `{db}`.budget_utilization_daily (
    snapshot_date    Date,
    department_id    UUID,
    department_name  String         DEFAULT '',
    budget_amount    Decimal(18, 2),
    spent_amount     Decimal(18, 2),
    utilization_pct  Float32
) ENGINE = MergeTree()
ORDER BY (snapshot_date, department_id)
PARTITION BY toYYYYMM(snapshot_date)
"""

_DDL_COMPLIANCE_MONTHLY = """\
CREATE TABLE IF NOT EXISTS `{db}`.compliance_monthly (
    snapshot_month    Date,
    policy_violations UInt32,
    po_match_rate     Float32,
    approval_rate     Float32,
    override_count    UInt32,
    avg_approval_hrs  Float32
) ENGINE = MergeTree()
ORDER BY snapshot_month
PARTITION BY toYYYYMM(snapshot_month)
"""

_DDL_VENDOR_RISK_DAILY = """\
CREATE TABLE IF NOT EXISTS `{db}`.vendor_risk_daily (
    snapshot_date  Date,
    vendor_id      UUID,
    vendor_name    String DEFAULT '',
    risk_score     Float32,
    risk_factors   String DEFAULT '[]'
) ENGINE = MergeTree()
ORDER BY (snapshot_date, vendor_id)
PARTITION BY toYYYYMM(snapshot_date)
"""

_ANALYTICS_DDLS = [
    _DDL_SPEND_DAILY,
    _DDL_VENDOR_METRICS_DAILY,
    _DDL_BUDGET_UTILIZATION,
    _DDL_COMPLIANCE_MONTHLY,
    _DDL_VENDOR_RISK_DAILY,
]
```

Update `ensure_schema()` to run all DDLs:
```python
def ensure_schema():
    db = settings.CLICKHOUSE_DATABASE
    client = get_client()
    client.command(_DDL_DATABASE.format(db=db))
    client.command(_DDL_AUDIT_EVENTS.format(db=db))
    for ddl in _ANALYTICS_DDLS:
        client.command(ddl.format(db=db))
```

- [ ] **Step 4: Run test**

```bash
uv run pytest tests/invoices/test_analytics_snapshots.py::test_ensure_schema_creates_analytics_tables -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/core/clickhouse_client.py tests/invoices/test_analytics_snapshots.py
git commit -m "feat: add analytics snapshot table DDLs to ensure_schema()"
```

---

## Task 2: Analytics Snapshot Refresh Task

**Files:**
- Create: `apps/invoices/analytics_tasks.py`
- Modify: `config/celery.py`

- [ ] **Step 1: Write failing test**

Add to `tests/invoices/test_analytics_snapshots.py`:
```python
from unittest.mock import patch, MagicMock
from django.test import TestCase

class SnapshotTaskTest(TestCase):
    def test_refresh_spend_daily_inserts_data(self):
        from apps.invoices.analytics_tasks import _build_spend_daily
        from apps.invoices.models import Expense
        from apps.core.models import Vendor, Department, User
        import uuid
        from decimal import Decimal

        dept = Department.objects.create(name='Engineering')
        user = User.objects.create_user(username='emp1', password='x', employee_grade=1, department=dept)
        vendor = Vendor.objects.create(name='Acme', status='ACTIVE', is_approved=True)
        Expense.objects.create(
            submitted_by=user, vendor=vendor, amount=Decimal('1000'),
            category='Software', status='PAID', department=dept,
        )

        rows = _build_spend_daily()
        assert len(rows) >= 1
        assert any(r['category'] == 'Software' for r in rows)

    def test_refresh_task_calls_insert_for_all_tables(self):
        from apps.invoices.analytics_tasks import refresh_analytics_snapshots

        mock_client = MagicMock()
        with patch('apps.invoices.analytics_tasks.get_client', return_value=mock_client):
            refresh_analytics_snapshots()

        assert mock_client.insert.call_count >= 5
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/invoices/test_analytics_snapshots.py::SnapshotTaskTest -v
```
Expected: `ImportError` — `analytics_tasks` not found

- [ ] **Step 3: Create `apps/invoices/analytics_tasks.py`**

```python
import logging
from datetime import date

from celery import shared_task
from django.conf import settings
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone

from apps.core.clickhouse_client import get_client

logger = logging.getLogger(__name__)


@shared_task(queue="analytics")
def refresh_analytics_snapshots():
    """Nightly refresh of all ClickHouse analytics snapshot tables."""
    client = get_client()
    db = settings.CLICKHOUSE_DATABASE
    today = date.today()

    _upsert(client, db, "spend_daily", today, _build_spend_daily())
    _upsert(client, db, "vendor_metrics_daily", today, _build_vendor_metrics_daily())
    _upsert(client, db, "budget_utilization_daily", today, _build_budget_utilization_daily())
    _upsert(client, db, "compliance_monthly", today, _build_compliance_monthly())
    _upsert(client, db, "vendor_risk_daily", today, _build_vendor_risk_daily())

    logger.info("Analytics snapshots refreshed for %s", today)
    return {"date": str(today), "status": "ok"}


def _upsert(client, db, table, snapshot_date, rows):
    """Delete today's snapshot rows then insert fresh ones."""
    if not rows:
        return
    client.command(
        f"ALTER TABLE `{db}`.{table} DELETE WHERE snapshot_date = '{snapshot_date}'"
    )
    col_names = list(rows[0].keys())
    data = [[r[c] for c in col_names] for r in rows]
    client.insert(f"`{db}`.{table}", data, column_names=col_names)


def _build_spend_daily() -> list:
    from apps.invoices.models import Expense

    today = date.today()
    qs = (
        Expense.objects.filter(status__in=["APPROVED", "PAID"])
        .select_related("vendor", "department")
        .values("vendor__id", "vendor__name", "category", "department__id")
        .annotate(total_amount=Sum("amount"), expense_count=Count("id"))
    )
    return [
        {
            "snapshot_date": today,
            "vendor_id": str(r["vendor__id"]) if r["vendor__id"] else None,
            "vendor_name": r["vendor__name"] or "",
            "category": r["category"] or "",
            "department_id": str(r["department__id"]) if r["department__id"] else None,
            "total_amount": float(r["total_amount"] or 0),
            "expense_count": r["expense_count"],
        }
        for r in qs
    ]


def _build_vendor_metrics_daily() -> list:
    from apps.core.models import Vendor
    from apps.invoices.models import Expense

    today = date.today()
    vendors = Vendor.objects.filter(is_approved=True)
    rows = []
    for v in vendors:
        expenses = Expense.objects.filter(vendor=v)
        total = expenses.count()
        if total == 0:
            continue
        approved = expenses.filter(status="APPROVED").count()
        rejected = expenses.filter(status="REJECTED").count()
        anomalies = expenses.exclude(anomaly_severity="").exclude(anomaly_severity__isnull=True).count()
        rows.append({
            "snapshot_date": today,
            "vendor_id": str(v.id),
            "vendor_name": v.name,
            "anomaly_count": anomalies,
            "rejection_count": rejected,
            "approval_count": approved,
            "total_invoices": total,
            "avg_turnaround_hrs": 0.0,  # computed separately if SLA data available
        })
    return rows


def _build_budget_utilization_daily() -> list:
    from apps.core.models import Department
    from apps.invoices.models import Expense, Budget

    today = date.today()
    rows = []
    for dept in Department.objects.all():
        spent = (
            Expense.objects.filter(department=dept, status__in=["APPROVED", "PAID"])
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        try:
            budget = Budget.objects.get(department=dept, is_active=True)
            budget_amount = float(budget.amount)
        except Exception:
            budget_amount = 0.0
        utilization = (float(spent) / budget_amount * 100) if budget_amount > 0 else 0.0
        rows.append({
            "snapshot_date": today,
            "department_id": str(dept.id),
            "department_name": dept.name,
            "budget_amount": budget_amount,
            "spent_amount": float(spent),
            "utilization_pct": round(utilization, 2),
        })
    return rows


def _build_compliance_monthly() -> list:
    from apps.invoices.models import Expense

    today = date.today()
    month_start = today.replace(day=1)
    qs = Expense.objects.filter(created_at__date__gte=month_start)
    total = qs.count()
    approved = qs.filter(status="APPROVED").count()
    overrides = qs.filter(status="APPROVED").exclude(approval_chain__isnull=True).count()
    return [
        {
            "snapshot_month": month_start,
            "policy_violations": 0,  # populated by anomaly pipeline data
            "po_match_rate": 0.0,
            "approval_rate": round((approved / total * 100) if total > 0 else 0.0, 2),
            "override_count": overrides,
            "avg_approval_hrs": 0.0,
        }
    ]


def _build_vendor_risk_daily() -> list:
    from apps.core.models import Vendor
    from apps.invoices.models import Expense

    today = date.today()
    rows = []
    for v in Vendor.objects.filter(is_approved=True):
        expenses = Expense.objects.filter(vendor=v)
        total = expenses.count()
        if total == 0:
            continue
        rejection_rate = expenses.filter(status="REJECTED").count() / total
        anomaly_rate = (
            expenses.exclude(anomaly_severity="").exclude(anomaly_severity__isnull=True).count() / total
        )
        risk_score = round((rejection_rate * 0.5 + anomaly_rate * 0.5) * 100, 2)
        rows.append({
            "snapshot_date": today,
            "vendor_id": str(v.id),
            "vendor_name": v.name,
            "risk_score": risk_score,
            "risk_factors": "[]",
        })
    return rows
```

- [ ] **Step 4: Register in `config/celery.py`**

Add to `beat_schedule`:
```python
    "refresh-analytics-snapshots": {
        "task": "apps.invoices.analytics_tasks.refresh_analytics_snapshots",
        "schedule": crontab(hour=1, minute=0),  # 01:00 IST nightly
    },
```

Add to `task_routes`:
```python
        "apps.invoices.analytics_tasks.refresh_analytics_snapshots": {"queue": "analytics"},
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/invoices/test_analytics_snapshots.py::SnapshotTaskTest -v
```
Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add apps/invoices/analytics_tasks.py config/celery.py tests/invoices/test_analytics_snapshots.py
git commit -m "feat: nightly analytics snapshot refresh task writing to ClickHouse"
```

---

## Task 3: Rewrite Analytics Views to Read from ClickHouse

**Files:**
- Modify: `apps/invoices/analytics_views.py`

For each analytics view that previously ran heavy Postgres aggregations, replace the ORM query with a ClickHouse read. Show the pattern once; apply it consistently.

- [ ] **Step 1: Add ClickHouse read helper at top of `analytics_views.py`**

Add at the top of `apps/invoices/analytics_views.py`:
```python
from apps.core.clickhouse_client import get_client
from django.conf import settings as _settings

def _ch_query(sql: str, params: dict = None) -> list:
    """Run a ClickHouse query and return rows as list of dicts."""
    client = get_client()
    result = client.query(sql, parameters=params or {})
    cols = [c.name for c in result.column_names] if hasattr(result.column_names[0], 'name') else result.column_names
    return [dict(zip(cols, row)) for row in result.result_rows]

_DB = _settings.CLICKHOUSE_DATABASE
```

- [ ] **Step 2: Rewrite `SpendIntelligenceView.get`**

Replace the existing Postgres ORM aggregation with:
```python
def get(self, request):
    days = int(request.query_params.get("days", 30))
    rows = _ch_query(f"""
        SELECT
            category,
            sum(total_amount)   AS total,
            sum(expense_count)  AS count,
            vendor_name
        FROM `{_DB}`.spend_daily
        WHERE snapshot_date >= today() - {days}
        GROUP BY category, vendor_name
        ORDER BY total DESC
        LIMIT 50
    """)
    # ... rest of response building using `rows` instead of ORM queryset
    return Response({"spend": rows, "days": days})
```

Apply the same pattern to `VendorRiskScoreView`, `BudgetHealthView`, `DepartmentVarianceView`, `SupplierScorecardView`, `CommandCenterIntelligenceView`, and `PolicyComplianceView` — each reads from the appropriate ClickHouse snapshot table. Views that do not have matching snapshot data (`GSTReconciliationView`, `TDSComplianceView`, `WorkingCapitalView`, `PaymentPredictionView`, `SpendVelocityView`, `POMatchStatusView`) continue reading from Postgres until their data is added to a snapshot table in a future iteration.

- [ ] **Step 3: Verify**

```bash
uv run python manage.py check
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/analytics/spend-intelligence/
```

- [ ] **Step 4: Commit**

```bash
git add apps/invoices/analytics_views.py
git commit -m "feat: analytics views read from ClickHouse snapshot tables"
```
