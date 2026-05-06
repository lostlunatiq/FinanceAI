# AI Feedback Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prerequisite:** `2026-04-28-clickhouse-audit-log.md` must be fully implemented first. ClickHouse must be running and `apps/core/clickhouse_client.py` must exist.

**Goal:** Log every AI pipeline invocation to ClickHouse, capture user corrections/feedback per pipeline type, and inject relevant past feedback as context into future AI calls via entity-scoped retrieval.

**Architecture:** A thin `ai_logger.py` module wraps each pipeline call — it writes `ai_inference_log` rows directly to ClickHouse (not via outbox, since inference logs are high-volume and latency-tolerant). Five typed `ai_feedback_*` tables in ClickHouse store user corrections. A `get_feedback_context(pipeline, entity_id)` function queries the relevant table and returns a formatted string injected into the model prompt. The UI adds inline feedback widgets to the five AI surfaces: OCR form fields, anomaly flag cards, forecast panel, NL query responses, and expense query suggestions.

**Tech Stack:** Django 4.x, `clickhouse-connect==0.15.1`, React (existing `js/` JSX files), existing `ai/pipelines/` and `ai/agents/`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/core/clickhouse_client.py` | Modify | Add `ai_inference_log` + 5 `ai_feedback_*` table DDLs |
| `apps/core/ai_logger.py` | Create | `log_inference()` + `get_feedback_context()` |
| `apps/invoices/ai_feedback_views.py` | Create | POST endpoints for each of the 5 feedback types |
| `apps/invoices/urls.py` | Modify | Register feedback endpoints |
| `ai/pipelines/ocr_pipeline.py` | Modify | Call `log_inference()` before/after run |
| `ai/pipelines/anomaly_pipeline.py` | Modify | Call `log_inference()` before/after run |
| `ai/pipelines/forecast_pipeline.py` | Modify | Call `log_inference()` before/after run |
| `ai/agents/query_agent.py` | Modify | Call `log_inference()` before/after run |
| `apps/invoices/services.py` | Modify | Log inference for `build_query_ai_suggestion` |
| `ai/pipelines/ocr_pipeline.py` | Modify | Inject OCR feedback context before model call |
| `ai/pipelines/anomaly_pipeline.py` | Modify | Inject anomaly feedback context before model call |
| `apps/invoices/services.py` | Modify | Inject suggestion feedback context |
| `js/Secondary.jsx` | Modify | OCR field correction inline widget |
| `js/AIHub.jsx` | Modify | NL query thumbs up/down + feedback modal for anomalies |
| `js/App.jsx` or expense detail component | Modify | AI suggestion accept/reject/edit buttons |
| `tests/core/test_ai_logger.py` | Create | Tests for inference logging and feedback retrieval |

---

## Task 1: ClickHouse AI Tables DDL

**Files:**
- Modify: `apps/core/clickhouse_client.py`

- [ ] **Step 1: Write failing test**

Create `tests/core/test_ai_logger.py`:
```python
from unittest.mock import MagicMock, patch
import apps.core.clickhouse_client as ch

def test_ensure_schema_creates_ai_tables():
    mock_client = MagicMock()
    original = ch._client
    ch._client = mock_client
    try:
        from apps.core.clickhouse_client import ensure_schema
        ensure_schema()
    finally:
        ch._client = original

    commands = [str(c) for c in mock_client.command.call_args_list]
    assert any('ai_inference_log' in c for c in commands)
    assert any('ai_feedback_ocr' in c for c in commands)
    assert any('ai_feedback_anomaly' in c for c in commands)
    assert any('ai_feedback_forecast' in c for c in commands)
    assert any('ai_feedback_nl_query' in c for c in commands)
    assert any('ai_feedback_suggestion' in c for c in commands)
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/core/test_ai_logger.py::test_ensure_schema_creates_ai_tables -v
```
Expected: FAIL

- [ ] **Step 3: Add DDL constants to `apps/core/clickhouse_client.py`**

Add after `_ANALYTICS_DDLS`:
```python
_DDL_AI_INFERENCE_LOG = """\
CREATE TABLE IF NOT EXISTS `{db}`.ai_inference_log (
    id           UUID    DEFAULT generateUUIDv4(),
    pipeline     LowCardinality(String),
    entity_type  LowCardinality(String),
    entity_id    Nullable(UUID),
    user_id      Nullable(UUID),
    model_used   String  DEFAULT '',
    input_hash   String  DEFAULT '',
    confidence   Nullable(Float32),
    latency_ms   UInt32  DEFAULT 0,
    success      Bool    DEFAULT true,
    created_at   DateTime64(3, 'Asia/Kolkata')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, pipeline, entity_type)
"""

