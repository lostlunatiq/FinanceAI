# apps/core/permissions.py
"""
Role-based and object-level permission classes for FinanceAI.

SECURITY POLICY (non-negotiable):
  - No privilege escalation: every view must declare explicit permission_classes.
  - Vendors may only access their own data.
  - Finance operations require finance_manager or finance_admin roles.
  - Approvers may only act on steps they are explicitly assigned to.
  - Object-level checks are performed in has_object_permission; views must call
    self.check_object_permissions(request, obj) before returning data.
"""
from rest_framework.permissions import BasePermission

FINANCE_ROLES = ("finance_admin", "finance_manager", "cfo")
APPROVER_ROLES = ("employee", "dept_head", "finance_manager", "finance_admin", "cfo")
INTERNAL_ROLES = ("employee", "dept_head", "finance_manager", "finance_admin", "cfo")


# ── Role-level checks ──────────────────────────────────────────────────────────

class IsCFO(BasePermission):
    """Only CFO role."""
    message = "CFO access required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == "cfo")


class IsFinanceAdmin(BasePermission):
    """finance_admin or CFO (CFO has equivalent payment authority)."""
    message = "Finance administrator access required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in ("finance_admin", "cfo"))


class IsFinanceOrAdmin(BasePermission):
    """finance_manager or finance_admin."""
    message = "Finance team access required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in FINANCE_ROLES)


class IsFinanceManager(BasePermission):
    """finance_manager or finance_admin (legacy alias for IsFinanceOrAdmin)."""
    message = "Finance manager access required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in FINANCE_ROLES)


class IsDeptHeadOrAbove(BasePermission):
    """dept_head, finance_manager, or finance_admin."""
    message = "Department head or above access required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in ("dept_head", "finance_manager", "finance_admin"))


class IsInternalUser(BasePermission):
    """Any non-vendor authenticated user (employee, dept_head, finance_*)."""
    message = "Internal staff access required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in INTERNAL_ROLES)


class IsVendorOnly(BasePermission):
    """Only vendor role accounts."""
    message = "Vendor account required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == "vendor")


class IsEmployee(BasePermission):
    """Any authenticated user (kept for backward compat; prefer IsInternalUser for finance ops)."""
    message = "Authentication required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


# ── Object-level checks ───────────────────────────────────────────────────────

class CanViewExpense(BasePermission):
    """
    An expense is visible to:
      - The user who submitted it (or the vendor linked to that user).
      - Any internal user (approvers, finance team).
    Vendors may NOT see other vendors' expenses.
    """
    message = "You do not have permission to view this expense."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in INTERNAL_ROLES:
            return True
        # Vendor: only see own submissions
        if user.role == "vendor":
            if obj.submitted_by_id == user.id:
                return True
            if hasattr(user, "vendor_profile") and obj.vendor_id == user.vendor_profile.id:
                return True
            return False
        return False


class CanActOnExpenseStep(BasePermission):
    """
    A user may approve/reject/query an expense only if:
      1. They are the assigned approver for the CURRENT PENDING step.
      2. They are NOT the user who submitted the expense (SoD).
    Finance admins may act on any step as override (audit-logged separately).
    """
    message = "You are not the assigned approver for this expense at the current step."

    def has_object_permission(self, request, view, obj):
        from apps.invoices.models import ExpenseApprovalStep
        user = request.user

        # SoD: submitter cannot approve their own expense.
        # Exception: when filed_on_behalf=True, the filer (e.g. HOD) submitted it
        # administratively on behalf of a vendor and is the appropriate operational
        # reviewer at their level — allow them to approve their assigned step.
        if obj.submitted_by_id == user.id:
            is_behalf_filer = obj.filed_on_behalf and obj.filer_on_behalf_id == user.id
            if not is_behalf_filer:
                return False

        # Check user is assigned to THE CURRENT PENDING step (not any future step).
        # current_step tracks the active level; approvers for later steps must wait.
        current_level = getattr(obj, "current_step", None)
        is_assigned = ExpenseApprovalStep.objects.filter(
            expense=obj,
            assigned_to=user,
            status="PENDING",
            level=current_level,  # must be the active step, not a future one
        ).exists()

        if is_assigned:
            return True

        # Finance admin / CFO can override any step (still audit-logged)
        return user.role in ("finance_admin", "cfo")


class CanRespondToQuery(BasePermission):
    """
    Only the expense submitter (or their vendor) may respond to queries,
    plus finance admins.
    """
    message = "You are not permitted to respond to this query."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == "finance_admin":
            return True
        if obj.submitted_by_id == user.id:
            return True
        if hasattr(user, "vendor_profile") and obj.vendor_id == user.vendor_profile.id:
            return True
        return False


class CanDownloadFile(BasePermission):
    """
    A file may be downloaded by:
      - The user who uploaded it.
      - Any internal user.
    Vendors may only download files they uploaded.
    """
    message = "You do not have permission to download this file."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in INTERNAL_ROLES:
            return True
        # Vendor: only own uploads
        return obj.uploaded_by_id == user.id
