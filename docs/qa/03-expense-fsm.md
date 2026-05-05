# 🧪 Feature: Expense Submission & Approval FSM
**Component Scope:** React `APHub.jsx` / `BillDetail.jsx` → DRF `views.ExpenseSubmitView`, `employee_views.*` → `services.transition_expense` → PostgreSQL `invoices_expense` + `expenseapprovalstep` → Celery `export_approved_invoice_to_json`
**Objective:** Verify the full lifecycle of an expense from DRAFT → PAID, every grade gate, every state transition, SoD enforcement, auto-routing logic, query/response loop, settlement, and the superior-override path.

### 1. Prerequisites & State Setup
- [ ] All demo users seeded; each has correct `employee_grade`.
- [ ] At least one `Vendor` (e.g. via `vendor1`'s portal flow), one `Department`, and `VendorL1Mapping` row mapping the vendor to `l1_approver` user.
- [ ] `Budget` row exists for the department covering the current month.
- [ ] `D365_MOCK_MODE=true` (otherwise approval will crash on missing `apps.d365`).
- [ ] `CELERY_TASK_ALWAYS_EAGER=true` so D365 export task runs inline.
- [ ] `exports/` directory exists in project root and is writable.
- [ ] Approval grade limits constants known: confirm via `services.get_approval_limit(grade)` — record values per grade.

### 2. The Happy Path (End-to-End)

#### 2.1 Submit
- [ ] As `employee1`: `POST /api/v1/invoices/submit/` with valid `{vendor_name, ref_no? (auto-generated), total_amount: 25000, pre_gst_amount, cgst, sgst, igst, invoice_date, line_items, evidence_files:[<fileref_id>]}`.
- [ ] **Assert API:** `201` with `id`, `ref_no` (matches `BILL-YYYY-NNNNN`), `_status="PENDING_L1"` (read-only field returned via `status` property).
- [ ] **Assert DB:** `Expense` row created; `submitted_by_id=employee1.id`; `pre_gst_amount` computed if absent.
- [ ] **Assert DB:** exactly one `ExpenseApprovalStep` at `level=1`, `status=PENDING`, `assigned_to=l1_approver` (because of VendorL1Mapping).
- [ ] **Assert AuditLog:** rows for `expense.submitted` and step assignment.
- [ ] **Assert log:** "📋 L1 STEP CREATED" with reason "vendor-mapping".

#### 2.2 L1 approve
- [ ] As `l1_approver`: `POST /api/v1/invoices/finance/bills/<id>/approve/` with `{decision_reason:"OK"}`.
- [ ] **Assert API:** `200`; expense `status` advances per the bill amount and approval-limit table; for ₹25k the bill should hop directly past lower levels until a level whose `grade_required` limit is ≥ 25 000.
- [ ] **Assert DB:** L1 step `status=APPROVED`, `actual_actor=l1_approver`, `decided_at` set, `decision_reason` stored.
- [ ] **Assert DB:** new step inserted at the next level chosen by the amount-aware skipper (verify the level matches `LEVEL_AFTER` chain and skipped levels are NOT recorded as APPROVED rows).
- [ ] **Assert AuditLog:** one row per transition.

#### 2.3 HOD approve
- [ ] As `hod`: approve. Expense moves to `PENDING_FIN_L1` (or higher per amount).

#### 2.4 Finance Manager approve
- [ ] As `fin_manager`: approve.
- [ ] **Assert:** if amount > fin_manager's limit, expense advances; else stops at next FIN level.

#### 2.5 Finance Head / CFO final approve
- [ ] As `cfo`: approve.
- [ ] **Assert API:** expense `status=APPROVED`; final step records `actual_actor=cfo`.
- [ ] **Assert async:** `export_approved_invoice_to_json` task fires; file `exports/<ref_no>.json` exists with D365-shaped payload (`invoiceNo`, `vendorNo`, `postingDate`, `lines[]`).
- [ ] **Assert notifications:** `submitted_by` user receives a notification; Finance Team group receives one.

#### 2.6 Settle (mark paid)
- [ ] As `fin_manager` or higher: `POST /finance/bills/<id>/settle/` with `{d365_document_no:"BC-12345", d365_payment_utr:"UTR-…", payment_method:"NEFT", payment_notes:"…"}`.
- [ ] **Assert:** status walks `APPROVED → PENDING_D365 → BOOKED_D365 → POSTED_D365 → PAID` in a single call.
- [ ] **Assert DB:** `Expense.ocr_raw` carries `d365_document_no`, `d365_payment_utr`, `paid_by`, `payment_method`.
- [ ] **Assert AuditLog:** one row per intermediate transition.
- [ ] **Assert email:** vendor and submitter receive payment-confirmation email (check console backend or `EMAIL_REDIRECT_TO`).

### 3. Negative Testing (Bad Flows)

- [ ] Submit with `vendor_name="Internal Expense"` → **`400`** with redirect hint to `/finance/expenses/`.
- [ ] Submit without authorization → **`401`**.
- [ ] Approve as `employee1` (not assigned step) → **`403`** "Cannot approve".
- [ ] Approve as `l1_approver` after L1 already done → **`403`**.
- [ ] Approve while expense is `REJECTED` → **`400`** invalid transition.
- [ ] Approve when bill amount exceeds approver's `get_approval_limit(grade)` → **`400`** "Approval limit exceeded".
- [ ] Approve when monthly budget exceeded → **`400`** "Monthly budget exceeded".
- [ ] **Anomaly override missing:** scan-anomaly first to set severity=HIGH, then approve without `anomaly_override_reason` → **`400`** "Override reason required".
- [ ] Reject without reason or with reason < 10 chars → **`400`**.
- [ ] Query without question or question < 10 chars → **`400`**.
- [ ] Respond-query as a non-submitter, non-vendor user → **`403`**.
- [ ] Settle a non-APPROVED expense → **`400`**.
- [ ] Settle exceeding settlement limit (non-superuser) → **`403`**.
- [ ] Superior-override as `fin_manager` (grade 3) → **`403`** "Insufficient grade".
- [ ] Superior-override on already-terminal expense (e.g. PAID) → **`400`**.
- [ ] Submit with negative `total_amount` → **`400`**.
- [ ] Submit with `total_amount=0` → **`400`** (or accepted? record observed behavior).

### 4. Edge Cases & Concurrency

- [ ] **SoD violation:** force `skip_sod=False` path — call `transition_expense` directly via management shell to retry approval by same actor on a later step → raises `SoDViolation` (test the safety net, not the production "approve" flow which sets `skip_sod=True`).
- [ ] **`approve` while-loop bug:** approve a small invoice (e.g. ₹500 — within G1 limit) and confirm the response does NOT auto-skip past every level. The view contains a triple-copy-pasted `while` loop (lines ~170–282 in `employee_views.py`) — verify only one transition happens per click.
- [ ] **Race — two approvers click simultaneously:** open two browsers with `l1_approver` token, click approve at the same moment → exactly one APPROVED step row; the other returns 400/409 (record).
- [ ] **Query → respond loop:** raise QUERY_RAISED at PENDING_HOD, respond as `employee1`, expense reverts to `PENDING_HOD` with the original step reset to `PENDING` (not duplicated).
- [ ] **Auto-routing skip:** submit ₹5,00,000 as `employee1`. Verify the step chain skips L1/L2/HOD if those grades' limits are below ₹5L, lands on the lowest level whose grade can approve.
- [ ] **No approver found:** delete all users at the level the system would route to; submit and approve up to that gap → expense should land in a sensible terminal/error state, not crash. Record observed behavior.
- [ ] **Idempotency on D365 export:** approve twice via API replay (same expense, same body) — second call returns 400; export JSON file written exactly once.
- [ ] **Superior-override audit:** as `cfo`, override a `PENDING_HOD` expense → all 6 step rows present with `actual_actor=cfo`; AuditLog includes one master event with `override=True`, plus per-level "Skipped via Higher Authority" reasons.
- [ ] **Internal expense submission:** `POST /finance/expenses/` (not /submit/) as `employee1` with `category="Travel", amount=4500` (under G1 limit) → succeeds; `over_limit=false` in `ocr_raw`.
- [ ] Same as above with `amount=10000` → `over_limit=true` flag set; submission still allowed (no hard block, by design).
- [ ] **Reject after approve:** attempt reject on an APPROVED expense → 400 invalid transition.
- [ ] **Withdraw:** if WITHDRAWN transition is exposed via API, test from DRAFT and from any PENDING_* state — confirm only DRAFT → WITHDRAWN works (per VALID_TRANSITIONS).
