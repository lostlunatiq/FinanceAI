# ClickHouse Audit Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Postgres `AuditLog` table with ClickHouse, instrument every user action across the platform, and expose a role-filtered API backed by ClickHouse.

**Architecture:** Every action writes a row to `AuditOutbox` (Postgres) in the same transaction as the action itself. A Celery Beat task drains the outbox to ClickHouse when it hits 500 rows or at 23:59 IST daily. A Django middleware captures request context (IP, user agent, session hash) into thread-local storage so any writer can read it without passing `request` around. On app startup, if `audit_events` is empty, existing Postgres `AuditLog` rows are batch-migrated automatically.

**Tech Stack:** Django 4.x, Celery + Redis, `clickhouse-connect==0.15.1`, PostgreSQL 16, ClickHouse 24.x (Docker)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `docker-compose.yml` | Modify | Add ClickHouse service |
| `apps/core/clickhouse_client.py` | Create | Singleton client + DDL |
| `apps/core/middleware.py` | Create | Thread-local request context |
| `apps/core/audit.py` | Create | `write_audit()` — single entry point for all audit writes |
| `apps/core/models.py` | Modify | Add `AuditOutbox`; remove `AuditLog` (after migration task) |
| `apps/core/migrations/0004_audit_outbox.py` | Create | Migration for AuditOutbox |
| `apps/core/migrations/0005_remove_auditlog.py` | Create | Drop AuditLog table |
| `apps/core/tasks.py` | Modify | Replace broken stub with `drain_audit_outbox` + `drain_audit_outbox_eod` |
| `apps/core/apps.py` | Modify | `ready()` hook: ensure schema + auto-migrate |
| `config/celery.py` | Modify | Add beat schedules for drain tasks |
| `config/settings/base.py` | Modify | Register middleware + `AUDIT_OUTBOX_BATCH_SIZE` |
| `apps/core/auth_views.py` | Modify | Instrument auth + IAM events; rewrite `AuditLogListView` to query ClickHouse |
| `apps/invoices/services.py` | Modify | Replace `AuditLog.objects.create` with `write_audit()` |
| `apps/invoices/employee_views.py` | Modify | Replace `AuditLog.objects.create` with `write_audit()` |
| `apps/invoices/vendor_views.py` | Modify | Instrument vendor create/update/activate/deactivate |
| `apps/core/file_views.py` | Modify | Instrument file upload + download |
| `apps/core/management/commands/init_clickhouse.py` | Modify | Update to call `ensure_schema()` from new client |
| `tests/core/test_audit.py` | Create | Tests for outbox writer, middleware, drain task |
| `js/Secondary.jsx` | Modify | AuditScreen: show `context` panel for G4+/CFO |

---

## Task 1: Add ClickHouse to docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add ClickHouse service**

Add after the `redis` service block in `docker-compose.yml`:

```yaml
  clickhouse:
    image: clickhouse/clickhouse-server:24.3-alpine
    ports:
      - "8123:8123"
      - "9000:9000"
    environment:
      CLICKHOUSE_DB: financeai
      CLICKHOUSE_USER: default
      CLICKHOUSE_PASSWORD: ""
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: 1
    volumes:
      - ch_data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8123/ping"]
      interval: 5s
      timeout: 5s
      retries: 10
```

Add `ch_data` to the `volumes` block at the bottom of the file:
```yaml
volumes:
  pg_data:
  ch_data:
```

Add `CLICKHOUSE_URL` to the `x-django-common` environment block so all Django services can reach it:
```yaml
    environment:
      ...
      CLICKHOUSE_HOST: clickhouse
      CLICKHOUSE_PORT: 8123
      CLICKHOUSE_DATABASE: financeai
```

Update the `depends_on` block of `web`, `celery`, and `celery-beat` to include:
```yaml
    depends_on:
      ...
      clickhouse:
        condition: service_healthy
```

- [ ] **Step 2: Verify**

```bash
docker compose up clickhouse -d
curl http://localhost:8123/ping
```
Expected output: `Ok.`

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "infra: add ClickHouse 24.3 service to docker-compose"
```

---

## Task 2: ClickHouse Connection Client + Schema

**Files:**
- Create: `apps/core/clickhouse_client.py`
- Modify: `apps/core/management/commands/init_clickhouse.py`

- [ ] **Step 1: Write failing test**

Create `tests/core/test_clickhouse_client.py`:
```python
from unittest.mock import patch, MagicMock
import pytest

def test_ensure_schema_creates_database_and_table():
    mock_client = MagicMock()
    with patch('apps.core.clickhouse_client._client', mock_client):
        from apps.core.clickhouse_client import ensure_schema
        ensure_schema()
    calls = [str(c) for c in mock_client.command.call_args_list]
    assert any('CREATE DATABASE' in c for c in calls)
    assert any('audit_events' in c for c in calls)

def test_get_client_returns_singleton():
    import apps.core.clickhouse_client as ch
    ch._client = None
    with patch('clickhouse_connect.get_client') as mock_factory:
        mock_factory.return_value = MagicMock()
        c1 = ch.get_client()
        c2 = ch.get_client()
    assert mock_factory.call_count == 1
    assert c1 is c2
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/core/test_clickhouse_client.py -v
```
Expected: `ModuleNotFoundError: No module named 'apps.core.clickhouse_client'`

- [ ] **Step 3: Implement `apps/core/clickhouse_client.py`**

```python
import clickhouse_connect
from django.conf import settings

_client = None

_DDL_DATABASE = "CREATE DATABASE IF NOT EXISTS `{db}`"

