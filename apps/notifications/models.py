from django.db import models
from django.conf import settings
import uuid


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notif_prefs',
    )
    email_summaries = models.BooleanField(default=True)
    system_alerts = models.BooleanField(default=True)
    mobile_push = models.BooleanField(default=False)

    def __str__(self):
        return f"NotifPrefs({self.user.username})"


class Notification(models.Model):
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='LOW')
    nav_target = models.CharField(max_length=100, blank=True, null=True)
    
    # Metadata for deep linking
    entity_type = models.CharField(max_length=50, blank=True, null=True)
    entity_id = models.UUIDField(blank=True, null=True)
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Visual cues
    dot_color = models.CharField(max_length=20, default='#F59E0B')
    action_url = models.URLField(max_length=500, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.priority}] {self.user.username}: {self.title}"
