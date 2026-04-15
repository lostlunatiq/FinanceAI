# 14 — Shared Capabilities (Cross-Cutting Services)

These 12 capabilities are consumed by multiple modules. They are implemented as Django apps or service layers within the `apps/` or `services/` directories.

**MVP Principle**: Every capability has a graceful fallback when its external dependency is missing.

---

## 14.1 State Machine Framework

**Location**: `apps/core/state_machine.py`
**Used by**: All stateful models (Expense, Invoice, Budget, Vendor, AP, CN)

### Purpose
- Enforce only declared transitions
- Forbid direct status assignment
- Automatic audit logging on every transition
- Optimistic concurrency via version field

### API

```python
class StateMachineEngine:
    def transition_to(self, record, target_state, actor, reason='', metadata=None):
        """
        1. Lookup transition definition (from → to)
        2. Validate transition is declared
        3. Run guards (preconditions)
        4. Run SoD checks (if approval step)
        5. Acquire optimistic lock (version check)
        6. Apply state change
        7. Run side effects (on_transition hooks)
        8. Write audit log (automatic, non-bypassable)
        9. Enqueue notifications (after_transition hooks)
        10. Return updated record
        """
```

### Declaration Pattern

```python
class ExpenseStateMachine(StateMachine):
    states = ['DRAFT', 'SUBMITTED', 'PENDING_L1', ...]
    transitions = [
        Transition('SUBMITTED', 'PENDING_L1', guard=anomaly_clean, on_transition=notify_l1),
        Transition('SUBMITTED', 'AUTO_REJECT', guard=hard_duplicate, on_transition=notify_rejection),
        ...
    ]
```

### Concurrency Control

Version-based optimistic locking:
```sql
UPDATE expenses SET status='PENDING_L2', version=6
WHERE id='{uuid}' AND version=5;
-- Returns 0 rows → ConcurrentModification error → client retries
```

### Lifecycle Hooks

| Hook | When | Use Case |
|------|------|----------|
| `before_transition` | Pre-validation | Compute derived fields |
| `guard` | Validation | Check preconditions, budget limits |
| `on_transition` | During (same DB transaction) | Side effects, create approval step |
| `after_transition` | Post-commit | Notifications, enqueue follow-ups |

---

## 14.2 Approval Engine

**Location**: `apps/approvals/`
**Used by**: Expense (6-step), Invoice CN (2-step), Budget BRR, Vendor onboard, Bank change, PO

### Chain Templates

| Template | Steps | Used For |
|----------|-------|----------|
| `expense_6_step` | L1→L2→HoD→FinL1→FinL2→FinHead | Vendor bill approval |
| `invoice_cn_2_step` | FinL2→CFO | Credit note approval |
| `budget_brr_intra` | HoD→CFO | Intra-department budget reallocation |
| `budget_brr_inter` | HoD→CFO→CEO | Inter-department reallocation |
| `vendor_onboard` | Admin→CFO | New vendor onboarding |
| `bank_change_3_step` | Vendor→48h_cooling→CFO+verify | Bank account changes |
| `payment_run_2_step` | FinL2→CFO | Payment batch approval |
| `po_2_step` | FinL1→FinL2 | Purchase order approval |

### Engine API

```python
class ApprovalEngine:
    def init_chain(target, template_key): ...
    def advance_step(chain_id, actor, decision): ...
    def raise_query(chain_id, actor, message): ...
    def respond_query(chain_id, actor, message): ...
    def reject(chain_id, actor, reason): ...
    def cancel(chain_id, reason): ...
    def get_status(chain_id): ...
```

### SoD Enforcement (at engine level)
All 8 SoD rules are enforced inside `advance_step()` — see `05-auth-rbac.md` for full rules.

---

## 14.3 PII Masking Middleware

**Location**: `services/masking.py`
**Used by**: OCR, Anomaly Detection, NL Query, AI Summaries — anything that calls Claude API

### Single Chokepoint
No service may call `claude_client.call()` directly. All requests flow through `MaskingService.process()`.

### Field-Level Strategy

| Field Type | Strategy | Output Example |
|-----------|----------|----------------|
| Vendor name | Tokenize | `vendor_token_a8f3` |
| GSTIN | Tokenize | `gstin_token_002` |
| PAN | Strip | Not sent |
| Bank account | Strip | Not sent |
| Amount | Bucket | `200k_300k` |
| Email | Tokenize | `user_token_004` |
| Description | Pass through | Strip names if present |
| Internal notes | Strip | Not sent |
| Date | Pass through | As-is |