_DDL_AUDIT_EVENTS = """\
CREATE TABLE IF NOT EXISTS `{db}`.audit_events (
    id           UUID           DEFAULT generateUUIDv4(),
    user_id      Nullable(UUID),
    actor_name   String         DEFAULT '',
    actor_grade  Int8           DEFAULT 0,
    action       LowCardinality(String),
    entity_type  LowCardinality(String),
    entity_id    Nullable(UUID),
    context      String         DEFAULT '{{}}',
    payload      String         DEFAULT '{{}}',
    created_at   DateTime64(3, 'Asia/Kolkata')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, action, entity_type)
SETTINGS index_granularity = 8192
"""


def get_client():
    global _client
    if _client is None:
        _client = clickhouse_connect.get_client(
            host=settings.CLICKHOUSE_HOST,
            port=settings.CLICKHOUSE_PORT,
            database=settings.CLICKHOUSE_DATABASE,
            username=settings.CLICKHOUSE_USER,
            password=settings.CLICKHOUSE_PASSWORD,
            connect_timeout=10,
            send_receive_timeout=30,
        )
    return _client


def ensure_schema():
    db = settings.CLICKHOUSE_DATABASE
    client = get_client()
    client.command(_DDL_DATABASE.format(db=db))
    client.command(_DDL_AUDIT_EVENTS.format(db=db))
```

- [ ] **Step 4: Update `init_clickhouse.py`**

```python
from django.core.management.base import BaseCommand
from apps.core.clickhouse_client import ensure_schema


class Command(BaseCommand):
    help = "Initialize ClickHouse schema (audit_events table)"

    def handle(self, *args, **kwargs):
        try:
            ensure_schema()
            self.stdout.write(self.style.SUCCESS("ClickHouse schema ready."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"ClickHouse init failed: {e}"))
            raise
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/core/test_clickhouse_client.py -v
```
Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add apps/core/clickhouse_client.py apps/core/management/commands/init_clickhouse.py tests/core/test_clickhouse_client.py
git commit -m "feat: add ClickHouse client with audit_events schema DDL"
```

---

## Task 3: AuditOutbox Postgres Model

**Files:**
- Modify: `apps/core/models.py`
- Create: `apps/core/migrations/0004_audit_outbox.py`

- [ ] **Step 1: Write failing test**

Add to `tests/core/test_audit.py` (create file):
```python
import uuid
import pytest
from django.test import TestCase

class AuditOutboxModelTest(TestCase):
    def test_create_outbox_row(self):
        from apps.core.models import AuditOutbox
        row = AuditOutbox.objects.create(
            action='expense.submitted',
            entity_type='Expense',
            entity_id=uuid.uuid4(),
            actor_name='Test User',
            actor_grade=1,
            context={'ip': '127.0.0.1', 'user_agent': 'test', 'session_hash': None, 'request_id': 'abc'},
            payload={'after': {'status': 'SUBMITTED'}},
        )
        assert row.id is not None
        assert row.action == 'expense.submitted'

    def test_outbox_ordered_by_created_at(self):
        from apps.core.models import AuditOutbox
        AuditOutbox.objects.create(action='a', entity_type='X', actor_name='', actor_grade=0, context={}, payload={})
        AuditOutbox.objects.create(action='b', entity_type='X', actor_name='', actor_grade=0, context={}, payload={})
        rows = list(AuditOutbox.objects.all())
        assert rows[0].action == 'a'
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/core/test_audit.py::AuditOutboxModelTest -v
```
Expected: `ImportError` — `AuditOutbox` doesn't exist yet.

- [ ] **Step 3: Add `AuditOutbox` to `apps/core/models.py`**

Add after the `AuditLog` class (before end of file):
```python
# ─────────────────────────────────────────────
# AuditOutbox  (Postgres buffer — drained to ClickHouse by Celery)
# ─────────────────────────────────────────────


class AuditOutbox(models.Model):
    """
    Transactional buffer for audit events.
    Written synchronously with the action; drained to ClickHouse by Celery Beat.
    Never read for business logic — query ClickHouse audit_events instead.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(null=True, blank=True)
    actor_name = models.CharField(max_length=255, default="")
    actor_grade = models.SmallIntegerField(default=0)
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField(null=True, blank=True)
    context = models.JSONField(default=dict)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["created_at"])]
```

- [ ] **Step 4: Create and run migration**

```bash
uv run python manage.py makemigrations core --name audit_outbox
uv run python manage.py migrate
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/core/test_audit.py::AuditOutboxModelTest -v
```
Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add apps/core/models.py apps/core/migrations/
git commit -m "feat: add AuditOutbox Postgres buffer model"
```

---

## Task 4: Request Context Middleware

**Files:**
- Create: `apps/core/middleware.py`
- Modify: `config/settings/base.py`

- [ ] **Step 1: Write failing test**

Add to `tests/core/test_audit.py`:
```python
from django.test import RequestFactory

