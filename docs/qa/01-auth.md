# 🧪 Feature: Authentication & Session
**Component Scope:** React `Login.jsx` → DRF `auth_views` → SimpleJWT → PostgreSQL `core_user` → AuditLog
**Objective:** Verify login, token refresh, password change/reset, and `/me` profile work for all 6 grades, with rate-limit and audit guarantees.

### 1. Prerequisites & State Setup
- [ ] `USE_SQLITE=true DJANGO_SETTINGS_MODULE=config.settings.dev ./start_dev.sh` is running.
- [ ] `python manage.py seed_demo` has been run; demo users exist.
- [ ] `OPENROUTER_API_KEY` placeholder OR real key (login does not depend on it; verify only that startup didn't crash).
- [ ] `AuditLog` table is reachable (`select count(*) from core_auditlog;` returns ≥ 0).
- [ ] Browser dev tools open; clear `localStorage` / cookies before each login attempt.

### 2. The Happy Path (Acceptable Flow)

#### 2.1 Login
- [ ] `POST /api/v1/auth/login/` with `{"username":"fin_manager","password":"demo1234"}`.
- [ ] **Assert API:** `200 OK` with body `{access, refresh, user:{id, username, employee_grade, ...}}`.
- [ ] **Assert JWT payload:** `access` token decoded shows `username`, `employee_grade=3`.
- [ ] **Assert DB:** new `AuditLog` row with `action="auth.login"`, matching `user_id`, `ip_address` populated.
- [ ] **Assert UI:** `Login.jsx` redirects to dashboard; `localStorage.access_token` present.

#### 2.2 `/me`
- [ ] `GET /api/v1/auth/me/` with bearer token.
- [ ] **Assert:** `200 OK`, body has `id`, `username`, `employee_grade`, `department`, `groups[]`.

#### 2.3 Refresh
- [ ] `POST /api/v1/auth/refresh/` with `{"refresh": <token>}`.
- [ ] **Assert:** `200 OK` with new `access` token (different from previous, decoded `exp` later).

#### 2.4 Change password (authenticated)
- [ ] `POST /api/v1/auth/change-password/` with `{old_password:"demo1234", new_password:"NewDemo!234"}`.
- [ ] **Assert API:** `200 OK`.
- [ ] **Assert DB:** `AuditLog` row `action="auth.password_changed"`.
- [ ] **Assert behavior:** old password fails on `/auth/login/`; new password succeeds.
- [ ] **Cleanup:** revert via change-password back to `demo1234`.

#### 2.5 Forgot password
- [ ] `POST /api/v1/auth/forgot-password/` with `{"username":"employee1"}`.
- [ ] **Assert:** `200 OK` with neutral message ("If this account exists…").
- [ ] **Assert DB:** `AuditLog` row `action="auth.password_reset"`; user row `password` hash changed.
- [ ] **Assert console / email backend:** new temp password (`Tmp@…`) appears in the configured email backend output.
- [ ] Login with returned temp password succeeds.

### 3. Negative Testing (Bad Flows)
- [ ] Login wrong password → **`400`** body `{detail:"Invalid credentials"}`.
- [ ] Login with non-existent user → **`400`** (no user enumeration via timing/message).
- [ ] Missing username/password → **`400`** field-level errors.
- [ ] `/auth/me/` without bearer → **`401`**.
- [ ] `/auth/me/` with malformed bearer → **`401`**.
- [ ] `/auth/refresh/` with expired refresh → **`401`** (`token_not_valid`).
- [ ] `/auth/change-password/` with wrong `old_password` → **`400`**.
- [ ] `/auth/forgot-password/` for inactive user (`is_active=false`) → **`200`** with neutral message; password **NOT** rotated; no audit row.
- [ ] `/auth/forgot-password/` for non-existent user → **`200`** neutral message; no DB writes.
- [ ] CSRF: POSTing to `/auth/login/` from cross-origin without bearer → confirm CORS policy reflects `CORS_ALLOWED_ORIGINS`.

### 4. Edge Cases & Concurrency
- [ ] **Throttle:** 6 failed `/auth/login/` attempts in 60s from same IP → 6th returns **`429 Too Many Requests`** (anon throttle scope).
- [ ] **Throttle (forgot-password):** 6 attempts within window → **`429`**.
- [ ] **Race — two refresh tokens:** call `/auth/refresh/` twice with same refresh in parallel; both should succeed (SimpleJWT default).
- [ ] **Token expiry:** wait `>SIMPLE_JWT.ACCESS_TOKEN_LIFETIME` (8h dev) → call `/auth/me/` → **`401`** with `token_not_valid`.
- [ ] **Long username:** 256-char username on login → `400` validation error, no 500.
- [ ] **Unicode password:** password with emoji + RTL chars → can change and re-login successfully.
- [ ] **Audit log race:** 5 simultaneous logins same user → exactly 5 `auth.login` rows (no dropped writes).
- [ ] **Password reset → log out other sessions:** verify whether prior access tokens are still accepted (current implementation does NOT invalidate; record observed behavior).