_DDL_AI_FEEDBACK_OCR = """\
CREATE TABLE IF NOT EXISTS `{db}`.ai_feedback_ocr (
    id               UUID    DEFAULT generateUUIDv4(),
    inference_id     Nullable(UUID),
    expense_id       Nullable(UUID),
    vendor_id        Nullable(UUID),
    field_name       String  DEFAULT '',
    original_value   String  DEFAULT '',
    corrected_value  String  DEFAULT '',
    user_id          Nullable(UUID),
    created_at       DateTime64(3, 'Asia/Kolkata')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (vendor_id, field_name, created_at)
"""

_DDL_AI_FEEDBACK_ANOMALY = """\
CREATE TABLE IF NOT EXISTS `{db}`.ai_feedback_anomaly (
    id               UUID    DEFAULT generateUUIDv4(),
    inference_id     Nullable(UUID),
    expense_id       Nullable(UUID),
    vendor_id        Nullable(UUID),
    flag_type        String  DEFAULT '',
    was_false_positive Bool  DEFAULT true,
    reason_code      LowCardinality(String),
    free_text        String  DEFAULT '',
    user_id          Nullable(UUID),
    created_at       DateTime64(3, 'Asia/Kolkata')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (vendor_id, flag_type, created_at)
"""

_DDL_AI_FEEDBACK_FORECAST = """\
CREATE TABLE IF NOT EXISTS `{db}`.ai_feedback_forecast (
    id                    UUID   DEFAULT generateUUIDv4(),
    inference_id          Nullable(UUID),
    department_id         Nullable(UUID),
    category              String DEFAULT '',
    forecast_was_accurate Bool   DEFAULT false,
    deviation_direction   LowCardinality(String),
    note                  String DEFAULT '',
    user_id               Nullable(UUID),
    created_at            DateTime64(3, 'Asia/Kolkata')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (department_id, created_at)
"""

_DDL_AI_FEEDBACK_NL_QUERY = """\
CREATE TABLE IF NOT EXISTS `{db}`.ai_feedback_nl_query (
    id            UUID   DEFAULT generateUUIDv4(),
    inference_id  Nullable(UUID),
    question_hash String DEFAULT '',
    rating        LowCardinality(String),
    user_id       Nullable(UUID),
    created_at    DateTime64(3, 'Asia/Kolkata')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (question_hash, created_at)
"""

_DDL_AI_FEEDBACK_SUGGESTION = """\
CREATE TABLE IF NOT EXISTS `{db}`.ai_feedback_suggestion (
    id               UUID   DEFAULT generateUUIDv4(),
    inference_id     Nullable(UUID),
    expense_query_id Nullable(UUID),
    vendor_id        Nullable(UUID),
    action           LowCardinality(String),
    edited_text      String DEFAULT '',
    user_id          Nullable(UUID),
    created_at       DateTime64(3, 'Asia/Kolkata')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (vendor_id, created_at)
"""

_AI_DDLS = [
    _DDL_AI_INFERENCE_LOG,
    _DDL_AI_FEEDBACK_OCR,
    _DDL_AI_FEEDBACK_ANOMALY,
    _DDL_AI_FEEDBACK_FORECAST,
    _DDL_AI_FEEDBACK_NL_QUERY,
    _DDL_AI_FEEDBACK_SUGGESTION,
]
```

Update `ensure_schema()` to also run `_AI_DDLS`:
```python
def ensure_schema():
    db = settings.CLICKHOUSE_DATABASE
    client = get_client()
    client.command(_DDL_DATABASE.format(db=db))
    client.command(_DDL_AUDIT_EVENTS.format(db=db))
    for ddl in _ANALYTICS_DDLS:
        client.command(ddl.format(db=db))
    for ddl in _AI_DDLS:
        client.command(ddl.format(db=db))