class AuditMiddlewareTest(TestCase):
    def test_context_populated_from_request(self):
        from apps.core.middleware import AuditContextMiddleware, get_request_context

        factory = RequestFactory()
        req = factory.get('/')
        req.META['REMOTE_ADDR'] = '10.0.0.1'
        req.META['HTTP_USER_AGENT'] = 'TestBrowser/1.0'
        req.META['HTTP_AUTHORIZATION'] = 'Bearer sometoken123'

        captured = {}

        def get_response(r):
            captured.update(get_request_context())
            from django.http import HttpResponse
            return HttpResponse()

        middleware = AuditContextMiddleware(get_response)
        middleware(req)

        assert captured['ip'] == '10.0.0.1'
        assert captured['user_agent'] == 'TestBrowser/1.0'
        assert captured['session_hash'] is not None
        assert 'sometoken123' not in captured['session_hash']

    def test_x_forwarded_for_uses_rightmost_ip(self):
        from apps.core.middleware import AuditContextMiddleware, get_request_context

        factory = RequestFactory()
        req = factory.get('/')
        req.META['HTTP_X_FORWARDED_FOR'] = '1.2.3.4, 5.6.7.8, 9.10.11.12'
        req.META['REMOTE_ADDR'] = '127.0.0.1'

        captured = {}

        def get_response(r):
            captured.update(get_request_context())
            from django.http import HttpResponse
            return HttpResponse()

        AuditContextMiddleware(get_response)(req)
        assert captured['ip'] == '9.10.11.12'

    def test_no_request_returns_system_context(self):
        from apps.core.middleware import get_request_context
        ctx = get_request_context()
        assert ctx['ip'] == 'system'
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/core/test_audit.py::AuditMiddlewareTest -v
```
Expected: `ImportError`

- [ ] **Step 3: Create `apps/core/middleware.py`**

```python
import hashlib
import threading
import uuid as _uuid

_local = threading.local()

_SYSTEM_CONTEXT = {
    "ip": "system",
    "user_agent": "system",
    "session_hash": None,
    "request_id": None,
}


def get_request_context() -> dict:
    return getattr(_local, "audit_context", _SYSTEM_CONTEXT.copy())


class AuditContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.audit_context = self._extract(request)
        try:
            return self.get_response(request)
        finally:
            try:
                del _local.audit_context
            except AttributeError:
                pass

    @staticmethod
    def _extract(request) -> dict:
        # Rightmost IP in X-Forwarded-For is the last trusted hop
        xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
        ip = xff.split(",")[-1].strip() if xff else request.META.get("REMOTE_ADDR", "unknown")

        user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]

        # Hash the bearer token — never log the raw credential
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        session_hash = None
        if auth.startswith("Bearer "):
            session_hash = hashlib.sha256(auth[7:].encode()).hexdigest()[:16]

        request_id = request.META.get("HTTP_X_REQUEST_ID") or str(_uuid.uuid4())[:8]

        return {
            "ip": ip,
            "user_agent": user_agent,
            "session_hash": session_hash,
            "request_id": request_id,
        }
```

- [ ] **Step 4: Register middleware in `config/settings/base.py`**

Add as the third entry in `MIDDLEWARE` (after `CorsMiddleware`, before `SessionMiddleware`):
```python
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "apps.core.middleware.AuditContextMiddleware",   # ← add here
    "django.contrib.sessions.middleware.SessionMiddleware",
    ...
]
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/core/test_audit.py::AuditMiddlewareTest -v
```
Expected: 3 passed

- [ ] **Step 6: Commit**

```bash
git add apps/core/middleware.py config/settings/base.py tests/core/test_audit.py
git commit -m "feat: add AuditContextMiddleware for thread-local request context capture"
```

---

## Task 5: Audit Writer Module

**Files:**
- Create: `apps/core/audit.py`

- [ ] **Step 1: Write failing test**

Add to `tests/core/test_audit.py`:
```python
class AuditWriterTest(TestCase):
    def test_write_audit_creates_outbox_row(self):
        from apps.core.audit import write_audit
        from apps.core.models import AuditOutbox
        import uuid

        write_audit(
            action='expense.approved',
            entity_type='Expense',
            entity_id=uuid.uuid4(),
            after={'status': 'APPROVED'},
        )
        assert AuditOutbox.objects.filter(action='expense.approved').count() == 1

    def test_write_audit_with_actor(self):
        from apps.core.audit import write_audit
        from apps.core.models import AuditOutbox, User
        import uuid

        user = User.objects.create_user(
            username='tester', password='x', employee_grade=2
        )
        write_audit(
            action='vendor.created',
            entity_type='Vendor',
            entity_id=uuid.uuid4(),
            actor=user,
            after={'name': 'Acme'},
        )
        row = AuditOutbox.objects.get(action='vendor.created')
        assert str(row.user_id) == str(user.id)
        assert row.actor_grade == 2

    def test_write_audit_no_actor_uses_system(self):
        from apps.core.audit import write_audit
        from apps.core.models import AuditOutbox

        write_audit(action='system.boot', entity_type='System')
        row = AuditOutbox.objects.get(action='system.boot')
        assert row.user_id is None
        assert row.actor_name == 'System'

    def test_write_audit_payload_structure(self):
        from apps.core.audit import write_audit
        from apps.core.models import AuditOutbox
        import uuid

        write_audit(
            action='expense.rejected',
            entity_type='Expense',
            entity_id=uuid.uuid4(),
            before={'status': 'PENDING'},
            after={'status': 'REJECTED', 'reason': 'Duplicate'},
        )
        row = AuditOutbox.objects.get(action='expense.rejected')
        assert row.payload['before']['status'] == 'PENDING'
        assert row.payload['after']['reason'] == 'Duplicate'
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/core/test_audit.py::AuditWriterTest -v
```
Expected: `ImportError` — `apps.core.audit` not found

- [ ] **Step 3: Create `apps/core/audit.py`**

```python
from .middleware import get_request_context
from .models import AuditOutbox


