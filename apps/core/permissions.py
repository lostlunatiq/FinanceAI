# apps/core/permissions.py
from rest_framework.permissions import BasePermission

ROLE_HIERARCHY = ["employee", "dept_head", "finance_manager", "finance_admin"]


class IsFinanceAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == "finance_admin"


class IsFinanceManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ["finance_admin", "finance_manager"]


class IsDeptHeadOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ["finance_admin", "finance_manager", "dept_head"]


class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated
