#!/usr/bin/env bash
#
# setup-github.sh
# ----------------
# Bulk-resets and populates a GitHub repo for the 3SC FinanceAI project.
#
# Scope of population:
#   - Foundation (Auth, RBAC, Audit, Infra)
#   - Expense Management (Module 1.2 of FRD)
#   - Purchase Invoice Intake + Vendor Management (Module 1.1 + Module 5)
#   - Stub milestones for later features (Sales Invoice, Budget, AR/AP, AI, Compliance, D365)
#
# Prereqs:
#   - gh CLI installed and authenticated (`gh auth status`)
#   - Run from inside the target git repo, OR set REPO="owner/name" env var
#   - jq installed
#
# Usage:
#   chmod +x setup-github.sh
#   ./setup-github.sh                  # uses current repo
#   REPO=owner/name ./setup-github.sh  # explicit repo
#
# WARNING: This is destructive. It will:
#   - Close ALL existing open issues
#   - Delete ALL existing labels
#   - Delete ALL existing milestones
#

set -euo pipefail

# ---------- Config ----------
REPO_FLAG=""
if [[ -n "${REPO:-}" ]]; then
  REPO_FLAG="--repo $REPO"
  echo "Using repo: $REPO"
else
  echo "Using current directory's repo (gh will auto-detect)"
fi

