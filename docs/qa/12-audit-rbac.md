# 🧪 Feature: Audit Log + RBAC
**Component Scope:** `AuditLog` (append-only) ← all services / views → DRF `auth_views.AuditLogListView` / `AuditLogExportView` → visibility tiers per grade
**Objective:** Verify audit trail captures all state changes, SoD violations, PII masking, and that each grade sees only authorized data.

### 1. Prerequisites & State Setup
- [ ] Submit → approve → reject → settle flow completed (creates 10+ audit logs).
- [ ] Anomaly escalations, feedback submissions logged.
- [ ] Multiple users of grades 1–5 ready.
- [ ] `AuditLog` table pre-populated with historical records.

### 2. The Happy Path

#### 2.1 Audit log view (grade-scoped)
- [ ] As `vendor1` (grade 0): `GET /api/v1/audit/`.
- [ ] **Assert API:** only logs where `entity_type="invoices.Expense"` AND `entity_id` is vendor1's submission; no finance events visible.
- [ ] As `employee1` (grade 1): `GET /api/v1/audit/`.
- [ ] **Assert:** own actions + own expense submissions visible; no budget actions, no superuser overrides.
- [ ] As `hod` (grade 2): `GET /api/v1/audit/`.
- [ ] **Assert:** own dept's expense lifecycle (submitted by own dept) + own actions; no other dept's finance events, no CFO overrides.
- [ ] As `fin_manager` (grade 3): `GET /api/v1/audit/`.
- [ ] **Assert:** all expenses + finance actions by G1–G3; no CFO overrides (grade 4+).
- [ ] As `cfo` (grade 5): `GET /api/v1/audit/`.
- [ ] **Assert:** unrestricted; all actions visible.

#### 2.2 Audit log detail fields
- [ ] Pick a log row for an expense approval.
- [ ] **Assert fields present:**
  - `action` (e.g. "expense.approved")
  - `entity_type` (e.g. "invoices.Expense")
  - `entity_id` (UUID)
  - `entity_display_name` (e.g. "BILL-2026-12345")
  - `created_by` (user who triggered it)
  - `timestamp`
  - `ip_address` (if available)
  - `request_id` (correlation ID)
  - `masked_before` / `masked_after` (if PII involved) — JSON objects
  - `state_change_only` flag

#### 2.3 Audit log export (CSV)
- [ ] As `fin_admin`: `GET /api/v1/audit/export/?format=csv`.
- [ ] **Assert API:** `200` with CSV attachment; rows include all visible (grade-scoped) audit logs.
- [ ] **Assert CSV injection guard:** if action contains `=`, `+`, `-`, `@`, it's prefixed with `'` so Excel doesn't evaluate it.

#### 2.4 Audit log filters
- [ ] `?entity_type=invoices.Expense&action=expense.approved` → filters to approval actions only.
- [ ] `?search=vendor1` → searches entity_display_name / user fields.
- [ ] `?state_change_only=true` → excludes VIEW, READ actions; includes STATE CHANGES (SUBMITTED, APPROVED, PAID, etc.).
- [ ] `?date_from=2026-01-01&date_to=2026-01-31` → date range filter.

#### 2.5 SoD violation logged
- [ ] Force a SoD violation (if possible in tests) or mock one.
- [ ] **Assert:** AuditLog captures both the violation attempt and any remediation (e.g. "SoD check: L1 approver already approved earlier step").

### 3. Negative Testing

- [ ] Vendor tries `?state_change_only=true` → still filtered to own invoices (vendor cannot see other vendors' state changes).
- [ ] Grade 1 tries to export audit → **`403`** (export only for grade 3+; record actual gate).
- [ ] Invalid date format `?date_from=01-01-2026` → **`400`** or normalized (record).
- [ ] Non-existent `entity_type` filter → `200` with empty list (not 400).
- [ ] Paginate with `limit=500` (exceeds max) → clamped to max (e.g. 200) or **`400`** (record).

### 4. Edge Cases & Concurrency

- [ ] **PII in masked_before/masked_after:** submit an expense with PAN in description; approve it → AuditLog.masked_before should show plain description, masked_after shows PAN redacted OR both are redacted (policy decision; record).
- [ ] **Request ID correlation:** approve an expense, check AuditLog → all 6 step transitions + final expense transition have same `request_id` (if enabled).
- [ ] **IP address in audit:** approve from IP 192.168.1.1 → AuditLog.ip_address captured.
- [ ] **Concurrent modifications:** two approvers update same expense step (impossible by design, but test the audit trail shows first-writer-wins).
- [ ] **Audit log immutability test:** try to DELETE or UPDATE a row directly from DB → table should have constraints (e.g. no DELETE ON RESTRICTION, append-only schema).
- [ ] **Large action list (1000s of entries):** list audit with no filter → pagination works correctly; total_count accurate.
- [ ] **Export large dataset (10,000+ rows):** CSV export should stream without OOM; file size reasonable.
- [ ] **User deleted after audit logged:** delete a user; audit logs still show their ID and username (no cascade delete expected).
- [ ] **Timezone correctness:** timestamp in audit is in Asia/Kolkata (project TZ); verify when exported.