### Token Roundtrip
1. Generate random tokens per PII field
2. Token→value map stored **in-memory only** (never persisted, never logged)
3. Send masked payload to Claude
4. Unmask tokens in Claude's response
5. Discard token map

### Graceful Fallback
If `CLAUDE_API_KEY` not set → `MaskingService.process()` raises `AIServiceUnavailable` → calling service handles gracefully (OCR=SKIPPED, Anomaly=rule-only, NLQuery=disabled).

---

## 14.4 OCR Pipeline

**Location**: `apps/ocr/`
**Used by**: Expense module (vendor bill extraction)

### Pipeline Steps
1. **File detection**: PDF or image?
2. **PDF conversion**: Render first page to image (pdf2image/Pillow)
3. **Image preprocessing**: Resize, contrast enhancement, auto-rotate
4. **Masking**: Strip PII from prompt context
5. **Claude Vision call**: Send image + extraction prompt
6. **Parse response**: Extract structured fields JSON
7. **Validate**: Regex for GSTIN, date formats, amount ranges
8. **Confidence scoring**: Per-field confidence (0.0–1.0)
9. **Store result**: OcrTask + result JSON in DB

### Output Schema
```json
{
  "vendor_name": {"value": "XYZ Logistics", "confidence": 0.97},
  "invoice_number": {"value": "INV-2026-042", "confidence": 0.99},
  "invoice_date": {"value": "2026-04-08", "confidence": 0.95},
  "amount_total": {"value": 250000.00, "confidence": 0.92},
  "gstin": {"value": "29ABCDE1234F1Z5", "confidence": 0.95},
  "line_items": [...]
}
```
Fields with confidence < 0.85 → highlighted in amber on frontend.

### Graceful Fallback
No `CLAUDE_API_KEY` → OcrTask status=SKIPPED → user fills form manually. UI shows "OCR unavailable, please fill manually."

---

## 14.5 Anomaly Detection

**Location**: `apps/anomaly/`
**Used by**: Expense (on submission), AP, Invoice

### Hybrid Pipeline: Rules + ML

#### 8 Rule-Based Checks

| # | Rule | Weight | Action |
|---|------|--------|--------|
| 1 | Hard duplicate (vendor + inv_no + amount) | 100 | Auto-reject |
| 2 | Bank account changed within 7 days | 60 | High flag |
| 3 | Amount > 3σ above vendor average | 40 | Medium flag |
| 4 | Round amount + first bill from vendor | 30 | Medium flag |
| 5 | Submitted between 11 PM–5 AM | 15 | Low flag |
| 6 | Amount within 5% of approval threshold | 25 | Medium flag |
| 7 | GSTIN suspended in last 30 days | 50 | High flag |
| 8 | Vendor concentration > 40% of category | 10 | Low flag |

#### ML Component (Isolation Forest)
- **Features**: amount, day_of_month, day_of_week, hour, days_since_last_bill, ratio_to_vendor_avg, ratio_to_category_avg
- **Training**: Nightly Celery task retrain on rolling 12-month window
- **Score**: -1 to 1; threshold at -0.3 contributes 30 points to severity

#### Severity Tiers

| Score Range | Severity | Action |
|------------|----------|--------|
| ≥ 100 | CRITICAL | Auto-reject (hard duplicate only) |
| 50–99 | HIGH | Flag with override required |
| 20–49 | MEDIUM | Show amber warning |
| 0–19 | LOW/NONE | Continue normally |

### Graceful Fallback
No historical data → ML score=null → only rule-based checks run. No bills at all → all checks skip → bill goes straight to PENDING_L1.

---

## 14.6 Audit Trail

**Location**: `apps/core/audit.py`
**Used by**: All modules

### Write Architecture
- `@audited` decorator or `AuditWriter.log()` direct call
- Build entry payload with before/after snapshots
- Compute `entry_hash = SHA256(payload + prev_hash)`
- INSERT only (DB trigger prevents UPDATE/DELETE)

### Action Catalog (module.verb naming)

| Module | Actions |
|--------|---------|
| expense | created, submitted, approved_l1, approved_l2, approved_hod, approved_fin_l1, approved_fin_l2, approved_fin_head, rejected, query_raised, query_responded, expired, reactivated, booked_d365, posted_d365, paid, withdrawn |
| invoice | drafted, sent, viewed, paid, partial_paid, overdue, dunning_stage1/2/3, disputed, cn_issued, cancelled |
| accounts | user_created, role_assigned, user_deactivated, password_reset, login, logout |
| vendor | created, approved, suspended, bank_change_requested, bank_change_approved |
| audit | log_verified, tamper_detected, sod_violation_detected |

