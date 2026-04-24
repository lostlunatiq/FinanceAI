# FinanceAI — Comprehensive Code Review

**Date:** April 2026  
**Branch:** phase3  
**Reviewer:** Claude Code (automated multi-agent review)  
**Scope:** Full codebase — backend (Django/Python), frontend (React/JSX), architecture & configuration

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Critical Security Issues (P0)](#3-critical-security-issues-p0)
4. [High Priority Issues (P1)](#4-high-priority-issues-p1)
5. [Medium Priority Issues (P2)](#5-medium-priority-issues-p2)
6. [Frontend Code Quality](#6-frontend-code-quality)
7. [Backend Code Quality](#7-backend-code-quality)
8. [Configuration & DevOps](#8-configuration--devops)
9. [Genuine Strengths](#9-genuine-strengths)
10. [Recommended Action Plan](#10-recommended-action-plan)

---

## 1. Executive Summary

FinanceAI is a Django 5.2 ASGI monolith with a vanilla JS / JSX frontend serving a finance automation platform. The core domain logic is well-thought-out — approval workflows, anomaly detection, multi-persona dashboards, AI-powered NL query, and OCR invoice processing are all present and largely functional.

However, the codebase has **several critical security vulnerabilities** that must be addressed before any production deployment, alongside a significant gap between the aspirational architecture documented in `system_architecture.md` and the actual codebase.

**Issue count by priority:**

| Priority | Count | Description |
|----------|-------|-------------|
| P0 — Critical | 6 | Must fix before any production deployment |
| P1 — High | 12 | Fix within days |
| P2 — Medium | 18 | Fix within weeks |
| P3 — Low/Polish | 15+ | Fix over time |

---

## 2. Architecture Overview

### What exists (actual)
- Django 5.2 ASGI monolith (`uvicorn` + `gunicorn`)
- PostgreSQL 16 (analytics routed to ClickHouse)
- Redis for Celery broker + result backend + cache
- Celery workers with 4 queues: `ocr`, `anomaly`, `analytics`, `default`
- Frontend: static HTML pages + shared vanilla JS utilities + a separate React/Vite app (`finance-ai-platform`)
- Authentication: JWT (simplejwt) + Microsoft/Azure AD (allauth)
- AI: OpenRouter API (LLM), spaCy (NLP), scikit-learn + Prophet (forecasting), Presidio (PII masking)

### What the docs describe (aspirational)
The `system_architecture.md` and `architecture_diagrams.md` describe Kong/Envoy API gateway, Istio service mesh, RabbitMQ, TensorFlow Serving, MLflow, Feast, React+TypeScript SPA with Redux Toolkit, and multi-region Kubernetes. **None of this exists in the codebase.** These documents are aspirational and should not be used for capacity planning, security reviews, or onboarding.

---

## 3. Critical Security Issues (P0)

### P0-1: Path Traversal in Static File Servers — Remote File Read
**File:** `config/urls.py:33–51`

`serve_js()` and `serve_legacy_frontend()` accept user-controlled `<path:path>` values and pass them directly to `os.path.join()` without sanitisation. An attacker can fetch any file readable by the server process:

```
GET /js/../../../etc/passwd
GET /frontend/../../../config/settings/prod.py
```

**Fix:**
```python
import pathlib
root = pathlib.Path(settings.BASE_DIR, 'js').resolve()
full = (root / path).resolve()
if not str(full).startswith(str(root)):
    raise Http404()
```

---

### P0-2: `is_superuser` Writable via PATCH `/api/v1/auth/me/`
**File:** `apps/core/auth_views.py:57–61`, `apps/core/auth_serializers.py`

`UserProfileSerializer` does not list `is_superuser` in `read_only_fields`. Any authenticated user can elevate themselves to superuser:

```http
PATCH /api/v1/auth/me/
{"is_superuser": true}
```

**Fix:** Add `"is_superuser"`, `"employee_grade"`, and `"groups"` to `read_only_fields` in the serializer used by `MeView`.

---

### P0-3: `is_superuser` in `UserDetailView.allowed_fields` — Privilege Escalation
**File:** `apps/core/auth_views.py:125–134`

```python
allowed_fields = {
    "is_active", "first_name", "last_name", "email",
    "employee_grade", "department", "is_superuser",  # ← DANGER
    "groups",
}
```

Any Grade-4 user can PATCH another user to `is_superuser=true`. **Fix:** Remove `"is_superuser"` from `allowed_fields`.

---

### P0-4: Broken Celery Beat Tasks — SLA Enforcement Never Fires
**File:** `config/celery.py:19,24`

Two scheduled tasks reference non-existent functions:
```python
"task": "apps.invoices.tasks.expire_overdue_steps",    # does not exist
"task": "apps.invoices.tasks.rebuild_cashflow_forecast", # does not exist
```

These fail silently every scheduled tick. Approval SLAs are never enforced and cashflow forecast is never rebuilt. **Fix:** Implement these functions or remove the beat entries.

---

### P0-5: `log_approval_action` Celery Task Crashes on Every Invocation
**File:** `apps/core/tasks.py:13–14`, `apps/core/utils.py:26–27`

`log_approval_action` references `FunctionCallLog` which is never imported or defined anywhere. Every call raises `NameError` and retries 3 times before failing. This task is called from a `finally` block in `log_to_db()`, meaning every decorated service function fires a guaranteed-crashing Celery task. The `finally` block also suppresses actual exceptions via `except Exception: pass` — errors in decorated methods are silently discarded.

---

### P0-6: `ApprovalActionView` Has No Assignee Check — Anyone Can Approve
**File:** `apps/invoices/views.py:113–156`

`POST /api/v1/invoices/<id>/action/` only checks `IsAuthenticated`. Any authenticated user can approve, reject, or raise a query on any invoice — including approving their own submissions. Compare with `employee_views.py` which properly calls `can_user_take_step_action()`. **Fix:** Call `can_user_take_step_action()` before processing the action.

---

## 4. High Priority Issues (P1)

### P1-1: File Upload MIME Type Spoofing
**File:** `apps/core/file_views.py:31–41`

Allowed types are validated against the browser-supplied `Content-Type` header, which is fully attacker-controlled. An attacker sets `Content-Type: application/pdf` and uploads an executable or SVG with embedded JavaScript.

**Fix:** Use `python-magic` to read magic bytes from the file after write and validate the actual file type.

---

### P1-2: `OCRResultView` Exposes Any User's Task Results
**File:** `apps/invoices/vendor_views.py:295–329`

`GET /api/v1/invoices/vendor/bills/extract/<task_id>/` retrieves Celery results by raw task ID with no ownership check. Any authenticated user can poll another user's OCR job and read extracted invoice data.

**Fix:** Store the task ID in the `Expense` model, look up the associated record, verify ownership, then return the result.

---

### P1-3: Audit Log Exposed to All Authenticated Users
**File:** `apps/core/auth_views.py:167–207`

The audit log shows every action across the entire platform. A Grade-1 vendor user can read every state transition including amounts, approver identities, and reasons.

**Fix:** Add `HasMinimumGrade.make(3)` and scope results by user/entity ownership.

---

### P1-4: `D365_MOCK_MODE` Defaults to `True` in Base Settings
**File:** `config/settings/base.py:198`

```python
D365_MOCK_MODE = env.bool("D365_MOCK_MODE", default=True)
```

If `D365_MOCK_MODE` is not explicitly set to `False` in production, real payments will be simulated rather than executed. **Fix:** Default to `False`; require explicit opt-in for mock mode.

---

### P1-5: `SECURE_SSL_REDIRECT` Defaults to `False` in Production
**File:** `config/settings/prod.py:13`

```python
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
```

Without this env var set, all production traffic is plain HTTP — JWT tokens and financial data travel unencrypted. **Fix:** Change default to `True`. Also add `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD`.

---

### P1-6: Hardcoded Demo Credentials in Login UI
**File:** `js/Login.jsx:4–5, 174`

```js
const [username, setUsername] = React.useState('fin_admin');
const [password, setPassword] = React.useState('demo1234');
// ...
<span>Demo: fin_admin / demo1234 | vendor1 / demo1234</span>
```

Credentials are in source code (git history), pre-filled in the form, and rendered as visible text. **Fix:** Remove defaults and strip the hint text; manage demo credentials externally.

---

### P1-7: `useState` Inside `.map()` — Rules of Hooks Violation
**File:** `js/AIHub.jsx:373`

```js
{summaryMonths.map((s, i) => {
    const [hov, setHov] = React.useState(false);  // ← ILLEGAL
```

This will cause React to crash or produce unpredictable behavior as the hook call count varies between renders. **Fix:** Extract the summary month card into its own component.

---

### P1-8: XSS via `innerHTML` with API-Derived and localStorage Data
**Files:** `frontend/shared/status_poller.js:146–150`, `frontend/shared/layout.js:71–104`

Both files set `innerHTML` with data that originates from API responses or `localStorage`. A compromised backend or tampered localStorage can inject arbitrary HTML/script.

**Fix:** Use `createElement` + `textContent` instead of template-literal innerHTML for any user-controlled data.

---

### P1-9: JWT Tokens Stored in `localStorage` — XSS-Accessible
**Files:** `js/api.js:9–26`, `frontend/shared/api.js:105–107`

`localStorage` is readable by any JavaScript on the page. If any XSS vulnerability exists (and several do — see P1-8), tokens are immediately compromised.

**Fix:** Use `httpOnly` cookies for token storage. If `localStorage` must be kept, enforce strict CSP and dramatically shorten token lifetime.

---

### P1-10: Dual Token Systems — Incompatible Auth Keys
**Files:** `js/api.js` vs `frontend/shared/api.js`

Two completely separate token stores coexist in the same browser:
- Main SPA: `tj_access`, `tj_refresh`, `tj_authed`, `tj_role`, `tj_user`
- Shared pages: `financeai_access_token`, `financeai_refresh_token`, `financeai_user`

A user authenticated in the SPA appears unauthenticated to the `AUTH.requireAuth()` guard in shared pages and vice versa. **Fix:** Unify to a single auth module and key namespace.

---

### P1-11: `ExpenseSubmitView` Auto-Creates and Auto-Approves Vendors
**File:** `apps/invoices/views.py:30–39`

Any user can submit an expense with an arbitrary `vendor_name` string. The view silently creates the vendor and immediately sets `is_approved=True, status="ACTIVE"`, bypassing the entire vendor approval workflow.

---

### P1-12: Mock PO Match and Cash Flow Data Served as Real Data
**Files:** `apps/invoices/analytics_views.py:884–912`, `apps/invoices/budget_views.py:261`

PO matching data is deterministic fake data (`i % 3`, `i % 5`, `i % 7`). CFO cash flow uses a hardcoded `opening_balance = 2500000`. These are served as live data with no indicator they are mocked. **Fix:** Add a feature flag header or return a `"data_source": "mock"` field.

---

## 5. Medium Priority Issues (P2)

### P2-1: Race Condition in `ref_no` Generation
**File:** `apps/invoices/models.py:156–165`

`Expense.save()` generates `ref_no` by querying `MAX(ref_no)` and incrementing — not atomic. Two concurrent saves will produce duplicate reference numbers. **Fix:** Use a PostgreSQL sequence or wrap in `select_for_update()` within an `atomic()` block.

---

### P2-2: Password Validators Not Called in `ChangePasswordView`
**File:** `apps/core/auth_views.py:79–80`

`set_password(new_password)` is called without running `AUTH_PASSWORD_VALIDATORS`. `UserDetailView.patch()` only checks `len(new_pass) >= 6`. **Fix:** Call `validate_password(new_password, user)` before `set_password()`.

---

### P2-3: `ROTATE_REFRESH_TOKENS` Without Token Blacklisting
**File:** `config/settings/base.py:113`

`ROTATE_REFRESH_TOKENS = True` is set but `BLACKLIST_AFTER_ROTATION = True` and the `token_blacklist` app are not configured. Old refresh tokens remain valid after rotation. **Fix:** Add `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS` and set `BLACKLIST_AFTER_ROTATION = True`.

---

### P2-4: N+1 Queries in Vendor Serializer and Analytics Views
**Files:** `apps/invoices/vendor_serializers.py:72–86`, `apps/invoices/analytics_views.py:162–202, 728–741, 756–796`

- `VendorDetailSerializer.get_total_invoices/spend/pending`: 3 queries per vendor on list views
- `VendorRiskScoreView`: ignores `prefetch_related`, issues 4 queries per vendor in a loop
- `SupplierScorecardView`: 4 per-vendor queries inside a 20-vendor loop
- `PolicyComplianceView._check_policy`: 1 COUNT query per expense (up to 200)

**Fix:** Use `annotate()` with aggregates in the queryset; use prefetched data.

---

### P2-5: `Budget.spent_amount` Property — DB Hit on Every Access
**File:** `apps/invoices/models.py:303–316`

`spent_amount` fires a `SUM` query every time it's accessed. `BudgetListView` calls it 3× per budget. **Fix:** `annotate(spent_amount=Subquery(...))` in the queryset.

---

### P2-6: Widespread Silent Exception Swallowing
Multiple critical paths catch broad exceptions and do nothing:

- `apps/invoices/views.py:69` — if `create_initial_approval_step` fails, invoice is stuck forever
- `apps/invoices/views.py:79` — OCR task ID not saved but no error surfaced
- `apps/invoices/vendor_views.py:219` — same pattern
- `apps/invoices/employee_views.py:459` — anomaly scan failures swallowed
- `apps/invoices/services.py:323` — re-routing transition failure discarded; API claims success

**Fix:** Log at minimum; surface errors to the caller with appropriate HTTP status codes.

---

### P2-7: `NLQueryView` Returns HTTP 200 for Server Errors
**File:** `apps/core/auth_views.py:227–231`

```python
except Exception as e:
    return Response({"error": str(e)}, status=status.HTTP_200_OK)
```

**Fix:** Use `HTTP_500_INTERNAL_SERVER_ERROR` and avoid leaking `str(e)` to clients.

---

### P2-8: Bulk Approve/Reject and Dashboard Approve/Reject Are Non-Functional
**Files:** `js/APHub.jsx:221–222`, `js/Dashboard.jsx:174–177`

These buttons render and appear clickable but have no `onClick` handlers. Users will assume the action was performed. **Fix:** Wire to API calls or remove the buttons.

---

### P2-9: Policy CRUD Has No API Persistence
**File:** `js/FinanceAutomation.jsx:477`

`handleCreatePolicy` uses a `setTimeout` and only modifies local React state. Policies disappear on page refresh. Same for delete and toggle.

---

### P2-10: No Error Boundaries in React App
There are zero `React.ErrorBoundary` components. Any unhandled render error unmounts the entire application. **Fix:** Wrap at least the main content area.

---

### P2-11: `fiscal_year` Defaults to Hardcoded `2026`
**File:** `apps/invoices/models.py:281`

```python
fiscal_year = models.IntegerField(default=2026)
```

**Fix:** `default=lambda: datetime.date.today().year`.

---

### P2-12: ML Model `.pkl` Files Loaded Without Integrity Checks
**Config:** `CATEGORY_MODEL_PATH`, `ANOMALY_MODEL_PATH`, `PROPHET_MODEL_PATH`

Pickle files are executable Python. A tampered model file can execute arbitrary code on load. **Fix:** Store and verify a SHA256 checksum before loading; consider ONNX format.

---

### P2-13: No `.gitignore` File
There is no `.gitignore` at the repository root. `.env` files, `db.sqlite3`, `__pycache__`, ML `.pkl` models, and media uploads are all at risk of being committed. **Fix:** Add a comprehensive `.gitignore` immediately.

---

### P2-14: Redis Has No Authentication and No Persistence
The Redis container in `docker-compose.yml` has no `requirepass`. Anyone on the host network can read/write the Celery task queue. No RDB/AOF persistence — a Redis restart loses all queued tasks.

---

### P2-15: `fmt` / `fmtAmt` Currency Formatter Duplicated in 5+ Files
The currency formatting function is defined identically (or with slight variations) in `Dashboard.jsx`, `APHub.jsx`, `FinanceAutomation.jsx`, `AR.jsx`, and `PersonaDashboards.jsx`. The `fmt` global from `FinanceAutomation.jsx` and `AR.jsx` collide in the `window` namespace. **Fix:** Extract to a shared utility module.

---

### P2-16: Random Fallback Chart Data Causes Visual Flicker
**File:** `js/Dashboard.jsx:117–119`

```js
if (projected.length === 0) {
    for(let i=0; i<6; i++) projected.push(Math.random() * 5 + 2);
}
```

Random values regenerate on every parent re-render, causing chart jitter. **Fix:** Use `useMemo` or static fallback data.

---

### P2-17: Hardcoded Personas and Static AI Insights
**File:** `js/PersonaDashboards.jsx:49, 107, 178, 289, 402`

Every persona dashboard uses hardcoded user names (`"AP Clerk · Priya Mehta"`) and static AI insight text that always references the same invoice number (`TS-INV-056`) regardless of actual queue state.

---

### P2-18: `CONN_MAX_AGE = 0` Disables Connection Pooling
**File:** `config/settings/base.py:88`

Every request opens and closes a new DB connection. **Fix:** Set `CONN_MAX_AGE = 60` or deploy PgBouncer.

---

## 6. Frontend Code Quality

### Functional Gaps (Demo vs Production)
Several areas are UI-only with no backend integration:

| Feature | Status |
|---------|--------|
| AR (Accounts Receivable) | Entirely static mock data; "Record Payment" does nothing |
| Persona Dashboard actions | "Submit for Approval", "Confirm Payment" close modals without API calls |
| Anomaly "Explain in Copilot" | Button with no `onClick` |
| "View All" link in Dashboard | `cursor: pointer` but no handler |
| Badge counts | Fetched once at mount, never refreshed |

### Code Quality Patterns
- **`alert()` used for errors**: 6+ files use `alert()` for error reporting — blocks JS thread and can't be styled. Use the existing `actionError` state pattern or toasts.
- **Index keys on dynamic lists**: Many `.map()` calls use `key={i}` on reorderable data. Use stable IDs.
- **Missing `useCallback`/`useMemo` everywhere**: Zero memoization across the entire React codebase causes full re-renders on any state change, particularly visible in SVG chart components.
- **No ARIA attributes**: No `aria-label`, `role`, `aria-expanded`, focus trapping in modals, or keyboard navigation support anywhere.
- **Hardcoded email addresses**: `finance@acmecorp.in`, `cfo@acmecorp.in` hardcoded in `AIHub.jsx:409`.
- **Hardcoded date tooltip**: Dashboard always shows "May 2026: ₹5.2Cr projected" regardless of actual data.

---

## 7. Backend Code Quality

### File Handle Leak
**File:** `config/urls.py:29, 39, 51`

`open(file_path, 'rb')` called without a `with` block inside `FileResponse` constructors. File handles leak on any exception path.

### `_run_nl_query` — 200-Line Function in Views File
**File:** `apps/core/auth_views.py:234–417`

Business logic (context gathering, prompt construction, LLM calling, fallback rules) lives inside a view file with in-function imports. This belongs in a service module.

### `BudgetListView.post` — No Input Validation
**File:** `apps/invoices/budget_views.py:62–89`

Budget creation reads `request.data["name"]` directly with no serializer validation. A missing key raises `KeyError` which is caught by a bare `except Exception` that leaks the exception string in the response.

### `UserListView` — No Pagination on `User.objects.all()`
**File:** `apps/core/auth_views.py:97–113`

Raw `APIView` bypasses DRF global pagination settings. Returns all users in a single response.

### Inconsistent Error Envelope
Errors are returned as `{"error": "..."}`, `{"detail": "..."}`, `{"message": "..."}`, or raw `serializer.errors` — no consistent shape for API consumers to rely on.

### Fabricated UTR Numbers Sent to Vendors
**File:** `apps/invoices/employee_views.py:561`

```python
d365_payment_utr = f"UTR-{expense.ref_no}"
```

This fake UTR is sent to vendors and would appear in financial records as if it came from a real bank transaction.

---

## 8. Configuration & DevOps

### Docker Issues

| Issue | Risk |
|-------|------|
| PostgreSQL (5432) and Redis (6379) ports bound to `0.0.0.0` | Anyone on host network can access DB and cache |
| Redis has no `requirepass` | Arbitrary Celery task injection |
| `Dockerfile` has no `USER` directive — runs as root | Container compromise = root access |
| Dockerfile `CMD` includes `--reload` | CPU overhead + file watching in production |
| `entrypoint.sh` seeds demo data on every container start | Demo accounts (`vendor1/demo1234`) created in production |
| Source code volume-mounted into all containers | Container compromise exposes host filesystem |

### Missing Production Configurations

| Gap | Severity |
|-----|----------|
| No `.gitignore` | Critical |
| `SECURE_SSL_REDIRECT` defaults to `False` | High |
| No HSTS headers | High |
| Redis unauthenticated, no persistence | High |
| `D365_MOCK_MODE` defaults to `True` | High |
| Dockerfile runs as root | High |
| MD5 password hasher in `dev.py` | Medium |
| `CELERY_RESULT_EXPIRES` not set | Medium |
| `CONN_MAX_AGE = 0` | Medium |
| No CI/CD pipeline configuration | Medium |
| No health check endpoints | Medium |
| No database backup strategy | High |
| ClickHouse not in docker-compose | Medium |
| JWT access token lifetime = 8 hours | Medium |

### Dev vs Production Divergence
- Dev uses SQLite; production uses PostgreSQL — bugs that only manifest in PostgreSQL (constraint enforcement, transaction isolation, JSON queries) won't be caught in dev.
- ClickHouse is referenced in settings and `config/routers.py` but is not a service in `docker-compose.yml`.

---

## 9. Genuine Strengths

- **`django-environ` usage**: Secrets are env-var driven with no hardcoded defaults for critical values (`SECRET_KEY`, `OPENROUTER_API_KEY`).
- **Argon2 password hasher in production**: Current best practice.
- **Celery configuration**: `CELERY_TASK_ACKS_LATE = True` and `CELERY_WORKER_PREFETCH_MULTIPLIER = 1` are correct for financial workloads.
- **Queue routing**: Explicit separation of `ocr`, `anomaly`, `analytics`, `default` queues is well-designed.
- **`uv` with hash-pinned lockfile**: Excellent reproducibility and supply chain security.
- **DRF configuration**: JWT auth, `IsAuthenticated` as the default permission class, per-view throttle with tighter limits on AI endpoints.
- **Presidio PII masking**: Evidence that AI data privacy was considered.
- **`drf_spectacular` OpenAPI integration**: `SERVE_INCLUDE_SCHEMA: False` in production is correct.
- **`HasMinimumGrade` permission class**: Clean, composable approach to grade-based access control.
- **Approval workflow state machine**: Well-modelled domain logic with SoD violation detection.
- **Azure AD social auth**: Appropriate choice for an enterprise finance application.
- **Persona-based UX**: Four distinct dashboards (AP Clerk, Finance Manager, Finance Admin, Employee) tailored to real job roles.
- **AI-powered features**: NL query, OCR pipeline, anomaly detection, cash flow forecasting — the ambition is real and the integrations are in place.

---

## 10. Recommended Action Plan

### Immediate (before any external demo or shared access)
1. Fix path traversal in `serve_js()` and `serve_legacy_frontend()` (`config/urls.py`)
2. Remove `is_superuser` from `UserProfileSerializer` writable fields and `UserDetailView.allowed_fields`
3. Add assignee check to `ApprovalActionView`
4. Fix or stub `expire_overdue_steps` and `rebuild_cashflow_forecast` in beat schedule
5. Fix `log_approval_action` task (`FunctionCallLog` undefined)
6. Remove hardcoded credentials from `js/Login.jsx`
7. Add a comprehensive `.gitignore`

### Before Production Deployment
8. Implement MIME-type magic-byte validation on file uploads
9. Add ownership check to `OCRResultView`
10. Set `SECURE_SSL_REDIRECT = True` by default; add HSTS headers
11. Set `D365_MOCK_MODE` to default `False`
12. Configure Redis `requirepass` and enable RDB persistence
13. Add non-root `USER` to Dockerfile; remove `--reload` from CMD
14. Guard `seed_demo` from production environments
15. Unify the two frontend token systems to a single auth module
16. Add `rest_framework_simplejwt.token_blacklist` and `BLACKLIST_AFTER_ROTATION = True`
17. Fix `CONN_MAX_AGE` and move to PgBouncer or set to 60
18. Call `validate_password()` in `ChangePasswordView`

### Quality Improvements (ongoing)
19. Extract `_run_nl_query` to a service module
20. Replace N+1 queries with annotated querysets
21. Add `React.ErrorBoundary` wrappers
22. Extract shared currency formatter utility
23. Replace `alert()` with inline error state or toasts
24. Wire up non-functional buttons (Bulk Approve/Reject, Dashboard queue actions)
25. Implement real API persistence for Policy CRUD
26. Replace fabricated UTR numbers with real payment gateway responses
27. Add PostgreSQL to dev `docker-compose.yml` (remove SQLite in dev)
28. Set `fiscal_year` default to dynamic current year
