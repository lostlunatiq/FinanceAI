# 🧪 Feature: Vendor Portal + Vendor CRUD
**Component Scope:** React `vendor/` components → DRF `vendor_views` (self-service + admin) → PostgreSQL `core_vendor`, `invoices_expense` → Expense FSM
**Objective:** Verify vendor self-service (profile, bill extraction via OCR, bill submission) and finance admin CRUD (create, activate, list, detail) with vendor-level RBAC.

### 1. Prerequisites & State Setup
- [ ] `vendor1` and `vendor2` accounts seeded (grade 0).
- [ ] At least one `Vendor` record in DB.
- [ ] At least one Finance Admin (`fin_admin`, grade 4) account.
- [ ] Sample invoice PDF ready for vendor submission.
- [ ] `CELERY_TASK_ALWAYS_EAGER=true` (OCR extraction runs inline).

### 2. The Happy Path

#### 2.1 Vendor login + profile view
- [ ] As `vendor1`: `GET /api/v1/invoices/vendor/profile/` (bearer token).
- [ ] **Assert API:** `200`; body has `vendor_id`, `vendor_name`, `gstin`, `bc_vendor_no`, `status`, `contact_email`, `bills_submitted_count`, `pending_approval_count`.
- [ ] **Assert:** displays only vendor1's own data.

#### 2.2 Vendor extract invoice via OCR
- [ ] As `vendor1`: `POST /api/v1/invoices/vendor/bills/extract/` with `{file_id: <fileref_uuid>}` (FileRef from a prior upload by vendor1).
- [ ] **Assert API:** `202 Accepted` with `task_id` (Celery task ID).
- [ ] **Assert Celery:** task runs, completes with OCRResult stored.
- [ ] `GET /api/v1/invoices/vendor/bills/extract/<task_id>/`.
- [ ] **Assert:** `200` with `status="SUCCESS"`, `extracted_fields`, `confidence`, validation_errors.

#### 2.3 Vendor submit bill
- [ ] As `vendor1`: `POST /api/v1/invoices/submit/` with OCR-extracted fields + vendor_id.
- [ ] **Assert:** expense created in `PENDING_L1`; assigned to vendor's L1 approver.
- [ ] `GET /api/v1/invoices/vendor/bills/` (list vendor's own bills).
- [ ] **Assert:** newly submitted bill appears; status shows PENDING_L1.

#### 2.4 Vendor view bill detail
- [ ] As `vendor1`: `GET /api/v1/invoices/vendor/bills/<id>/`.
- [ ] **Assert:** returns bill detail with approval status, query history, payment status (if paid).

#### 2.5 Vendor respond to query
- [ ] Finance approver raises QUERY_RAISED on vendor1's bill.
- [ ] As `vendor1`: `POST /api/v1/invoices/finance/bills/<id>/respond-query/` with `{response: "Corrected details attached"}`.
- [ ] **Assert API:** `200`.
- [ ] **Assert DB:** expense reverts to PENDING_L1; step reset.
- [ ] **Assert notification:** query raiser notified of response.

#### 2.6 Finance admin — vendor list
- [ ] As `fin_admin`: `GET /api/v1/invoices/vendors/`.
- [ ] **Assert:** list of all vendors, paginated, with status, bill count, risk score.

#### 2.7 Finance admin — create vendor
- [ ] As `fin_admin`: `POST /api/v1/invoices/vendors/create/` with `{vendor_name, gstin, contact_email, status:"PENDING"}`.
- [ ] **Assert API:** `201`; vendor record created.
- [ ] **Assert DB:** `core_vendor` row inserted; status="PENDING".

#### 2.8 Finance admin — activate vendor
- [ ] As `fin_admin`: `POST /api/v1/invoices/vendors/<id>/activate/` with `{status:"ACTIVE"}`.
- [ ] **Assert:** `200`; vendor.status changed to ACTIVE.
- [ ] **Assert DB:** AuditLog row with action="vendor.activated".

#### 2.9 Finance admin — vendor detail + update
- [ ] As `fin_admin`: `GET /api/v1/invoices/vendors/<id>/`.
- [ ] **Assert:** full detail: name, gstin, bc_vendor_no, contact, bills_submitted, risk_score.
- [ ] `PATCH` the vendor with new contact_email.
- [ ] **Assert:** `200`; DB updated.

#### 2.10 Dashboard stats (vendor count, active vendors)
- [ ] As any grade: `GET /api/v1/invoices/dashboard/stats/`.
- [ ] **Assert:** includes `total_vendors`, `active_vendors`, `pending_vendors`, `blacklisted_vendors`.

### 3. Negative Testing

- [ ] Vendor list/create as `vendor1` (grade 0) → **`403`** "Insufficient grade".
- [ ] Vendor activate as `fin_manager` (grade 3) → **`403`** (only grade 4+ allowed).
- [ ] Vendor extract with non-existent `file_id` → **`404`**.
- [ ] Vendor extract on a file uploaded by `vendor2` (not vendor1) → **`403`** "Not your file".
- [ ] Vendor submit with `vendor_name` mismatched from their profile → record behavior (error or allow?).
- [ ] Vendor respond-query on someone else's bill → **`403`**.
- [ ] Vendor respond-query when no open query → **`404`**.
- [ ] Create vendor with invalid GSTIN (length != 15) → **`400`** or accepted with validation warning (record).
- [ ] Activate vendor with no `status` field → **`400`**.
- [ ] Update vendor with `bc_vendor_no` to a duplicate value → **`400`** unique constraint or accepted (record).

### 4. Edge Cases & Concurrency

- [ ] **Vendor self-service isolation:** as `vendor1`, call `/vendors/list` (admin endpoint) → **`403`**.
- [ ] **Vendor bill list privacy:** vendor1 submits a bill, vendor2 tries `GET /api/v1/invoices/vendor/bills/<id>/` → **`403`**.
- [ ] **Concurrent extract:** vendor1 uploads two files, extracts both in parallel → both tasks complete; both FileRef rows linked.
- [ ] **Extract timeout:** simulate 30s LLM delay → request should not 500; Celery task hangs gracefully.
- [ ] **Vendor activation race:** two finance admins activate same vendor concurrently → final status ACTIVE; one audit row per request.
- [ ] **Vendor creation duplicate name:** create vendor A, then create another named A → allowed (no unique constraint on name; record if any validation).
- [ ] **Extract after file deleted:** extract a file, delete the file from disk, poll result → task fails gracefully with error message in TaskResult.
- [ ] **Vendor status transitions:** create PENDING → activate to ACTIVE → can they submit bills? (confirm workflow allows ACTIVE only).
- [ ] **Blacklist a vendor:** create ACTIVE vendor, then set status=BLACKLISTED → existing bills frozen? Bills submitted by blacklisted vendor are still routed (record behavior — likely no special handling).
- [ ] **Portal login session:** vendor1 logs in, token expires (8h in dev), tries to list bills → **`401`** (token_not_valid); refresh succeeds.
