# 🧪 Feature: File Upload + OCR Sync
**Component Scope:** React `BillDetail.jsx` / Vendor portal → DRF `file_views` → `MEDIA_ROOT/invoices/` → `ai/pipelines/ocr_pipeline` → OpenRouter (vision) → `FileRef` table
**Objective:** Verify upload guards (MIME, size, magic), OCR extraction, confidence scoring (c1, c2), fallback model trigger, and manual-review flagging.

### 1. Prerequisites & State Setup
- [ ] Server up; `MEDIA_ROOT/invoices/` is writable.
- [ ] At least one valid sample invoice PDF (~150 KB), one PNG, one JPG, one corrupted PDF (truncate the file), one 12 MB PDF (over limit).
- [ ] `OPENROUTER_API_KEY` real key for live OCR; placeholder for mock-mode tests.
- [ ] `OPENROUTER_MODEL_OCR` and `OPENROUTER_MODEL_PRIMARY` set; fallback model differs from primary.
- [ ] `OCR_CONFIDENCE_REVIEW=0.50`, `OCR_CONFIDENCE_MANUAL=0.30` (defaults).
- [ ] PyMuPDF (`fitz`) installed; verify with `python -c "import fitz; print(fitz.version)"`.
- [ ] `python-magic` installed (optional; record whether MIME validation is hard or soft).

### 2. The Happy Path (Acceptable Flow)

#### 2.1 Upload single-page PDF
- [ ] `POST /api/v1/files/upload/` (multipart `file=invoice.pdf`) with bearer of `vendor1`.
- [ ] **Assert API:** `201` (or `200`) body has `id` (UUID), `filename`, `path`, `uploaded_at`.
- [ ] **Assert DB:** `FileRef` row inserted; `uploaded_by_id = vendor1.id`; `path` matches `invoices/<uuid>.pdf`.
- [ ] **Assert FS:** file exists on disk at `MEDIA_ROOT/invoices/<uuid>.pdf` with non-zero bytes.

#### 2.2 OCR sync
- [ ] `POST /api/v1/files/ocr/` with `{"file_id":"<uuid>"}`.
- [ ] **Assert API:** `200 OK` with `status="COMPLETE"`, `confidence ≥ 0.50`, `extracted_fields:{vendor_name, invoice_number, invoice_date, total_amount, …}`.
- [ ] **Assert API:** `validation_errors=[]`, `flagged_manual=false`, `model_used` populated, `pages_processed=1`.
- [ ] **Assert API:** `extracted_fields.cgst + sgst + igst + pre_gst_amount ≈ total_amount` within 2%.
- [ ] **Assert no PII leak:** `raw_text` truncated to 500 chars.

#### 2.3 Multi-page PDF (single invoice)
- [ ] Upload a 5-page invoice PDF.
- [ ] OCR sync.
- [ ] **Assert:** `pages_processed=5`; one merged `extracted_fields` object; line items aggregated from all pages.

#### 2.4 Multi-invoice PDF
- [ ] Upload PDF with 2 distinct invoice numbers across pages.
- [ ] OCR sync.
- [ ] **Assert:** the response signals multiple invoices detected (record exact field name in observed response — e.g. `multiple_invoices_detected:true` or `extracted_fields[]`).

#### 2.5 Image upload (PNG / JPG)
- [ ] Upload a clear PNG photograph of an invoice.
- [ ] OCR.
- [ ] **Assert:** `status="COMPLETE"` and confidence ≥ 0.30.

### 3. Negative Testing (Bad Flows)

- [ ] Upload without `file` field → **`400`** body explains missing field; no FileRef row.
- [ ] Upload `.exe` (or `application/x-msdownload`) → **`400`** "MIME type not allowed".
- [ ] Upload 12 MB PDF (over 10 MB limit) → **`400`** "File too large".
- [ ] Upload tiny corrupted PDF (random bytes) → upload succeeds (bytes pass MIME), OCR returns `flagged_manual=true`, `error="PDF could not be converted"`.
- [ ] OCR with non-existent `file_id` → **`404`**.
- [ ] OCR with valid `file_id` but file deleted from disk → **`404`** "file missing on disk"; FileRef row preserved (no auto-delete).
- [ ] OCR with malformed `file_id` (not a UUID) → **`400`**.
- [ ] Unauthenticated upload → **`401`**.
- [ ] Magic mismatch (rename `.exe` to `.pdf`) — only meaningful if `python-magic` installed → **`400`**, file removed from disk.

### 4. Edge Cases & Concurrency

- [ ] **Confidence < 0.50, ≥ 0.30:** invoice missing GSTIN; OCR returns `status="LOW_CONFIDENCE"`, `flagged_manual=false`. Confirm fallback model was attempted (check log line "fallback model").
- [ ] **Confidence < 0.30:** photograph of crumpled paper; OCR returns `flagged_manual=true`, `status="LOW_CONFIDENCE"` or `"FAILED"`.
- [ ] **OpenRouter timeout / 5xx:** simulate by setting `OPENROUTER_API_KEY` to an invalid key (forces 401) → OCR returns `flagged_manual=true`; client error swallowed; no 500.
- [ ] **Mock mode:** set `OPENROUTER_API_KEY="sk-or-placeholder"` → OCR returns demo invoice (`INV-2026-DEMO-001`, ₹11,800) with logged "MOCK MODE vision call skipped".
- [ ] **AI feedback injection:** create an `AIFeedback` record (task_type=OCR) for `vendor1` with `field_corrections={"gstin":"…"}`, then re-OCR a vendor1 invoice → confirm prompt log includes "Past corrections" snippet (check Celery/Django logs).
- [ ] **Concurrent OCR on same file:** 5 parallel POSTs to `/files/ocr/` for same `file_id` → all succeed; no DB constraint errors; FileRef untouched.
- [ ] **Disk full:** mock by bind-mounting a tiny tmpfs to `MEDIA_ROOT`; upload 9.5 MB file → graceful `500` or `400`, never silently truncated.
- [ ] **Path traversal:** filename `../../etc/passwd.pdf` → file saved as `<uuid>.pdf` (not the original name); `original_filename` field stores raw input but path uses UUID.
- [ ] **GST cross-validation (c2):** craft fields where `pre_gst + cgst + sgst ≠ total` by 5% → `validation_errors` includes "GST math mismatch"; confidence reduced.
- [ ] **GSTIN length check:** GSTIN of length 14 → validation_errors flag "GSTIN must be 15 chars".
- [ ] **PAN length check:** PAN of length 9 → validation_errors flag.
- [ ] **Replication / read-after-write:** upload then immediately call `/files/<id>/` download → file streams without 404 (assert no race).
