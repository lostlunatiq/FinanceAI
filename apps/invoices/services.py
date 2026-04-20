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
    "SUBMITTED":       "PENDING_L1",
    "PENDING_L1":      "PENDING_HOD",
    "PENDING_HOD":     "PENDING_FIN_L1",
    "PENDING_FIN_L1":  "PENDING_FIN_L2",
    "PENDING_FIN_L2":  "PENDING_FIN_HEAD",
    "PENDING_FIN_HEAD": "APPROVED",
}

LEVEL_AFTER = {1: 3, 3: 4, 4: 5, 5: 6}


def _find_approver_for_level(level):
    from apps.core.models import User
    mapping = {
        1: {"role": "employee",        "is_superuser": False},
        3: {"role": "dept_head",       "is_superuser": False},
        4: {"role": "finance_manager", "is_superuser": False},
        5: {"role": "finance_admin",   "is_superuser": False},
        6: {"role": "finance_admin",   "is_superuser": True},
    }
    cfg = mapping.get(level)
    if not cfg:
        return None
    return User.objects.filter(
        role=cfg["role"], is_active=True, is_superuser=cfg["is_superuser"]
    ).first()


def create_initial_approval_step(expense):
    """Create step 1 (L1) for a newly SUBMITTED expense."""
    from apps.core.models import User
    # Prefer vendor-specific L1 mapping, then 'l1_approver' username, then any employee
    mapping = VendorL1Mapping.objects.filter(vendor=expense.vendor, is_primary=True).first()
    if mapping:
        approver = mapping.l1_user
    else:
        approver = (
            User.objects.filter(username="l1_approver", is_active=True).first()
            or _find_approver_for_level(1)
        )
    if not approver:
        return None
    step, _ = ExpenseApprovalStep.objects.get_or_create(
        expense=expense,
        level=1,
        defaults={
            "role_required": "EMP_L1",
            "assigned_to": approver,
            "status": "PENDING",
        },
    )
    return step


def create_next_approval_step(expense):
    """After an approval step completes, create the next pending step."""
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
    role_labels = {1: "EMP_L1", 3: "DEPT_HEAD", 4: "FIN_L1", 5: "FIN_L2", 6: "FIN_HEAD"}
    step, _ = ExpenseApprovalStep.objects.get_or_create(
        expense=expense,
        level=next_level,
        defaults={
            "role_required": role_labels.get(next_level, f"LEVEL_{next_level}"),
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
            raise InvalidTransition(
                f"{expense.status} → {new_status} is not a valid transition."
            )

        # 3. SoD: actor cannot approve a step they already approved earlier
        already_approved = ExpenseApprovalStep.objects.filter(
            expense=expense, actual_actor=actor, status="APPROVED"
        ).exists()
        if not skip_sod and already_approved and new_status not in ("QUERY_RAISED", "WITHDRAWN"):
            raise SoDViolation(
                f"Actor {actor} already approved an earlier step on this expense."
            )

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

        _mirror_to_clickhouse(expense, actor, old_status, new_status, reason)

    return expense


def _mirror_to_clickhouse(
    expense: Expense,
    actor,
    old_status: str,
    new_status: str,
    reason: str,
) -> None:
    """
    Fire-and-forget mirror to ClickHouse Omega log.
    Called AFTER the transaction commits — never inside atomic().
    If Celery is down, the event is lost from ClickHouse but Postgres AuditLog is intact.
    """
    try:
        from apps.core.tasks import mirror_event_to_clickhouse

        mirror_event_to_clickhouse.delay(
            event_id=str(uuid.uuid4()),
            event_type=f"expense.{new_status.lower()}",
            entity_type="Expense",
            entity_id=str(expense.id),
            actor_id=str(actor.id),
            actor_role=getattr(actor, "role", "unknown"),
            department_id=str(actor.department_id) if actor.department_id else "",
            vendor_id=str(expense.vendor_id),
            amount=float(expense.total_amount or 0),
            status_from=old_status,
            status_to=new_status,
            anomaly_severity=expense.anomaly_severity or "NONE",
            category="",
            metadata={"reason": reason},
            event_ts=timezone.now().isoformat(),
        )
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"ClickHouse mirror task failed to enqueue: {e}")
