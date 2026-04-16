from rest_framework import permissions
from .models import UserRole


class HasRole(permissions.BasePermission):
    """
    Permission check for specific user roles
    """
    def __init__(self, allowed_roles):
        self.allowed_roles = allowed_roles
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.allowed_roles
    
    def __call__(self):
        return self


class IsAdmin(permissions.BasePermission):
    """Check if user is ADMIN"""
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == UserRole.ADMIN
        )


class IsFinanceUser(permissions.BasePermission):
    """Check if user is in finance department (FIN_L1, FIN_L2, CFO)"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [UserRole.FIN_L1, UserRole.FIN_L2, UserRole.CFO]


class IsDepartmentHeadOrAbove(permissions.BasePermission):
    """Check if user is Department Head or above (HOD, FIN_L1, FIN_L2, CFO, CEO, ADMIN)"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [
            UserRole.HOD, UserRole.FIN_L1, UserRole.FIN_L2, 
            UserRole.CFO, UserRole.CEO, UserRole.ADMIN
        ]


class IsVendor(permissions.BasePermission):
    """Check if user is a VENDOR"""
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == UserRole.VENDOR
        )


class IsEmployee(permissions.BasePermission):
    """Check if user is an employee (EMP_L1, EMP_L2)"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [UserRole.EMP_L1, UserRole.EMP_L2]


class IsAuditor(permissions.BasePermission):
    """Check if user is an auditor (AUDITOR, EXTERNAL_CA)"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [UserRole.AUDITOR, UserRole.EXTERNAL_CA]


class CanApproveExpenses(permissions.BasePermission):
    """Check if user can approve expenses"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [
            UserRole.HOD, UserRole.FIN_L1, UserRole.FIN_L2, 
            UserRole.CFO, UserRole.CEO, UserRole.ADMIN
        ]


class CanViewFinancials(permissions.BasePermission):
    """Check if user can view financial data"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [
            UserRole.FIN_L1, UserRole.FIN_L2, UserRole.CFO,
            UserRole.CEO, UserRole.ADMIN, UserRole.AUDITOR, UserRole.EXTERNAL_CA
        ]


class CanManageUsers(permissions.BasePermission):
    """Check if user can manage users"""
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == UserRole.ADMIN
        )


class CanManageVendors(permissions.BasePermission):
    """Check if user can manage vendors"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [
            UserRole.FIN_L1, UserRole.FIN_L2, UserRole.CFO, UserRole.ADMIN
        ]


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Check if user is the owner of the object or an admin
    """
    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user.role == UserRole.ADMIN:
            return True
        
        # Check if user is the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        return False


class DelegationAwarePermission(permissions.BasePermission):
    """
    Permission that considers delegation
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get effective role considering delegation
        effective_role = request.user.get_effective_role()
        
        # Check permission based on effective role
        return self.check_effective_role(effective_role)
    
    def check_effective_role(self, role):
        """Override this method in subclasses"""
        raise NotImplementedError


class IsDelegatedFinanceUser(DelegationAwarePermission):
    """Check if user is a finance user considering delegation"""
    def check_effective_role(self, role):
        return role in [UserRole.FIN_L1, UserRole.FIN_L2, UserRole.CFO]