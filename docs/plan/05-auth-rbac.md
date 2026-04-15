# 05 — Security, Authentication, RBAC & Segregation of Duties

## 5.1 Authentication

### Hackathon: Email + Password + JWT

```
Login Flow:
POST /api/v1/auth/login {email, password}
  → Django authenticates against User model
  → Returns {access_token (15min), refresh_token (7d), user profile}

Token Refresh:
POST /api/v1/auth/refresh {refresh_token}
  → Returns new {access_token}

Logout:
POST /api/v1/auth/logout {refresh_token}
  → Blacklists refresh token
```

**Implementation**: `djangorestframework-simplejwt`

JWT Payload:
```json
{
  "user_id": "uuid",
  "email": "user@3sc.in",
  "role": "FIN_L1",
  "department_id": "uuid",
  "vendor_id": "uuid or null",
  "iat": 1713200000,
  "exp": 1713200900
}
```

### Vendor Login

Vendors use the same email+password auth but access `/vendor/` routes. The frontend detects `role=VENDOR` from the JWT payload and routes to the vendor portal.

Dedicated URL: `/vendor/login` → same API endpoint, different UI route.

### Session Security

| Control | Setting |
|---------|---------|
| Access token TTL | 15 minutes |
| Refresh token TTL | 7 days |
| CSRF | Enabled for session-based admin; JWT endpoints exempt |
| Rate limiting | `django-ratelimit`: 5 failed logins → 15min lockout |
| Password hashing | bcrypt (Django default) |
| Password policy | Minimum 8 chars (hackathon), stricter in prod |

---

## 5.2 Role Hierarchy & Permission Matrix

### 10+ Roles

```
CEO
 └── CFO / Finance Head
      ├── Finance L2
      │    └── Finance L1
      └── Department Head (HoD)
           ├── Employee L2
           │    └── Employee L1
           └── (mapped to Vendors)

Admin ←--→ CFO (lateral, not hierarchical)
Auditor ←--→ CFO (read-only access)
External CA ←--→ Auditor (compliance only)
Vendor (external user)
```

### Permission Matrix

| Permission | Vendor | EmpL1 | EmpL2 | HoD | FinL1 | FinL2 | CFO | CEO | Admin | Auditor |
|-----------|--------|-------|-------|-----|-------|-------|-----|-----|-------|---------|
| **Expense Module** | | | | | | | | | | |
| Submit own bill | ✅ | — | — | — | — | — | — | — | — | — |
| File bill on behalf | — | ✅ | — | — | — | — | — | — | — | — |
| Approve at L1 | — | ✅ | — | — | — | — | — | — | — | — |
| Approve at L2 | — | — | ✅ | — | — | — | — | — | — | — |
| Approve at HoD | — | — | — | ✅ | — | — | — | — | — | — |
| Approve at Fin L1 | — | — | — | — | ✅ | — | — | — | — | — |
| Approve at Fin L2 | — | — | — | — | — | ✅ | — | — | — | — |
| Approve at Fin Head | — | — | — | — | — | — | ✅ | — | — | — |
| Reject at any step | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Raise query | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Respond to query | ✅ | ✅ | — | — | — | — | — | — | — | — |
| Override anomaly | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Book in D365 | — | — | — | — | — | — | ✅ | — | — | — |
| View own bills | ✅ | ✅ | — | — | — | — | — | — | — | — |
| View all bills | — | — | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| **Invoice Module** | | | | | | | | | | |
| Create draft invoice | — | — | — | — | ✅ | — | — | — | — | — |
| Send invoice | — | — | — | — | ✅ | — | — | — | — | — |
| Trigger dunning Stage 2 | — | — | — | — | — | ✅ | — | — | — | — |
| Trigger dunning Stage 3 | — | — | — | — | — | — | ✅ | — | — | — |
| Issue credit note | — | — | — | — | — | ✅ | — | — | — | — |
| Reconcile payment | — | — | — | — | ✅ | — | — | — | — | — |
| Mark legal referral | — | — | — | — | — | — | ✅ | — | — | — |
| **Admin** | | | | | | | | | | |
| Create vendor | — | — | — | — | — | — | — | — | ✅ | — |
| Approve vendor | — | — | — | — | — | — | ✅ | — | ✅ | — |
| Map L1 to vendor | — | — | — | — | — | — | — | — | ✅ | — |
| Manage users | — | — | — | — | — | — | — | — | ✅ | — |
| Configure approvals | — | — | — | — | — | — | — | — | ✅ | — |
| **Audit** | | | | | | | | | | |
| View audit log | — | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ |
| Export audit log | — | — | — | — | — | — | ✅ | — | — | ✅ |
| **Budget** | | | | | | | | | | |
| Lock budget | — | — | — | — | — | — | ✅ | — | — | — |
| Request BRR | — | — | — | ✅ | — | — | — | — | — | — |
| Override budget block | — | — | — | — | — | — | ✅ | — | — | — |

---

## 5.3 Segregation of Duties (SoD) — 4-Layer Cascade

Every approval/action request passes through 4 security layers:

