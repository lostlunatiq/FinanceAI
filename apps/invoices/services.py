import uuid
from django.utils import timezone
from django.db import transaction
from django.db import OperationalError, ProgrammingError
from django.db.models import Sum
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
    "PENDING_CFO": "APPROVED",  # CFO final approval
}

LEVEL_AFTER = {1: 3, 3: 4, 4: 5, 5: 6}

DEFAULT_APPROVAL_AUTHORITIES = {
    1: {
        "label": "L1 Approver",
        "approval_limit": 50_000,
        "settlement_limit": 0,
        "monthly_approval_budget": None,
        "monthly_settlement_budget": None,
    },
    2: {
        "label": "HOD",
        "approval_limit": 200_000,
        "settlement_limit": 0,
        "monthly_approval_budget": None,
        "monthly_settlement_budget": None,
    },
    3: {
        "label": "Finance Manager",
        "approval_limit": 10_000_000,
        "settlement_limit": 10_000_000,
        "monthly_approval_budget": 50_000_000,
        "monthly_settlement_budget": 50_000_000,
    },
    4: {
        "label": "Finance Admin",
        "approval_limit": 2_000_000,
        "settlement_limit": 2_000_000,
        "monthly_approval_budget": None,
        "monthly_settlement_budget": None,
    },
}


def get_authority_settings(grade: int) -> dict:
    from .models import ApprovalAuthority

    if grade >= 5:
        return {
            "grade": grade,
            "label": "CFO",
            "approval_limit": 999_999_999,
            "settlement_limit": 999_999_999,
            "monthly_approval_budget": None,
            "monthly_settlement_budget": None,
        }

    defaults = DEFAULT_APPROVAL_AUTHORITIES.get(
        grade,
        {
            "label": f"Grade {grade}",
            "approval_limit": None,
            "settlement_limit": None,
            "monthly_approval_budget": None,
            "monthly_settlement_budget": None,
        },
    )
    try:
        authority = ApprovalAuthority.objects.filter(grade=grade).first()
    except (ProgrammingError, OperationalError):
        authority = None
    if not authority:
        return {"grade": grade, **defaults}
    return {
        "grade": grade,
        "label": authority.label or defaults["label"],
        "approval_limit": float(authority.approval_limit)
        if authority.approval_limit is not None
        else defaults["approval_limit"],
        "settlement_limit": float(authority.settlement_limit)
        if authority.settlement_limit is not None
        else defaults["settlement_limit"],
        "monthly_approval_budget": float(authority.monthly_approval_budget)
        if authority.monthly_approval_budget is not None
        else defaults["monthly_approval_budget"],
        "monthly_settlement_budget": float(authority.monthly_settlement_budget)
        if authority.monthly_settlement_budget is not None
        else defaults["monthly_settlement_budget"],
    }


def get_approval_limit(grade: int) -> float:
    limit = get_authority_settings(grade)["approval_limit"]
    return float("inf") if limit is None else float(limit)


def get_settlement_limit(grade: int) -> float:
    limit = get_authority_settings(grade)["settlement_limit"]
    return 0.0 if limit is None else float(limit)


def normalize_approval_chain(expense):
    status_to_level = {v: k for k, v in STEP_TO_STATUS.items()}
    steps = list(expense.approval_steps.order_by("level"))
    max_approved_level = max((step.level for step in steps if step.status == "APPROVED"), default=None)

    if max_approved_level:
        if max_approved_level >= 6 and expense.status != "APPROVED":
            expense._force_status("APPROVED")
            expense.current_step = 6
            expense.save(update_fields=["_status", "current_step"])
        else:
            current_level = status_to_level.get(expense.status)
            if current_level is not None and max_approved_level > current_level:
                expense._force_status(STEP_TO_STATUS[max_approved_level])
                expense.current_step = max_approved_level
                expense.save(update_fields=["_status", "current_step"])

    effective_level = status_to_level.get(expense.status)
    for step in steps:
        should_autocomplete = False
        if max_approved_level and step.status == "PENDING" and step.level < max_approved_level:
            should_autocomplete = True
        if effective_level and step.status == "PENDING" and step.level < effective_level:
            should_autocomplete = True
        if should_autocomplete:
            step.status = "APPROVED"
            step.decided_at = step.decided_at or timezone.now()
            step.decision_reason = step.decision_reason or "Auto-normalized after higher-level progression"
            step.save(update_fields=["status", "decided_at", "decision_reason"])

    return expense


