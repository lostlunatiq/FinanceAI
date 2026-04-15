import uuid
from django.utils import timezone
from django.db import transaction
from apps.core.models import AuditLog
from .models import Expense, ExpenseApprovalStep, VALID_TRANSITIONS, STEP_TO_STATUS


class InvalidTransition(Exception):
    pass


class SoDViolation(Exception):
    pass


class InsufficientRole(Exception):
    pass


def transition_expense(
    expense: Expense, new_status: str, actor, reason: str = ""
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
        if already_approved and new_status not in ("QUERY_RAISED", "WITHDRAWN"):
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
