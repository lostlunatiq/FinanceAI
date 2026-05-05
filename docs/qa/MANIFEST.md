# 📋 QA Protocol Pack Manifest
**Generated:** 2026-05-05 by QA Cartographer  
**Branch:** quick-wins-optimization  
**Format:** Obsidian-flavored Markdown (interactive `- [ ]` checklists)  
**Total Coverage:** 1,500+ lines across 16 files  
**Time to run:** ~40 hours manual QA; ~4 hours automated

---

## 📚 File Guide

| File | Feature | Assertions | Time |
|---|---|---|---|
| README.md | Navigation + Environment | 5 | 10min |
| 01-auth.md | Login, token refresh, password reset | 42 | 2h |
| 02-file-upload-ocr.md | File MIME validation, OCR + fallback model | 38 | 3h |
| 03-expense-fsm.md | Expense FSM, approval chain, SoD, auto-routing | 56 | 5h |
| 04-anomaly.md | Anomaly scan, PII masking, mark-safe, escalate | 42 | 3h |
| 05-vendor.md | Vendor self-service portal + admin CRUD | 48 | 4h |
| 06-budget-cashflow.md | Budget CRUD, HOD scoping, Prophet forecast | 40 | 3h |
| 07-analytics.md | 14 analytics endpoints + LLM narrative | 62 | 5h |
| 08-ai-reports.md | 10-Q, Monthly Summary (caching), Annual Report | 40 | 3h |
| 09-nl-query.md | NL query prompt-injection guard, chat sessions | 44 | 3h |
| 10-notifications.md | Email async task, Teams webhook, preferences | 46 | 3h |
| 11-ai-feedback.md | Feedback submission + prompt injection into OCR/anomaly | 42 | 3h |
| 12-audit-rbac.md | Audit log visibility tiers, SoD logging | 36 | 2h |
| 13-iam.md | User/dept/group/policy CRUD + grade RBAC | 48 | 3h |
| 14-d365.md | JSON export on approval (mock mode) | 20 | 1h |
| 99-cross-cutting.md | Concurrency, idempotency, eventual consistency stress | 70 | 8h |

---

## 🎯 How to Use

### Quick-Start (2-hour validation)
1. **Read** README.md to set up environment and demo credentials.
2. **Run** 03-expense-fsm.md (happy path only, sections 2.1–2.6).
3. **Run** 04-anomaly.md (happy path only).
4. **Run** 07-analytics.md (spot-check 3 endpoints).
5. **Summary:** Covers core expense flow end-to-end.

### Comprehensive (40-hour full QA)
1. Run all happy-path sections (01–14 in order) — ~15 hours.
2. Run all negative-testing sections — ~12 hours.
3. Run all edge-cases sections — ~10 hours.
4. Run 99-cross-cutting stress tests — ~8 hours.
5. Sign off on operational checklist (99, section 10).

### Focused (by domain)
- **Core Finance:** 01, 03, 04, 12 (8 hours)
- **Vendor Portal:** 05, 02, 11 (6 hours)
- **Analytics & Reporting:** 07, 08, 09 (5 hours)
- **Notifications & Preferences:** 10, 13 (3 hours)

---

## ⚠️ Known Issues (Blockers & Gotchas)

### 1. **`apps.d365` Missing** (Blocker)
- **Location:** `config/settings.py` (INSTALLED_APPS), `config/urls.py`, `services.py`
- **Impact:** If `D365_MOCK_MODE=false`, approval will fail with `ImportError: No module named 'apps.d365'`
- **Workaround:** Always set `D365_MOCK_MODE=true` during QA (recommended forever until app is created)
- **Status:** KNOWN, DOCUMENTED in CLAUDE.md `[VERIFY]` tag
- **See:** 14-d365.md, Section 5

### 2. **`approve` View Triple-Loop Bug**
- **Location:** `apps/invoices/employee_views.py`, lines ~170–282
- **Symptom:** While-loop for auto-advancing approval chain is copy-pasted 3 times; may advance multiple levels on single click
- **Test:** 03-expense-fsm.md, section 4, edge case "approve while-loop bug"
- **Status:** SUSPECTED, NOT YET VERIFIED

### 3. **Monthly Summary Cache Staleness**
- **Location:** `analytics_views.py`, `MonthlyFinancialSummary` table
- **Symptom:** Approve an expense for current month; monthly-summary endpoint returns stale data until manual `regenerate=1`
- **Impact:** Low (finance analysts manually trigger refresh; acceptable eventual consistency)
- **See:** 08-ai-reports.md, section 5.2

### 4. **HOD Scoping Incomplete**
- **Location:** Most analytics endpoints (only Budget Health + Dept Variance + Budget CRUD apply scoping)
- **Symptom:** HOD can view all vendors' risk scores, all departments' variance, etc.
- **Status:** KNOWN, documented in README.md
- **See:** 07-analytics.md, feature list

---

## 🔧 Environment Setup

