from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(source='created_at')

    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'priority', 'nav_target',
            'entity_type', 'entity_id', 'is_read', 'timestamp',
            'dot_color', 'action_url'
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['email_summaries', 'system_alerts', 'mobile_push']
