from django.template.loader import render_to_string


def render_alert_email(user, title, message):
    ctx = {"user": user, "title": title, "message": message}
    html  = render_to_string("notifications/emails/alert.html", ctx)
    plain = render_to_string("notifications/emails/alert.txt", ctx)
    return html, plain
