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


# ── send_email_task ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSendEmailTask:
    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
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

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
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

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_plain_body_is_message_body(self):
        from apps.notifications.tasks import send_email_task
        send_email_task.delay(
            to="alice@example.com",
            subject="Test",
            html_body="<p>Hello</p>",
            plain_body="Hello plain",
        )
        assert mail.outbox[0].body == "Hello plain"


# ── RedirectEmailBackend ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRedirectEmailBackend:
    @override_settings(EMAIL_REDIRECT_TO="catchall@example.com")
    def test_rewrites_recipient_to_redirect_address(self):
        from apps.notifications.backends import RedirectEmailBackend
        from django.core.mail import EmailMultiAlternatives
        from django.core.mail.backends.smtp import EmailBackend

        backend = RedirectEmailBackend()
        msg = EmailMultiAlternatives("Subject", "body", "from@example.com", ["original@example.com"])
        with patch.object(EmailBackend, "send_messages", return_value=1):
            backend.send_messages([msg])
        assert msg.to == ["catchall@example.com"]
        assert msg.cc == []
        assert msg.bcc == []

    @override_settings(EMAIL_REDIRECT_TO="catchall@example.com")
    def test_strips_cc_and_bcc(self):
        from apps.notifications.backends import RedirectEmailBackend
        from django.core.mail import EmailMultiAlternatives
        from django.core.mail.backends.smtp import EmailBackend

        backend = RedirectEmailBackend()
        msg = EmailMultiAlternatives(
            "Subject", "body", "from@example.com",
            to=["a@example.com"], cc=["b@example.com"], bcc=["c@example.com"],
        )
        with patch.object(EmailBackend, "send_messages", return_value=1):
            backend.send_messages([msg])
        assert msg.to == ["catchall@example.com"]
        assert msg.cc == []
        assert msg.bcc == []


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