```

- [ ] **Step 4: Run test**

```bash
uv run pytest tests/core/test_ai_logger.py::test_ensure_schema_creates_ai_tables -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/core/clickhouse_client.py tests/core/test_ai_logger.py
git commit -m "feat: add ai_inference_log and 5 ai_feedback_* table DDLs"
```

---

## Task 2: AI Logger Module

**Files:**
- Create: `apps/core/ai_logger.py`

- [ ] **Step 1: Write failing tests**

Add to `tests/core/test_ai_logger.py`:
```python
from unittest.mock import patch, MagicMock
from django.test import TestCase
import uuid

class AILoggerTest(TestCase):
    def test_log_inference_inserts_to_clickhouse(self):
        from apps.core.ai_logger import log_inference

        mock_client = MagicMock()
        with patch('apps.core.ai_logger.get_client', return_value=mock_client):
            inference_id = log_inference(
                pipeline='ocr',
                entity_type='Expense',
                entity_id=uuid.uuid4(),
                model_used='claude-3-haiku',
                input_hash='abc123',
                confidence=0.92,
                latency_ms=1200,
                success=True,
            )

        assert inference_id is not None
        mock_client.insert.assert_called_once()

    def test_get_feedback_context_ocr_returns_corrections(self):
        from apps.core.ai_logger import get_feedback_context

        vendor_id = uuid.uuid4()
        mock_client = MagicMock()
        mock_client.query.return_value.result_rows = [
            ('invoice_number', 'INV-001', 'INV-002'),
            ('total_amount', '1000', '1050'),
        ]
        with patch('apps.core.ai_logger.get_client', return_value=mock_client):
            context = get_feedback_context('ocr', vendor_id=str(vendor_id))

        assert 'invoice_number' in context
        assert 'INV-002' in context

    def test_get_feedback_context_returns_empty_string_on_error(self):
        from apps.core.ai_logger import get_feedback_context

        with patch('apps.core.ai_logger.get_client', side_effect=Exception("CH down")):
            context = get_feedback_context('ocr', vendor_id=str(uuid.uuid4()))

        assert context == ''
```

- [ ] **Step 2: Run to confirm failure**

```bash
uv run pytest tests/core/test_ai_logger.py::AILoggerTest -v
```
Expected: `ImportError`

- [ ] **Step 3: Create `apps/core/ai_logger.py`**

```python
import hashlib
import logging
import uuid as _uuid
from datetime import datetime, timezone

from django.conf import settings

from .clickhouse_client import get_client

logger = logging.getLogger(__name__)

_DB = lambda: settings.CLICKHOUSE_DATABASE


def log_inference(
    pipeline: str,
    entity_type: str,
    entity_id=None,
    user_id=None,
    model_used: str = "",
    input_hash: str = "",
    confidence: float = None,
    latency_ms: int = 0,
    success: bool = True,
) -> str:
    """
    Log an AI pipeline invocation to ClickHouse.
    Returns the inference_id (UUID string) for linking feedback later.
    Never raises — logs warning on failure so pipeline is never blocked.
    """
    inference_id = str(_uuid.uuid4())
    try:
        client = get_client()
        client.insert(
            f"`{_DB()}`.ai_inference_log",
            [[
                inference_id,
                pipeline,
                entity_type,
                str(entity_id) if entity_id else None,
                str(user_id) if user_id else None,
                model_used,
                input_hash,
                confidence,
                latency_ms,
                success,
                datetime.now(timezone.utc),
            ]],
            column_names=[
                "id", "pipeline", "entity_type", "entity_id", "user_id",
                "model_used", "input_hash", "confidence", "latency_ms", "success", "created_at",
            ],
        )
    except Exception as exc:
        logger.warning("Failed to log AI inference (%s): %s", pipeline, exc)
    return inference_id