def get_current_pending_step(expense):
    expense = normalize_approval_chain(expense)
    expected_level = {v: k for k, v in STEP_TO_STATUS.items()}.get(expense.status)
    if expected_level is not None:
        step = expense.approval_steps.filter(status="PENDING", level=expected_level).first()
        if step:
            return step

        from .models import GRADE_FOR_STEP

        existing = expense.approval_steps.filter(level=expected_level).first()
        approver = getattr(existing, "assigned_to", None) or _find_approver_for_level(expected_level)
        if not approver:
            return None
        if existing:
            existing.assigned_to = approver
            existing.grade_required = existing.grade_required or GRADE_FOR_STEP.get(expected_level, 1)
            existing.status = "PENDING"
            existing.actual_actor = None
            existing.decided_at = None
            existing.decision_reason = ""
            existing.anomaly_override_reason = ""
            existing.save(
                update_fields=[
                    "assigned_to",
                    "grade_required",
                    "status",
                    "actual_actor",
                    "decided_at",
                    "decision_reason",
                    "anomaly_override_reason",
                ]
            )
            return existing
        return ExpenseApprovalStep.objects.create(
            expense=expense,
            level=expected_level,
            grade_required=GRADE_FOR_STEP.get(expected_level, 1),
            assigned_to=approver,
            status="PENDING",
        )
    return None


def can_user_respond_to_query(user, expense) -> bool:
    if not expense.queries.filter(response="").exists():
        return False
    if user.id == expense.submitted_by_id:
        return True
    vendor_profile = getattr(user, "vendor_profile", None)
    return bool(vendor_profile and vendor_profile.id == expense.vendor_id)


def can_user_take_step_action(user, expense) -> bool:
    if expense.status in {"APPROVED", "PAID", "REJECTED", "AUTO_REJECT", "WITHDRAWN", "EXPIRED"}:
        return False
    if getattr(user, "vendor_profile", None):
        return False
    # CFO / superuser can act on any non-terminal bill including PENDING_CFO
    if user.is_superuser:
        return True
    pending_step = get_current_pending_step(expense)
    if not pending_step:
        return False
    user_grade = user.employee_grade or 1
    if user_grade < (pending_step.grade_required or 1):
        return False
    return pending_step.assigned_to_id == user.id or user_grade >= (pending_step.grade_required or 1)


def get_monthly_actor_spend(actor, field_name: str) -> float:
    start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    total = (
        ExpenseApprovalStep.objects.filter(actual_actor=actor, decided_at__gte=start, status="APPROVED")
        .aggregate(total=Sum(f"expense__{field_name}"))
        .get("total")
    )
    return float(total or 0)


def build_action_permissions(user, expense) -> dict:
    expense = normalize_approval_chain(expense)
    can_step = can_user_take_step_action(user, expense)
    user_grade = user.employee_grade or 1
    authority = get_authority_settings(user_grade)
    return {
        "can_approve": can_step,
        "can_reject": can_step,
        "can_query": can_step,
        "can_respond_query": can_user_respond_to_query(user, expense),
        "can_settle": expense.status == "APPROVED"
        and (user.is_superuser or user_grade >= 3)
        and float(expense.total_amount or 0)
        <= (float("inf") if user.is_superuser else float(authority.get("settlement_limit") or 0)),
    }


def build_query_ai_suggestion(expense, question: str) -> str:
    flags = []
    if expense.ocr_raw and isinstance(expense.ocr_raw, dict):
        flags = expense.ocr_raw.get("anomaly_flags", []) or []
    if flags:
        top = flags[0]
        message = top.get("message") or top.get("type") or "anomaly detected"
        return f"AI suggests clarifying: {message}."
    if expense.ocr_confidence and float(expense.ocr_confidence) < 0.75:
        return "AI suggests asking for clearer invoice details because OCR confidence is low."
    return f"AI suggests validating supporting proof for: {question[:120]}"


