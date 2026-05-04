# SMTP Email Setup — Design Spec

**Date:** 2026-05-04  
**Status:** Approved  

## Overview

Add asynchronous Gmail SMTP email sending to the Tijori AI Django backend. The notifications dispatcher already calls `_send_email_alert` — this spec wires that call through a Celery task with HTML templates instead of a blocking `send_mail` call.

## Architecture

```
notify_user() in dispatcher.py
  └── _send_email_alert(user, title, message)
        └── render_alert_email() → html, plain
        └── send_email_task.delay(to, subject, html, plain)
              └── Celery worker → EmailMultiAlternatives.send() → Gmail SMTP
```

## Section 1: Config & Credentials

**`config/settings.py`** — add Gmail SMTP backend reading from environment variables:

```python
EMAIL_BACKEND     = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST        = 'smtp.gmail.com'
EMAIL_PORT        = 587
EMAIL_USE_TLS     = True
EMAIL_HOST_USER     = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = os.environ.get('DEFAULT_FROM_EMAIL', 'Tijori AI <noreply@example.com>')
```

**`.env`** (project root, git-ignored) holds real values:

```
EMAIL_HOST_USER=you@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx   # Gmail App Password (not regular password)
DEFAULT_FROM_EMAIL=Tijori AI <you@gmail.com>
```

Gmail requires a **App Password** (myaccount.google.com → Security → App passwords) when 2FA is enabled — regular passwords are rejected by Gmail SMTP.

`.gitignore` must list `.env`.

`python-dotenv` is already in requirements but `settings.py` does not call `load_dotenv()` yet. The implementation must add this at the top of `settings.py`:

```python
from dotenv import load_dotenv
load_dotenv()
```

## Section 2: Celery Task

**`apps/notifications/tasks.py`** (new file):

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

- All arguments are plain strings — no ORM objects, safe for Celery serialization.
- `from_email=None` falls back to `DEFAULT_FROM_EMAIL` from settings.
- Retries up to 3 times with 60s delay on SMTP failures.

## Section 3: HTML Email Templates

**Directory:** `apps/notifications/templates/notifications/emails/`

| File | Purpose |
|---|---|
| `base.html` | Branded layout — Tijori color palette (`#E8783B` orange, `#0F172A` slate, `#FAFAF8` warm white), header, content block, footer |
| `alert.html` | Extends base — renders `{{ title }}`, `{{ message }}`, `{{ user.first_name }}`, priority badge |
| `alert.txt` | Plain text fallback — same variables, no HTML |

**`apps/notifications/email_utils.py`** (new file):

```python
from django.template.loader import render_to_string

def render_alert_email(user, title, message):
    ctx = {'user': user, 'title': title, 'message': message}
    html  = render_to_string('notifications/emails/alert.html', ctx)
    plain = render_to_string('notifications/emails/alert.txt', ctx)
    return html, plain
```

## Section 4: Dispatcher Update

Replace the blocking `_send_email_alert` in `apps/notifications/dispatcher.py`:

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

`notify_user`, `notify_role`, and `notify_finance_team` are unchanged.

## Files Changed

| File | Change |
|---|---|
| `config/settings.py` | Add Gmail SMTP config via env vars |
| `.env` | New — Gmail credentials (git-ignored) |
| `.gitignore` | Ensure `.env` is listed |
| `apps/notifications/tasks.py` | New — `send_email_task` Celery task |
| `apps/notifications/email_utils.py` | New — `render_alert_email` helper |
| `apps/notifications/templates/notifications/emails/base.html` | New — branded base layout |
| `apps/notifications/templates/notifications/emails/alert.html` | New — alert template |
| `apps/notifications/templates/notifications/emails/alert.txt` | New — plain text fallback |
| `apps/notifications/dispatcher.py` | Update `_send_email_alert` to dispatch Celery task |

## Out of Scope

- Password reset emails (separate feature)
- Invoice/vendor email notifications (separate feature)
- Email open/click tracking
- Unsubscribe flow
