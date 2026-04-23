from rest_framework import serializers
from django.contrib.auth import authenticate
from apps.core.models import User


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data["username"], password=data["password"])
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError("Account is deactivated.")
        data["user"] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default="")
    full_name = serializers.SerializerMethodField()
    is_vendor = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_superuser",
            "department",
            "department_name",
            "employee_grade",
            "is_vendor",
        ]
        read_only_fields = ["id", "username", "is_superuser"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_is_vendor(self, obj):
        try:
            return obj.vendor_profile is not None
        except Exception:
            return False


class RegisterUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "department",
            "employee_grade",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
