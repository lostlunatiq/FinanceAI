# 🧪 Feature: AI Feedback Loop
**Component Scope:** DRF `feedback_views.AIFeedbackView` / `AIFeedbackTraceView` → `AIFeedback` table → prompt injection into OCR/Anomaly pipelines
**Objective:** Verify feedback submission, trace history, access control (superuser / grade 4+ / own expense), and validation that past corrections are injected into LLM prompts.

### 1. Prerequisites & State Setup
- [ ] At least 3 APPROVED expenses for vendor1 (to inject feedback context on next vendor1 OCR).
- [ ] One expenses with anomaly scan result (to inject disputed flags into anomaly prompt).
- [ ] Users of all grades ready; `fin_admin` (grade 4), `fin_manager` (grade 3), `employee1` (submitted own expense).
- [ ] `OPENROUTER_API_KEY` real or placeholder for LLM injection verification.

### 2. The Happy Path

#### 2.1 Submit OCR feedback (superuser)
- [ ] As `cfo`: `POST /api/v1/ai-feedback/` with:
  ```json
  {
    "task_type": "OCR",
    "vendor_name": "vendor1",
    "is_positive": false,
    "comment": "GSTIN was incorrect; should be 12ABCDE1234F1ZZ",
    "field_corrections": {"gstin": "12ABCDE1234F1ZZ"}
  }
  ```
- [ ] **Assert API:** `201`; feedback record created.
- [ ] **Assert DB:** `AIFeedback` row with `task_type=OCR`, `vendor_name`, `is_positive=false`, `field_corrections` JSON.

#### 2.2 Submit anomaly feedback (grade 4)
- [ ] As `fin_admin`: `POST /api/v1/ai-feedback/` with:
  ```json
  {
    "task_type": "ANOMALY",
    "expense_id": "<uuid>",
    "is_positive": true,
    "comment": "Flagged weekend submission, but vendor confirmed valid (holiday adjustment)",
    "disputed_flags": ["weekend_submission"]
  }
  ```
- [ ] **Assert API:** `201`.
- [ ] **Assert DB:** `AIFeedback` with `task_type=ANOMALY`, `expense_id`, `disputed_flags=["weekend_submission"]`.

#### 2.3 Submit feedback on own expense (grade 1)
- [ ] As `employee1`: `POST /api/v1/ai-feedback/` with `{task_type: "OCR", expense_id: <employee1_submitted_id>, is_positive: true, comment: "OCR was accurate"}`.
- [ ] **Assert API:** `201`.
- [ ] **Assert DB:** feedback created; `created_by=employee1`.

#### 2.4 Vendor submits feedback on own vendor (vendor grade 0)
- [ ] As `vendor1`: `POST /api/v1/ai-feedback/` with `{task_type: "OCR", vendor_name: "vendor1", …}`.
- [ ] **Assert API:** `201` (vendor can feedback on own vendor).

#### 2.5 GET feedback list (filtered by task type)
- [ ] As superuser: `GET /api/v1/ai-feedback/?task=OCR`.
- [ ] **Assert API:** list of all OCR feedback records.
- [ ] As `employee1`: `GET /api/v1/ai-feedback/`.
- [ ] **Assert:** only feedback submitted by or about employee1's expenses (scoped view).

#### 2.6 Feedback trace (history for an expense)
- [ ] `GET /api/v1/ai-feedback/trace/<expense_id>/`.
- [ ] **Assert API:** `200`; body includes:
  - `expense_summary: {ref_no, vendor, amount, status}`
  - `ocr_feedback: [{created_by, is_positive, comment, field_corrections}, ...]` (last 5)
  - `anomaly_feedback: [{created_by, is_positive, comment, disputed_flags}, ...]` (last 5)
  - `ai_reasoning: "OCR confidence 0.92 … Anomaly severity HIGH due to vendor_risk"`
  - `feedback_influence: {corrections_applied: int, flags_disputed: int, positive_confirmations: int}`

#### 2.7 Prompt injection verification (indirect — check logs)
- [ ] Submit OCR feedback for vendor1.
- [ ] Upload a new invoice from vendor1; trigger OCR sync.
- [ ] **Assert (via debug logs or prompt capture):** OCR pipeline's LLM request includes "Past corrections: GSTIN field corrected to …" (verify feedback was injected).
- [ ] Repeat for anomaly: submit disputed flag feedback; re-scan same vendor → anomaly prompt includes "Past disputed flags: …".

### 3. Negative Testing

- [ ] Submit feedback as grade 2 on someone else's expense → **`403`** (insufficient grade and not owner).
- [ ] Submit feedback as employee1 on expense submitted by employee2 → **`403`** (not owner).
- [ ] Vendor submit feedback on vendor2's expenses → **`403`** (not own vendor).
- [ ] `task_type` invalid (e.g. "INVALID") → **`400`**.
- [ ] `task_type=OCR` + `expense_id` provided + `vendor_name` missing → **`400`** (OCR must provide vendor_name).
- [ ] Empty `comment` → **`400`** or accepted (record).
- [ ] `field_corrections` as a string instead of object → **`400`**.
- [ ] `disputed_flags` as a string instead of array → **`400`**.
- [ ] GET feedback for non-existent expense → **`404`**.
- [ ] Unauthorized user tries to GET feedback for someone else's expense → **`403`** (unless superuser or admin).

### 4. Edge Cases & Concurrency

- [ ] **Feedback on non-existent expense:** `{task_type: "ANOMALY", expense_id: <bad-uuid>}` → **`400`** "Expense not found".
- [ ] **Field correction with null value:** `{field_corrections: {gstin: null}}` → stored as `null`; OCR prompt should not reference (verify no "null" string in prompt).
- [ ] **Duplicate feedback:** submit two identical feedback records for same vendor + task_type → both rows created (no uniqueness constraint; expected).
- [ ] **Feedback influence calculation:** 10 OCR corrections submitted, 5 applied in next scan (inject subset) → `feedback_influence.corrections_applied=5`, not 10.
- [ ] **Large comment:** 5000 chars → stored fully; not truncated.
- [ ] **Unicode comment:** Hindi/Arabic text → stored in DB; Unicode in prompt sent to LLM without encoding errors.
- [ ] **Concurrent feedback submission:** two admins submit feedback for same expense simultaneously → both rows created; both applied in trace.
- [ ] **Feedback for deleted expense:** delete an expense, then `GET /trace/<id>/` → **`404`** or graceful "Expense not found".
- [ ] **Admin cannot see vendor-submitted feedback (by default):** vendor1 submits feedback; as fin_admin, try to filter `?vendor_name=vendor1` → may or may not return vendor1's feedback depending on scope (record behavior).
- [ ] **OCR feedback injection limit:** create 100 feedback records for vendor1; next OCR should only inject top 3–5 (verify prompt doesn't bloat with all history).
