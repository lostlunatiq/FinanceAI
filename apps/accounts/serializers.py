from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta

from .models import User, UserRole, Department


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    is_delegated = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'department', 'department_name',
            'is_active', 'is_staff', 'is_delegated',
            'created_at', 'updated_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        # Authenticate user
        user = authenticate(username=email, password=password)
        
        if not user:
            raise serializers.ValidationError('Invalid email or password')
        
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled')
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        attrs['user'] = user
        attrs['refresh'] = str(refresh)
        attrs['access'] = str(refresh.access_token)
        
        return attrs


class RefreshSerializer(serializers.Serializer):
    """Serializer for token refresh"""
    refresh = serializers.CharField(required=True)
    
    def validate(self, attrs):
        refresh_token = attrs.get('refresh')
        
        try:
            # Verify the refresh token
            refresh = RefreshToken(refresh_token)
            user_id = refresh['user_id']
            
            # Get the user
            try:
                user = User.objects.get(id=user_id, is_active=True)
            except User.DoesNotExist:
                raise serializers.ValidationError('User not found or inactive')
            
            # Check if token is blacklisted
            from .models import RefreshToken as BlacklistedToken
            if BlacklistedToken.objects.filter(token=refresh_token).exists():
                raise serializers.ValidationError('Token has been blacklisted')
            
            # Generate new access token
            new_access_token = refresh.access_token
            
            attrs['user'] = user
            attrs['access'] = str(new_access_token)
            
        except Exception as e:
            raise serializers.ValidationError(f'Invalid token: {str(e)}')
        
        return attrs


class LogoutSerializer(serializers.Serializer):
    """Serializer for user logout"""
    refresh = serializers.CharField(required=True)
    
    def validate(self, attrs):
        refresh_token = attrs.get('refresh')
        
        try:
            # Verify the refresh token
            refresh = RefreshToken(refresh_token)
            user_id = refresh['user_id']
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                raise serializers.ValidationError('User not found')
            
            # Set expiration (24 hours from now for blacklist)
            expires_at = timezone.now() + timedelta(hours=24)
            
            attrs['user'] = user
            attrs['expires_at'] = expires_at
            
        except Exception as e:
            raise serializers.ValidationError(f'Invalid token: {str(e)}')
        
        return attrs


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model"""
    head_name = serializers.CharField(source='head.full_name', read_only=True, default=None)
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'cost_centre_code', 'head', 'head_name',
            'budget_annual', 'budget_q1', 'budget_q2', 'budget_q3', 'budget_q4',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users"""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'password',
            'role', 'department', 'is_active', 'is_staff'
        ]
        read_only_fields = ['id']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            **{k: v for k, v in validated_data.items() if k != 'email'}
        )
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance