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


from django.contrib.auth.models import Group

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class UserProfileSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default="")
    full_name = serializers.SerializerMethodField()
    is_vendor = serializers.SerializerMethodField()
    group_names = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_active",
            "is_superuser",
            "last_login",
            "department",
            "department_name",
            "employee_grade",
            "is_vendor",
            "group_names",
            "groups",
        ]
        read_only_fields = ["id", "username", "last_login", "is_superuser", "employee_grade", "groups"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_is_vendor(self, obj):
        try:
            return obj.vendor_profile is not None
        except Exception:
            return False

    def get_group_names(self, obj):
        return list(obj.groups.values_list("name", flat=True))


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