def _find_approver_for_level(level: int):
    from apps.core.models import User
    from .models import GRADE_FOR_STEP

    min_grade = GRADE_FOR_STEP.get(level, 1)
    # Exclude vendor users (those with a vendor_profile) and superusers from auto-assignment
    return (
        User.objects.filter(
            employee_grade__gte=min_grade,
            is_active=True,
            is_superuser=False,
        )
        .exclude(vendor_profile__isnull=False)
        .order_by("employee_grade", "username")
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
    """
    Create the next approval step, skipping levels whose grade limit covers the bill amount.
    Bills ≤ grade limit of the approver at that level do not need to go higher.
    """
    from .models import GRADE_FOR_STEP

    last_done = (
        ExpenseApprovalStep.objects.filter(expense=expense, status="APPROVED")
        .order_by("-level")
        .first()
    )
    current_level = last_done.level if last_done else 0
    bill_amount = float(expense.total_amount or 0)

    next_level = LEVEL_AFTER.get(current_level)
    while next_level:
        grade_needed = GRADE_FOR_STEP.get(next_level, 1)
        limit_for_grade = get_approval_limit(grade_needed)
        if bill_amount <= limit_for_grade:
            # This level's limit covers the bill — create step here and stop routing upward
            break
        # Amount exceeds this level's limit — skip to the next higher level
        next_level = LEVEL_AFTER.get(next_level)

    if not next_level:
        return None

    approver = _find_approver_for_level(next_level)
    if not approver:
        return None

    step, _ = ExpenseApprovalStep.objects.get_or_create(
        expense=expense,
        level=next_level,
        defaults={
            "grade_required": GRADE_FOR_STEP.get(next_level, 1),
            "assigned_to": approver,
            "status": "PENDING",
        },
    )
    return step


def superior_override_approve(expense: Expense, actor, reason: str = "") -> Expense:
    """
    CFO / Finance Admin direct approval — auto-clears all intermediate pending steps.
    All skipped levels are recorded as "Skipped via Higher Authority".
    Requires actor grade >= 4 or superuser.
    """
    from .models import GRADE_FOR_STEP, STEP_TO_STATUS

    actor_grade = actor.employee_grade or 1
    if not (actor.is_superuser or actor_grade >= 4):
        raise InsufficientRole("Superior override requires Finance Admin grade (4+) or superuser.")

    terminal = {"APPROVED", "PAID", "REJECTED", "AUTO_REJECT", "WITHDRAWN", "EXPIRED"}
    if expense.status in terminal:
        raise InvalidTransition(f"Expense is already in terminal state: {expense.status}")

    with transaction.atomic():
        expense = Expense.objects.select_for_update().get(pk=expense.pk)
        old_status = expense.status
        now = timezone.now()
        max_level = 6  # PENDING_FIN_HEAD is the last step before APPROVED

        override_note = (
            f"Skipped via Higher Authority — approved by "
            f"{actor.get_full_name() or actor.username} (Grade {actor_grade})"
        )
        final_reason = reason or "Approved by Higher Authority"

        for level in range(1, max_level + 1):
            existing = expense.approval_steps.filter(level=level).first()
            if existing:
                if existing.status == "PENDING":
                    existing.status = "APPROVED"
                    existing.actual_actor = actor
                    existing.decided_at = now
                    existing.decision_reason = (
                        final_reason if level == max_level else override_note
                    )
                    existing.save(
                        update_fields=["status", "actual_actor", "decided_at", "decision_reason"]
                    )
            else:
                approver_fallback = _find_approver_for_level(level) or actor
                ExpenseApprovalStep.objects.create(
                    expense=expense,
                    level=level,
                    grade_required=GRADE_FOR_STEP.get(level, 1),
                    assigned_to=approver_fallback,
                    actual_actor=actor,
                    status="APPROVED",
                    decided_at=now,
                    decision_reason=(
                        final_reason if level == max_level else override_note
                    ),
                )

        expense._force_status("APPROVED")
        expense.current_step = max_level
        expense.approved_at = now
        expense.save()

        AuditLog.objects.create(
            user=actor,
            action="expense.superior_override_approved",
            entity_type="Expense",
            entity_id=expense.id,
            masked_before={"status": old_status},
            masked_after={
                "status": "APPROVED",
                "reason": final_reason,
                "override": True,
                "actor_grade": actor_grade,
                "note": "All intermediate steps auto-cleared by superior authority",
            },
        )

    return expense


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
