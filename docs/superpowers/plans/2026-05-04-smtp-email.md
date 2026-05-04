# SMTP Email Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Gmail SMTP email sending into the existing notification system using async Celery tasks and HTML templates.

**Architecture:** `dispatcher._send_email_alert` renders an HTML template and dispatches a `send_email_task` Celery task, which sends via `EmailMultiAlternatives`. Credentials live in `.env` and are read by `django-environ` in `base.py` (already wired). `dev.py` currently hardcodes `EMAIL_BACKEND=console`, so that override is removed to let the env var drive it.

**Tech Stack:** Django `EmailMultiAlternatives`, Celery `shared_task`, `django-environ`, Gmail SMTP

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `.env` | Modify | Add Gmail credentials |
| `config/settings/dev.py` | Modify | Remove hardcoded console EMAIL_BACKEND override |
| `apps/notifications/tasks.py` | Create | `send_email_task` Celery task |
| `apps/notifications/email_utils.py` | Create | `render_alert_email` template renderer |
| `apps/notifications/templates/notifications/emails/base.html` | Create | Branded email layout |
| `apps/notifications/templates/notifications/emails/alert.html` | Create | Alert email body |
| `apps/notifications/templates/notifications/emails/alert.txt` | Create | Plain-text fallback |
| `apps/notifications/dispatcher.py` | Modify | Replace blocking `_send_email_alert` with task dispatch |
| `apps/notifications/tests/__init__.py` | Create | Make tests a package |
| `apps/notifications/tests/test_email.py` | Create | Tests for all three new modules |

---

## Task 1: Credentials & Settings

**Files:**
- Modify: `.env`
- Modify: `config/settings/dev.py`

### Context

`config/settings/base.py` already reads email config from env via `django-environ`:
```python
EMAIL_BACKEND     = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST        = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT        = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS     = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER     = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL  = env("DEFAULT_FROM_EMAIL", default="Tijori Finance <noreply@tijori.ai>")
```

`dev.py` overrides it with a hardcode that ignores the env var:
```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

- [ ] **Step 1: Add Gmail credentials to `.env`**

Append these lines to `.env` (fill in your Gmail address and App Password — NOT your regular Gmail password; generate at myaccount.google.com → Security → App passwords):

```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST_USER=you@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
DEFAULT_FROM_EMAIL=Tijori AI <you@gmail.com>
```

- [ ] **Step 2: Remove the hardcoded EMAIL_BACKEND override in `dev.py`**

In `config/settings/dev.py`, remove this line:
```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

`base.py` will now read `EMAIL_BACKEND` from `.env`, which points to Gmail SMTP. No other changes to settings needed.

- [ ] **Step 3: Commit**

```bash
git add config/settings/dev.py
git commit -m "config: make EMAIL_BACKEND env-driven, remove console hardcode"
```

(Do NOT commit `.env` — it is already in `.gitignore`.)

---

## Task 2: Email Templates

**Files:**
- Create: `apps/notifications/templates/notifications/emails/base.html`
- Create: `apps/notifications/templates/notifications/emails/alert.html`
- Create: `apps/notifications/templates/notifications/emails/alert.txt`

`APP_DIRS=True` in settings means Django will find templates under any app's `templates/` directory automatically. No settings change needed.

- [ ] **Step 1: Create the template directory**

```bash
mkdir -p apps/notifications/templates/notifications/emails
```

- [ ] **Step 2: Create `base.html`**

Create `apps/notifications/templates/notifications/emails/base.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{% block subject %}Tijori AI{% endblock %}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#0F172A;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;background:#0F172A;border-bottom:1px solid #1E293B;">
              <span style="font-size:20px;font-weight:800;color:#FAFAF8;letter-spacing:-0.5px;">
                Tijori <span style="color:#E8783B;">AI</span>
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;background:#0F172A;color:#FAFAF8;">
              {% block content %}{% endblock %}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#020617;border-top:1px solid #1E293B;">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.5;">
                You're receiving this because you have email notifications enabled on Tijori AI.
                Log in and visit Settings to update your preferences.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

- [ ] **Step 3: Create `alert.html`**

Create `apps/notifications/templates/notifications/emails/alert.html`:

```html
{% extends "notifications/emails/base.html" %}

{% block content %}
<p style="margin:0 0 8px;font-size:14px;color:#94A3B8;">
  Hi {{ user.first_name|default:user.username }},
</p>
<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#FAFAF8;line-height:1.3;">
  {{ title }}
</h2>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#94A3B8;">
  {{ message }}
</p>
<p style="margin:0;font-size:12px;color:#475569;">— Tijori AI Finance OS</p>
{% endblock %}
```

- [ ] **Step 4: Create `alert.txt`**

Create `apps/notifications/templates/notifications/emails/alert.txt`:

```
Hi {{ user.first_name|default:user.username }},

{{ title }}

{{ message }}

