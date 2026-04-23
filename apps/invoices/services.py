import uuid
from django.utils import timezone
from django.db import transaction
from apps.core.models import AuditLog
from .models import Expense, ExpenseApprovalStep, VendorL1Mapping, VALID_TRANSITIONS, STEP_TO_STATUS


class InvalidTransition(Exception):
    pass


class SoDViolation(Exception):
    pass


class InsufficientRole(Exception):
    pass


APPROVAL_LEVEL_TO_STATUS = {
    1: "PENDING_L1",
    3: "PENDING_HOD",
    4: "PENDING_FIN_L1",
    5: "PENDING_FIN_L2",
    6: "PENDING_FIN_HEAD",
}

STATUS_TO_NEXT_STATUS = {
    "SUBMITTED": "PENDING_L1",
    "PENDING_L1": "PENDING_HOD",
    "PENDING_HOD": "PENDING_FIN_L1",
    "PENDING_FIN_L1": "PENDING_FIN_L2",
    "PENDING_FIN_L2": "PENDING_FIN_HEAD",
    "PENDING_FIN_HEAD": "APPROVED",
}

LEVEL_AFTER = {1: 3, 3: 4, 4: 5, 5: 6}


def _find_approver_for_level(level: int):
    from apps.core.models import User
    from .models import GRADE_FOR_STEP

    min_grade = GRADE_FOR_STEP.get(level, 1)
    return (
        User.objects.filter(
            employee_grade__gte=min_grade,
            is_active=True,
        )
        .order_by("employee_grade")
        .first()
    )


def create_initial_approval_step(expense):
    from apps.core.models import User
    from .models import GRADE_FOR_STEP

    mapping = VendorL1Mapping.objects.filter(vendor=expense.vendor, is_primary=True).first()
    if mapping:
        approver = mapping.l1_user
    else:
        approver = User.objects.filter(
            username="l1_approver", is_active=True
        ).first() or _find_approver_for_level(1)
    if not approver:
        return None
    step, _ = ExpenseApprovalStep.objects.get_or_create(
        expense=expense,
        level=1,
        defaults={
            "grade_required": GRADE_FOR_STEP[1],  # ✅ was role_required="EMP_L1"
            "assigned_to": approver,
            "status": "PENDING",
        },
    )
    return step


def create_next_approval_step(expense):
    from .models import GRADE_FOR_STEP

    last_done = (
        ExpenseApprovalStep.objects.filter(expense=expense, status="APPROVED")
        .order_by("-level")
        .first()
    )
    current_level = last_done.level if last_done else 0
    next_level = LEVEL_AFTER.get(current_level)
    if not next_level:
        return None
    approver = _find_approver_for_level(next_level)
    if not approver:
        return None
    step, _ = ExpenseApprovalStep.objects.get_or_create(
        expense=expense,
        level=next_level,
        defaults={
            "grade_required": GRADE_FOR_STEP.get(
                next_level, 1
            ),  # ✅ was role_required=role_labels[...]
            "assigned_to": approver,
            "status": "PENDING",
        },
    )
    return step


def transition_expense(
    expense: Expense, new_status: str, actor, reason: str = "", skip_sod: bool = False
) -> Expense:
    """
    The single gate for all Expense state changes.
    Nothing else ever touches expense._status directly.
    """
    with transaction.atomic():
        # 1. Lock the row
        expense = Expense.objects.select_for_update().get(pk=expense.pk)

        # 2. Valid transition?
        if new_status not in VALID_TRANSITIONS.get(expense.status, set()):
            raise InvalidTransition(f"{expense.status} → {new_status} is not a valid transition.")

        # 3. SoD: actor cannot approve a step they already approved earlier
        already_approved = ExpenseApprovalStep.objects.filter(
            expense=expense, actual_actor=actor, status="APPROVED"
        ).exists()
        if not skip_sod and already_approved and new_status not in ("QUERY_RAISED", "WITHDRAWN"):
            raise SoDViolation(f"Actor {actor} already approved an earlier step on this expense.")

        old_status = expense.status

        # 4. Apply transition
        expense._force_status(new_status)

        # 5. Update step tracking
        step_map = {v: k for k, v in STEP_TO_STATUS.items()}
        if new_status in step_map:
            expense.current_step = step_map[new_status]

        if new_status == "SUBMITTED":
            expense.submitted_at = timezone.now()
        elif new_status == "APPROVED":
            expense.approved_at = timezone.now()

        expense.save()

        # 6. Write audit log
        AuditLog.objects.create(
            user=actor,
            action=f"expense.{new_status.lower()}",
            entity_type="Expense",
            entity_id=expense.id,
            masked_before={"status": old_status},
            masked_after={"status": new_status, "reason": reason},
        )

    return expense
