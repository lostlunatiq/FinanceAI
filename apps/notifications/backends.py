from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend


class RedirectEmailBackend(EmailBackend):
    """Routes every outgoing email to EMAIL_REDIRECT_TO.

    Set EMAIL_REDIRECT_TO in .env to catch all mail at one address
    without changing any application code — useful when the database
    contains real-looking but dummy recipient addresses.
    """

    def send_messages(self, email_messages):
        redirect_to = getattr(settings, "EMAIL_REDIRECT_TO", None)
        if redirect_to:
            for msg in email_messages:
                msg.to = [redirect_to]
                msg.cc = []
                msg.bcc = []
        return super().send_messages(email_messages)
