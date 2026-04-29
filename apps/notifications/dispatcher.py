from .models import Notification, NotificationPreference
from apps.core.models import User


def _get_prefs(user):
    try:
        return user.notif_prefs
    except NotificationPreference.DoesNotExist:
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        return prefs


def _send_email_alert(user, title, message):
    from django.core.mail import send_mail
    from django.conf import settings
    try:
        send_mail(
            subject=f"[Tijori Alert] {title}",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass


def notify_user(user, title, message, priority='LOW', nav_target=None, entity_type=None, entity_id=None, dot_color=None):
    prefs = _get_prefs(user)

    # Skip HIGH/CRITICAL in-app notifications if user has system_alerts off
    if not prefs.system_alerts and priority in ('HIGH', 'CRITICAL'):
        return None

    if not dot_color:
        dot_color = '#EF4444' if priority in ['HIGH', 'CRITICAL'] else '#F59E0B'

    notif = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        priority=priority,
        nav_target=nav_target,
        entity_type=entity_type,
        entity_id=entity_id,
        dot_color=dot_color,
    )

    # Send email if user has email_summaries on and has an email address
    if prefs.email_summaries and user.email:
        _send_email_alert(user, title, message)

    return notif


def notify_role(grade_min, title, message, priority='LOW', nav_target=None, entity_type=None, entity_id=None, exclude_user=None):
    users = User.objects.filter(employee_grade__gte=grade_min, is_active=True)
    if exclude_user:
        users = users.exclude(id=exclude_user.id)

    for user in users:
        notify_user(user, title, message, priority, nav_target, entity_type, entity_id)


def notify_finance_team(title, message, priority='LOW', nav_target=None, entity_type=None, entity_id=None, exclude_user=None):
    notify_role(4, title, message, priority, nav_target, entity_type, entity_id, exclude_user)
