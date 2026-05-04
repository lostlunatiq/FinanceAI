# D365 Business Central Integration — Design Spec

**Date:** 2026-05-04  
**Branch:** quick-wins-optimization  

---

## Overview

Integrate FinanceAI with Microsoft Dynamics 365 Business Central (BC) via the standard OData v4 REST API. Two directions:

- **Read:** Periodically sync Purchase Orders (Table 38 Header + Table 39 Lines) from BC into a local cache so Finance can use them for internal mapping.
- **Write:** When a vendor `Expense` (invoice) is approved in FinanceAI, push it to BC as a Purchase Invoice (Document Type=2), populating the existing `d365_document_no` and `d365_posted_at` fields on `Expense`.

The vendor never sees D365 fields. All PO-to-invoice mapping is done internally by Finance.

---

## Scope

- New Django app: `apps/d365/`
- Minimal changes to existing models: one new field on `Expense` (`d365_push_error`) and one on `Vendor` (`bc_vendor_no`) — all other D365 fields (`d365_document_no`, `d365_posted_at`, `d365_payment_utr`, `PENDING_D365`, `BOOKED_D365`, `POSTED_D365` states) already exist.
- Hook into existing `transition_expense()` in `apps/invoices/services.py` — no other changes to the approval flow.

---

## Architecture

```
apps/d365/
  client.py        # D365Client — OData HTTP wrapper, Basic auth (placeholder)
  models.py        # D365PurchaseOrder, D365PurchaseLine (local BC cache)
  tasks.py         # sync_purchase_orders (Celery beat), push_invoice_to_d365 (on-demand)
  serializers.py   # map Expense fields → BC Purchase Header/Line payload
  views.py         # /api/d365/purchase-orders/ (Finance-only read), /api/d365/invoices/<id>/retry/
  urls.py
  admin.py
```

---

## Data Models (`apps/d365/models.py`)

### D365PurchaseOrder (Table 38 cache)

| Field | Type | Notes |
|---|---|---|
| `bc_document_no` | CharField, unique | e.g. "PI-0090" — BC primary key |
| `bc_document_type` | IntegerField | Always 2 (Purchase Invoice) |
| `vendor_no` | CharField | BC vendor ID e.g. "10000" |
| `vendor` | FK(Vendor, null=True) | Matched to local Vendor by vendor_no |
| `location_code` | CharField | e.g. "BLUE" |
| `posting_date` | DateField | |
| `document_date` | DateField | |
| `due_date` | DateField | |
| `service_month` | DateField | |
| `payment_terms` | CharField | e.g. "30 DAYS" |
| `project` | CharField | e.g. "3SC" |
| `project_location` | CharField | e.g. "Gurugram" |
| `vendor_invoice_no` | CharField | Any value |
| `synced_at` | DateTimeField | Last BC sync timestamp |
| `is_open` | BooleanField | False once BC closes/posts the PO |

### D365PurchaseLine (Table 39 cache)

| Field | Type | Notes |
|---|---|---|
| `purchase_order` | FK(D365PurchaseOrder) | |
| `bc_line_no` | IntegerField | e.g. 10000 |
| `line_type` | CharField | e.g. "g/l account" |
| `account_no` | CharField | e.g. "8430" |
| `description` | CharField | e.g. "Travel" |
| `quantity` | DecimalField | |
| `unit_cost` | DecimalField | |
| `gst_group_code` | CharField | e.g. "0988" |
| `hsn_sac` | CharField | e.g. "0988001" |
| `gst_jurisdiction_type` | CharField | e.g. "Intrastate" |
| `gst_credit` | CharField | e.g. "Availment" |
| `project` | CharField | |
| `project_location` | CharField | |

---

## D365Client (`apps/d365/client.py`)

Basic auth with placeholder credentials from Django settings. All methods return parsed JSON or raise `D365APIError`.

```python
D365_BASE_URL    = settings.D365_BASE_URL      # e.g. https://<tenant>.api.businesscentral.dynamics.com/v2.0/<env>/ODataV4
D365_USERNAME    = settings.D365_USERNAME      # placeholder
D365_PASSWORD    = settings.D365_PASSWORD      # placeholder
D365_COMPANY_ID  = settings.D365_COMPANY_ID   # BC company filter
```

Methods:
- `get_purchase_orders(filter=None)` — GET PurchaseHeaders filtered to open orders
- `get_purchase_lines(document_no)` — GET PurchaseLines for a given header
- `create_purchase_header(payload)` — POST to create Purchase Invoice header
- `create_purchase_lines(doc_no, lines)` — POST lines against a header
- `get_purchase_header(document_no)` — GET single header (used to confirm booking)

All calls use `requests.Session` with Basic auth, 30s timeout, and raise `D365APIError` on non-2xx.

---

## Read Direction — PO Sync

**Celery beat task:** `sync_purchase_orders` — runs every 30 minutes.

