import uuid
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from apps.core.models import AuditLog
from .models import Expense, ExpenseApprovalStep, VALID_TRANSITIONS, STEP_TO_STATUS, ROLE_FOR_STEP


class InvalidTransition(Exception):
    pass


class SoDViolation(Exception):
    pass


class InsufficientRole(Exception):
    pass


# ── Approval step helpers ──────────────────────────────────────────────────────

def _get_approver_for_step(step: int, expense: Expense):
    """
    Resolve the assigned approver for a given step level.
    Priority order: explicit VendorL1Mapping → department-based lookup → role fallback.
    Returns None if no suitable approver is found (step will be skipped).
    """
    from apps.core.models import User
    from .models import VendorL1Mapping

    submitter = expense.submitted_by

    if step == 1:  # EMP_L1 — primary L1 from vendor mapping
        mapping = VendorL1Mapping.objects.filter(
            vendor=expense.vendor, is_primary=True
        ).select_related("l1_user").first()
        if mapping:
            return mapping.l1_user
        # Fallback: any employee who is not the submitter
        return (
            User.objects.filter(role="employee")
            .exclude(pk=submitter.pk)
            .first()
        )

    elif step == 2:  # EMP_L2 — secondary mapping or different employee
        mapping = VendorL1Mapping.objects.filter(
            vendor=expense.vendor, is_primary=False
        ).select_related("l1_user").first()
        if mapping:
            return mapping.l1_user
        # Fallback: finance_manager acts as L2
        return User.objects.filter(role="finance_manager").first()

    elif step == 3:  # DEPT_HEAD
        dept = submitter.department
        if dept:
            head = User.objects.filter(role="dept_head", department=dept).first()
            if head:
                return head
        return User.objects.filter(role="dept_head").first()

    elif step == 4:  # FIN_L1 — first finance_manager
        return User.objects.filter(role="finance_manager").order_by("date_joined").first()

    elif step == 5:  # FIN_L2 — second finance_manager or finance_admin
        mgrs = list(User.objects.filter(role="finance_manager").order_by("date_joined"))
        if len(mgrs) >= 2:
            return mgrs[1]
        return User.objects.filter(role="finance_admin").first()

    elif step == 6:  # FIN_HEAD — finance_admin
        return User.objects.filter(role="finance_admin").first()

    return None


SLA_HOURS = {1: 24, 2: 24, 3: 48, 4: 48, 5: 48, 6: 72}


def create_approval_steps(expense: Expense) -> list:
    """
    Create the full approval step chain for a newly submitted expense.
    Called inside transition_expense when status → SUBMITTED.
    Returns list of created steps.
    """
    steps_config = [
        (1, "EMP_L1"),
        (2, "EMP_L2"),
        (3, "DEPT_HEAD"),
        (4, "FIN_L1"),
        (5, "FIN_L2"),
        (6, "FIN_HEAD"),
    ]

    created = []
    now = timezone.now()

    for level, role_required in steps_config:
        approver = _get_approver_for_step(level, expense)
        if approver is None:
            continue  # skip if no approver found for this step
        step, _ = ExpenseApprovalStep.objects.get_or_create(
            expense=expense,
            level=level,
            defaults={
                "role_required": role_required,
                "assigned_to": approver,
                "status": "PENDING",
                "sla_due_at": now + timedelta(hours=SLA_HOURS.get(level, 48)),
            },
        )
        created.append(step)

    # Immediately advance expense to PENDING_L1 inside the same transaction
    if created:
        expense._force_status("PENDING_L1")
        expense.current_step = 1
        expense.save(update_fields=["_status", "current_step"])

    return created


def create_next_step(expense: Expense, next_level: int) -> ExpenseApprovalStep | None:
    """
    After a step is approved, create (or reactivate) the next step record
    so the next approver sees it in their queue.
    """
    approver = _get_approver_for_step(next_level, expense)
    if approver is None:
        return None

    role_required = ROLE_FOR_STEP.get(next_level, "")
    step, _ = ExpenseApprovalStep.objects.get_or_create(
        expense=expense,
        level=next_level,
        defaults={
            "role_required": role_required,
            "assigned_to": approver,
            "status": "PENDING",
            "sla_due_at": timezone.now() + timedelta(hours=SLA_HOURS.get(next_level, 48)),
        },
    )
    # If the step existed but was not yet active (e.g. re-routing after query), reset it
    if step.status != "PENDING":
        step.status = "PENDING"
        step.decided_at = None
        step.decision_reason = ""
        step.save(update_fields=["status", "decided_at", "decision_reason"])

    return step


# ── Core state machine ────────────────────────────────────────────────────────

def transition_expense(
    expense: Expense, new_status: str, actor, reason: str = ""
) -> Expense:
    """
    The single gate for all Expense state changes.
    Nothing else ever touches expense._status directly.

    SECURITY: all callers must already have verified that `actor` is
    authorised to perform this transition (see CanActOnExpenseStep permission).
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
        if already_approved and new_status not in ("QUERY_RAISED", "WITHDRAWN"):
            raise SoDViolation(
                f"Actor {actor.username} already approved an earlier step on this expense."
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

        # 6. Create approval steps when expense is first submitted
        if new_status == "SUBMITTED":
            create_approval_steps(expense)

        # 7. Write audit log
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
