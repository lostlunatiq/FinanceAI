# 🧪 Feature: Notifications System
**Component Scope:** Notification creation → dispatcher → async email task (Celery) → SMTP / Teams webhook / browser push → `NotificationPreference` (user settings)
**Objective:** Verify notification CRUD, async email delivery with retries, Teams webhook integration, browser push opt-in, user preferences, and email redirect backend for QA.

### 1. Prerequisites & State Setup
- [ ] `CELERY_TASK_ALWAYS_EAGER=true` for synchronous task execution in tests.
- [ ] `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` (logs to console).
- [ ] Optional: `EMAIL_REDIRECT_TO=qa@example.com` (catch-all redirect for all outgoing mail).
- [ ] `TEAMS_WEBHOOK_URL` set or unset (graceful skip if not configured).
- [ ] Demo users with various NotificationPreference settings.
- [ ] At least one high-priority event (anomaly escalation, approval override) to test CRITICAL notifications.

### 2. The Happy Path

#### 2.1 Notification list (user's inbox)
- [ ] As `employee1`: `GET /api/v1/notifications/`.
- [ ] **Assert API:** list of user's notifications, paginated, with priority, title, message, dot_color, created_at, is_read.

#### 2.2 Notification creation (via business logic)
- [ ] Trigger an event that creates a notification (e.g. submit an expense).
- [ ] **Assert DB:** `Notification` row inserted with correct `user_id`, `priority`, `title`, `message`, `entity_type`, `entity_id`.
- [ ] **Assert notification:** appears in user's list with `is_read=false`.

#### 2.3 Mark single notification read
- [ ] `POST /api/v1/notifications/<id>/mark-read/`.
- [ ] **Assert API:** `200`.
- [ ] **Assert DB:** `is_read=true` on the Notification.

#### 2.4 Mark all notifications read
- [ ] `POST /api/v1/notifications/mark-all-read/`.
- [ ] **Assert:** all user notifications marked `is_read=true`.

#### 2.5 Unread count
- [ ] `GET /api/v1/notifications/unread-count/`.
- [ ] **Assert API:** `{unread_count: int}`.

#### 2.6 Notification preferences
- [ ] `GET /api/v1/notifications/preferences/`.
- [ ] **Assert API:** `{email_summaries: bool, system_alerts: bool, mobile_push: bool}`.
- [ ] `PATCH /api/v1/notifications/preferences/` with `{email_summaries: false}`.
- [ ] **Assert:** `200`; preference updated.

#### 2.7 Async email task (approval notification)
- [ ] Approve an expense; `employee1` (submitter) should receive an approval email.
- [ ] **Assert email backend output:** email sent to `employee1.email` with subject containing "Invoice Approved".
- [ ] **Assert email content:** includes `ref_no`, `amount`, `approval_chain_summary`.
- [ ] **Assert Celery task:** `send_email_task` logged or completed (check async task queue).

#### 2.8 Email redirect backend (QA mode)
- [ ] Set `EMAIL_REDIRECT_TO=qa-test@example.com`.
- [ ] Trigger an email; check email backend output.
- [ ] **Assert:** email redirected to `qa-test@example.com`, not original recipient.

#### 2.9 Email retry (transient failure)
- [ ] Mock SMTP timeout on first attempt; task retries up to 3 times.
- [ ] **Assert Celery logs:** "Retrying task…" appears; eventually succeeds.

#### 2.10 Browser push notification (if enabled)
- [ ] Set user preference `mobile_push=true`.
- [ ] Trigger a HIGH/CRITICAL event.
- [ ] **Assert notification backend:** push service called (if configured; may be no-op in dev).

### 3. Negative Testing

- [ ] Mark-read with non-existent notification ID → **`404`**.
- [ ] Mark-read a notification belonging to another user → **`403`**.
- [ ] Update preferences with invalid value (e.g. `{email_summaries: "yes"}`) → **`400`** or coerced to bool.
- [ ] Notification preference for unauthenticated user → **`401`**.
- [ ] Unread count for deleted notifications → count does not include soft-deleted rows (if soft-delete is used).

### 4. Edge Cases & Concurrency

- [ ] **Notification preference skip HIGH/CRITICAL:** user sets `system_alerts=false` and triggers a CRITICAL anomaly escalation → notification still created in DB (system_alerts controls email, not creation); HIGH notifications skip email only.
- [ ] **Email task failure after retries:** after 3 retries, Celery task fails permanently; exception logged; notification record remains (no delete); user can manually retry or admin can investigate.
- [ ] **Concurrent mark-read:** two browsers click mark-read on same notification simultaneously → both succeed; idempotent (second write is a no-op on `is_read=true`).
- [ ] **Email rate limit:** 100 emails sent in 1 minute to same recipient; SMTP backend may throttle (record observed behavior; should not 500).
- [ ] **Teams webhook failure:** `TEAMS_WEBHOOK_URL` unreachable → dispatcher catches exception, logs warning, does not block business logic; notification still created in DB.
- [ ] **Large email body:** notification message > 10 MB → email backend should chunk or reject gracefully (record behavior).
- [ ] **Unicode in notification:** title, message, recipient name with Unicode → email renders correctly; no encoding errors.
- [ ] **Notification explosion (bulk operation):** approve 1000 expenses in succession → each creates notification; system handles 1000 async tasks without deadlock.
- [ ] **Preferences for deleted user:** delete a user; their NotificationPreference should be cleaned up (cascade delete) or orphaned; confirm behavior.
- [ ] **Email backend swap:** change `EMAIL_BACKEND` to a custom backend; notifications still work with new backend (verify Celery picks up new backend at task time).