def write_audit(
    action: str,
    entity_type: str,
    actor=None,
    entity_id=None,
    before: dict = None,
    after: dict = None,
) -> None:
    """
    Single entry point for all audit writes.
    Writes to AuditOutbox (Postgres) — Celery drains to ClickHouse.
    Safe to call from views, services, and Celery tasks.
    In tasks there is no HTTP request so context defaults to system placeholders.
    """
    user_id = None
    actor_name = "System"
    actor_grade = 0

    if actor is not None:
        user_id = actor.id
        actor_name = actor.get_full_name() or actor.username
        actor_grade = actor.employee_grade or 0

    payload: dict = {}
    if before:
        payload["before"] = before
    if after:
        payload["after"] = after

    AuditOutbox.objects.create(
        user_id=user_id,
        actor_name=actor_name,
        actor_grade=actor_grade,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        context=get_request_context(),
        payload=payload,
    )
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest tests/core/test_audit.py::AuditWriterTest -v
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add apps/core/audit.py tests/core/test_audit.py
git commit -m "feat: add write_audit() — single entry point for all audit events"
```

---

## Task 6: Celery Drain Task + Beat Schedules

**Files:**
- Modify: `apps/core/tasks.py`
- Modify: `config/celery.py`
- Modify: `config/settings/base.py`

- [ ] **Step 1: Write failing test**

Add to `tests/core/test_audit.py`:
```python
from unittest.mock import patch, MagicMock

class DrainTaskTest(TestCase):
    def test_drain_skips_when_below_threshold(self):
        from apps.core.tasks import drain_audit_outbox
        from apps.core.models import AuditOutbox

        # Only 3 rows — below 500 threshold
        for i in range(3):
            AuditOutbox.objects.create(
                action=f'test.{i}', entity_type='X',
                actor_name='', actor_grade=0, context={}, payload={}
            )

        with patch('apps.core.tasks.get_client') as mock_ch:
            result = drain_audit_outbox()

        assert result['skipped'] is True
        mock_ch.assert_not_called()

    def test_drain_force_drains_regardless_of_count(self):
        from apps.core.tasks import drain_audit_outbox
        from apps.core.models import AuditOutbox

        AuditOutbox.objects.create(
            action='test.1', entity_type='X',
            actor_name='', actor_grade=0, context={}, payload={}
        )

        mock_client = MagicMock()
        with patch('apps.core.tasks.get_client', return_value=mock_client):
            result = drain_audit_outbox(force=True)

        assert result['drained'] == 1
        mock_client.insert.assert_called_once()
        assert AuditOutbox.objects.count() == 0

    def test_drain_clears_outbox_after_insert(self):
        from apps.core.tasks import drain_audit_outbox
        from apps.core.models import AuditOutbox
        from django.test import override_settings

        for i in range(500):
            AuditOutbox.objects.create(
                action='expense.approved', entity_type='Expense',
                actor_name='', actor_grade=0, context={}, payload={}
            )

        mock_client = MagicMock()
        with patch('apps.core.tasks.get_client', return_value=mock_client):
            with override_settings(AUDIT_OUTBOX_BATCH_SIZE=500):
                result = drain_audit_outbox()

        assert result['drained'] == 500
        assert AuditOutbox.objects.count() == 0
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/core/test_audit.py::DrainTaskTest -v
```
Expected: `ImportError` or attribute errors

- [ ] **Step 3: Replace `apps/core/tasks.py` entirely**

```python
import json
import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

BATCH_SIZE = getattr(settings, "AUDIT_OUTBOX_BATCH_SIZE", 500)


@shared_task(queue="analytics")
def drain_audit_outbox(force: bool = False) -> dict:
    """
    Drain AuditOutbox rows into ClickHouse audit_events.
    Skips if row count < AUDIT_OUTBOX_BATCH_SIZE unless force=True.
    """
    from .models import AuditOutbox
    from .clickhouse_client import get_client

    threshold = getattr(settings, "AUDIT_OUTBOX_BATCH_SIZE", 500)
    count = AuditOutbox.objects.count()

    if not force and count < threshold:
        return {"skipped": True, "count": count}

    rows = list(AuditOutbox.objects.order_by("created_at")[:1000])
    if not rows:
        return {"drained": 0}

    db = settings.CLICKHOUSE_DATABASE
    client = get_client()

    data = [
        [
            str(row.id),
            str(row.user_id) if row.user_id else None,
            row.actor_name,
            row.actor_grade,
            row.action,
            row.entity_type,
            str(row.entity_id) if row.entity_id else None,
            json.dumps(row.context),
            json.dumps(row.payload),
            row.created_at,
        ]
        for row in rows
    ]

    client.insert(
        f"`{db}`.audit_events",
        data,
        column_names=[
            "id", "user_id", "actor_name", "actor_grade", "action",
            "entity_type", "entity_id", "context", "payload", "created_at",
        ],
    )

    AuditOutbox.objects.filter(id__in=[r.id for r in rows]).delete()
    logger.info("Drained %d audit events to ClickHouse", len(rows))
    return {"drained": len(rows)}


@shared_task(queue="analytics")
def drain_audit_outbox_eod() -> dict:
    """End-of-day force drain — flushes all pending rows regardless of count."""
    return drain_audit_outbox(force=True)
```

- [ ] **Step 4: Add beat schedules to `config/celery.py`**

Add to `app.conf.beat_schedule`:
```python
    "check-audit-outbox": {
        "task": "apps.core.tasks.drain_audit_outbox",
        "schedule": crontab(minute="*"),  # every minute — skips if < 500 rows
    },
    "drain-audit-outbox-eod": {
        "task": "apps.core.tasks.drain_audit_outbox_eod",
        "schedule": crontab(hour=23, minute=59),  # 23:59 IST (timezone=Asia/Kolkata)
    },
```

Also add the task route in `task_routes`:
```python
        "apps.core.tasks.drain_audit_outbox": {"queue": "analytics"},
        "apps.core.tasks.drain_audit_outbox_eod": {"queue": "analytics"},
