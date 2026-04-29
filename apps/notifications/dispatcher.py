from .models import Notification
from apps.core.models import User

def notify_user(user, title, message, priority='LOW', nav_target=None, entity_type=None, entity_id=None, dot_color=None):
    """
    Central dispatcher for in-app notifications.
    """
    if not dot_color:
        dot_color = '#EF4444' if priority in ['HIGH', 'CRITICAL'] else '#F59E0B'
        
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        priority=priority,
        nav_target=nav_target,
        entity_type=entity_type,
        entity_id=entity_id,
        dot_color=dot_color
    )

def notify_role(grade_min, title, message, priority='LOW', nav_target=None, entity_type=None, entity_id=None, exclude_user=None):
    """
    Notify all users at or above a certain grade.
    Example: notify_role(5, ...) notifies all CFOs.
    """
    users = User.objects.filter(employee_grade__gte=grade_min, is_active=True)
    if exclude_user:
        users = users.exclude(id=exclude_user.id)
        
    for user in users:
        notify_user(user, title, message, priority, nav_target, entity_type, entity_id)

def notify_finance_team(title, message, priority='LOW', nav_target=None, entity_type=None, entity_id=None, exclude_user=None):
    """
    Notify Finance Admin and CFOs.
    """
    notify_role(4, title, message, priority, nav_target, entity_type, entity_id, exclude_user)