def get_feedback_context(pipeline: str, vendor_id: str = None,
                          entity_id: str = None, question_hash: str = None) -> str:
    """
    Retrieve past user feedback for a pipeline scoped to the entity.
    Returns a formatted string suitable for injection into a model prompt.
    Returns '' on any error — never blocks the pipeline.
    """
    try:
        return _FEEDBACK_RETRIEVERS[pipeline](vendor_id=vendor_id, entity_id=entity_id,
                                               question_hash=question_hash)
    except Exception as exc:
        logger.warning("Failed to retrieve feedback context (%s): %s", pipeline, exc)
        return ""


def _ocr_context(vendor_id=None, **_) -> str:
    if not vendor_id:
        return ""
    client = get_client()
    rows = client.query(
        f"""
        SELECT field_name, original_value, corrected_value
        FROM `{_DB()}`.ai_feedback_ocr
        WHERE vendor_id = {{vendor_id:UUID}}
        ORDER BY created_at DESC
        LIMIT 20
        """,
        parameters={"vendor_id": vendor_id},
    ).result_rows
    if not rows:
        return ""
    lines = [f"  {r[0]}: '{r[1]}' was corrected to '{r[2]}'" for r in rows]
    return "Past OCR corrections for this vendor:\n" + "\n".join(lines)


def _anomaly_context(vendor_id=None, **_) -> str:
    if not vendor_id:
        return ""
    client = get_client()
    rows = client.query(
        f"""
        SELECT flag_type, reason_code, free_text, count() AS cnt
        FROM `{_DB()}`.ai_feedback_anomaly
        WHERE vendor_id = {{vendor_id:UUID}} AND was_false_positive = true
        GROUP BY flag_type, reason_code, free_text
        ORDER BY cnt DESC
        LIMIT 10
        """,
        parameters={"vendor_id": vendor_id},
    ).result_rows
    if not rows:
        return ""
    lines = [f"  {r[0]} (reason: {r[1]}) — {r[2]} ({r[3]}x false positive)" for r in rows]
    return "Known false positive patterns for this vendor:\n" + "\n".join(lines)


def _forecast_context(entity_id=None, **_) -> str:
    if not entity_id:
        return ""
    client = get_client()
    rows = client.query(
        f"""
        SELECT deviation_direction, note, count() AS cnt
        FROM `{_DB()}`.ai_feedback_forecast
        WHERE department_id = {{dept_id:UUID}} AND forecast_was_accurate = false
        GROUP BY deviation_direction, note
        ORDER BY cnt DESC
        LIMIT 5
        """,
        parameters={"dept_id": entity_id},
    ).result_rows
    if not rows:
        return ""
    lines = [f"  Forecast was {r[0]}: {r[1]} ({r[2]}x)" for r in rows]
    return "Past forecast inaccuracies for this department:\n" + "\n".join(lines)


def _nl_query_context(question_hash=None, **_) -> str:
    if not question_hash:
        return ""
    client = get_client()
    rows = client.query(
        f"""
        SELECT rating, count() AS cnt
        FROM `{_DB()}`.ai_feedback_nl_query
        WHERE question_hash = {{qhash:String}}
        GROUP BY rating
        """,
        parameters={"qhash": question_hash},
    ).result_rows
    if not rows:
        return ""
    summary = {r[0]: r[1] for r in rows}
    return f"This query type: {summary.get('thumbs_up', 0)} helpful, {summary.get('thumbs_down', 0)} not helpful."


def _suggestion_context(vendor_id=None, **_) -> str:
    if not vendor_id:
        return ""
    client = get_client()
    rows = client.query(
        f"""
        SELECT action, edited_text, count() AS cnt
        FROM `{_DB()}`.ai_feedback_suggestion
        WHERE vendor_id = {{vendor_id:UUID}}
        GROUP BY action, edited_text
        ORDER BY cnt DESC
        LIMIT 5
        """,
        parameters={"vendor_id": vendor_id},
    ).result_rows
    if not rows:
        return ""
    edits = [r[1] for r in rows if r[0] == "edited" and r[1]]
    if not edits:
        return ""
    return "Past manual edits to suggestions for this vendor:\n" + "\n".join(f"  - {e}" for e in edits)


