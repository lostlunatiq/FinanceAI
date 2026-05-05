# 🧪 Feature: Analytics Suite (14 Endpoints)
**Component Scope:** DRF `analytics_views` → PostgreSQL aggregations (`Expense`, `Budget`, `Vendor`, `AnomalyLog`) → OpenRouter (2 endpoints generate narratives)
**Objective:** Verify each of the 14 analytics endpoints returns correct aggregations, HOD scoping where applicable, and LLM integration for Spend Intelligence + Command Center.

### 1. Prerequisites & State Setup
- [ ] 50+ APPROVED/PAID/BOOKED_D365/POSTED_D365 expenses across vendors and departments.
- [ ] Multiple vendors with varying risk profiles (high rejection rate, low approval rate, MSME flags).
- [ ] Budgets for 3+ departments with varying utilization (0%, 50%, 95%+).
- [ ] Anomalies detected on 10+ expenses; various severity levels.
- [ ] `hod` account linked to a department.
- [ ] `OPENROUTER_API_KEY` for live or placeholder for mock narratives.

### 2. The Happy Path

#### 2.1 Spend Intelligence
- [ ] As `fin_manager`: `GET /api/v1/invoices/analytics/spend-intelligence/`.
- [ ] **Assert API:** `200`; body includes `ytd_spend`, `yoy_change_pct`, `top_category`, `top_category_amount`, `narrative` (LLM-generated or rule-based).

#### 2.2 Vendor Risk Score
- [ ] `GET /api/v1/invoices/analytics/vendor-risk/`.
- [ ] **Assert:** all ACTIVE vendors, scores 0–100, severity levels (CRITICAL/HIGH/MEDIUM/LOW), risk breakdown (anomaly_score, rejection_score, msme_penalty).

#### 2.3 Payment Prediction
- [ ] `GET /api/v1/invoices/analytics/payment-prediction/`.
- [ ] **Assert:** 50 pending invoices with projected days-to-payment, overdue risk flags for those exceeding 1.5× avg SUBMITTED→PAID time.

#### 2.4 Budget Health
- [ ] As `fin_admin`: `GET /api/v1/invoices/analytics/budget-health/`.
- [ ] **Assert:** all department budgets with projected end-of-period utilization.
- [ ] As `hod`: same endpoint.
- [ ] **Assert:** filtered to hod's department only; all others hidden (**critical HOD scoping test**).

#### 2.5 GST Reconciliation
- [ ] `GET /api/v1/invoices/analytics/gst-recon/?month=2026-05`.
- [ ] **Assert:** all expenses in May 2026 with GST validation; mismatches flagged (pre_gst + taxes ≠ total by >₹1).
- [ ] **Assert:** invalid CGST+IGST combos (inter-state use IGST, not CGST+SGST) flagged.

#### 2.6 TDS Compliance
- [ ] `GET /api/v1/invoices/analytics/tds-compliance/`.
- [ ] **Assert:** deductions grouped by section (194A, 194C, etc.); invoices with TDS section but ₹0 deducted flagged ACTION_REQUIRED.

#### 2.7 Working Capital
- [ ] `GET /api/v1/invoices/analytics/working-capital/`.
- [ ] **Assert:** DPO (days payable outstanding), payables aging buckets (0–30, 31–60, 61–90, 90+), MSME breach risk (unpaid > 45 days), health score 0–100.

#### 2.8 Spend Velocity
- [ ] `GET /api/v1/invoices/analytics/spend-velocity/`.
- [ ] **Assert:** WoW and MoM deltas; spikes >50% WoW or >25% MoM flagged; large invoices (>₹500k) submitted today flagged.

#### 2.9 Policy Compliance
- [ ] `GET /api/v1/invoices/analytics/policy-compliance/`.
- [ ] **Assert:** violations flagged: >₹100k without business purpose, weekend submission, duplicate vendor+amount within 30 days; compliance_rate (0–100%).

#### 2.10 Supplier Scorecard
- [ ] `GET /api/v1/invoices/analytics/supplier-scorecard/`.
- [ ] **Assert:** vendors scored 0–100 (approval_rate 60% + dispute_rate penalty 40%); grades A/B/C/D assigned; rejection + query counts.