1. Call `D365Client.get_purchase_orders()` — fetches all open Purchase Headers (Document Type=2).
2. For each header, call `get_purchase_lines(bc_document_no)`.
3. Upsert `D365PurchaseOrder` (match on `bc_document_no`) and its `D365PurchaseLine` records.
4. Match `vendor_no` to local `Vendor` FK where possible.
5. Mark orders as `is_open=False` if BC no longer returns them in the open set.

Finance-only API endpoint: `GET /api/d365/purchase-orders/` — lists cached POs with their lines. Used internally; never exposed to vendors.

---

## Write Direction — Invoice Push

**Hook point:** `transition_expense()` in `apps/invoices/services.py`.

After a successful transition to `"APPROVED"`, if `expense.vendor.vendor_type != "internal"`:
```python
from apps.d365.tasks import push_invoice_to_d365
push_invoice_to_d365.delay(str(expense.id))
```
This immediately transitions the expense to `PENDING_D365`.

**Celery task:** `push_invoice_to_d365(expense_id)`

1. Load `Expense` + related `Vendor`.
2. Build Purchase Header payload (Table 38 fields) from `Expense` fields.
3. Build Purchase Line payload(s) (Table 39 fields) from OCR data in `expense.ocr_raw`.
4. Call `D365Client.create_purchase_header(payload)`.
5. Call `D365Client.create_purchase_lines(doc_no, lines)`.
6. On success: set `expense.d365_document_no`, `expense.d365_posted_at`, transition to `BOOKED_D365`.
7. On failure: log error to `AuditLog`, leave expense in `PENDING_D365` (retryable). Store failure reason in a `d365_push_error` field (new field, CharField blank=True).

**Manual retry:** `POST /api/d365/invoices/<expense_id>/retry/` — Finance-only. Re-enqueues `push_invoice_to_d365` for expenses stuck in `PENDING_D365`.

**Celery retry config:** max 3 retries, exponential backoff (60s, 120s, 240s). After exhausting retries, mark with a logged failure — Finance sees it in the retry UI.

---

## Payload Mapping (Expense → BC)

### Purchase Header (Table 38)

| BC Field | Source |
|---|---|
| `Document_Type` | `2` (hardcoded) |
| `No.` | Left blank — BC auto-generates the document number; returned value stored in `expense.d365_document_no` |
| `Buy_from_Vendor_No` | `expense.vendor.bc_vendor_no` (new field on Vendor, blank=True) |
| `Vendor_Invoice_No` | `expense.invoice_number` |
| `Document_Date` | `expense.invoice_date` |
| `Posting_Date` | today |
| `Due_Date` | from `ocr_raw` if extracted, else left blank for BC to calculate |
| `Location_Code` | from `ocr_raw` if extracted, else blank |
| `Payment_Terms_Code` | from `ocr_raw` if extracted, else blank |

### Purchase Line (Table 39)

| BC Field | Source |
|---|---|
| `Document_Type` | `2` |
| `Document_No` | from created header |
| `Line_No` | `10000` (first line) |
| `Type` | `"G/L Account"` |
| `No.` | from `ocr_raw` if extracted, else blank (Finance must configure post-push if needed) |
| `Description` | `expense.business_purpose` or OCR description |
| `Quantity` | `1` |
| `Direct_Unit_Cost` | `expense.pre_gst_amount` |
| `GST_Group_Code` | from `ocr_raw` if extracted, else blank |
| `HSN_SAC_Code` | from `ocr_raw` if extracted, else blank |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| BC unreachable during sync | Celery retries 3×; last `synced_at` stays stale; Finance sees warning in admin |
| Push fails after 3 retries | Expense stays `PENDING_D365`; `d365_push_error` populated; Finance retries manually |
| OCR data missing required BC fields | Push task logs validation error before calling BC; Finance is notified |
| BC returns duplicate document error | Idempotency check: if `d365_document_no` already set, skip push |

---

## New Settings (placeholders)

```python
# config/settings.py
D365_BASE_URL   = env("D365_BASE_URL", default="https://placeholder.api.businesscentral.dynamics.com/v2.0/placeholder/ODataV4")
D365_USERNAME   = env("D365_USERNAME", default="placeholder")
D365_PASSWORD   = env("D365_PASSWORD", default="placeholder")
D365_COMPANY_ID = env("D365_COMPANY_ID", default="placeholder")
```

---

## New Fields on Existing Models

| Model | Field | Type | Purpose |
|---|---|---|---|
| `Expense` | `d365_push_error` | CharField(blank=True) | Stores last push failure reason |
| `Vendor` | `bc_vendor_no` | CharField(blank=True) | BC vendor ID for payload mapping |

---

## Testing Strategy

- Unit tests: `D365Client` with mocked `requests` responses
- Task tests: mock `D365Client`, verify status transitions on success/failure
- Sync tests: verify upsert logic, `is_open` flag, vendor FK matching
- Integration: placeholder — real BC sandbox credentials required
