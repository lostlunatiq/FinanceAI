from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer

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
