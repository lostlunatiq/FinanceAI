import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.utils import timezone
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTRefreshView
from django.contrib.auth import get_user_model
from django.conf import settings

from .models import User, RefreshToken, Department
from .serializers import (
    UserSerializer, LoginSerializer, RefreshSerializer, 
    LogoutSerializer, DepartmentSerializer, UserCreateSerializer
)

User = get_user_model()


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Authenticate user and return JWT tokens
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        refresh_token = serializer.validated_data['refresh']
        access_token = serializer.validated_data['access']
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Create response data
        user_data = UserSerializer(user).data
        response_data = {
            'user': user_data,
            'tokens': {
                'refresh': refresh_token,
                'access': access_token
            }
        }
        
        # Set refresh token as HTTP-only cookie
        response = Response(response_data, status=status.HTTP_200_OK)
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Strict',
            max_age=24 * 60 * 60  # 24 hours
        )
        
        return response


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklist refresh token and logout user
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        refresh_token = request.data.get('refresh')
        user = serializer.validated_data['user']
        expires_at = serializer.validated_data['expires_at']
        
        # Blacklist the refresh token
        RefreshToken.objects.create(
            token=refresh_token,
            user=user,
            expires_at=expires_at
        )
        
        # Clear the refresh token cookie
        response = Response(
            {'detail': 'Successfully logged out'},
            status=status.HTTP_200_OK
        )
        response.delete_cookie('refresh_token')
        
        return response


class RefreshView(SimpleJWTRefreshView):
    """
    POST /api/v1/auth/refresh/
    Refresh access token using refresh token
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        # Try to get refresh token from cookie first
        refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
        
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if token is blacklisted
        if RefreshToken.objects.filter(token=refresh_token).exists():
            return Response(
                {'detail': 'Token has been blacklisted'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Use the parent class to handle token refresh
        request.data['refresh'] = refresh_token
        return super().post(request, *args, **kwargs)


class MeView(APIView):
    """
    GET /api/v1/auth/me/
    Get current user profile
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserListView(generics.ListAPIView):
    """
    GET /api/v1/auth/users/
    List all users (admin only)
    """
    permission_classes = [permissions.IsAdminUser]  # Use Django's built-in admin check
    queryset = User.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/PATCH/DELETE /api/v1/auth/users/{id}/
    Manage user details (admin only)
    """
    permission_classes = [permissions.IsAdminUser]  # Use Django's built-in admin check
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    lookup_field = 'id'
    
    def perform_destroy(self, instance):
        # Soft delete: mark as inactive
        instance.is_active = False
        instance.save()


class DepartmentListView(generics.ListCreateAPIView):
    """
    GET/POST /api/v1/auth/departments/
    List and create departments
    """
    permission_classes = [IsAuthenticated]  # Simplified for now
    queryset = Department.objects.all().order_by('name')
    serializer_class = DepartmentSerializer


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/PATCH/DELETE /api/v1/auth/departments/{id}/
    Manage department details
    """
    permission_classes = [IsAuthenticated]  # Simplified for now
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    lookup_field = 'id'


class WhoamiView(APIView):
    """
    GET /api/v1/auth/whoami/
    Get minimal user info for permission checking
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            'id': str(user.id),
            'email': user.email,
            'role': user.role,
            'role_display': user.get_role_display(),
            'department_id': str(user.department.id) if user.department else None,
            'full_name': user.full_name,
            'is_staff': user.is_staff,
            'is_active': user.is_active,
            'permissions': {
                'can_approve_expenses': user.role in ['HOD', 'FIN_L1', 'FIN_L2', 'CFO', 'ADMIN'],
                'can_view_financials': user.role in ['FIN_L1', 'FIN_L2', 'CFO', 'ADMIN', 'AUDITOR'],
                'can_manage_users': user.role in ['ADMIN'],
                'can_manage_vendors': user.role in ['FIN_L1', 'FIN_L2', 'CFO', 'ADMIN'],
            }
        })