---
You're receiving this because you have email notifications enabled on Tijori AI.
Log in and visit Settings to update your preferences.
```

- [ ] **Step 5: Commit**

```bash
git add apps/notifications/templates/
git commit -m "feat: add HTML and plain-text email templates for alert notifications"
```

---

## Task 3: Email Renderer (`email_utils.py`)

**Files:**
- Create: `apps/notifications/tests/__init__.py`
- Create: `apps/notifications/tests/test_email.py` (render tests only)
- Create: `apps/notifications/email_utils.py`

- [ ] **Step 1: Create the tests package**

```bash
touch apps/notifications/tests/__init__.py
```

- [ ] **Step 2: Write the failing test for `render_alert_email`**

Create `apps/notifications/tests/test_email.py`:

```python
import pytest
from unittest.mock import patch
from django.core import mail
from django.test import override_settings

from apps.core.models import User


# ── render_alert_email ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRenderAlertEmail:
    def test_returns_html_and_plain_text(self):
        from apps.notifications.email_utils import render_alert_email
        user = User.objects.create_user(
            username="alice", email="alice@example.com", first_name="Alice"
        )
        html, plain = render_alert_email(user, "Budget Exceeded", "Your Q3 budget has been exceeded.")
        assert "<html" in html
        assert "Budget Exceeded" in html
        assert "Alice" in html
        assert "Budget Exceeded" in plain
        assert "Alice" in plain

    def test_plain_text_has_no_html_tags(self):
        from apps.notifications.email_utils import render_alert_email
        user = User.objects.create_user(username="bob2", email="bob2@example.com", first_name="Bob")
        _, plain = render_alert_email(user, "Title", "Message")
        assert "<" not in plain

    def test_falls_back_to_username_when_no_first_name(self):
        from apps.notifications.email_utils import render_alert_email
        user = User.objects.create_user(username="charlie", email="charlie@example.com")
        html, plain = render_alert_email(user, "Title", "Message")
        assert "charlie" in html
        assert "charlie" in plain
```

- [ ] **Step 3: Run the test — expect ImportError (module doesn't exist yet)**

```bash
pytest apps/notifications/tests/test_email.py::TestRenderAlertEmail -v
```

Expected: `ImportError: cannot import name 'render_alert_email'`

- [ ] **Step 4: Create `email_utils.py`**

Create `apps/notifications/email_utils.py`:

```python
from django.template.loader import render_to_string


def render_alert_email(user, title, message):
    ctx = {"user": user, "title": title, "message": message}
    html  = render_to_string("notifications/emails/alert.html", ctx)
    plain = render_to_string("notifications/emails/alert.txt", ctx)
    return html, plain
```

- [ ] **Step 5: Run the tests — expect PASS**

```bash
pytest apps/notifications/tests/test_email.py::TestRenderAlertEmail -v
```

Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/notifications/email_utils.py apps/notifications/tests/
git commit -m "feat: add render_alert_email helper and email templates"
```

---

## Task 4: Celery Task (`tasks.py`)

**Files:**
- Modify: `apps/notifications/tests/test_email.py` (add task tests)
- Create: `apps/notifications/tasks.py`

Note: `dev.py` sets `CELERY_TASK_ALWAYS_EAGER = True` and `CELERY_TASK_EAGER_PROPAGATES = True`, so `.delay()` runs synchronously in tests — no broker needed.

- [ ] **Step 1: Add failing tests for `send_email_task`**

Append to `apps/notifications/tests/test_email.py`:

```python
# ── send_email_task ───────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class TestSendEmailTask:
    def test_sends_email_to_recipient(self):
        from apps.notifications.tasks import send_email_task
        send_email_task.delay(
            to="alice@example.com",
            subject="Test Subject",
            html_body="<p>Hello</p>",
            plain_body="Hello",
        )
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["alice@example.com"]
        assert mail.outbox[0].subject == "Test Subject"

    def test_email_has_html_alternative(self):
        from apps.notifications.tasks import send_email_task
        send_email_task.delay(
            to="alice@example.com",
            subject="Test",
            html_body="<p>Hello</p>",
            plain_body="Hello",
        )
        msg = mail.outbox[0]
        content_types = [ct for _, ct in msg.alternatives]
        assert "text/html" in content_types

    def test_plain_body_is_message_body(self):
        from apps.notifications.tasks import send_email_task
        send_email_task.delay(
            to="alice@example.com",
            subject="Test",
            html_body="<p>Hello</p>",
            plain_body="Hello plain",
        )
        assert mail.outbox[0].body == "Hello plain"
```

- [ ] **Step 2: Run — expect ImportError**

```bash
pytest apps/notifications/tests/test_email.py::TestSendEmailTask -v
```

Expected: `ImportError: cannot import name 'send_email_task'`

- [ ] **Step 3: Create `tasks.py`**

Create `apps/notifications/tasks.py`:

```python
from celery import shared_task
from django.core.mail import EmailMultiAlternatives


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, to, subject, html_body, plain_body):
    try:
        msg = EmailMultiAlternatives(subject, plain_body, None, [to])
        msg.attach_alternative(html_body, "text/html")
        msg.send()
    except Exception as exc:
        raise self.retry(exc=exc)
```

