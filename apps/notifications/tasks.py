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