### Hash Chain Verification
Walk the chain: if `entry[N].prev_hash != entry[N-1].entry_hash` → tamper detected → critical alert.

### Performance
- Partitioned by month
- Indexed on `(target_type, target_id)`, `(actor_id, created_at)`
- Background partition manager

---

## 14.7 Document Storage

**Location**: `apps/core/file_service.py`
**Used by**: All modules with file attachments

### Upload Flow
1. Compute SHA256 of incoming file
2. Check if hash already exists in FileRef table → reuse if so (dedupe)
3. If new: upload to MinIO bucket, create FileRef row
4. Return FileRef UUID to caller

### Buckets
- `bills/` — vendor bill PDFs
- `invoices/` — generated invoice PDFs
- `evidence/` — supporting documents
- `exports/` — report exports
- `contracts/` — vendor contracts

### Download
Presigned URLs with 15-minute TTL. Never direct bucket access.

### Graceful Fallback
No MinIO → use Django's default `FileSystemStorage` (local disk).

---

## 14.8 Notifications

**Location**: `apps/notifications/`
**Used by**: All modules

### Channels
| Channel | Hackathon | Phase 2 |
|---------|-----------|---------|
| In-App | ✅ Always works | ✅ |
| Email | ✅ If SMTP configured | ✅ |
| SMS | ❌ | Twilio |
| Slack | ❌ | Slack API |

### Per-Channel Masking

| Field | Email | In-App | SMS |
|-------|-------|--------|-----|
| Vendor name | Full | Full | Initials |
| Amount | Full | Full | Bucket |
| Bank account | Last 4 | Last 4 | Never |
| Internal notes | Never | Full | Never |

### Deduplication
Same `(recipient, template, target_id)` within 30 seconds → deduplicated.

### Graceful Fallback
No SMTP → email logged to console + in-app notification still created. No email → system still functions.

---

## 14.9 D365 Integration (Adapter Pattern)

**Location**: `apps/d365_adapter/`
**Used by**: Expense, Invoice, Vendor

### Mock vs Real

| Concern | Hackathon (Mock) | Production |
|---------|-----------------|------------|
| Transport | In-process Django views | HTTPS OData v4 |
| Auth | None | OAuth 2.0 |
| Endpoints | `/mock-d365/api/v2.0/...` | Real BC URL |
| Webhook | Celery delay 5s | Real-time |

### Adapter Interface

```python
class D365Adapter(ABC):
    @abstractmethod
    def create_purchase_invoice(self, payload): ...
    @abstractmethod
    def create_sales_invoice(self, payload): ...
    @abstractmethod
    def upsert_vendor(self, payload): ...
    @abstractmethod
    def record_payment(self, payload): ...
```

Two implementations: `MockD365Client` (calls mock_d365 app) and `BCODataClient` (calls real BC).

### Resilience
- Retries with exponential backoff (max 3)
- 4xx → do not retry (bad request)
- 5xx/timeout → retry → dead letter queue after 3 fails
- Idempotency key on every request

### Graceful Fallback
Mock D365 app disabled → D365 calls skip, expense stays APPROVED, admin can manually progress.

---

## 14.10 NL Query Engine

**Location**: `apps/nlquery/` (Phase 2)
**Used by**: CFO dashboard, reporting, audit

### Pipeline
1. User types natural language question
2. Schema catalog provided to Claude (masked)
3. Claude generates SQL
4. `sqlglot` parser validates:
   - SELECT only (no INSERT/UPDATE/DELETE)
   - Only allowlisted tables
   - No system functions
   - Joins ≤ 5 tables
5. LIMIT injected (max 10,000 rows)
6. Statement timeout (30s)
7. Execute on read replica
8. Format results

### Graceful Fallback
No `CLAUDE_API_KEY` → NL query feature disabled in UI.

---

## 14.11 AI Summaries

**Location**: `apps/aisummaries/` (Phase 2)
**Used by**: CFO dashboard, weekly reports

### Summary Types

| Summary | Frequency | Source |
|---------|-----------|--------|
| CFO Monthly | Monthly 5th | All modules |
| AR Flash | Weekly Mon | AR module |
| Forecast Narrative | Daily | Cash flow |

### Quality Controls
- Bounded length (max-word prompt)
- No fabrication policy
- Numerical anchoring
- Review queue for first 5 of each type

### Graceful Fallback
No `CLAUDE_API_KEY` → AI summaries disabled, standard data tables shown instead.

---

## 14.12 RBAC & SoD

See `05-auth-rbac.md` for full details. Summary:
- 4-layer enforcement cascade
- 8 hard-coded SoD rules
- Hourly SoD scanner
- Backup approver auto-routing
