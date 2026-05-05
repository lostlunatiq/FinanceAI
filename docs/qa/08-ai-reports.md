# 🧪 Feature: AI Reports (10-Q / Monthly / Annual / Command Center)
**Component Scope:** DRF `analytics_views` → MonthlyFinancialSummary (cache) → OpenRouter (narrative generation) → JSON response (PDF via WeasyPrint planned)
**Objective:** Verify report generation, LLM prompt composition, caching strategy for monthly summaries, and graceful fallback on LLM failure.

### 1. Prerequisites & State Setup
- [ ] 100+ expenses spanning 6+ months to build historical trends.
- [ ] Monthly data with varying utilization, approved, pending, paid amounts per month.
- [ ] Real `OPENROUTER_API_KEY` for live tests; placeholder for mock narrative tests.
- [ ] `MonthlyFinancialSummary` table empty or pre-populated; understand cache behavior.
- [ ] One anomalous month (e.g. 5× normal spend) to test anomaly context in narrative.

### 2. The Happy Path

#### 2.1 Monthly Summary — Fresh generation
- [ ] `GET /api/v1/invoices/analytics/monthly-summary/?month=2026-05&regenerate=1&with_ai=1`.
- [ ] **Assert API:** `200`; body includes:
  - `month: "2026-05"`
  - `paid_amount`, `pending_amount`, `approved_amount` (sums for the month)
  - `top_vendors: [{name, amount}, ...]`
  - `dept_breakdown: [{dept, amount}, ...]`
  - `anomaly_count_critical`, `_high`, `_medium`
  - `month_over_month_pct` (vs. previous month)
  - `budget_utilization_pct`
  - `trending_months: [{month, amount}, ...]` (last 3 months)
  - `narrative: "Lorem ipsum…"` (generated via LLM or rule-based)

#### 2.2 Monthly Summary — Cache hit
- [ ] Same request without `regenerate=1`.
- [ ] **Assert:** response identical but response time <100ms (cache hit from MonthlyFinancialSummary table).

#### 2.3 Monthly Summary — `with_ai=0`
- [ ] `?month=2026-05&with_ai=0`.
- [ ] **Assert:** all fields present except `narrative` is generic placeholder or omitted.

#### 2.4 Annual Report — current year
- [ ] `GET /api/v1/invoices/analytics/annual-report/?year=2026`.
- [ ] **Assert API:** `200`; body includes:
  - `total_spend`, `yoy_pct` (vs 2025 if data exists)
  - `budget_utilization_pct`
  - `quarterly_breakdown: [{q, amount}, ...]`
  - `monthly_trend: [{month, amount}, ...]` (all 12 months)
  - `dept_performance: [{dept, budget, actual, variance_pct}, ...]`
  - `top_vendors` (top 10)
  - `top_categories` (top 8)
  - `risk_summary: {critical_count, high_count, medium_count, resolved_count}`
  - `pending_payables_amount`, `estimated_gst`, `estimated_tds`
  - `narrative` (investor-grade, LLM-generated)

#### 2.5 10-Q Report
- [ ] `POST /api/v1/invoices/analytics/generate-10q/` (no body).
- [ ] **Assert API:** `200` or `202`; body includes:
  - `executive_summary` (paragraph)
  - `expense_analysis` (paragraph with top vendors, category breakdown)
  - `vendor_obligations` (paragraph on outstanding payables, payment terms)
  - `risk_compliance` (paragraph on anomalies, GST/TDS compliance)
  - `outlook` (forward-looking statement)
  - `metadata: {quarter, year, generated_at, data_points:{...}}`

#### 2.6 Command Center Intelligence
- [ ] `GET /api/v1/invoices/analytics/command-center/`.
- [ ] **Assert API:** `200`; includes:
  - `risk_watch: [{expense_id, ref_no, vendor, amount, anomaly_severity, flag_count}, ...]` (top 5)
  - `treasury_health_index` (0–100 score with reasoning)
  - `cashflow_30day: {opening_balance, inflows, outflows, net_position}`
  - `outstanding_liability`
  - `narrative` (risk assessment + treasury outlook)

### 3. Negative Testing

- [ ] Monthly summary with invalid `month` format (e.g. `05-2026`) → **`400`** or normalized (record).
- [ ] Annual report with non-existent `year=1900` → **`200`** with zero data.
- [ ] Request with `OPENROUTER_API_KEY` invalid (forces 401 from upstream) → narratives populated with rule-based fallback, not null; no 500.
- [ ] 10-Q without OPENROUTER key → **`200`** with rule-based narratives.
- [ ] Command Center as unauthenticated → **`401`**.
- [ ] Monthly summary for month with zero expenses → all amounts are 0; narrative is generic ("no activity").

### 4. Edge Cases & Concurrency

- [ ] **Cache invalidation:** monthly summary cached for 2026-05; then approve an expense for 2026-05 → should regenerate automatically OR stay stale until manual refresh (record behavior; current code likely shows stale data until `regenerate=1`).
- [ ] **Mock mode:** `OPENROUTER_API_KEY="sk-or-placeholder"` → narrative fields populated with generic rule-based text.
- [ ] **Real LLM latency:** 10-Q / Annual Report generation via live LLM takes 3–10s → UI should show "Generating…" spinner.
- [ ] **Concurrent 10-Q generation:** two users POST `/generate-10q/` simultaneously → both trigger LLM call; both get same response (no idempotency key; calls may both succeed or race).
- [ ] **Large dataset (5000+ expenses):** annual report query should complete <10s; confirm performance.
- [ ] **Year boundary:** annual report includes data through Dec 31 but not Jan 1 of next year (off-by-one test).
- [ ] **Month with all rejections:** monthly summary for a month where every expense was REJECTED → paid_amount=0, approved_amount=0, narrative reflects "no approved spend".
- [ ] **Anomaly narrative injection:** month has 10 CRITICAL anomalies → both narrative and Command Center highlight this prominently (verify LLM prompt includes anomaly context).
- [ ] **Missing MonthlyFinancialSummary table:** if migrations fail and table doesn't exist, monthly summary should not 500; either skip cache or create on-demand (record fallback).
- [ ] **Unicode in narrative:** vendor names with Hindi/Arabic chars → LLM narrative renders correctly in response JSON (no mojibake or encoding errors).