_FEEDBACK_RETRIEVERS = {
    "ocr": _ocr_context,
    "anomaly": _anomaly_context,
    "forecast": _forecast_context,
    "nl_query": _nl_query_context,
    "ai_suggestion": _suggestion_context,
}
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest tests/core/test_ai_logger.py::AILoggerTest -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add apps/core/ai_logger.py tests/core/test_ai_logger.py
git commit -m "feat: add ai_logger with log_inference() and entity-scoped get_feedback_context()"
```

---

## Task 3: Feedback API Endpoints

**Files:**
- Create: `apps/invoices/ai_feedback_views.py`
- Modify: `apps/invoices/urls.py`

- [ ] **Step 1: Create `apps/invoices/ai_feedback_views.py`**

```python
import logging
from datetime import datetime, timezone

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.clickhouse_client import get_client

logger = logging.getLogger(__name__)

_DB = lambda: settings.CLICKHOUSE_DATABASE


def _insert(table: str, row: list, cols: list):
    try:
        get_client().insert(f"`{_DB()}`.{table}", [row], column_names=cols)
    except Exception as exc:
        logger.warning("Feedback insert failed (%s): %s", table, exc)
        raise


class OCRFeedbackView(APIView):
    """POST /api/v1/ai-feedback/ocr/ — User corrects an OCR-extracted field."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        _insert("ai_feedback_ocr", [
            None,                               # id — auto
            data.get("inference_id"),
            data.get("expense_id"),
            data.get("vendor_id"),
            str(data.get("field_name", "")),
            str(data.get("original_value", "")),
            str(data.get("corrected_value", "")),
            str(request.user.id),
            datetime.now(timezone.utc),
        ], ["id", "inference_id", "expense_id", "vendor_id", "field_name",
            "original_value", "corrected_value", "user_id", "created_at"])
        return Response({"status": "ok"}, status=201)


class AnomalyFeedbackView(APIView):
    """POST /api/v1/ai-feedback/anomaly/ — User dismisses or confirms an anomaly flag."""
    permission_classes = [IsAuthenticated]

    REASON_CODES = [
        "normal_transaction", "pre_approved", "recurring_vendor",
        "corrected_amount", "other",
    ]

    def post(self, request):
        data = request.data
        reason_code = data.get("reason_code", "other")
        if reason_code not in self.REASON_CODES:
            reason_code = "other"
        _insert("ai_feedback_anomaly", [
            None,
            data.get("inference_id"),
            data.get("expense_id"),
            data.get("vendor_id"),
            str(data.get("flag_type", "")),
            bool(data.get("was_false_positive", True)),
            reason_code,
            str(data.get("free_text", ""))[:500],
            str(request.user.id),
            datetime.now(timezone.utc),
        ], ["id", "inference_id", "expense_id", "vendor_id", "flag_type",
            "was_false_positive", "reason_code", "free_text", "user_id", "created_at"])
        return Response({"status": "ok"}, status=201)


class ForecastFeedbackView(APIView):
    """POST /api/v1/ai-feedback/forecast/ — User marks a forecast as inaccurate."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        direction = data.get("deviation_direction", "")
        if direction not in ("over", "under", ""):
            direction = ""
        _insert("ai_feedback_forecast", [
            None,
            data.get("inference_id"),
            data.get("department_id"),
            str(data.get("category", "")),
            bool(data.get("forecast_was_accurate", False)),
            direction,
            str(data.get("note", ""))[:500],
            str(request.user.id),
            datetime.now(timezone.utc),
        ], ["id", "inference_id", "department_id", "category",
            "forecast_was_accurate", "deviation_direction", "note", "user_id", "created_at"])
        return Response({"status": "ok"}, status=201)