```
Request
 │
 ├─ Layer 1: Permission Check ───── Does user have the required role?
 │   └─ Fail → 403 Forbidden
 │
 ├─ Layer 2: SoD Code Rules ─────── 8 hard-coded rules (see below)
 │   └─ Fail → 403 SoD Violation
 │
 ├─ Layer 3: State Machine ──────── Is current state valid for this action?
 │   └─ Fail → 409 Invalid State
 │
 └─ Layer 4: Object-Level ──────── Is user authorized for THIS specific record?
     │  (e.g., dept membership, vendor mapping, thread participation)
     └─ Fail → 403 Not Authorized for This Object
```

### 8 Hard-Coded SoD Rules

Implemented in `apps/approvals/sod.py` — these cannot be configured or overridden:

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | **No self-approval** | `actor.id != target.submitter.id` |
| 2 | **No double-approval** | `actor.id not in target.approval_history` |
| 3 | **No vendor-as-approver** | `actor.role != VENDOR` for approval actions |
| 4 | **No admin financial approval** | `actor.role != ADMIN` for money-flow transitions |
| 5 | **No filer-on-behalf as L1 validator** | If `target.filer_on_behalf == actor`, route to backup L1 |
| 6 | **No delegate already in chain** | If delegate previously approved this chain, auto-skip with audit note |
| 7 | **CFO cannot approve their own expense** | Even at Fin Head level |
| 8 | **Reviewer cannot review own audit findings** | Internal auditor cannot self-clear |

### Continuous SoD Scanner

Celery Beat runs hourly to detect violations that may have slipped through:
```
1. Scan all approvals in last hour
2. Re-evaluate all 8 SoD rules
3. If violation found:
   → Critical alert to CFO + Admin
   → Lock the affected record
   → Audit log: sod_violation_detected
```

---

## 5.4 PII Masking Middleware

### The Single Chokepoint

All data leaving 3SC's network bound for Claude API goes through `MaskingMiddleware`. No service may call Claude directly.

```
Any Service → MaskingMiddleware → Claude API
                                  ↓
                        Masked response
                                  ↓
              MaskingMiddleware (unmask) → Service
```

### Masking Strategy by Field Type

| Field Type | Strategy | Example |
|-----------|----------|---------|
| Vendor name | Tokenize | `Acme Logistics` → `vendor_token_a8f3` |
| GSTIN | Tokenize | `29ABCDE1234F1Z5` → `gstin_token_002` |
| PAN | Strip entirely | `ABCDE1234F` → not sent |
| Bank account | Strip entirely | `1234567890123` → not sent |
| Amount | Bucket | `₹2,47,500` → `amount_bucket_200k_300k` |
| Email | Tokenize | `rahul@3sc.in` → `user_token_004` |
| Description | Pass through | (strip names if present) |
| Internal notes | Strip entirely | Not sent |
| Date | Pass through | As-is |

### Token Roundtrip

```python
# Lifecycle of one masking operation:
1. Service calls mask.process(data)
2. MaskingMiddleware generates random tokens for each PII field
3. Stores token→value map in memory (NEVER persisted)
4. Sends masked payload to Claude
5. Claude response contains tokens
6. MaskingMiddleware replaces tokens with original values
7. Returns unmasked response to service
8. Token map discarded
```

### Graceful Degradation

If `CLAUDE_API_KEY` is not configured:
- OCR tasks → status=SKIPPED, user fills form manually
- Anomaly ML score → skipped, only rule-based checks run
- NL query → disabled in UI
- AI summaries → disabled in UI

---

## 5.5 Backup Approver Logic

When primary approver is unavailable:

| Scenario | Detection | Action |
|----------|-----------|--------|
| Approver deactivated | Admin deactivates user | System sweeps all PENDING_* assigned to user, reassigns to backup |
| Approver on leave | Delegate configured with date range | Auto-route to delegate, SoD check applied to delegate too |
| Delegate already in chain | SoD Rule #6 | Auto-skip step with audit note + downstream warning |
| No backup configured | System check | Alert Admin, step stays pending, escalation timer starts |

---

## 5.6 Object-Level Authorization

Beyond role permissions, these object-level checks apply:

| Action | Object-Level Check |
|--------|-------------------|
| Vendor submits bill | `user.vendor_id` must match vendor of the bill |
| L1 reviews bill | `user.id` must be in `VendorL1Mapping` for this vendor |
| HoD approves bill | `user.headed_departments` must include bill's department |
| Finance approves | User must have finance role (no dept restriction) |
| View bill timeline | User must be in the bill's thread (computed by ThreadComputer) |
| Download bill PDF | User must be in thread OR have audit role |

---

## 5.7 API Security

| Control | Implementation |
|---------|---------------|
| JWT validation | Every request via `JWTAuthentication` class |
| CORS | Whitelist frontend origins only |
| Rate limiting | `django-ratelimit`: 100 req/min per user, 5 login attempts per 15min |
| Input validation | Serializer validation + Zod on frontend |
| SQL injection | ORM-only queries (no raw SQL except NL query on read replica with safety validator) |
| XSS | DRF HTML escaping + React default escaping |
| CSRF | Cookie-based for Django admin; JWT endpoints exempt |
| File upload | Max 10MB, allowed: PDF/JPG/PNG/XLSX, virus scan (Phase 2) |
| Webhook auth | HMAC-SHA256 signature verification on D365 webhooks |
| Presigned URLs | 15-minute TTL for S3/MinIO file downloads |
| Audit logging | Every state change, auth event, file access — automatic, non-bypassable |
