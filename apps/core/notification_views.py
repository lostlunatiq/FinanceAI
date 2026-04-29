from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 20)), 50)
        notifs = Notification.objects.filter(user=request.user).order_by("-created_at")
        
        unread_count = notifs.filter(is_read=False).count()
        
        results = []
        for n in notifs[:limit]:
            # Derive dot color and navTarget similar to what frontend did
            dot = "#F59E0B"
            if n.action and "reject" in n.action.lower():
                dot = "#EF4444"
            elif n.action and "approv" in n.action.lower():
                dot = "#10B981"
            elif n.action and "paid" in n.action.lower():
                dot = "#8B5CF6"

            navTarget = "audit"
            entity_type = (n.entity_type or "").lower()
            if entity_type == "expense":
                navTarget = "ap-hub"
            elif entity_type == "vendor":
                navTarget = "vendors"
            elif entity_type == "user":
                navTarget = "iam"

            results.append({
                "id": n.id,
                "text": n.text,
                "sub": n.sub_text,
                "action": n.action,
                "entity_type": n.entity_type,
                "entity_id": n.entity_id,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
                "time": n.created_at.strftime("%H:%M"),  # formatted for UI
                "dot": dot,
                "navTarget": navTarget
            })
            
        return Response({
            "results": results,
            "unread_count": unread_count,
        })

class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            Notification.objects.filter(user=request.user, id=pk).update(is_read=True)
        else:
            # Mark all as read
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"status": "ok"})
