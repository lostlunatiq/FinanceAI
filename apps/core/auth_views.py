from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404

from .auth_serializers import LoginSerializer, UserProfileSerializer, RegisterUserSerializer
from .permissions import IsFinanceAdmin
from .models import User, AuditLog


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["username"] = user.username
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user).data,
        }, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            refresh = RefreshToken(refresh_token)
            return Response({"access": str(refresh.access_token)})
        except Exception:
            return Response({"error": "Invalid or expired refresh token."}, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class RegisterView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserProfileSerializer(user).data, status=status.HTTP_201_CREATED)


class UserListView(APIView):
    """
    GET  /api/v1/auth/users/ — List all users (admin only)
    """
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def get(self, request):
        users = User.objects.all().order_by("role", "first_name")
        role_filter = request.query_params.get("role")
        if role_filter:
            users = users.filter(role=role_filter)
        search = request.query_params.get("search")
        if search:
            from django.db.models import Q
            users = users.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        return Response(UserProfileSerializer(users, many=True).data)


class UserDetailView(APIView):
    """
    GET   /api/v1/auth/users/<id>/ — User detail
    PATCH /api/v1/auth/users/<id>/ — Update user (role, active, etc.)
    DELETE /api/v1/auth/users/<id>/ — Deactivate user
    """
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response(UserProfileSerializer(user).data)

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        allowed_fields = {"role", "is_active", "first_name", "last_name", "email", "employee_grade", "department"}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}

        # Handle password change
        if "password" in request.data:
            new_pass = request.data["password"]
            if len(new_pass) >= 6:
                user.set_password(new_pass)

        serializer = UserProfileSerializer(user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if "password" in request.data:
            user.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        user.is_active = False
        user.save()
        return Response({"message": f"User {user.username} deactivated."})


class AuditLogListView(APIView):
    """
    GET /api/v1/audit/ — Paginated audit log
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 50)), 200)
        offset = int(request.query_params.get("offset", 0))
        entity_type = request.query_params.get("entity_type")
        action = request.query_params.get("action")
        user_id = request.query_params.get("user_id")

        qs = AuditLog.objects.select_related("user").order_by("-created_at")

        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if action:
            qs = qs.filter(action__icontains=action)
        if user_id:
            qs = qs.filter(user_id=user_id)

        total = qs.count()
        entries = qs[offset: offset + limit]

        results = []
        for entry in entries:
            results.append({
                "id": str(entry.id),
                "action": entry.action,
                "entity_type": entry.entity_type,
                "entity_id": str(entry.entity_id) if entry.entity_id else None,
                "actor": entry.user.get_full_name() if entry.user else "System",
                "actor_role": entry.user.role if entry.user else "system",
                "timestamp": entry.created_at.isoformat(),
                "details": entry.masked_after or {},
            })

        return Response({"total": total, "results": results, "limit": limit, "offset": offset})