```

Remove the old broken entry:
```python
        # DELETE this line:
        "apps.core.tasks.mirror_event_to_clickhouse": {"queue": "analytics"},
```

- [ ] **Step 5: Add `AUDIT_OUTBOX_BATCH_SIZE` to `config/settings/base.py`**

```python
# --- Audit ---
AUDIT_OUTBOX_BATCH_SIZE = 500
```

- [ ] **Step 6: Run tests**

```bash
uv run pytest tests/core/test_audit.py::DrainTaskTest -v
```
Expected: 3 passed

- [ ] **Step 7: Commit**

```bash
git add apps/core/tasks.py config/celery.py config/settings/base.py tests/core/test_audit.py
git commit -m "feat: add Celery drain task — outbox to ClickHouse at 500 rows or EOD"
```

---

## Task 7: Startup Auto-Migration

**Files:**
- Modify: `apps/core/apps.py`

- [ ] **Step 1: Update `apps/core/apps.py`**

No test needed — this is a startup hook; tested by running the server. Replace the file:

```python
import logging
import sys

from django.apps import AppConfig

logger = logging.getLogger(__name__)

_SKIP_CMDS = {"migrate", "makemigrations", "collectstatic", "test", "shell"}


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "Core"

    def ready(self):
        if any(cmd in sys.argv for cmd in _SKIP_CMDS):
            return
        try:
            self._init_clickhouse()
        except Exception as exc:
            logger.warning("ClickHouse startup init skipped: %s", exc)

    def _init_clickhouse(self):
        from django.conf import settings
        from .clickhouse_client import ensure_schema, get_client

        ensure_schema()

        client = get_client()
        db = settings.CLICKHOUSE_DATABASE
        result = client.query(f"SELECT count() FROM `{db}`.audit_events")
        ch_count = result.result_rows[0][0]

        if ch_count == 0:
            self._migrate_postgres_audit(client, db)

    @staticmethod
    def _migrate_postgres_audit(client, db):
        import json
        from .models import AuditLog

        total = AuditLog.objects.count()
        if total == 0:
            return

        logger.info("Migrating %d AuditLog rows to ClickHouse...", total)
        BATCH = 1000
        migrated = 0

        qs = AuditLog.objects.select_related("user").order_by("created_at")

        while migrated < total:
            batch = list(qs[migrated : migrated + BATCH])
            if not batch:
                break

            data = [
                [
                    str(row.id),
                    str(row.user_id) if row.user_id else None,
                    row.user.get_full_name() if row.user else "System",
                    row.user.employee_grade if row.user else 0,
                    row.action,
                    row.entity_type,
                    str(row.entity_id) if row.entity_id else None,
                    json.dumps({
                        "ip": "migrated",
                        "user_agent": "migrated",
                        "session_hash": None,
                        "request_id": None,
                    }),
                    json.dumps({
                        "before": row.masked_before or {},
                        "after": row.masked_after or {},
                    }),
                    row.created_at,
                ]
                for row in batch
            ]

            client.insert(
                f"`{db}`.audit_events",
                data,
                column_names=[
                    "id", "user_id", "actor_name", "actor_grade", "action",
                    "entity_type", "entity_id", "context", "payload", "created_at",
                ],
            )
            migrated += len(batch)
            logger.info("Migrated %d / %d rows", migrated, total)

        logger.info("ClickHouse audit migration complete: %d rows", migrated)