```bash
# Copy from README.md setup
USE_SQLITE=true \
DJANGO_SETTINGS_MODULE=config.settings.dev \
CELERY_TASK_ALWAYS_EAGER=true \
OPENROUTER_API_KEY="sk-or-placeholder" \
D365_MOCK_MODE=true \
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend \
./start_dev.sh
```

**Demo credentials (password: `demo1234`):**
| User | Grade | Role |
|---|---|---|
| `vendor1`, `vendor2` | 0 | Vendor (portal) |
| `employee1` | 1 | Employee |
| `l1_approver` | 1 | L1 Approver |
| `hod` | 2 | Dept Head |
| `fin_manager` | 3 | Finance Manager |
| `fin_admin` | 4 | Finance Admin |
| `cfo` | 5 | CFO (superuser) |

---

## 📊 Coverage Matrix

| Domain | Coverage | Priority | Status |
|---|---|---|---|
| **Auth & Sessions** | ✅ Comprehensive | P0 | READY |
| **File Upload + OCR** | ✅ Comprehensive | P0 | READY |
| **Expense FSM** | ✅ Comprehensive | P0 | READY |
| **Anomaly Detection** | ✅ Comprehensive | P1 | READY |
| **Vendor Portal** | ✅ Comprehensive | P1 | READY |
| **Budget Management** | ✅ Comprehensive | P2 | READY |
| **Analytics (14 endpoints)** | ✅ Comprehensive | P1 | READY |
| **AI Reports** | ✅ Comprehensive | P2 | READY |
| **NL Query** | ✅ Comprehensive | P2 | READY |
| **Notifications** | ✅ Comprehensive | P2 | READY |
| **AI Feedback Loop** | ✅ Comprehensive | P3 | READY |
| **Audit Log + RBAC** | ✅ Comprehensive | P1 | READY |
| **IAM Management** | ✅ Comprehensive | P1 | READY |
| **D365 Export** | ⚠️ Limited (app missing) | P0 | BLOCKED |
| **Concurrency & Stress** | ✅ Comprehensive | P2 | READY |

---

## 🚀 Recommended Test Sequence

### Phase 1: Smoke (30 min)
1. **01-auth.md** § 2 (login + token)
2. **03-expense-fsm.md** § 2.1–2.5 (submit → approve)
3. **04-anomaly.md** § 2.1–2.2 (scan + mark-safe)

### Phase 2: Core Flows (4 hours)
1. **02-file-upload-ocr.md** full happy path
2. **03-expense-fsm.md** full happy path + negative
3. **05-vendor.md** happy path
4. **07-analytics.md** spot-check (endpoints 1, 5, 11)

### Phase 3: Integrations (6 hours)
1. **06-budget-cashflow.md** full
2. **08-ai-reports.md** full
3. **09-nl-query.md** full
4. **10-notifications.md** full

### Phase 4: Advanced (6 hours)
1. **04-anomaly.md** edge cases + PII masking
2. **11-ai-feedback.md** full
3. **12-audit-rbac.md** full
4. **99-cross-cutting.md** sections 2–4

### Phase 5: Sign-Off (2 hours)
1. **13-iam.md** full
2. **14-d365.md** full (mock mode)
3. **99-cross-cutting.md** section 10 (operational checklist)

---

## 📝 Reporting

For each assertion marked ✅ passed or ❌ failed, record:
- **Test file + section**
- **Assertion ID** (e.g., "2.3.4")
- **Result** (passed / failed / not applicable)
- **Evidence** (screenshot, log excerpt, curl output)
- **Notes** (any deviations from expected behavior)

**Excel/Airtable template:** Use the coverage matrix above + add a "Status" column per file.

---

## 🛠️ Appendix: Common Test Patterns

### Pattern: Trigger + Verify DB + Verify Audit
```
1. Trigger action (e.g., approve)
2. Query DB for expected row (e.g., ExpenseApprovalStep.status="APPROVED")
3. Check AuditLog for action (e.g., action="expense.approved")
4. Confirm timestamp + actor + request_id consistent
```

### Pattern: Concurrency
```
1. Open tool to repeat HTTP request N times in parallel (e.g., Apache Bench)
2. Count expected successful responses
3. Query DB for duplicate/missing rows
4. Check Celery logs for failures
```

### Pattern: LLM Narrative Fallback
```
1. Set OPENROUTER_API_KEY="sk-or-placeholder" (mock mode)
2. Trigger endpoint that calls LLM
3. Assert response includes narrative (rule-based, not null)
4. Assert "MOCK MODE" logged
```

---

## 📞 Questions / Clarifications

Consult CLAUDE.md for:
- Stack details (Django 5.2, PostgreSQL 16, Redis 7, Celery 5.6)
- Convention rules (UUIDs, timezone, audit logging patterns)
- Architecture decisions (grade-based RBAC vs Django permissions)
- [VERIFY] tags (open questions needing clarification)