class NLQueryFeedbackView(APIView):
    """POST /api/v1/ai-feedback/nl-query/ — User rates an NL query response."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        rating = data.get("rating", "")
        if rating not in ("thumbs_up", "thumbs_down"):
            return Response({"error": "rating must be thumbs_up or thumbs_down"}, status=400)
        _insert("ai_feedback_nl_query", [
            None,
            data.get("inference_id"),
            str(data.get("question_hash", "")),
            rating,
            str(request.user.id),
            datetime.now(timezone.utc),
        ], ["id", "inference_id", "question_hash", "rating", "user_id", "created_at"])
        return Response({"status": "ok"}, status=201)


class SuggestionFeedbackView(APIView):
    """POST /api/v1/ai-feedback/suggestion/ — User accepts, rejects, or edits a query suggestion."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        action = data.get("action", "")
        if action not in ("accepted", "rejected", "edited"):
            return Response({"error": "action must be accepted, rejected, or edited"}, status=400)
        _insert("ai_feedback_suggestion", [
            None,
            data.get("inference_id"),
            data.get("expense_query_id"),
            data.get("vendor_id"),
            action,
            str(data.get("edited_text", ""))[:1000],
            str(request.user.id),
            datetime.now(timezone.utc),
        ], ["id", "inference_id", "expense_query_id", "vendor_id",
            "action", "edited_text", "user_id", "created_at"])
        return Response({"status": "ok"}, status=201)
```

- [ ] **Step 2: Register URLs in `apps/invoices/urls.py`**

Add to the urlpatterns in `apps/invoices/urls.py`:
```python
from .ai_feedback_views import (
    OCRFeedbackView, AnomalyFeedbackView, ForecastFeedbackView,
    NLQueryFeedbackView, SuggestionFeedbackView,
)

# Add inside urlpatterns:
path("ai-feedback/ocr/", OCRFeedbackView.as_view(), name="ai-feedback-ocr"),
path("ai-feedback/anomaly/", AnomalyFeedbackView.as_view(), name="ai-feedback-anomaly"),
path("ai-feedback/forecast/", ForecastFeedbackView.as_view(), name="ai-feedback-forecast"),
path("ai-feedback/nl-query/", NLQueryFeedbackView.as_view(), name="ai-feedback-nl-query"),
path("ai-feedback/suggestion/", SuggestionFeedbackView.as_view(), name="ai-feedback-suggestion"),
```

- [ ] **Step 3: Verify**

```bash
uv run python manage.py check
```

- [ ] **Step 4: Commit**

```bash
git add apps/invoices/ai_feedback_views.py apps/invoices/urls.py
git commit -m "feat: add AI feedback endpoints for all 5 pipeline types"
```

---

## Task 4: Instrument OCR and Anomaly Pipelines

**Files:**
- Modify: `ai/pipelines/ocr_pipeline.py`
- Modify: `ai/pipelines/anomaly_pipeline.py`

- [ ] **Step 1: Add inference logging to OCR pipeline**

In `ai/pipelines/ocr_pipeline.py`, wrap the main `run()` function:

```python
import time
import hashlib

def run(file_path: str, process_all_pages: bool = False):
    from apps.core.ai_logger import log_inference, get_feedback_context

    # Retrieve past OCR corrections for this vendor if available
    # (vendor context passed via file_path convention or caller sets it via thread-local)
    feedback_context = ""  # enriched per-call by the task layer (see tasks.py)

    start = time.monotonic()
    try:
        # existing OCR logic here — no changes to core logic
        result = _run_ocr_internal(file_path, process_all_pages, extra_context=feedback_context)
        success = result.success
        confidence = result.confidence
    except Exception:
        success = False
        confidence = None
        raise
    finally:
        latency_ms = int((time.monotonic() - start) * 1000)
        log_inference(
            pipeline="ocr",
            entity_type="FileRef",
            model_used=result.model_used if success else "",
            input_hash=hashlib.sha256(file_path.encode()).hexdigest()[:16],
            confidence=confidence,
            latency_ms=latency_ms,
            success=success,
        )
    return result
```

In `apps/invoices/tasks.py`, inside `run_ocr_pipeline`, inject vendor feedback before calling `run_ocr`:
```python
    # Inject past OCR corrections for this vendor
    from apps.core.ai_logger import get_feedback_context
    vendor_id = str(expense.vendor_id) if expense.vendor_id else None
    feedback_ctx = get_feedback_context("ocr", vendor_id=vendor_id)
    # Pass as environment variable read by pipeline (thread-local pattern)
    import threading
    _ocr_local = threading.local()
    _ocr_local.feedback_context = feedback_ctx