confirm() {
  read -r -p "This will WIPE all issues, labels, and milestones. Type 'yes' to continue: " ans
  if [[ "$ans" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
}
confirm

# ---------- 1. Close all existing issues ----------
echo ""
echo "==> Closing all open issues..."
# shellcheck disable=SC2086
gh issue list $REPO_FLAG --state open --limit 1000 --json number -q '.[].number' |
  while read -r num; do
    [[ -z "$num" ]] && continue
    echo "  closing #$num"
    gh issue close $REPO_FLAG "$num" --reason "not planned" >/dev/null || true
  done

# ---------- 2. Delete all labels ----------
echo ""
echo "==> Deleting all existing labels..."
# shellcheck disable=SC2086
gh label list $REPO_FLAG --limit 500 --json name -q '.[].name' |
  while read -r name; do
    [[ -z "$name" ]] && continue
    echo "  deleting label: $name"
    gh label delete $REPO_FLAG "$name" --yes >/dev/null || true
  done

# ---------- 3. Delete all milestones ----------
echo ""
echo "==> Deleting all existing milestones..."
# Milestones must go via the REST API
# shellcheck disable=SC2086
gh api "repos/{owner}/{repo}/milestones?state=all&per_page=100" --jq '.[].number' |
  while read -r num; do
    [[ -z "$num" ]] && continue
    echo "  deleting milestone #$num"
    gh api -X DELETE "repos/{owner}/{repo}/milestones/$num" >/dev/null || true
  done

# ---------- 4. Create labels ----------
echo ""
echo "==> Creating labels..."

create_label() {
  local name="$1"
  local color="$2"
  local desc="$3"
  # shellcheck disable=SC2086
  gh label create $REPO_FLAG "$name" --color "$color" --description "$desc" --force >/dev/null
  echo "  + $name"
}

# type:* — what kind of work
create_label "type:feature" "0E8A16" "New feature or capability"
create_label "type:chore" "C2E0C6" "Maintenance, setup, refactor"
create_label "type:bug" "D73A4A" "Something is broken"
create_label "type:spike" "FBCA04" "Research / time-boxed investigation"
create_label "type:docs" "0075CA" "Documentation"
create_label "type:test" "BFD4F2" "Tests / QA work"

# area:* — which part of the system
create_label "area:auth" "1D76DB" "Authentication, SSO, JWT"
create_label "area:rbac" "1D76DB" "Roles & permissions"
create_label "area:audit" "1D76DB" "Audit trail / immutable logs"
create_label "area:expenses" "5319E7" "Expense management module"
create_label "area:invoices-purchase" "5319E7" "Vendor / purchase invoice module"
create_label "area:invoices-sales" "5319E7" "Sales invoice module"
create_label "area:vendors" "5319E7" "Vendor master & onboarding"
create_label "area:budget" "5319E7" "Budget management"
create_label "area:ar-ap" "5319E7" "Accounts receivable / payable"
create_label "area:ai" "8E24AA" "AI / ML features"
create_label "area:d365" "B60205" "Dynamics 365 BC integration"
create_label "area:reports" "006B75" "Reporting & analytics"
create_label "area:compliance" "B60205" "GST / TDS / MSME compliance"
create_label "area:workflow" "5319E7" "Approval workflows & SLA"
create_label "area:infra" "BFDADC" "DevOps, CI/CD, deployment"
create_label "area:backend" "C5DEF5" "Django backend"
create_label "area:frontend" "C5DEF5" "React frontend"
create_label "area:db" "C5DEF5" "Database schema / migrations"
create_label "area:api" "C5DEF5" "API design / endpoints"

# priority:*
create_label "priority:p0" "B60205" "Must-have for current milestone"
create_label "priority:p1" "D93F0B" "Should-have"
create_label "priority:p2" "FBCA04" "Nice-to-have"

# size:* — rough effort
create_label "size:xs" "C2E0C6" "< 2 hours"
create_label "size:s" "C2E0C6" "< 1 day"
create_label "size:m" "FEF2C0" "1-3 days"
create_label "size:l" "F9D0C4" "3-5 days"
create_label "size:xl" "E99695" "1-2 weeks"

# status:*
create_label "status:blocked" "000000" "Blocked by another issue"
create_label "status:needs-spec" "EDEDED" "Needs more detail before starting"
create_label "status:ready" "0E8A16" "Ready to be picked up"

# ---------- 5. Create milestones ----------
echo ""
echo "==> Creating milestones..."

create_milestone() {
  local title="$1"
  local desc="$2"
  local due="$3" # ISO 8601 or empty
  local payload
  if [[ -n "$due" ]]; then
    payload=$(jq -n --arg t "$title" --arg d "$desc" --arg due "$due" \
      '{title: $t, description: $d, due_on: $due, state: "open"}')
  else
    payload=$(jq -n --arg t "$title" --arg d "$desc" \
      '{title: $t, description: $d, state: "open"}')
  fi
  echo "$payload" | gh api -X POST "repos/{owner}/{repo}/milestones" --input - >/dev/null
  echo "  + $title"
}

create_milestone "M1 — Foundation" \
  "Project skeleton, Django + React scaffolding, Postgres, Auth (JWT + Azure AD SSO), RBAC, Audit logging, CI/CD, base infra. Everything that other modules depend on." \
  "2026-05-05T23:59:59Z"

create_milestone "M2 — Expense Management" \
  "Full employee expense submission lifecycle: receipt upload, category limits by grade, approval workflow, GST ITC flagging, reimbursement tracking. (FRD Module 1.2 — without OCR/AI which lands in M6.)" \
  "2026-05-26T23:59:59Z"

create_milestone "M3 — Vendor Management" \
  "Vendor master, KYC fields, GSTIN/PAN validation, MSME tracking, bank account change control, vendor performance metrics. Foundation for purchase invoice intake. (FRD Module 5.)" \
  "2026-06-09T23:59:59Z"

create_milestone "M4 — Purchase Invoice Intake" \
  "Vendor self-service portal, invoice submission with validation, 3-way match (PO/GRN/Invoice), approval workflow, status lifecycle. (FRD Module 1.1 — D365 write-back lands in M9.)" \
  "2026-06-30T23:59:59Z"

# Stub milestones for later phases
create_milestone "M5 — Sales Invoice & AR" \
  "STUB. Sales invoice creation across 4 service lines (SaaS/AAAS/Transport/Warehouse), branded templates, dunning, AR aging, payment reconciliation. (FRD Module 2 + 6.1.)" \
  ""

create_milestone "M6 — Budget Management" \
  "STUB. Real-time budget consumption checks at invoice booking, threshold alerts (70/85/100%), Budget Reallocation Requests. (FRD Module 3.)" \
  ""

create_milestone "M7 — AP & Cash Flow" \
  "STUB. AP aging, DPO tracking, MSME compliance alerts, payment runs, combined cash flow projection. (FRD Module 6.2 + 6.3.)" \
  ""

create_milestone "M8 — AI Intelligence Layer" \
  "STUB. Receipt OCR, invoice anomaly detection, NL query engine, cash flow forecasting (Prophet), masking middleware. (FRD Module 8.)" \
  ""

create_milestone "M9 — D365 Integration" \
  "STUB. Bidirectional D365 BC sync: vendor/customer master, purchase invoice creation, sales invoice posting, budget sync, payment webhooks. (FRD Section 12.)" \
  ""

create_milestone "M10 — Compliance & Reporting" \
  "STUB. GSTR-1/2A data prep, TDS challan generation, Form 26AS reconciliation, MSME compliance reports, all financial reports from Module 7. (FRD Module 7 + 10.)" \
  ""

# ---------- 6. Helper to create issues ----------
echo ""
echo "==> Creating issues..."

create_issue() {
  local title="$1"
  local milestone="$2"
  local labels="$3"
  local body="$4"
  # shellcheck disable=SC2086
  gh issue create $REPO_FLAG \
    --title "$title" \
    --milestone "$milestone" \
    --label "$labels" \
    --body "$body" >/dev/null
  echo "  + $title"
}

# =====================================================================
# MILESTONE 1 — FOUNDATION
# =====================================================================

create_issue \
  "[infra] Initialize monorepo structure (backend + frontend)" \
  "M1 — Foundation" \
  "type:chore,area:infra,priority:p0,size:s,status:ready" \
  "## Goal
Set up a clean monorepo with separate backend and frontend trees so engineering can work in parallel.

## Scope
- Create top-level structure: \`/backend\`, \`/frontend\`, \`/docs\`, \`/scripts\`
- Add root \`README.md\` with project overview, links to FRD, and dev quickstart
- Add root \`.gitignore\` (Python, Node, IDE, OS files)
- Add \`.editorconfig\` for consistent formatting
- Add \`LICENSE\` placeholder (internal — confirm with CFO)
- Add \`CODEOWNERS\` file

## Acceptance Criteria
- [ ] Folder structure committed
- [ ] README explains how to run backend and frontend locally
- [ ] .gitignore covers \`.venv\`, \`node_modules\`, \`.env\`, \`*.pyc\`, \`.DS_Store\`, \`.idea\`, \`.vscode\`
- [ ] CODEOWNERS routes backend to backend team, frontend to frontend team

## Out of Scope
- Actual Django/React scaffolding (separate issues)"

create_issue \
  "[backend] Scaffold Django 5 + DRF project" \
  "M1 — Foundation" \
  "type:chore,area:backend,area:infra,priority:p0,size:m,status:ready" \
  "## Goal
Bootstrap the Django backend with a sane, production-ready layout.

## Scope
- Django 5.x project named \`financeai\`
- Django REST Framework installed and configured
- Settings split: \`base.py\`, \`development.py\`, \`production.py\`, \`test.py\`
- Environment variables via \`django-environ\` (no secrets in code)
- Postgres as the default database (no SQLite in dev either — match prod)
- \`pyproject.toml\` or \`requirements/\` folder with pinned versions
- Basic apps created (empty for now): \`core\`, \`auth_app\`, \`rbac\`, \`audit\`
- \`/api/v1/health\` endpoint returning 200 OK with version info
- Logging configured (JSON format, INFO default)

## Acceptance Criteria
- [ ] \`python manage.py runserver\` works
- [ ] \`python manage.py migrate\` succeeds against Postgres
- [ ] Hitting \`/api/v1/health\` returns \`{\"status\": \"ok\", \"version\": \"...\"}\`
- [ ] No secrets in any committed file
- [ ] \`pytest\` runs and passes (even if zero tests yet)

## References
FRD Section 12 (D365 integration assumes Django + Postgres backend)"

create_issue \
  "[frontend] Scaffold React 18 + Vite + TypeScript app" \
  "M1 — Foundation" \
  "type:chore,area:frontend,area:infra,priority:p0,size:m,status:ready" \
  "## Goal
Bootstrap the React frontend.

## Scope
- React 18 + Vite + TypeScript
- Folder layout: \`src/pages\`, \`src/components\`, \`src/api\`, \`src/hooks\`, \`src/lib\`, \`src/types\`
- Tailwind CSS configured
- React Router v6 set up with placeholder routes (\`/login\`, \`/dashboard\`, \`/expenses\`, \`/invoices\`)
- TanStack Query (react-query) for server state
- Axios client with interceptor placeholder for JWT
- ESLint + Prettier configured
- Environment variables via \`.env\` (only \`VITE_\` prefixed)

## Acceptance Criteria
- [ ] \`npm run dev\` boots the app
- [ ] \`npm run build\` produces a clean production build
- [ ] \`npm run lint\` passes
- [ ] Health-check page calls backend \`/api/v1/health\` and shows the result"

create_issue \
  "[infra] Docker + docker-compose for local dev" \
  "M1 — Foundation" \
  "type:chore,area:infra,priority:p0,size:m,status:ready" \
  "## Goal
One-command local environment for backend, frontend, Postgres, and Redis.

## Scope
- \`Dockerfile\` for backend (multi-stage, non-root user)
- \`Dockerfile\` for frontend (build + nginx serve)
- \`docker-compose.yml\` with services: \`backend\`, \`frontend\`, \`postgres\`, \`redis\`
- Volume mounts for hot-reload in dev
- \`.env.example\` documenting every required env var
- \`make up\` / \`make down\` / \`make logs\` shortcuts (or npm scripts)

## Acceptance Criteria
- [ ] \`docker compose up\` brings up all services
- [ ] Backend can reach Postgres and Redis
- [ ] Frontend can reach backend via configured proxy
- [ ] README documents the workflow"

create_issue \
  "[infra] GitHub Actions CI pipeline" \
  "M1 — Foundation" \
  "type:chore,area:infra,priority:p0,size:m,status:ready" \
  "## Goal
Every PR runs lint, tests, and build before merge.

## Scope
- \`.github/workflows/backend-ci.yml\`: install deps, lint (ruff/black), run pytest with Postgres service container
- \`.github/workflows/frontend-ci.yml\`: install deps, lint, type-check, build
- Path filters so backend changes don't run frontend CI and vice versa
- Branch protection on \`main\` requiring CI green (document in README; actual setting is manual)
- Cache pip and npm dependencies

## Acceptance Criteria
- [ ] Both workflows green on a sample PR
- [ ] CI completes in under 5 minutes for an empty change"

create_issue \
  "[db] Initial database schema design + ERD" \
  "M1 — Foundation" \
  "type:spike,area:db,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Design the core data model before writing migrations. Output is a doc + ERD, not code.

## Scope
Tables to design (foundation only — module-specific tables come later):
- \`users\` — id, email, azure_ad_oid, full_name, employee_id, grade, department_id, manager_id, is_active, created_at
- \`roles\` — id, name, description
- \`permissions\` — id, codename, description
- \`role_permissions\` — many-to-many
- \`user_roles\` — many-to-many with optional scope (department/cost-centre)
- \`departments\` — id, name, code, parent_id, head_user_id
- \`cost_centres\` — id, name, code, department_id
- \`audit_log\` — id, user_id, timestamp, action, entity_type, entity_id, before_state JSONB, after_state JSONB, ip_address

## Deliverable
- ERD diagram in \`/docs/erd.png\` (dbdiagram.io or drawio)
- \`/docs/data-model.md\` explaining each table and its purpose
- Note any decisions deferred (e.g., partitioning audit_log)

## Acceptance Criteria
- [ ] ERD reviewed and approved by tech lead before migration issues are picked up"

create_issue \
  "[auth] Implement JWT authentication with SimpleJWT" \
  "M1 — Foundation" \
  "type:feature,area:auth,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Local username/password JWT auth as a fallback and for service accounts. Azure AD SSO is the primary path (separate issue).

## Scope
- Install \`djangorestframework-simplejwt\`
- Custom user model with email as username
- Endpoints:
  - \`POST /api/v1/auth/login\` → returns access + refresh token
  - \`POST /api/v1/auth/refresh\` → rotates tokens
  - \`POST /api/v1/auth/logout\` → blacklists refresh token
  - \`GET  /api/v1/auth/me\` → current user profile
- Access token TTL: 15 min. Refresh token TTL: 7 days. Refresh rotation enabled.
- Refresh token blacklist enabled
- Password hashing: Django default (PBKDF2)

## Acceptance Criteria
- [ ] All endpoints documented in OpenAPI schema
- [ ] Tests cover: successful login, wrong password, expired token, refresh, logout
- [ ] Logged-out refresh tokens cannot be reused

## Security Notes
- Tokens never logged
- Login failures rate-limited (separate infra issue)"

create_issue \
  "[auth] Azure AD SSO integration (OAuth 2.0 / OIDC)" \
  "M1 — Foundation" \
  "type:feature,area:auth,area:backend,priority:p0,size:l,status:ready" \
  "## Goal
Primary login path. Employees sign in with their 3SC Microsoft account; the portal provisions a local user record on first login.

## Scope
- Use \`msal\` Python library or \`django-allauth\` with Microsoft provider
- Azure AD app registration (document required redirect URIs in \`/docs/azure-ad-setup.md\`)
- OIDC flow: authorization code with PKCE
- On first login: create local user, populate name/email/employee_id from token claims, assign default role
- Endpoint: \`GET /api/v1/auth/sso/login\` → redirects to Microsoft
- Endpoint: \`GET /api/v1/auth/sso/callback\` → handles code exchange, issues local JWT
- Frontend: \"Sign in with Microsoft\" button on login page
- Group claims from Azure AD mapped to local roles (config in settings)

## Acceptance Criteria
- [ ] Existing Azure AD user can sign in end-to-end
- [ ] Local user record auto-created on first login
- [ ] User attributes (name, email, employee ID) populated from claims
- [ ] Logout clears both local session and tells frontend to clear tokens

## Dependencies
- Requires JWT auth issue merged first (we still issue local JWTs after SSO completes)

## References
FRD: Azure AD listed in 3.2.1 as source of employee identity"

create_issue \
  "[rbac] Role-Based Access Control framework" \
  "M1 — Foundation" \
  "type:feature,area:rbac,area:backend,priority:p0,size:l,status:ready" \
  "## Goal
Permission system that all other modules will build on. Must support both global roles and scoped roles (e.g. \"Dept Head of Engineering\").

## Scope
### Roles to seed
- \`finance_admin\` — full system access
- \`cfo\` — full read; approval rights for high-value transactions
- \`finance_manager\` — finance operations; mid-tier approvals
- \`dept_head\` — scoped to one or more departments; first-level approvals
- \`employee\` — submit expenses, view own data
- \`vendor\` — external; access vendor self-service portal only (M3)
- \`auditor\` — read-only access to audit logs and reports

### Permission codenames (initial)
- \`expense.submit\`, \`expense.approve\`, \`expense.view_own\`, \`expense.view_all\`
- \`invoice.purchase.submit\`, \`invoice.purchase.approve\`, \`invoice.purchase.view_all\`
- \`vendor.create\`, \`vendor.approve\`, \`vendor.view\`
- \`audit.view\`, \`report.view\`, \`user.manage\`, \`role.manage\`

### DRF integration
- Custom permission class \`HasPermission('codename')\`
- Custom permission class \`HasScopedPermission('codename', scope='department')\` for dept-scoped checks
- Decorator for use in viewsets

### Management
- Endpoints to list roles, list permissions, assign role to user (admin only)
- Seed script: \`python manage.py seed_rbac\`

## Acceptance Criteria
- [ ] Seeded roles and permissions present after migrations + seed
- [ ] Permission classes work in DRF viewsets (covered by tests)
- [ ] Scoped permissions work — a Dept Head of Engineering cannot approve a Marketing expense
- [ ] Admin can assign/revoke roles via API

## References
FRD Section 11 (Approval Matrix) — RBAC must support all approver tiers"

create_issue \
  "[audit] Immutable audit logging service" \
  "M1 — Foundation" \
  "type:feature,area:audit,area:backend,priority:p0,size:l,status:ready" \
  "## Goal
Every financial action must be logged immutably. This is a hard compliance requirement (FRD 10.3) and many later modules depend on it.

## Scope
- \`audit_log\` table (designed in DB schema issue)
- Service: \`audit.log(user, action, entity, before=None, after=None)\`
- Django signal hooks for any model inheriting from \`AuditedModel\` base class
- Captures: user_id, timestamp (UTC), action, entity_type, entity_id, before_state (JSONB), after_state (JSONB), ip_address, user_agent
- IP and user agent pulled from request via thread-local middleware
- DB-level constraint: no UPDATE or DELETE on \`audit_log\` (revoke via Postgres role; document in migration)
- Read-only API: \`GET /api/v1/audit?entity=invoice&entity_id=123\` (requires \`audit.view\` permission)

## Acceptance Criteria
- [ ] Creating, updating, deleting an \`AuditedModel\` instance produces a log entry
- [ ] Log entries cannot be modified or deleted by any application user
- [ ] Audit entries include before/after JSON diff
- [ ] API supports filtering by user, entity, date range
- [ ] Tests cover the immutability constraint

## Out of Scope
- Tamper-evident PDF export (M10)
- AI-powered audit queries (M8)

## References
FRD Section 10.3 (Audit Trail), FRD Section 14.1 (Fraud risk register relies on audit trail)"

create_issue \
  "[backend] Segregation of Duties (SoD) enforcement framework" \
  "M1 — Foundation" \
  "type:feature,area:rbac,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
A creator of a transaction must never be its approver. A Finance approver must never be the payment releaser. This must be enforced at the system level, not by policy.

## Scope
- Generic \`SoDPolicy\` checker that takes (transaction, action, user) and rejects if user is in a forbidden role for that transaction
- Rules to seed:
  - User who created an expense cannot approve it
  - User who approved an invoice cannot trigger its payment
  - User who created a vendor cannot approve the vendor
- Hook into approval workflow code so violations raise \`SoDViolation\` (HTTP 403) with a clear error message
- All SoD violations logged to audit_log

## Acceptance Criteria
- [ ] Tests cover each seeded rule
- [ ] Violations return a clear, user-friendly error (\"You cannot approve a transaction you created\")
- [ ] Violation attempts appear in audit_log

## References
FRD Section 10.3, FRD Section 14.1"

create_issue \
  "[frontend] Login page + auth state management" \
  "M1 — Foundation" \
  "type:feature,area:frontend,area:auth,priority:p0,size:m,status:ready" \
  "## Goal
Users can log in via Microsoft SSO (primary) or username/password (fallback) and the app maintains an authenticated session.

## Scope
- \`/login\` page with \"Sign in with Microsoft\" button (primary) and email/password form (secondary, behind a \"More options\" toggle)
- Auth state in a Zustand or React Context store (no localStorage for refresh tokens — use httpOnly cookie if possible, else memory)
- Axios interceptor: attach access token to every API call, refresh on 401
- Protected route wrapper that redirects to /login if not authenticated
- \`/me\` displays the logged-in user's name, role, and a Logout button

## Acceptance Criteria
- [ ] Successful SSO login lands on \`/dashboard\`
- [ ] Expired access token transparently refreshes
- [ ] Logout clears state and redirects to \`/login\`
- [ ] Visiting a protected route while logged out redirects to login"

create_issue \
  "[frontend] App shell — sidebar, topbar, role-aware navigation" \
  "M1 — Foundation" \
  "type:feature,area:frontend,priority:p0,size:m,status:ready" \
  "## Goal
A consistent app shell that all module pages render inside. Navigation hides items the user has no permission for.

## Scope
- Sidebar with sections: Dashboard, Expenses, Invoices, Vendors, Reports, Settings
- Topbar with user avatar, role badge, logout
- Each nav item is gated by a permission codename — items without permission are hidden (not just disabled)
- Mobile responsive (collapsible sidebar)
- Loading skeletons for protected route transitions

## Acceptance Criteria
- [ ] An \`employee\` only sees Dashboard and Expenses
- [ ] A \`finance_manager\` sees everything except Settings
- [ ] A \`finance_admin\` sees everything
- [ ] Layout works on mobile (down to 375px wide)"

create_issue \
  "[backend] OpenAPI / Swagger schema generation" \
  "M1 — Foundation" \
  "type:chore,area:backend,area:api,priority:p1,size:s,status:ready" \
  "## Goal
Auto-generated, always-current API documentation that the frontend team can rely on.

## Scope
- \`drf-spectacular\` installed
- Schema endpoint: \`GET /api/v1/schema/\`
- Swagger UI: \`GET /api/v1/docs/\`
- ReDoc: \`GET /api/v1/redoc/\`
- All existing endpoints have docstrings and request/response serializers

## Acceptance Criteria
- [ ] Swagger UI loads and shows all auth, audit, RBAC endpoints
- [ ] Schema is valid OpenAPI 3.0 (validated in CI)"

create_issue \
  "[infra] Structured logging and error tracking setup" \
  "M1 — Foundation" \
  "type:chore,area:infra,area:backend,priority:p1,size:s,status:ready" \
  "## Goal
JSON-structured logs with request IDs, plus error tracking ready to plug into Sentry.

## Scope
- JSON log formatter
- Middleware that generates a request ID (UUID) and adds it to every log line for that request
- Sentry SDK installed but disabled unless \`SENTRY_DSN\` env var is set
- PII scrubbing — never log full request bodies, only metadata

## Acceptance Criteria
- [ ] Logs are valid JSON
- [ ] Same request ID appears across all log lines for one request
- [ ] No request bodies in logs"

# =====================================================================
# MILESTONE 2 — EXPENSE MANAGEMENT
# =====================================================================

create_issue \
  "[db] Expense management data model + migrations" \
  "M2 — Expense Management" \
  "type:feature,area:expenses,area:db,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Database tables for the full expense lifecycle.

## Scope
### Tables
- \`expense_categories\` — id, name, code, requires_project_code (bool), itc_eligible_default
- \`expense_grade_limits\` — id, category_id, grade (L1..L10+), limit_amount, period (per_day/per_event/per_month/single)
- \`projects\` — id, code, name, client_name, is_active (used for project code dropdown)
- \`expenses\` — id, employee_id, expense_date, category_id, amount, gst_amount, currency, vendor_name, business_purpose, project_id (nullable), receipt_file_id, status, submitted_at, created_at
- \`expense_approvals\` — id, expense_id, approver_id, level, status, decision_at, comments
- \`expense_status\` enum: draft, submitted, pending_l1, pending_l2, approved, rejected, reimbursed
- \`expense_travel_details\` — id, expense_id, from_city, to_city, mode (linked when category=Travel)
- \`expense_attachments\` — id, expense_id, file_id, uploaded_at

### Migrations
- All tables AuditedModel-enabled
- Seed expense_categories with FRD list
- Seed grade limits from FRD Section 3.2.3

## Acceptance Criteria
- [ ] Migrations run cleanly
- [ ] Seeded categories and limits visible via Django admin
- [ ] Foreign keys protected with on_delete=PROTECT where appropriate

## References
FRD Section 3.2 (Employee Expense Submission), 3.2.3 (Per-Category Limits)"

create_issue \
  "[backend] File upload service for receipts" \
  "M2 — Expense Management" \
  "type:feature,area:expenses,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Secure file upload for receipts and invoices, used by both expenses (M2) and purchase invoices (M4).

## Scope
- Endpoint: \`POST /api/v1/files\` (multipart) → returns \`{file_id, url, mime_type, size}\`
- Storage backend: configurable — local filesystem in dev, S3-compatible in prod
- Validation: PDF, JPG, PNG only; max 10 MB
- Virus scan hook (no-op in dev, ClamAV-ready interface)
- Files are not publicly accessible — served via authenticated proxy endpoint
- File metadata in \`uploaded_files\` table: id, uploader_id, original_name, mime_type, size, storage_key, sha256, created_at
- Deduplication: same sha256 + same uploader returns the existing file_id

## Acceptance Criteria
- [ ] Upload works for PDF and image
- [ ] Files > 10 MB rejected
- [ ] Wrong mime type rejected
- [ ] Direct URL access without auth fails

## References
FRD 3.2.1 (Receipt upload), FRD 3.1.1 (Vendor invoice upload)"

create_issue \
  "[backend] Expense submission API" \
  "M2 — Expense Management" \
  "type:feature,area:expenses,area:backend,area:api,priority:p0,size:l,status:ready" \
  "## Goal
Employees can create, edit (while draft), and submit expense claims via API.

## Scope
### Endpoints
- \`POST /api/v1/expenses\` — create as draft
- \`PATCH /api/v1/expenses/{id}\` — edit (only while draft, only own expense)
- \`POST /api/v1/expenses/{id}/submit\` — submit for approval, runs validation
- \`GET /api/v1/expenses\` — list own expenses (employee), or all (finance roles)
- \`GET /api/v1/expenses/{id}\` — detail
- \`DELETE /api/v1/expenses/{id}\` — only while draft

### Validation on submit
- All mandatory fields present (FRD 3.2.1)
- Receipt attached
- Business purpose ≥ 20 characters
- Expense date not more than 30 days in past (configurable)
- Amount within grade limit for category (else reject with limit shown to user)
- Project code present if category requires it
- Travel sub-form populated if category = Travel
- Policy acknowledgement checkbox set

### On submit
- Status → \`submitted\`
- Approver assigned per approval matrix
- Audit log entry written
- Approval workflow triggered (separate issue)

## Acceptance Criteria
- [ ] All endpoints permission-gated
- [ ] Tests cover happy path + each validation rule
- [ ] Submission triggers approval workflow (mocked is fine until approval issue lands)

## References
FRD Section 3.2.1, 3.2.3"

create_issue \
  "[backend] Approval workflow engine (generic)" \
  "M2 — Expense Management" \
  "type:feature,area:workflow,area:backend,priority:p0,size:xl,status:ready" \
  "## Goal
A reusable approval engine that drives expense approvals (M2), purchase invoice approvals (M4), and later sales invoice / vendor / budget approvals.

## Scope
### Concepts
- \`WorkflowDefinition\` — named, versioned, attached to a model (e.g. \"expense_approval_v1\")
- \`WorkflowStep\` — order, approver_resolver (callable that returns user(s) given the transaction), threshold conditions, SLA hours, escalation_target_resolver
- \`WorkflowInstance\` — links a transaction to its definition, tracks current step
- \`WorkflowAction\` — log of approve/reject/escalate actions

### Approval matrix (FRD 3.1.3 / 11.2)
- < ₹10,000 → Dept Manager (24h SLA)
- ₹10K – ₹1L → Dept Manager + Finance Manager (48h)
- ₹1L – ₹10L → Finance Manager + CFO (72h)
- > ₹10L → CFO + CEO (96h)
- Anomaly-flagged → Finance Manager + CFO mandatory (M8)

### SLA / escalation
- Background task (Celery beat — separate infra issue) checks pending approvals every 15 min
- On SLA breach: notify configured escalation target, mark instance as escalated
- Status visible on approval dashboard

### Endpoints
- \`POST /api/v1/approvals/{id}/approve\` — current approver only
- \`POST /api/v1/approvals/{id}/reject\` — requires reason
- \`GET /api/v1/approvals/pending\` — current user's pending approvals
- \`GET /api/v1/approvals/{id}\` — instance detail with full action history

### Delegation
- User profile has optional \`delegate_to\` user. When delegator is on leave (\`is_on_leave=true\`), approvals route to delegate.
- Cannot mark on-leave without setting a delegate (system-enforced)

## Acceptance Criteria
- [ ] Engine works for expense approvals end-to-end
- [ ] SLA breach correctly escalates
- [ ] Delegation works
- [ ] SoD enforcement integrated (creator cannot approve)
- [ ] Audit log entry for every approval action
- [ ] Tests cover each FRD threshold band

## References
FRD Section 11 (Approval Workflows), 3.1.3, 3.2.1"

create_issue \
  "[backend] Celery + Redis for async tasks and scheduled jobs" \
  "M2 — Expense Management" \
  "type:chore,area:infra,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Background task infrastructure for SLA escalations, dunning, scheduled reports, and later AI/OCR jobs.

## Scope
- Celery worker container in docker-compose
- Celery beat container for scheduled jobs
- Redis as broker and result backend
- Sample task: \`tasks.health.ping\` to verify
- Logging integrated with structured logs
- Retry policy defaults: 3 retries with exponential backoff

## Acceptance Criteria
- [ ] Worker and beat run in docker-compose
- [ ] Test task can be enqueued from Django shell and executes
- [ ] Failed tasks logged with traceback"

create_issue \
  "[backend] Notification service (email + in-app)" \
  "M2 — Expense Management" \
  "type:feature,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Single service for sending emails and creating in-app notifications. Used by approvals, dunning, alerts, etc.

## Scope
- Email backend: SMTP in dev, AWS SES or similar in prod (configurable)
- HTML email templates (Django templates) with branding
- In-app notification table: \`notifications(id, user_id, type, title, body, link, read_at, created_at)\`
- API: \`GET /api/v1/notifications\`, \`POST /api/v1/notifications/{id}/mark_read\`
- Service interface: \`notify.send(user, template, context, channels=['email','in_app'])\`
- Template registry with: \`expense.submitted\`, \`expense.approved\`, \`expense.rejected\`, \`approval.pending\`, \`approval.sla_breach\`

## Acceptance Criteria
- [ ] Email rendering tested with snapshot tests
- [ ] In-app notifications appear via WebSocket OR via polling (polling is fine for v1)
- [ ] Failed email send is logged but does not block the originating request"

create_issue \
  "[frontend] Expense submission form" \
  "M2 — Expense Management" \
  "type:feature,area:frontend,area:expenses,priority:p0,size:l,status:ready" \
  "## Goal
The form an employee uses to submit an expense claim. Mobile-friendly because employees often submit from their phones.

## Scope
- Page: \`/expenses/new\`
- Fields per FRD 3.2.1 (mandatory + conditional)
- Receipt upload with drag-drop and image preview
- Category dropdown loads from API
- Per-grade limit shown next to amount field — turns red if exceeded
- Travel sub-form appears only when category = Travel
- Project code dropdown appears only when category requires it
- Save Draft and Submit buttons
- Client-side validation matches server-side rules

## Acceptance Criteria
- [ ] Form validates and submits successfully
- [ ] Out-of-policy amount blocks submit and shows the limit
- [ ] Works on mobile (375px wide)
- [ ] Saved draft can be reopened and edited"

create_issue \
  "[frontend] Expense list + detail views" \
  "M2 — Expense Management" \
  "type:feature,area:frontend,area:expenses,priority:p0,size:m,status:ready" \
  "## Goal
Employees see their own expense history. Finance roles see all expenses with filters.

## Scope
- Page: \`/expenses\`
- Table columns: Date, Category, Vendor, Amount, Status, Approver, Submitted At
- Filters: status, date range, category, employee (finance roles only)
- Status badges with colour coding
- Click row → detail page \`/expenses/{id}\`
- Detail page shows all fields, receipt preview, approval history, audit trail (if user has \`audit.view\`)

## Acceptance Criteria
- [ ] Pagination works
- [ ] Filters update URL query params
- [ ] Detail page renders receipt PDF and image previews"

create_issue \
  "[frontend] Approval inbox" \
  "M2 — Expense Management" \
  "type:feature,area:frontend,area:workflow,priority:p0,size:m,status:ready" \
  "## Goal
A central place for approvers to see and act on pending approvals.

## Scope
- Page: \`/approvals\`
- Tabs: Pending Me, Pending Team (for managers), Completed
- Each row shows: type (expense/invoice), amount, submitter, age, SLA remaining (colour-coded green/amber/red)
- Inline Approve and Reject buttons; Reject requires a reason modal
- Bulk approve for low-value items (≤ ₹10K)
- Real-time SLA countdown

## Acceptance Criteria
- [ ] Approver can approve/reject from the inbox
- [ ] SLA colour matches FRD 11.3 (>50% green, <25% amber, breached red)
- [ ] Bulk approve works
- [ ] Empty state when nothing to approve"

create_issue \
  "[backend] Reimbursement batch generation" \
  "M2 — Expense Management" \
  "type:feature,area:expenses,area:backend,priority:p1,size:m,status:ready" \
  "## Goal
Finance Manager can group approved expenses into a reimbursement batch and mark it paid.

## Scope
- Model: \`ReimbursementBatch(id, created_by, employee_id, status, total_amount, payment_date, utr_number)\`
- Endpoint: \`POST /api/v1/reimbursements/batches\` — body: list of expense_ids, validates all are approved + same employee
- Endpoint: \`POST /api/v1/reimbursements/batches/{id}/mark_paid\` — captures UTR, sets payment date, transitions linked expenses to \`reimbursed\`
- Endpoint: \`GET /api/v1/reimbursements/batches\` with filters

## Acceptance Criteria
- [ ] Cannot include unapproved expenses in a batch
- [ ] Marking paid updates all linked expenses
- [ ] Audit log entry created"

create_issue \
  "[backend] GST ITC eligibility flagging on expenses" \
  "M2 — Expense Management" \
  "type:feature,area:expenses,area:compliance,priority:p1,size:s,status:ready" \
  "## Goal
Each expense gets a green/yellow/red flag for ITC eligibility, even before AI is wired up.

## Scope
- Add \`itc_status\` enum field to \`expenses\`: eligible, not_eligible, requires_review
- Rule-based logic for now:
  - Vendor GSTIN present + category marked itc_eligible_default → eligible
  - No GSTIN or category not eligible (e.g. Meals, personal SaaS) → not_eligible
  - Mixed signals → requires_review
- Visible on expense detail and list views
- Reviewable by Finance Manager (can override with reason — logged)

## Acceptance Criteria
- [ ] Flag set on submission
- [ ] Override endpoint requires reason and audit-logs the change

## References
FRD 3.2.2 (GST ITC Flag), 8.1 (full AI version comes later)"

create_issue \
  "[test] Expense module end-to-end test suite" \
  "M2 — Expense Management" \
  "type:test,area:expenses,area:backend,priority:p1,size:m,status:ready" \
  "## Goal
Lock in expense module behaviour with E2E tests before moving to next module.

## Scope
- pytest + pytest-django
- Fixtures for users at each grade, departments, categories with limits
- Scenarios:
  - Employee submits, manager approves, finance manager approves, batch reimbursement, status flows correctly
  - Out-of-policy submission rejected client-side and server-side
  - SoD: creator cannot approve own expense
  - Delegation: delegate sees pending approvals when delegator on leave
  - SLA escalation: simulated time advance triggers escalation notification
  - Audit log entries present for each state change

## Acceptance Criteria
- [ ] All scenarios pass
- [ ] Coverage ≥ 80% on \`expenses\` and \`workflow\` apps"

# =====================================================================
# MILESTONE 3 — VENDOR MANAGEMENT
# =====================================================================

create_issue \
  "[db] Vendor master data model + migrations" \
  "M3 — Vendor Management" \
  "type:feature,area:vendors,area:db,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Tables for vendor master, vendor users, vendor performance metrics, bank account history.

## Scope
### Tables
- \`vendors\` — id, legal_name, trade_name, gstin, pan, msme_number, msme_category, vendor_type, gst_registration_type, payment_terms, status (pending/approved/blocked), category, credit_limit, created_by, created_at
- \`vendor_bank_accounts\` — id, vendor_id, account_number_encrypted, bank_name, ifsc, account_holder_name, is_active, effective_from, effective_to (history table — never overwrite)
- \`vendor_tds_categories\` — id, vendor_id, section (194C/194J/194I/194Q), rate, threshold_amount
- \`vendor_contracts\` — id, vendor_id, file_id, signed_date, expiry_date, payment_terms_override
- \`vendor_users\` — id, vendor_id, email, name, phone (people from the vendor side who can log in)
- \`vendor_change_requests\` — id, vendor_id, field, old_value, new_value, requested_by, status, hold_until, approved_by

## Acceptance Criteria
- [ ] Migrations clean
- [ ] Bank account number column encrypted (Fernet or pgcrypto)
- [ ] All vendor tables AuditedModel-enabled

## References
FRD Section 7.1, 7.3"

create_issue \
  "[backend] Vendor onboarding API + KYC validation" \
  "M3 — Vendor Management" \
  "type:feature,area:vendors,area:backend,area:api,priority:p0,size:l,status:ready" \
  "## Goal
Finance Admin can onboard a new vendor with all required KYC fields. New vendors start as \`pending\` and need approval before they can submit invoices.

## Scope
### Endpoints
- \`POST /api/v1/vendors\` — create as pending
- \`PATCH /api/v1/vendors/{id}\` — edit (pending only)
- \`POST /api/v1/vendors/{id}/submit_for_approval\` — locks for review
- \`POST /api/v1/vendors/{id}/approve\` — Finance Manager + CFO per matrix
- \`POST /api/v1/vendors/{id}/reject\` — with reason
- \`GET /api/v1/vendors\` with filters (status, category, search)

### Validation
- All FRD 7.1 mandatory fields
- GSTIN format validation (regex + checksum)
- PAN format validation (regex)
- IFSC format validation
- MSME number validation if MSME = true
- Contract file required

### GSTIN live validation
- Stub interface for now: \`gstin_validator.validate(gstin) → {valid: bool, legal_name: str, status: str}\`
- Real GST portal integration in M10
- For now: deterministic stub that flags \`27AAAPL1234C1ZV\` as valid for testing

### Approval flow
- Routes through generic approval workflow engine (built in M2)

## Acceptance Criteria
- [ ] Cannot create a vendor with malformed GSTIN/PAN/IFSC
- [ ] Pending vendors cannot submit invoices (enforced in M4)
- [ ] Approval flow uses workflow engine
- [ ] Audit logged

## References
FRD Section 7.1"

create_issue \
  "[backend] Vendor bank account change control (48-hour hold)" \
  "M3 — Vendor Management" \
  "type:feature,area:vendors,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Implement the high-risk control from FRD 7.3 — bank account changes require a 48-hour hold and CFO approval.

## Scope
- \`POST /api/v1/vendors/{id}/bank_account/change_request\` — creates a \`vendor_change_request\`
- System sends email to the vendor's registered contact (the person currently in vendor master)
- 48-hour hold timer starts; CFO is notified immediately
- During hold: any \`POST /api/v1/payments\` for this vendor is blocked
- After hold + CFO approval: \`POST /api/v1/vendors/{id}/bank_account/approve\` activates the new account, deactivates the old one (history preserved)
- Any user can also reject the change

## Acceptance Criteria
- [ ] Payments to vendor blocked during hold (test with mocked payment endpoint)
- [ ] CFO is the only role that can approve
- [ ] Approval before 48 hours blocked unless explicit override flag (logged)
- [ ] Audit log captures every step

## References
FRD Section 7.3, FRD Section 14.1 (this is the highest-impact fraud vector)"

create_issue \
  "[backend] Vendor performance metrics" \
  "M3 — Vendor Management" \
  "type:feature,area:vendors,area:backend,priority:p1,size:m,status:ready" \
  "## Goal
Track vendor performance per FRD 7.2 so Finance can spot problematic vendors.

## Scope
Computed metrics (recalculated nightly via Celery beat):
- Invoice accuracy rate (% submitted without errors)
- Credit note frequency (count per FY)
- Average invoice cycle (submission → payment)
- MSME compliance score (% paid within 45 days)
- Onboarding completeness %
- Vendor concentration % of total AP

Endpoints:
- \`GET /api/v1/vendors/{id}/performance\` — single vendor
- \`GET /api/v1/vendors/performance/summary\` — top/bottom performers, concentration alerts

## Acceptance Criteria
- [ ] Nightly job populates a \`vendor_performance_snapshot\` table
- [ ] Concentration alert fires if any vendor > 30% of total AP

## References
FRD Section 7.2"

create_issue \
  "[frontend] Vendor management UI" \
  "M3 — Vendor Management" \
  "type:feature,area:frontend,area:vendors,priority:p0,size:l,status:ready" \
  "## Goal
Finance Admin and Finance Manager can onboard, view, and manage vendors.

## Scope
- Page: \`/vendors\` — list with filters (status, category, MSME flag, search)
- Page: \`/vendors/new\` — onboarding form with all FRD 7.1 fields, contract upload
- Page: \`/vendors/{id}\` — detail tabs:
  - Overview (KYC info)
  - Bank Accounts (history view, change request button)
  - Performance (metrics from API)
  - Documents (contracts)
  - Audit Trail
- Approval action buttons gated by RBAC

## Acceptance Criteria
- [ ] Onboarding form mirrors backend validation
- [ ] Bank account change request flow visible end-to-end
- [ ] Pending approval state clearly indicated"

# =====================================================================
# MILESTONE 4 — PURCHASE INVOICE INTAKE
# =====================================================================

create_issue \
  "[db] Purchase invoice + PO + GRN data model" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:invoices-purchase,area:db,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Tables to support purchase orders, goods/service receipts, and vendor invoices — the three legs of the 3-way match.

## Scope
### Tables
- \`purchase_orders\` — id, po_number, vendor_id, department_id, cost_centre_id, project_id, total_amount, currency, status (draft/approved/closed), created_by, approved_by, created_at
- \`po_line_items\` — id, po_id, description, hsn_sac, quantity, unit_price, gst_rate, line_total
- \`goods_receipts\` — id, grn_number, po_id, received_by, received_at, notes
- \`grn_line_items\` — id, grn_id, po_line_id, qty_received
- \`purchase_invoices\` — id, vendor_id, vendor_invoice_number, invoice_date, due_date, po_id (nullable), pre_gst_amount, cgst, sgst, igst, tds_section, tds_amount, total_amount, currency, status, attachment_file_id, submitted_by, submitted_at
- \`pi_line_items\` — id, pi_id, po_line_id (nullable), description, hsn_sac, qty, unit_price, gst_rate, line_total
- Status enum: submitted, under_review, query_raised, approved, rejected, payment_scheduled, paid, posted_in_d365

## Acceptance Criteria
- [ ] Migrations clean
- [ ] Unique constraint on (vendor_id, vendor_invoice_number) — prevents duplicates at DB level
- [ ] All AuditedModel-enabled

## References
FRD Section 6.2.1 (3-way match), Section 3.1.1 (PI fields)"

create_issue \
  "[backend] Purchase Order creation API" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:invoices-purchase,area:backend,area:api,priority:p0,size:m,status:ready" \
  "## Goal
Department heads create POs against approved vendors before procurement happens. POs are the first leg of the 3-way match.

## Scope
- \`POST /api/v1/purchase-orders\` — create as draft
- \`PATCH /api/v1/purchase-orders/{id}\` — edit while draft
- \`POST /api/v1/purchase-orders/{id}/submit\` — submit for approval
- \`GET /api/v1/purchase-orders\` — list with filters
- Validation: vendor must be approved, line items required, amounts > 0
- PO number format: \`PO/[FY]/[SEQ]\` (e.g. PO/2526/0001)
- Routes through approval workflow (Dept Head + Finance Manager per amount tier)

## Acceptance Criteria
- [ ] Cannot create PO against pending/blocked vendor
- [ ] Approved POs are immutable (changes need a Change Order — out of scope for now)
- [ ] Audit log entries"

create_issue \
  "[backend] Goods Receipt (GRN) API" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:invoices-purchase,area:backend,area:api,priority:p0,size:m,status:ready" \
  "## Goal
Operations / project managers record receipt of goods or services. This is the second leg of the 3-way match.

## Scope
- \`POST /api/v1/grn\` — body: po_id, line items with received quantities
- \`GET /api/v1/grn\` — list, filter by PO
- \`GET /api/v1/grn/{id}\` — detail
- Validation: cannot receive more than ordered; PO must be approved
- Multiple GRNs allowed against one PO (partial deliveries)
- Notifies Finance Manager when GRN posted

## Acceptance Criteria
- [ ] Cannot over-receive
- [ ] PO line item shows running 'received' total
- [ ] Audit log entries"

create_issue \
  "[backend] Vendor self-service portal — invoice submission API" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:invoices-purchase,area:vendors,area:backend,area:api,priority:p0,size:l,status:ready" \
  "## Goal
External-facing API used by vendor users (separate role) to submit invoices and track their status.

## Scope
### Endpoints (all require \`vendor\` role + scoped to that vendor's data)
- \`POST /api/v1/portal/invoices\` — create + submit
- \`GET  /api/v1/portal/invoices\` — list own invoices
- \`GET  /api/v1/portal/invoices/{id}\` — detail with status history
- \`POST /api/v1/portal/invoices/{id}/respond_to_query\` — reply when status = query_raised
- \`GET  /api/v1/portal/invoices/{id}/remittance_advice\` — PDF download (only if paid)

### Submission validation
- All FRD 3.1.1 mandatory fields
- Vendor invoice number unique per vendor (DB constraint)
- Invoice date not future, max 30 days past
- GSTIN must match the vendor's master GSTIN
- Line-item totals must match invoice total
- Attachment required (≤10MB PDF/image)
- If PO number provided: PO must exist and belong to this vendor
- Bank account name matches vendor master (cannot change here per FRD 3.1.1)

### Status lifecycle (FRD 3.1.2)
submitted → under_review → (query_raised → submitted) → approved → payment_scheduled → paid
or → rejected (terminal, with reason; vendor can revise + resubmit as a new invoice)

## Acceptance Criteria
- [ ] Vendor user can only see their own vendor's data (RBAC scoped)
- [ ] All FRD validation rules enforced
- [ ] Submission triggers OCR + anomaly stub (returns 'clean' for now — real AI in M8)
- [ ] Submission acknowledgement email sent

## References
FRD Section 3.1, 3.1.1, 3.1.2"

create_issue \
  "[backend] 3-way match engine" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:invoices-purchase,area:backend,priority:p0,size:l,status:ready" \
  "## Goal
Automatically match Vendor Invoice ↔ GRN ↔ PO and produce a match outcome (Full / Partial / No match).

## Scope
- Service: \`three_way_match.evaluate(invoice) → MatchResult(status, discrepancies)\`
- Triggered automatically on invoice submission
- Match rules:
  - PO referenced and exists
  - GRN(s) exist for the PO
  - Sum of invoiced quantities ≤ sum of received quantities (per line)
  - Total amount within ±2% tolerance of (received qty × unit price)
- Outcomes:
  - **Full Match** → invoice auto-proceeds to approval workflow
  - **Partial Match** → flagged for Finance review with discrepancy details
  - **No Match** → blocked, vendor notified, requires Finance Manager + CFO override
- Match result stored on invoice, visible in detail view

## Acceptance Criteria
- [ ] Tests cover all three outcomes
- [ ] Tolerance configurable in settings
- [ ] Discrepancy details human-readable
- [ ] Audit log entry on each match attempt

## References
FRD Section 6.2.1"

create_issue \
  "[backend] Internal purchase invoice review + approval" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:invoices-purchase,area:workflow,area:backend,priority:p0,size:m,status:ready" \
  "## Goal
Finance team's internal endpoints for reviewing and approving vendor invoices.

## Scope
### Endpoints
- \`GET /api/v1/invoices/purchase\` — internal list with filters (status, vendor, age)
- \`GET /api/v1/invoices/purchase/{id}\` — detail with match result, vendor context, attachments
- \`POST /api/v1/invoices/purchase/{id}/raise_query\` — body: question; vendor notified
- \`POST /api/v1/invoices/purchase/{id}/approve\` — routes through workflow engine
- \`POST /api/v1/invoices/purchase/{id}/reject\` — body: reason; vendor notified
- \`POST /api/v1/invoices/purchase/{id}/schedule_payment\` — sets payment date

### Approval workflow
- Uses generic engine from M2
- Tiers per FRD 3.1.3 (< ₹10K up to > ₹10L)
- Anomaly-flagged invoices (M8) bypass auto-approve and require Finance Manager + CFO

## Acceptance Criteria
- [ ] All endpoints permission-gated
- [ ] Status transitions match FRD lifecycle
- [ ] Each transition fires correct vendor notification
- [ ] Audit logged

## References
FRD Section 3.1.2, 3.1.3"

create_issue \
  "[frontend] Vendor self-service portal UI" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:frontend,area:invoices-purchase,priority:p0,size:l,status:ready" \
  "## Goal
External vendor users log in and manage their invoices. Visually distinct from the internal portal so vendors don't get confused.

## Scope
- Separate route prefix: \`/portal/*\`
- Vendor login (uses same auth backend, role-gated)
- Pages:
  - \`/portal/dashboard\` — invoice counts by status
  - \`/portal/invoices\` — list with status badges
  - \`/portal/invoices/new\` — submission form (FRD 3.1.1 fields)
  - \`/portal/invoices/{id}\` — detail with status timeline, query/response thread, remittance download
- Vendor branding: 3SC logo + 'Vendor Portal' label
- Mobile-responsive

## Acceptance Criteria
- [ ] Vendor user only sees their own invoices
- [ ] Submission form enforces all validation
- [ ] Status timeline matches FRD lifecycle visually
- [ ] Query/response thread works"

create_issue \
  "[frontend] Internal purchase invoice management UI" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:frontend,area:invoices-purchase,priority:p0,size:l,status:ready" \
  "## Goal
Finance team's view of all incoming vendor invoices.

## Scope
- Page: \`/invoices/purchase\` — list with filters
- Page: \`/invoices/purchase/{id}\` — detail with:
  - Invoice fields and PDF preview side-by-side
  - 3-way match result panel (PO link, GRN link, discrepancies)
  - Approval history
  - Action buttons: Raise Query, Approve, Reject, Schedule Payment
  - Audit trail tab
- Bulk actions for low-value approvals

## Acceptance Criteria
- [ ] All actions wired to backend
- [ ] Match result is clear at a glance (green/amber/red)
- [ ] PDF preview works for both image and PDF receipts"

create_issue \
  "[frontend] PO and GRN management UI" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:frontend,area:invoices-purchase,priority:p1,size:m,status:ready" \
  "## Goal
Department heads create POs; operations records GRNs.

## Scope
- Pages: \`/purchase-orders\`, \`/purchase-orders/new\`, \`/purchase-orders/{id}\`
- Pages: \`/grn\`, \`/grn/new?po=...\`, \`/grn/{id}\`
- PO line items as a dynamic table
- GRN form pre-fills line items from selected PO; user enters received quantities

## Acceptance Criteria
- [ ] Cannot enter received qty > ordered qty
- [ ] Submitted PO routes through approval workflow"

create_issue \
  "[backend] Duplicate purchase invoice detection (rule-based)" \
  "M4 — Purchase Invoice Intake" \
  "type:feature,area:invoices-purchase,area:backend,priority:p0,size:s,status:ready" \
  "## Goal
Catch obvious duplicate invoices at submission time, before AI/ML lands in M8.

## Scope
- Check on submission:
  - Exact: same vendor + same vendor_invoice_number → reject (already enforced by DB unique constraint, but return a friendly error)
  - Fuzzy: same vendor + amount within ±0.5% + invoice_date within ±3 days within last 60 days → flag (not auto-block) with link to suspected duplicate
- Result added to invoice as \`duplicate_check_result\`

## Acceptance Criteria
- [ ] Tests cover exact and fuzzy cases
- [ ] Flagged invoices appear with a warning badge in internal UI

## References
FRD Section 8.1 (rule-based version of the AI feature)"

create_issue \
  "[test] Purchase invoice end-to-end test suite" \
  "M4 — Purchase Invoice Intake" \
  "type:test,area:invoices-purchase,area:backend,priority:p1,size:m,status:ready" \
  "## Goal
Lock down the full invoice intake flow with E2E tests.

## Scope
Scenarios:
- Vendor onboarded → PO raised → GRN entered → vendor submits invoice → 3-way full match → approval workflow → approved → payment scheduled → paid
- Duplicate invoice (exact) rejected
- Duplicate invoice (fuzzy) flagged but not blocked
- Invoice with no PO → No Match → blocked → CFO override → approved
- Invoice from pending vendor → blocked
- Vendor cannot see another vendor's invoice (RBAC scope test)
- Bank account change request blocks payments during 48-hour hold

## Acceptance Criteria
- [ ] All scenarios pass
- [ ] Coverage ≥ 80% on \`invoices_purchase\`, \`vendors\`, and \`workflow\` apps"

# =====================================================================
# Done
# =====================================================================

echo ""
echo "==> Done."
echo ""
echo "Summary:"
# shellcheck disable=SC2086
echo "  Labels:     $(gh label list $REPO_FLAG --limit 500 --json name -q '. | length')"
# shellcheck disable=SC2086
echo "  Milestones: $(gh api 'repos/{owner}/{repo}/milestones?state=all&per_page=100' --jq '. | length')"
# shellcheck disable=SC2086
echo "  Issues:     $(gh issue list $REPO_FLAG --state open --limit 500 --json number -q '. | length')"
echo ""
echo "Next steps:"
echo "  1. Review issues in GitHub"
echo "  2. Assign owners and adjust priorities"
echo "  3. Start with M1 — Foundation issues marked priority:p0"
