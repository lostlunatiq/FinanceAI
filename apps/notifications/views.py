from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)
        unread_only = request.query_params.get('unread') == 'true'
        if unread_only:
            qs = qs.filter(is_read=False)
            
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        limit = int(request.query_params.get('limit', 50))
        notifications = qs[:limit]
        
        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            'notifications': serializer.data,
            'unread_count': unread_count,
            'total': qs.count()
        })

class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            try:
                notif = Notification.objects.get(pk=pk, user=request.user)
                notif.is_read = True
                notif.save()
                return Response({'status': 'ok'})
            except Notification.DoesNotExist:
                return Response({'error': 'Not found'}, status=404)
        else:
            Notification.objects.filter(user=request.user).update(is_read=True)
            return Response({'status': 'ok'})

class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


class NotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_or_create(self, user):
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        return prefs

    def get(self, request):
        prefs = self._get_or_create(request.user)
        return Response(NotificationPreferenceSerializer(prefs).data)

    def patch(self, request):
        prefs = self._get_or_create(request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