```

- [ ] **Step 2: Add inference logging to Anomaly pipeline**

In `ai/pipelines/anomaly_pipeline.py`, wrap `run_anomaly_checks()`:

```python
import time

def run_anomaly_checks(expense):
    from apps.core.ai_logger import log_inference, get_feedback_context

    vendor_id = str(expense.vendor_id) if expense.vendor_id else None
    feedback_context = get_feedback_context("anomaly", vendor_id=vendor_id)

    start = time.monotonic()
    success = True
    try:
        result = _run_checks_internal(expense, extra_context=feedback_context)
    except Exception:
        success = False
        raise
    finally:
        log_inference(
            pipeline="anomaly",
            entity_type="Expense",
            entity_id=expense.id,
            model_used="rule_engine",
            latency_ms=int((time.monotonic() - start) * 1000),
            success=success,
        )
    return result
```

- [ ] **Step 3: Verify**

```bash
uv run python manage.py check
```

- [ ] **Step 4: Commit**

```bash
git add ai/pipelines/ocr_pipeline.py ai/pipelines/anomaly_pipeline.py apps/invoices/tasks.py
git commit -m "feat: instrument OCR and anomaly pipelines with inference logging + feedback context injection"
```

---

## Task 5: Instrument Forecast and NL Query Pipelines

**Files:**
- Modify: `ai/pipelines/forecast_pipeline.py`
- Modify: `ai/agents/query_agent.py`
- Modify: `apps/invoices/services.py`

- [ ] **Step 1: Instrument forecast pipeline**

In `ai/pipelines/forecast_pipeline.py`, wrap the main entry point:
```python
import time

def run_forecast(days: int = 90, department_id: str = None):
    from apps.core.ai_logger import log_inference, get_feedback_context

    feedback_context = get_feedback_context("forecast", entity_id=department_id)

    start = time.monotonic()
    success = True
    try:
        result = _run_forecast_internal(days, extra_context=feedback_context)
    except Exception:
        success = False
        raise
    finally:
        log_inference(
            pipeline="forecast",
            entity_type="Department",
            entity_id=department_id,
            latency_ms=int((time.monotonic() - start) * 1000),
            success=success,
        )
    return result
```

- [ ] **Step 2: Instrument NL query agent**

In `ai/agents/query_agent.py` (or `apps/core/auth_views.py` in `_run_nl_query`), wrap the query call:
```python
import hashlib
import time

def _run_nl_query(question: str, user) -> dict:
    from apps.core.ai_logger import log_inference, get_feedback_context

    question_hash = hashlib.sha256(question.encode()).hexdigest()[:16]
    feedback_context = get_feedback_context("nl_query", question_hash=question_hash)

    start = time.monotonic()
    success = True
    try:
        result = _execute_nl_query(question, user, extra_context=feedback_context)
    except Exception:
        success = False
        raise
    finally:
        inference_id = log_inference(
            pipeline="nl_query",
            entity_type="User",
            entity_id=user.id,
            user_id=user.id,
            input_hash=question_hash,
            latency_ms=int((time.monotonic() - start) * 1000),
            success=success,
        )
        result["inference_id"] = inference_id  # returned to frontend for feedback linking
    return result
```

- [ ] **Step 3: Instrument AI suggestion in `services.py`**

In `apps/invoices/services.py`, in `build_query_ai_suggestion`:
```python
def build_query_ai_suggestion(expense, question: str) -> str:
    from apps.core.ai_logger import log_inference, get_feedback_context
    import time

    vendor_id = str(expense.vendor_id) if expense.vendor_id else None
    feedback_context = get_feedback_context("ai_suggestion", vendor_id=vendor_id)

    start = time.monotonic()
    success = True
    try:
        suggestion = _generate_suggestion(expense, question, extra_context=feedback_context)
    except Exception:
        success = False
        raise
    finally:
        log_inference(
            pipeline="ai_suggestion",
            entity_type="Expense",
            entity_id=expense.id,
            latency_ms=int((time.monotonic() - start) * 1000),
            success=success,
        )
    return suggestion
