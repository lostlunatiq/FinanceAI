# FinanceAI — Developer Security Policy

This document is enforced for every contributor and AI agent working in this repo.
**These rules are non-negotiable and must never be bypassed.**

---

## 1. Authentication & Authorisation (OWASP A01, A03)

Every API view MUST declare explicit `permission_classes`. Never rely on the DRF default.

| Endpoint type | Minimum permission class |
|---|---|
| Vendor self-service | `IsAuthenticated` + object-level `CanViewExpense` |
| Finance approval actions | `IsAuthenticated` + `IsInternalUser` + `CanActOnExpenseStep` |
| Vendor admin (list/create/update) | `IsAuthenticated` + `IsFinanceOrAdmin` |
| Vendor activation/blacklist | `IsAuthenticated` + `IsFinanceAdmin` |
| Budget create/update | `IsAuthenticated` + `IsFinanceOrAdmin` |
| Cash flow forecast | `IsAuthenticated` + `IsFinanceOrAdmin` |
| File download | `IsAuthenticated` + `CanDownloadFile` (object-level) |

**No `IsAuthenticated`-only views for finance data.** If you add a new view, add both a
role-level and an object-level permission check before merging.

### Privilege Escalation Prevention

- A vendor MUST NOT be able to access another vendor's expenses, files, or profile.
- A vendor MUST NOT be able to call finance approval endpoints.
- A user MUST NOT approve/reject/query an expense unless `ExpenseApprovalStep` assigns them to the **current PENDING step** for that expense.
- A user MUST NOT act as approver on an expense they submitted (SoD — enforced in `services.transition_expense`).

---

## 2. Input Validation (OWASP A03)

- All monetary fields must be validated as positive `Decimal` before storage.
- `warning_threshold` must be less than `critical_threshold`; both must be 1–100.
- Search query parameters must be capped at 100 characters to prevent ReDoS.
- Rejection reasons and anomaly override reasons require ≥ 10 non-whitespace characters.
- Never call `Decimal(user_input)` without a `try/except InvalidOperation`.

---

## 3. Passwords (OWASP A02, A07)

- **Never accept plain-text passwords in API request bodies for account creation.**
  Use `secrets.token_urlsafe()` to generate passwords server-side and deliver via
  a secure channel (email link). See `VendorCreateView` for the reference pattern.
- The `portal_password` field in the old `VendorCreateView` is **removed**. Do not re-add it.
- Minimum password length: 12 characters. Use `django.contrib.auth` validators.

---

## 4. Sensitive Data Exposure (OWASP A02)

- Never log request bodies that may contain financial data. Django's default `DEBUG=True`
  logs are acceptable only in local dev (`.env` has `DEBUG=True`; production env must set `DEBUG=False`).
- `AuditLog.masked_after` must store masked data only — no PII, no raw bank details.
- Vendor bank account numbers in API responses must be masked: show last 4 digits only.
- File paths stored in `FileRef.path` must never be returned in API responses (return only the `id`).

---

## 5. Injection (OWASP A03)

- Always use the Django ORM. Raw SQL via `cursor.execute()` is forbidden unless reviewed
  by a senior engineer and sanitised with parameterised queries.
- Search filters must use ORM `icontains`, never string interpolation in queries.

---

## 6. Security Misconfiguration (OWASP A05)

- `DEBUG=True` is only acceptable in `.env` for local development. Production `.env` must
  set `DEBUG=False` and a strong random `SECRET_KEY`.
- `CORS_ALLOW_ALL_ORIGINS=True` is only in `dev.py`. Production settings must whitelist
  specific origins.
- `D365_MOCK_MODE=True` is the default for dev. Set `D365_MOCK_MODE=False` in production
  to enable real D365 payment integration.
- `ALLOWED_HOSTS` must be explicitly set in production — never `["*"]`.

---

## 7. Rate Limiting (OWASP A04)

DRF throttling is configured in `base.py`:
- `user`: 200 requests/hour
- `nl_query`: 100 requests/hour

**Do not disable throttling except in `dev.py`.** Do not remove throttle classes from
production settings.

---

## 8. CSRF

- All state-changing API endpoints use JWT (stateless). CSRF tokens are not required for
  JSON API calls, but `CSRF_TRUSTED_ORIGINS` must be correctly set for any browser-based
  form submissions to the admin panel.

---

## 9. Approval Workflow Integrity

The expense state machine lives in `apps/invoices/services.py::transition_expense`.
**Never bypass it by calling `expense._force_status()` or `expense.save()` directly
outside this function.** All state changes must be logged in `AuditLog`.

When an expense is submitted (`SUBMITTED`):
1. `create_approval_steps()` is called automatically.
2. The expense immediately advances to `PENDING_L1`.
3. The L1 approver is resolved via `VendorL1Mapping` or role-based fallback.

When a step is approved:
1. `create_next_step()` creates the next step so the next approver sees it in their queue.
2. The expense status advances via `STEP_TO_STATUS`.

---

## 10. Dependency Security

- Run `pip-audit` before any production deployment.
- Never pin dependencies to versions with known CVEs.
- Dependencies are listed in `requirements.txt`; `pyproject.toml` is the source of truth
  for dev dependencies.

---

## Running the App Locally

```bash
bash start_dev.sh         # Windows: run in Git Bash
# OR manually:
PYTHONIOENCODING=utf-8 USE_SQLITE=true DJANGO_SETTINGS_MODULE=config.settings.dev \
  .venv/Scripts/python manage.py runserver 0.0.0.0:8000
```

Demo credentials (all passwords: `demo1234`):
- `vendor1` — Vendor portal
- `employee1` — AP Hub (submitter / L1 approver queue)
- `l1_approver` — L1 approval queue
- `hod` — Dept Head queue
- `fin_manager` — Finance Manager queue
- `fin_admin` — Finance Admin queue
- `cfo` — CFO Command Center