`from_email=None` makes Django use `DEFAULT_FROM_EMAIL` from settings automatically.

- [ ] **Step 4: Run — expect PASS**

```bash
pytest apps/notifications/tests/test_email.py::TestSendEmailTask -v
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/notifications/tasks.py apps/notifications/tests/test_email.py
git commit -m "feat: add send_email_task Celery task with retry logic"
```

---

## Task 5: Update Dispatcher

**Files:**
- Modify: `apps/notifications/tests/test_email.py` (add dispatcher tests)
- Modify: `apps/notifications/dispatcher.py`

- [ ] **Step 1: Add failing test for updated `_send_email_alert`**

Append to `apps/notifications/tests/test_email.py`:

```python
# ── _send_email_alert (dispatcher) ───────────────────────────────────────────

@pytest.mark.django_db
class TestSendEmailAlert:
    def test_dispatches_task_with_correct_recipient(self):
        from apps.notifications.dispatcher import _send_email_alert
        user = User.objects.create_user(
            username="dave", email="dave@example.com", first_name="Dave"
        )
        with patch("apps.notifications.dispatcher.send_email_task") as mock_task:
            _send_email_alert(user, "Invoice Approved", "Your invoice #1234 has been approved.")
            mock_task.delay.assert_called_once()
            kwargs = mock_task.delay.call_args.kwargs
            assert kwargs["to"] == "dave@example.com"

    def test_subject_includes_tijori_alert_prefix(self):
        from apps.notifications.dispatcher import _send_email_alert
        user = User.objects.create_user(
            username="eve", email="eve@example.com", first_name="Eve"
        )
        with patch("apps.notifications.dispatcher.send_email_task") as mock_task:
            _send_email_alert(user, "Budget Warning", "Spend is at 90%.")
            kwargs = mock_task.delay.call_args.kwargs
            assert kwargs["subject"] == "[Tijori Alert] Budget Warning"

    def test_sends_both_html_and_plain(self):
        from apps.notifications.dispatcher import _send_email_alert
        user = User.objects.create_user(
            username="frank", email="frank@example.com", first_name="Frank"
        )
        with patch("apps.notifications.dispatcher.send_email_task") as mock_task:
            _send_email_alert(user, "Title", "Body")
            kwargs = mock_task.delay.call_args.kwargs
            assert "<html" in kwargs["html_body"]
            assert "<html" not in kwargs["plain_body"]
```

- [ ] **Step 2: Run — expect failure (dispatcher still uses old `send_mail`)**

```bash
pytest apps/notifications/tests/test_email.py::TestSendEmailAlert -v
```

Expected: tests fail because `send_email_task` isn't patched in the right place yet.

- [ ] **Step 3: Update `_send_email_alert` in `dispatcher.py`**

In `apps/notifications/dispatcher.py`, replace the entire `_send_email_alert` function:

```python
def _send_email_alert(user, title, message):
    from .tasks import send_email_task
    from .email_utils import render_alert_email
    html, plain = render_alert_email(user, title, message)
    send_email_task.delay(
        to=user.email,
        subject=f"[Tijori Alert] {title}",
        html_body=html,
        plain_body=plain,
    )
```

The full updated `dispatcher.py` top section looks like:

```python
from .models import Notification, NotificationPreference
from apps.core.models import User


def _get_prefs(user):
    try:
        return user.notif_prefs
    except NotificationPreference.DoesNotExist:
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        return prefs


def _send_email_alert(user, title, message):
    from .tasks import send_email_task
    from .email_utils import render_alert_email
    html, plain = render_alert_email(user, title, message)
    send_email_task.delay(
        to=user.email,
        subject=f"[Tijori Alert] {title}",
        html_body=html,
        plain_body=plain,
    )
```

Everything below (`notify_user`, `notify_role`, `notify_finance_team`) is unchanged.

- [ ] **Step 4: Run all email tests — expect full PASS**

```bash
pytest apps/notifications/tests/test_email.py -v
```

Expected: `9 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/notifications/dispatcher.py apps/notifications/tests/test_email.py
git commit -m "feat: wire dispatcher to async send_email_task, replacing blocking send_mail"
```

---

## Manual Smoke Test (optional but recommended)

Once all tasks are complete, run this in Django shell to trigger a real email:

```bash
python manage.py shell
```

```python
from apps.core.models import User
from apps.notifications.dispatcher import notify_user

user = User.objects.get(username="your_username")
user.email = "your-real-email@gmail.com"
user.save()

from apps.notifications.models import NotificationPreference
prefs, _ = NotificationPreference.objects.get_or_create(user=user)
prefs.email_summaries = True
prefs.save()

notify_user(user, "Smoke Test", "If you see this email, SMTP is working.", priority="HIGH")
```

Check your inbox (and spam folder). Subject will be `[Tijori Alert] Smoke Test`.
