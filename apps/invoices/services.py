# apps/invoices/services.py
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

    return expense