```

- [ ] **Step 2: Verify startup migration runs**

```bash
docker compose up -d
docker compose logs web | grep -i "clickhouse\|migrat"
```
Expected: `Migrating X AuditLog rows to ClickHouse...` then `migration complete`

- [ ] **Step 3: Commit**

```bash
git add apps/core/apps.py
git commit -m "feat: auto-migrate Postgres AuditLog to ClickHouse on startup if empty"
```

---

## Task 8: Instrument Auth Events

**Files:**
- Modify: `apps/core/auth_views.py`

- [ ] **Step 1: Add imports and instrument LoginView, ChangePasswordView, RegisterView**

In `apps/core/auth_views.py`, add import at the top:
```python
from .audit import write_audit
```

Remove the existing `AuditLog` import (it will be unused after all instrumentations):
```python
# DELETE: from .models import User, AuditLog
from .models import User  # AuditLog removed — reads go via ClickHouse now
```

In `LoginView.post`, after the successful login response is prepared:
```python
def post(self, request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        # Log failed login attempt (no actor — user not authenticated yet)
        write_audit(
            action="auth.login_failed",
            entity_type="User",
            after={"username": request.data.get("username", "")[:50]},
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data["user"]
    refresh = RefreshToken.for_user(user)
    refresh["username"] = user.username

    write_audit(action="auth.login", entity_type="User", actor=user, entity_id=user.id)

    return Response({
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": UserProfileSerializer(user).data,
    })
```

In `ChangePasswordView.post`, after `user.save()`:
```python
    request.user.save(update_fields=["password"])
    write_audit(
        action="auth.password_changed",
        entity_type="User",
        actor=request.user,
        entity_id=request.user.id,
    )
```

In `RegisterView.post`, after user creation:
```python
    user = serializer.save()
    write_audit(
        action="user.registered",
        entity_type="User",
        actor=request.user if request.user.is_authenticated else None,
        entity_id=user.id,
        after={"username": user.username, "grade": user.employee_grade},
    )
```

- [ ] **Step 2: Instrument IAM events in `UserDetailView`**

In `UserDetailView.patch` (user grade/details update), after `serializer.save()`:
```python
    old_grade = user.employee_grade
    serializer.save()
    new_grade = user.employee_grade
    write_audit(
        action="iam.user_updated",
        entity_type="User",
        actor=request.user,
        entity_id=user.id,
        before={"grade": old_grade},
        after={"grade": new_grade},
    )
```

In `UserDetailView.delete`, before deletion:
```python
    write_audit(
        action="iam.user_deleted",
        entity_type="User",
        actor=request.user,
        entity_id=user.id,
        before={"username": user.username, "grade": user.employee_grade},
    )
    user.delete()
```

- [ ] **Step 3: Verify no import errors**

```bash
uv run python manage.py check
```
Expected: `System check identified no issues`

- [ ] **Step 4: Commit**

```bash
git add apps/core/auth_views.py
git commit -m "feat: instrument auth and IAM events (login, password, user CRUD)"
```

---

## Task 9: Instrument Expense Lifecycle

**Files:**
- Modify: `apps/invoices/services.py`
- Modify: `apps/invoices/employee_views.py`

- [ ] **Step 1: Replace `AuditLog.objects.create` in `services.py`**

In `apps/invoices/services.py`, replace the import:
```python
# DELETE: from apps.core.models import AuditLog
from apps.core.audit import write_audit
```

Replace the `AuditLog.objects.create` at line ~422 (superior override):
```python
# DELETE the existing AuditLog.objects.create block and replace with:
write_audit(
    action="expense.superior_override_approved",
    entity_type="Expense",
    actor=actor,
    entity_id=expense.id,
    before={"status": old_status},
    after={
        "status": "APPROVED",
        "reason": final_reason,
        "override": True,
        "actor_grade": actor_grade,
    },
)
```

Replace the `AuditLog.objects.create` at line ~480 (transition_expense):
```python
# DELETE the existing AuditLog.objects.create block and replace with:
write_audit(
    action=f"expense.{new_status.lower()}",
    entity_type="Expense",
    actor=actor,
    entity_id=expense.id,
    before={"status": old_status},
    after={"status": new_status, "reason": reason},
)
```

- [ ] **Step 2: Replace `AuditLog.objects.create` in `employee_views.py`**

In `apps/invoices/employee_views.py`, replace the import:
```python
# DELETE: from apps.core.models import AuditLog (if present)
from apps.core.audit import write_audit
```

Replace the `AuditLog.objects.create` at line ~541 (expense submission):
```python
# DELETE the existing AuditLog.objects.create block and replace with:
write_audit(
    action="expense.submitted",
    entity_type="Expense",
    actor=user,
    entity_id=expense.id,
    after={
        "category": category,
        "amount": float(amount),
        "over_limit": over_limit,
        "submitted_by_grade": grade,
    },
)
```

- [ ] **Step 3: Verify**

```bash
uv run python manage.py check
uv run pytest tests/ -v -k "expense" --no-header 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/invoices/services.py apps/invoices/employee_views.py
git commit -m "feat: replace AuditLog.objects.create with write_audit() in expense lifecycle"
```

---

## Task 10: Instrument Vendor Events

**Files:**
- Modify: `apps/invoices/vendor_views.py`

- [ ] **Step 1: Add import and instrument vendor views**

In `apps/invoices/vendor_views.py`, add:
```python
from apps.core.audit import write_audit
```

In `VendorCreateView.post`, after vendor is saved:
```python
    write_audit(
        action="vendor.created",
        entity_type="Vendor",
        actor=request.user,
        entity_id=vendor.id,
        after={"name": vendor.name, "type": vendor.vendor_type, "status": vendor.status},
    )
```

In `VendorDetailView.patch`, capture before state and write after save:
```python
    old_status = vendor.status
    serializer.save()
    write_audit(
        action="vendor.updated",
        entity_type="Vendor",
        actor=request.user,
        entity_id=vendor.id,
        before={"status": old_status},
        after={"status": vendor.status},
    )
```

In `VendorActivateView.post`, after status change:
```python
    old_status = vendor.status
    vendor.status = new_status  # wherever status is set
    vendor.save()
    write_audit(
        action=f"vendor.{'activated' if new_status == 'ACTIVE' else 'deactivated'}",
        entity_type="Vendor",
        actor=request.user,
        entity_id=vendor.id,
        before={"status": old_status},
        after={"status": new_status},
    )
```

- [ ] **Step 2: Verify**

```bash
uv run python manage.py check
```

- [ ] **Step 3: Commit**

```bash
git add apps/invoices/vendor_views.py
git commit -m "feat: instrument vendor create/update/activate events"
```

---

## Task 11: Instrument File Events

**Files:**
- Modify: `apps/core/file_views.py`

- [ ] **Step 1: Add import and instrument FileUploadView and FileDownloadView**

In `apps/core/file_views.py`, add:
```python
from .audit import write_audit
```

In `FileUploadView.post`, after file is saved to DB:
```python
    write_audit(
        action="file.uploaded",
        entity_type="FileRef",
        actor=request.user,
        entity_id=file_ref.id,
        after={
            "filename": file_ref.original_filename,
            "size_bytes": request.FILES[list(request.FILES.keys())[0]].size,
        },
    )
```

In `FileDownloadView.get`, before returning the file response:
```python
    write_audit(
        action="file.downloaded",
        entity_type="FileRef",
        actor=request.user,
        entity_id=file_ref.id,
        after={"filename": file_ref.original_filename},
    )
```

- [ ] **Step 2: Verify**

```bash
uv run python manage.py check
```

- [ ] **Step 3: Commit**

```bash
git add apps/core/file_views.py
git commit -m "feat: instrument file upload and download events"
```

---

## Task 12: Update AuditLogListView to Query ClickHouse

**Files:**
- Modify: `apps/core/auth_views.py`

This replaces the existing `AuditLogListView` Postgres query with a ClickHouse query. The role-based filtering logic is preserved — translated from Django ORM to SQL.

- [ ] **Step 1: Replace `AuditLogListView.get` in `apps/core/auth_views.py`**

```python
class AuditLogListView(APIView):
    """
    GET /api/v1/audit/ — Paginated audit log with role-based visibility.
    Reads from ClickHouse audit_events table.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        import json
        from django.conf import settings
        from .clickhouse_client import get_client

        user = request.user
        grade = user.employee_grade or 1
        is_vendor = hasattr(user, "vendor_profile") and user.vendor_profile is not None
        is_cfo = user.is_superuser or grade >= 5

        limit = min(int(request.query_params.get("limit", 50)), 200)
        offset = int(request.query_params.get("offset", 0))
        entity_type_filter = request.query_params.get("entity_type")
        action_filter = request.query_params.get("action")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        conditions = []
        params = {}

        if is_vendor:
            from apps.invoices.models import Expense
            vendor_ids = list(
                Expense.objects.filter(vendor=user.vendor_profile).values_list("id", flat=True)
            )
            visible_actions = [
                "expense.submitted", "expense.approved", "expense.rejected",
                "expense.query_raised", "expense.pending_l1", "expense.pending_hod",
                "expense.pending_fin_l1", "expense.pending_fin_l2",
                "expense.pending_fin_head", "expense.paid", "expense.withdrawn",
            ]
            id_list = ", ".join(f"'{str(i)}'" for i in vendor_ids) or "''"
            action_list = ", ".join(f"'{a}'" for a in visible_actions)
            conditions.append(f"entity_type = 'Expense'")
            conditions.append(f"entity_id IN ({id_list})")
            conditions.append(f"action IN ({action_list})")

        elif not is_cfo and grade < 4:
            visible_users = list(
                User.objects.filter(employee_grade__lte=grade, is_active=True)
                .values_list("id", flat=True)
            )
            if user.id not in visible_users:
                visible_users.append(user.id)
            uid_list = ", ".join(f"'{str(u)}'" for u in visible_users) or f"'{user.id}'"
            conditions.append(f"user_id IN ({uid_list})")

            hidden_actions = ["expense.superior_override_approved"]
            if grade < 3:
                hidden_actions += [
                    "expense.pending_fin_l1", "expense.pending_fin_l2", "expense.pending_fin_head",
                ]
            action_list = ", ".join(f"'{a}'" for a in hidden_actions)
            conditions.append(f"action NOT IN ({action_list})")

        elif not is_cfo and grade == 4:
            cfo_ids = list(
                User.objects.filter(
                    models.Q(is_superuser=True) | models.Q(employee_grade__gte=5)
                ).values_list("id", flat=True)
            )
            if cfo_ids:
                cfo_list = ", ".join(f"'{str(u)}'" for u in cfo_ids)
                conditions.append(f"user_id NOT IN ({cfo_list})")
            conditions.append("action != 'expense.superior_override_approved'")

        if entity_type_filter:
            conditions.append("entity_type = {entity_type:String}")
            params["entity_type"] = entity_type_filter
        if action_filter:
            conditions.append("action ILIKE {action_filter:String}")
            params["action_filter"] = f"%{action_filter}%"
        if date_from:
            conditions.append("created_at >= {date_from:String}")
            params["date_from"] = date_from
        if date_to:
            conditions.append("created_at <= {date_to:String}")
            params["date_to"] = date_to + " 23:59:59"

        user_id_param = request.query_params.get("user_id")
        if user_id_param and (user.is_superuser or grade >= 4):
            conditions.append("user_id = {filter_user_id:UUID}")
            params["filter_user_id"] = user_id_param

        where = "WHERE " + " AND ".join(conditions) if conditions else ""
        db = settings.CLICKHOUSE_DATABASE
        client = get_client()

        total_result = client.query(
            f"SELECT count() FROM `{db}`.audit_events {where}", parameters=params
        )
        total = total_result.result_rows[0][0]

        rows_result = client.query(
            f"""
            SELECT id, user_id, actor_name, actor_grade, action, entity_type,
                   entity_id, context, payload, created_at
            FROM `{db}`.audit_events
            {where}
            ORDER BY created_at DESC
            LIMIT {limit} OFFSET {offset}
            """,
            parameters=params,
        )

        results = []
        for row in rows_result.result_rows:
            (rid, uid, actor_name, actor_grade, action, entity_type,
             entity_id, context_str, payload_str, created_at) = row

            try:
                payload = json.loads(payload_str) if payload_str else {}
            except (ValueError, TypeError):
                payload = {}

            details = payload.get("after", {})
            if is_vendor:
                details = {
                    k: v for k, v in details.items()
                    if k not in ("reason", "override", "actor_grade", "note")
                }

            results.append({
                "id": str(rid),
                "action": action,
                "entity_type": entity_type,
                "entity_id": str(entity_id) if entity_id else None,
                "actor": actor_name or "System",
                "actor_role": actor_grade,
                "timestamp": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
                "details": details,
                "context": json.loads(context_str) if (context_str and (user.is_superuser or grade >= 4)) else None,
            })

        return Response({"total": total, "results": results, "limit": limit, "offset": offset})
```

- [ ] **Step 2: Verify**

```bash
uv run python manage.py check
docker compose up -d
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/audit/
```

- [ ] **Step 3: Commit**

```bash
git add apps/core/auth_views.py
git commit -m "feat: AuditLogListView now reads from ClickHouse with role-based filtering"
```

---

## Task 13: Remove Postgres AuditLog

**Files:**
- Modify: `apps/core/models.py`
- Create: `apps/core/migrations/0005_remove_auditlog.py`

- [ ] **Step 1: Verify no remaining usages**

```bash
grep -rn "AuditLog" apps/ --include="*.py" | grep -v "Outbox\|migration"
```
Expected: no output (all usages replaced in Tasks 8–11)

- [ ] **Step 2: Remove `AuditLog` class from `apps/core/models.py`**

Delete the entire block from `# AuditLog` comment through the closing `__str__` method (lines 129–165).

- [ ] **Step 3: Create and run migration**

```bash
uv run python manage.py makemigrations core --name remove_auditlog
uv run python manage.py migrate
```

- [ ] **Step 4: Verify**

```bash
uv run python manage.py check
```
Expected: no issues

- [ ] **Step 5: Commit**

```bash
git add apps/core/models.py apps/core/migrations/
git commit -m "feat: remove Postgres AuditLog model — ClickHouse is now the sole store"
```

---

## Task 14: Frontend AuditScreen — Context Panel for G4+/CFO

**Files:**
- Modify: `js/Secondary.jsx`

- [ ] **Step 1: Update `parseEntries` to include context**

In `AuditScreen`'s `parseEntries` function in `js/Secondary.jsx`, add `context` to the parsed entry:

```javascript
return {
  id:      entry.id || i,
  user:    entry.actor || 'System',
  action:  verb || actionStr,
  entity:  entityName,
  type,
  time:    entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—',
  reason,
  amount,
  detail:  Object.keys(details).length > 0 ? JSON.stringify(details, null, 2) : null,
  context: entry.context || null,   // ← add this
  raw:     entry,
};
```

- [ ] **Step 2: Add context panel to the detail expand view**

In the expanded row section of the audit timeline, after the existing `detail` display, add:

```jsx
{entry.context && (
  <div style={{
    marginTop: '8px', padding: '10px 12px',
    background: '#F8FAFC', borderRadius: '8px',
    border: '1px solid #E2E8F0', fontSize: '11px',
    fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#64748B'
  }}>
    <div style={{ fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>
      Request Context
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
      {entry.context.ip && <span>IP: <strong>{entry.context.ip}</strong></span>}
      {entry.context.session_hash && <span>Session: <strong>{entry.context.session_hash}</strong></span>}
      {entry.context.request_id && <span>Req ID: <strong>{entry.context.request_id}</strong></span>}
      {entry.context.user_agent && (
        <span style={{ gridColumn: '1 / -1' }}>
          UA: <strong style={{ wordBreak: 'break-all' }}>{entry.context.user_agent.slice(0, 80)}</strong>
        </span>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 3: Update stats cards to include new action type counts**

In `AuditScreen`, update the stats `useMemo`:
```javascript
const stats = React.useMemo(() => ({
  invoice:  auditEntries.filter(e => e.type === 'INVOICE' || e.type === 'EXPENSE').length,
  approval: auditEntries.filter(e => e.type === 'APPROVAL' || e.action.includes('approv') || e.action.includes('reject')).length,
  vendor:   auditEntries.filter(e => e.type === 'VENDOR').length,
  user:     auditEntries.filter(e => e.type === 'USER' || e.action.startsWith('iam.') || e.action.startsWith('auth.')).length,
  system:   auditEntries.filter(e => e.type === 'SYSTEM').length,
  file:     auditEntries.filter(e => e.action.startsWith('file.')).length,
}), [auditEntries]);
```

Add `'File'` to the `chips` array:
```javascript
const chips = ['All', 'Invoice', 'Approval', 'Vendor', 'User', 'File', 'System'];
```

Update the `filtered` function to handle `'File'`:
```javascript
const filtered = auditEntries.filter(e => {
  const matchType =
    filterChip === 'All' ||
    e.type === filterChip.toUpperCase() ||
    (filterChip === 'Invoice' && e.type === 'EXPENSE') ||
    (filterChip === 'File' && e.action.startsWith('file.')) ||
    (filterChip === 'User' && (e.type === 'USER' || e.action.startsWith('iam.') || e.action.startsWith('auth.')));
  const matchSearch = !search ||
    e.user.toLowerCase().includes(search.toLowerCase()) ||
    e.entity.toLowerCase().includes(search.toLowerCase()) ||
    e.action.toLowerCase().includes(search.toLowerCase());
  return matchType && matchSearch;
});
```

- [ ] **Step 4: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add js/Secondary.jsx
git commit -m "feat: AuditScreen shows request context panel for G4+/CFO, adds File filter chip"
```

---

## Self-Review Checklist

- [x] **Docker**: ClickHouse service with healthcheck added; all Django services depend on it
- [x] **Schema**: `audit_events` created with correct engine, partition, ordering
- [x] **Outbox**: `AuditOutbox` model + migration; drained at 500 rows or 23:59 IST
- [x] **Middleware**: IP (rightmost from XFF), user-agent, session hash (never raw token), request ID
- [x] **Writer**: single `write_audit()` — no direct `AuditOutbox.objects.create` calls in views
- [x] **Auth events**: login, login_failed, password_changed, user_registered
- [x] **IAM events**: user_updated (grade change), user_deleted
- [x] **Expense events**: submitted, all status transitions, superior_override_approved
- [x] **Vendor events**: created, updated, activated/deactivated
- [x] **File events**: uploaded, downloaded
- [x] **AuditLogListView**: reads ClickHouse; role filtering preserved; date_from/date_to now works
- [x] **AuditLog removal**: model removed + migration to drop table
- [x] **Frontend**: context panel for G4+/CFO; File chip; date filtering functional
- [x] **Security**: no PAN/GST/bank details logged anywhere; session hash only; IP trusted rightmost