#### 2.11 Department Variance
- [ ] As `fin_admin`: `GET /api/v1/invoices/analytics/dept-variance/`.
- [ ] **Assert:** all departments with YTD budget vs actual, variance %, transaction count, sorted by |variance| desc.
- [ ] As `hod`: same endpoint.
- [ ] **Assert:** only hod's department (**critical HOD scoping test**).

#### 2.12 PO Match Status
- [ ] `GET /api/v1/invoices/analytics/po-match/`.
- [ ] **Assert:** 3-way PO matching results (MATCHED/VARIANCE/MISSING_PO/MISSING_GRN); match_rate %. (Data is mock/deterministic for demo.)

#### 2.13 Command Center Intelligence
- [ ] As `fin_admin` or higher: `GET /api/v1/invoices/analytics/command-center/`.
- [ ] **Assert:** `200`; aggregates risk_watch (top 5 anomalies), treasury_health_index (liquidity/solvency), cash_flow_30day, outstanding_liability, narrative (LLM-generated or fallback).
- [ ] As `fin_manager` (grade 3): same endpoint.
- [ ] **Assert:** `200` (grade gate may be ≥3 or ≥4; record observed).

#### 2.14 10-Q Generation
- [ ] As `fin_admin`: `POST /api/v1/invoices/analytics/generate-10q/`.
- [ ] **Assert API:** `200` or `202`; body includes `executive_summary`, `expense_analysis`, `vendor_obligations`, `risk_compliance`, `outlook`, all generated via OpenRouter or rule-based fallback.
- [ ] **Assert:** includes quarterly metrics (YTD paid, pending, approved), top 5 vendors, monthly trends, anomaly stats, dept utilization, estimated GST/TDS.

#### 2.15 Monthly Summary
- [ ] `GET /api/v1/invoices/analytics/monthly-summary/?month=2026-05&with_ai=1`.
- [ ] **Assert:** `200`; body includes monthly paid/pending/approved, top vendors, dept breakdown, anomaly counts, YoY %, budget utilization, trend (3 months).
- [ ] **Assert caching:** `MonthlyFinancialSummary` table used if data already cached; response time <500ms.
- [ ] `?regenerate=1` param: forces fresh calculation, updates cache.

#### 2.16 Annual Report
- [ ] `GET /api/v1/invoices/analytics/annual-report/?year=2026`.
- [ ] **Assert:** `200`; total spend, YoY %, budget utilization %, quarterly breakdown, 12-month trend, dept performance, top 10 vendors, top 8 categories, risk summary, pending payables, estimated GST/TDS.

### 3. Negative Testing

- [ ] Command Center as `employee1` (grade 1) → **`403`** if gate is ≥3/≥4; record actual gate.
- [ ] Spend Intelligence without authentication → **`401`**.
- [ ] GST recon with invalid `month` format (e.g. `2026-5`) → **`400`** or accepted (record).
- [ ] 10-Q as `fin_manager` → **`403`** if gate is admin-only; or **`200`** (record).
- [ ] Annual report with future `year=2099` → **`200`** with zero data (or error; record).
- [ ] Analytics on empty database (no expenses) → all endpoints return `200` with zero/empty arrays, not 500.

### 4. Edge Cases & Concurrency

- [ ] **HOD scoping bypass attempt:** as `hod`, craft SQL injection in query param → API sanitizes; only own dept data visible.
- [ ] **Monthly summary caching race:** two concurrent requests for same month → both trigger LLM call (no lock); second overwrites cache; eventual consistency OK.
- [ ] **Large dataset:** 10,000+ expenses in DB → analytics queries complete <5s (verify performance; if >5s, record and suggest optimization).
- [ ] **Anomaly score without AnomalyLog table:** if anomaly_log is missing, Spend Intelligence / Command Center / 10-Q should degrade gracefully (no crash).
- [ ] **Real LLM latency:** live OpenRouter call on Spend Intelligence takes 2–5s; UI should show loading state.
- [ ] **Mock narrative:** `OPENROUTER_API_KEY="sk-or-placeholder"` → all narrative fields populated with rule-based text (not "pending" or null).
- [ ] **Month boundary:** request GST recon for 2026-05, submit expense on 2026-05-31 23:59:59 → included in May report.
- [ ] **Zero utilization budget:** budget with no expenses → `budget-health` shows 0%, no crash.
- [ ] **Vendor with no sales:** create vendor, never submit bill → Supplier Scorecard includes it (if included in list) with 0% approval_rate.
