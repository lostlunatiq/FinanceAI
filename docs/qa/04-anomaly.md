# 🧪 Feature: Anomaly Detection
**Component Scope:** React `Anomaly.jsx` → DRF `employee_views.ScanAnomalyView` / `MarkAnomalySafeView` / `EscalateAnomalyView` / `BulkScanAnomalyView` → `ai/pipelines/anomaly_pipeline` → Presidio (PII mask) → OpenRouter (text) → `Expense.anomaly_severity` + `ocr_raw["anomaly_flags"]`
**Objective:** Verify anomaly scan returns severity + flags, PII never reaches the LLM, mark-safe / escalate flows respect business semantics, bulk scan completes for all candidates, and AI feedback dispute history is injected back into the prompt.

### 1. Prerequisites & State Setup
- [ ] Real `OPENROUTER_API_KEY` for live runs (record results); placeholder for mock fallback path.
- [ ] At least 5 historical APPROVED/PAID expenses for one vendor (required for vendor stats baseline).
- [ ] Presidio installed (`presidio-analyzer`, `presidio-anonymizer`) and spaCy `en_core_web_sm` model present, otherwise pipeline degrades gracefully — capture which path you're on.
- [ ] `ANOMALY_MIN_AMOUNT=10000` (default; lower amounts return `skipped_reason`).
- [ ] One existing `Expense` with `total_amount=15000` to test below-threshold path (no — that's above; create one at `9000` for skip path).
- [ ] One target expense with deliberately anomalous amount (e.g. ₹5,00,000 vs vendor avg of ₹15k).

### 2. The Happy Path

#### 2.1 Single scan — clean invoice
- [ ] As `fin_manager`: `POST /api/v1/invoices/finance/bills/<id>/scan-anomaly/` on a normal invoice.
- [ ] **Assert API:** `200`; body has `severity`, `flags:[]` or short list, `score (0–100)`, `reasoning`.
- [ ] **Assert DB:** `Expense.anomaly_severity` updated; `ocr_raw["anomaly_flags"]` populated.
- [ ] **Assert AuditLog:** `action="anomaly.scanned"`, contains severity + flags count + total_score.

#### 2.2 Single scan — anomalous invoice
- [ ] Scan the ₹5L outlier.
- [ ] **Assert:** `severity ∈ {HIGH, CRITICAL}`; flags array contains "amount_outlier" or similar; reasoning references vendor avg.

#### 2.3 Mark safe
- [ ] `POST /api/v1/invoices/finance/bills/<id>/mark-safe/` with `{note:"Verified by procurement"}`.
- [ ] **Assert API:** `200`.
- [ ] **Assert DB:** `Expense.anomaly_severity="NONE"`; `ocr_raw["anomaly_flags"]=[]`; `marked_safe_by`, `marked_safe_at`, `marked_safe_note` recorded.
- [ ] **Assert notification:** Finance Team group receives a LOW priority notification.
- [ ] **Assert AuditLog:** `action="anomaly.marked_safe"`.

#### 2.4 Escalate
- [ ] `POST /api/v1/invoices/finance/bills/<id>/escalate/`.
- [ ] **Assert DB:** `anomaly_severity="CRITICAL"`; `escalated_by`, `escalated_at` in `ocr_raw`.
- [ ] **Assert notification:** CFO (grade ≥ 5) receives a CRITICAL notification.
- [ ] **Assert AuditLog:** `action="anomaly.escalated"`.

#### 2.5 Bulk scan
- [ ] `POST /api/v1/invoices/finance/scan-all/` (no body).
- [ ] **Assert API:** `200`; body summary `{scanned:int, skipped_below_threshold:int, anomalies_detected:int}`.
- [ ] **Assert:** every eligible expense has updated `anomaly_severity` and `ocr_raw["anomaly_flags"]`.

#### 2.6 Anomaly list view
- [ ] `GET /api/v1/invoices/finance/anomalies/`.
- [ ] **Assert:** all expenses with severity ∈ {LOW, MEDIUM, HIGH, CRITICAL} returned, sorted by severity desc.

### 3. Negative Testing

- [ ] Scan as unauthenticated → **`401`**.
- [ ] Scan a non-existent expense ID → **`404`**.
- [ ] Mark safe with no `note` field → record behavior (note is optional in current code; assert it does not 500).
- [ ] Escalate an already-CRITICAL expense → idempotent: `severity` stays CRITICAL; second AuditLog row still written.
- [ ] Scan with `OPENROUTER_API_KEY` invalid (forces 401 from upstream) → `200` with `flags=[{type:"SYSTEM_ERROR", severity:"MEDIUM"}]`; reasoning includes failure message; no 500.
- [ ] Scan an expense with `total_amount < ANOMALY_MIN_AMOUNT` → `200` with `skipped_reason="below_minimum"`; no LLM call (verify by mocking or by no token usage logs).
- [ ] Mark-safe an expense with no prior anomaly → succeeds (idempotent); severity already NONE.

### 4. Edge Cases & Concurrency

- [ ] **PII masking proof:** craft an invoice with PAN `ABCDE1234F`, Aadhaar `1234-5678-9012`, phone, email in description; capture the LLM request (enable debug logging in `openrouter_client`) → assert raw PAN/Aadhaar/phone are masked (`<IN_PAN>`, `<IN_AADHAAR>`, `<PHONE>`) before being sent.
- [ ] **Presidio init failure:** uninstall spaCy model temporarily (`python -m spacy remove en_core_web_sm`) → pipeline logs warning, still calls LLM with unmasked text; mark-safe / escalate still work. Reinstall after.
- [ ] **AI feedback dispute injection:** create `AIFeedback` rows with `task_type=ANOMALY`, `disputed_flags:["weekend_submission"]` for vendor X. Re-scan a vendor X invoice → confirm the prompt includes "Past disputed flags" snippet (Django log).
- [ ] **AI feedback confirmation injection:** add `AIFeedback {is_positive:true, comment:"valid concern"}` → next scan's prompt should include "Confirmed past anomalies".
- [ ] **Mock mode:** `OPENROUTER_API_KEY="sk-or-placeholder"` → scan returns `severity=NONE, flags=[], skipped=true` (no live call).
- [ ] **Race condition — two concurrent scans:** open two browsers, both click scan on the same expense → both succeed; final `Expense.anomaly_severity` reflects last-writer-wins; both AuditLog rows present.
- [ ] **Bulk scan on empty queue:** truncate Expense table (in a test DB!) → `scan-all` returns `{scanned:0, ...}` with `200`.
- [ ] **LLM JSON malformed:** simulate by tweaking model response handling (mock OpenRouter) → pipeline strips ` ```json ` fences; if still invalid, returns SYSTEM_ERROR flag.
- [ ] **Severity downgrade after mark-safe:** scan returns CRITICAL, then mark-safe, then re-scan → severity may flip back to CRITICAL (model not aware of mark-safe). Document this gotcha as a bug or accepted behavior.
- [ ] **Concurrency on escalate + mark-safe:** click both buttons within 1s → final state reflects last write; AuditLog has both events.
- [ ] **Vendor with no history:** scan first-ever invoice for a brand-new vendor → vendor_stats empty; pipeline still works, reasoning notes "no historical data".