```

- [ ] **Step 4: Verify**

```bash
uv run python manage.py check
```

- [ ] **Step 5: Commit**

```bash
git add ai/pipelines/forecast_pipeline.py ai/agents/query_agent.py apps/invoices/services.py apps/core/auth_views.py
git commit -m "feat: instrument forecast, NL query, and AI suggestion pipelines"
```

---

## Task 6: Frontend Feedback Widgets

**Files:**
- Modify: `js/Secondary.jsx` (OCR field corrections — shown on expense detail)
- Modify: `js/AIHub.jsx` (NL query thumbs up/down; anomaly dismiss modal)
- Modify: `js/api.js` (add feedback API calls)

- [ ] **Step 1: Add feedback API methods to `js/api.js`**

Add to the API object:
```javascript
async submitAIFeedback(type, data) {
  return apiFetch(`/invoices/ai-feedback/${type}/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
},
```

- [ ] **Step 2: NL Query thumbs up/down in `js/AIHub.jsx`**

On each NL query response, add below the answer text:
```jsx
const [rated, setRated] = React.useState(null);

const rateResponse = async (inferenceId, rating) => {
  if (rated) return;
  await window.TijoriAPI.submitAIFeedback('nl-query', {
    inference_id: inferenceId,
    question_hash: btoa(question).slice(0, 16),
    rating,
  });
  setRated(rating);
};

{entry.inference_id && !rated && (
  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
    <button onClick={() => rateResponse(entry.inference_id, 'thumbs_up')}
      style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>👍</button>
    <button onClick={() => rateResponse(entry.inference_id, 'thumbs_down')}
      style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>👎</button>
  </div>
)}
{rated && <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Thanks for your feedback</span>}
```

- [ ] **Step 3: Anomaly false-positive dismiss in anomaly flag card**

On each anomaly flag card (wherever `anomaly_flags` are rendered), add:
```jsx
const [dismissed, setDismissed] = React.useState(false);
const [showReason, setShowReason] = React.useState(false);
const REASONS = ['normal_transaction','pre_approved','recurring_vendor','corrected_amount','other'];

const dismiss = async (reasonCode, freeText) => {
  await window.TijoriAPI.submitAIFeedback('anomaly', {
    expense_id: expense.id,
    vendor_id: expense.vendor_id,
    flag_type: flag.type,
    was_false_positive: true,
    reason_code: reasonCode,
    free_text: freeText || '',
  });
  setDismissed(true);
  setShowReason(false);
};

{!dismissed && (
  <button onClick={() => setShowReason(true)}
    style={{ fontSize: '11px', color: '#EF4444', background: 'none', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}>
    False Positive
  </button>
)}
{showReason && (
  <div style={{ marginTop: '8px' }}>
    <select onChange={e => dismiss(e.target.value)}
      style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
      <option value="">Select reason...</option>
      {REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
    </select>
  </div>
)}
```

- [ ] **Step 4: AI Suggestion accept/reject/edit in expense detail**

On the `ai_suggestion` display in the expense query panel:
```jsx
const [suggestionAction, setSuggestionAction] = React.useState(null);
const [editText, setEditText] = React.useState(suggestion);

const submitSuggestionFeedback = async (action) => {
  await window.TijoriAPI.submitAIFeedback('suggestion', {
    expense_query_id: query.id,
    vendor_id: expense.vendor_id,
    action,
    edited_text: action === 'edited' ? editText : '',
  });
  setSuggestionAction(action);
};

{!suggestionAction && (
  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
    <button onClick={() => submitSuggestionFeedback('accepted')}
      style={{ fontSize: '11px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>
      Accept
    </button>
    <button onClick={() => submitSuggestionFeedback('rejected')}
      style={{ fontSize: '11px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>
      Reject
    </button>
    <button onClick={() => setShowEdit(true)}
      style={{ fontSize: '11px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>
      Edit
    </button>
  </div>
)}
```

- [ ] **Step 5: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add js/api.js js/AIHub.jsx js/Secondary.jsx
git commit -m "feat: add feedback widgets for NL query (thumbs), anomaly (dismiss), suggestion (accept/reject/edit)"
```
