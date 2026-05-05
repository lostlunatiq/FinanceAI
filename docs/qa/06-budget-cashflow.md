# 🧪 Feature: Budget Management + Cash Flow Forecast
**Component Scope:** DRF `budget_views` → PostgreSQL `invoices_budget`, `invoices_expense` → OpenRouter (text narrative) → Prophet forecast library
**Objective:** Verify budget CRUD (create, list, detail, update, delete), utilization tracking, HOD department scoping, monthly burn-rate projection, and cash-flow forecast with scenario analysis.

### 1. Prerequisites & State Setup
- [ ] Budget for current month exists, linked to a department.
- [ ] At least 20 APPROVED/PAID expenses in that department for historical baseline.
- [ ] `hod` account (grade 2) assigned to the department.
- [ ] `fin_admin` (grade 4) and `fin_manager` (grade 3) accounts ready.
- [ ] `OPENROUTER_API_KEY` real or placeholder for cash-flow narrative.
- [ ] `CELERY_TASK_ALWAYS_EAGER=true` to avoid background LLM calls hanging.

### 2. The Happy Path

#### 2.1 Budget list (all grades)
- [ ] As `fin_admin`: `GET /api/v1/invoices/budgets/`.
- [ ] **Assert:** `200`; list of all department budgets, paginated.
- [ ] As `hod`: `GET /api/v1/invoices/budgets/`.
- [ ] **Assert:** filtered to only `hod`'s department budgets.

#### 2.2 Budget create
- [ ] As `fin_admin`: `POST /api/v1/invoices/budgets/` with `{department_id, period_start:"2026-01-01", period_end:"2026-01-31", allocated_amount:500000, warning_threshold_pct:70, critical_threshold_pct:90}`.
- [ ] **Assert API:** `201`; budget record created.
- [ ] **Assert DB:** `Budget` row with `spent_amount` computed (sum of APPROVED/PAID expenses in period).

#### 2.3 Budget detail + utilization
- [ ] As `fin_admin`: `GET /api/v1/invoices/budgets/<id>/`.
- [ ] **Assert:** `allocated_amount`, `spent_amount`, `utilization_pct`, `alert_level` (OK|WARNING|CRITICAL based on thresholds).
- [ ] `GET /api/v1/invoices/budgets/<id>/utilization/`.
- [ ] **Assert:** monthly breakdown, top 10 vendors by spend, top 10 employees, transaction count.

#### 2.4 Budget update
- [ ] As `fin_admin`: `PATCH /api/v1/invoices/budgets/<id>/` with `{allocated_amount:600000}`.
- [ ] **Assert:** `200`; budget updated; utilization_pct recalculated.

#### 2.5 Budget delete
- [ ] As `fin_admin`: `DELETE /api/v1/invoices/budgets/<id>/`.
- [ ] **Assert:** `204` No Content; budget soft-deleted or hard-deleted (record observed behavior).

#### 2.6 Cash flow forecast
- [ ] As any grade: `GET /api/v1/invoices/forecasting/cashflow/?days=90&scenario=baseline`.
- [ ] **Assert API:** `200`; body has `opening_balance`, `daily_inflows`, `daily_outflows`, `net_position`, `confidence_score`, `risk_highlights[]`, `forecast_days=90`.
- [ ] **Assert narrative:** if `with_narrative=1` param, includes 2-paragraph CFO summary (generated via OpenRouter or rule-based fallback).
- [ ] Repeat with `scenario="pessimistic"` (lower inflows) and `"optimistic"` (higher).

#### 2.7 Budget health analytics
- [ ] As `fin_admin`: `GET /api/v1/invoices/analytics/budget-health/`.
- [ ] **Assert:** all budgets with projected utilization by month-end.
- [ ] **Assert:** flags budgets projected to exceed warning/critical thresholds.

### 3. Negative Testing

- [ ] Create budget as `hod` → **`403`** (only grade 4+).
- [ ] List budgets as `vendor1` → **`403`**.
- [ ] Update someone else's department budget as `hod` → **`403`**.
- [ ] Create budget with `allocated_amount=0` → **`400`** (or accepted; record).
- [ ] Create budget with `period_end < period_start` → **`400`**.
- [ ] Create budget with non-existent `department_id` → **`404`** or **`400`**.
- [ ] Delete a budget that has APPROVED expenses in its period → succeeds (no FK constraint; record if any warnings/notifications).
- [ ] Forecast with `days=0` or `days=181` (out of valid range) → **`400`** or clamped to max.
- [ ] Forecast with invalid `scenario` name → **`400`** or defaults to "baseline".
- [ ] Budget with `warning_threshold_pct > critical_threshold_pct` → **`400`** validation or accepted (record).

### 4. Edge Cases & Concurrency

- [ ] **HOD scoping isolation:** as `hod`, try to read a budget for a different department → **`403`**.
- [ ] **Real-time utilization:** approve an expense in a budget period → utilization_pct increases by exact amount (no lag).
- [ ] **Budget with zero history:** create new budget, zero expenses yet → forecast uses zero-baseline; cash flow shows opening balance flat.
- [ ] **Forecast with Prophet model missing:** if `pip show prophet` is not installed, cash-flow falls back to simple average-burn estimate. Verify fallback works.
- [ ] **Mock narrative:** `OPENROUTER_API_KEY="sk-or-placeholder"` → forecast narrative is generic rule-based text (not LLM-generated).
- [ ] **Concurrent updates:** two admins update the same budget allocation concurrently → final value is last-writer-wins.
- [ ] **Budget overlap:** create two budgets for same department with overlapping periods → allowed (no constraint; record if any aggregation issues in views).
- [ ] **Negative balance projection:** many large expenses scheduled → forecast `net_position` goes negative; risk_highlights flag; no crash.
- [ ] **Threshold edge case:** budget at exactly 70% utilization (warning threshold) → `alert_level` is WARNING or OK? Record observed behavior.
- [ ] **Monthly rollover:** period_end is 2026-01-31, create expense 2026-02-01 → not counted in this budget's utilization (spans periods correctly).
