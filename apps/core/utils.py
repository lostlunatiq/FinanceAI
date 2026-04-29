import functools
import logging
import time
from enum import Enum
from django.db import models
from django.db.models.base import ModelBase

logger = logging.getLogger(__name__)


class InvalidTransitionError(Exception):
    pass


def log_audit_event(
    *,
    user=None,
    action: str,
    entity_type: str = "",
    entity_id=None,
    entity_display_name: str = "",
    masked_before=None,
    masked_after=None,
    change_summary: str = "",
    metadata=None,
    request=None,
):
    """
    Central helper for writing immutable audit log entries.

    If *request* is provided, IP address, user-agent and request-id are
    extracted automatically (requires AuditLogMiddleware).
    """
    from .models import AuditLog

    ip_address = getattr(request, "audit_ip_address", None) if request else None
    user_agent = getattr(request, "audit_user_agent", "") if request else ""
    request_id = getattr(request, "audit_request_id", "") if request else ""

    # Auto-generate a terse change summary if none provided
    if not change_summary and masked_before and masked_after:
        changes = []
        for key in sorted(set(masked_before.keys()) | set(masked_after.keys())):
            b = masked_before.get(key)
            a = masked_after.get(key)
            if b != a:
                changes.append(f"{key}: {b} → {a}")
        if changes:
            change_summary = "; ".join(changes)[:500]

    return AuditLog.objects.create(
        user=user,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_display_name=entity_display_name,
        masked_before=masked_before,
        masked_after=masked_after,
        change_summary=change_summary,
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id,
        metadata=metadata,
    )


def log_to_db():
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            from .tasks import log_approval_action

            started_at = time.perf_counter()
            result = None
            exception = None
            status = "success"

            try:
                result = func(*args, **kwargs)
                return result
            except Exception as exc:
                exception = exc
                status = "error"
                raise
            finally:
                duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
                try:
                    log_approval_action.delay(
                        function_name=func.__name__,
                        module=func.__module__,
                        args=repr(args),
                        kwargs=repr(kwargs),
                        result=repr(result),
                        exception=str(exception) if exception else "",
                        status=status,
                        duration_ms=duration_ms,
                    )
                except Exception:
                    logger.exception("Failed to enqueue audit function log")

        return wrapper

    return decorator


class AuditLogMeta(type):
    def __new__(mcs, name, bases, namespaces, **kwargs):
        for attr_name, attr_value in list(namespaces.items()):
            if callable(attr_value) and not attr_name.startswith("__"):
                namespaces[attr_name] = log_to_db()(attr_value)

        return super().__new__(mcs, name, bases, namespaces, **kwargs)


class StatefulModelBase(AuditLogMeta, ModelBase):
    """
    MRO:  StatefulModelBase → AuditLogMeta → ModelBase (Django)

    Each __new__ calls super().__new__() so they execute in order:
    1. StatefulModelBase  — builds state machine, injects field
    2. AuditLogMeta       — wraps public methods with log_to_db()
    3. Django's ModelBase — ORM, migrations, everything Django
    """

    def __new__(mcs, name, bases, namespace, employees=None, **kwargs):

        # Step 1 — inject state machine into namespace
        if employees:
            State, transitions, sink_states = mcs._build_machine(employees)

            choices = [(s.value, s.name.replace("_", " ").title()) for s in State]

            namespace["state"] = models.CharField(
                max_length=50,
                choices=choices,
                default=next(iter(State)).value,
            )
            namespace["_State"] = State
            namespace["_TRANSITIONS"] = transitions
            namespace["_SINK_STATES"] = sink_states

        # Step 2 — super() hits AuditLogMeta next (wraps methods),
        #           then ModelBase (builds the Django model)
        return super().__new__(mcs, name, bases, namespace, **kwargs)


class StateMachineMixin:
    """
    Pure behaviour — no DB fields declared here.
    Reads/writes self.state which is injected by StatefulModelBase.
    """

    @property
    def current_state(self):
        return self._State(self.state)

    @property
    def is_terminal(self):
        return self.current_state in self._SINK_STATES

    def transition_to(self, new_state, save=True):
        allowed = self._TRANSITIONS[self.current_state]

        if not allowed:
            raise InvalidTransitionError(
                f"'{self.current_state.name}' is a sink — no further transitions."
            )
        if new_state not in allowed:
            raise InvalidTransitionError(
                f"'{self.current_state.name}' → '{new_state.name}' not allowed. "
                f"Valid: {[s.name for s in allowed]}"
            )

        self.state = new_state.value
        if save:
            self.save(update_fields=["state"])

    def assign_to(self, employee: str):
        key = f"PENDING_{employee.upper()}"
        if not hasattr(self._State, key):
            raise ValueError(f"'{employee}' is not a valid employee.")
        self.state = self._State[key].value
        self.save(update_fields=["state"])

    def start_processing(self):
        self.transition_to(self._State.PROCESSING)

    def complete(self):
        self.transition_to(self._State.COMPLETED)

    def cancel(self):
        self.transition_to(self._State.CANCELLED)


class InvoiceApprovalMixin(StateMachineMixin):
    """
    Adds approval-chain rules on top of the generic state machine.
    Only override transition_to — everything else is inherited.
    """

    def transition_to(self, approver: Employee, new_state, save=True):
        self._validate_approval(approver)
        super().transition_to(new_state, save)  # generic state machine handles the rest

    def _validate_approval(self, approver: Employee):
        steps = list(self.approval_steps.select_related("employee").order_by("order"))
        approved = [s for s in steps if s.status == "approved"]
        previous = approved[-1] if approved else None

        # Rule 1 — same department: must be strictly higher level
        if previous and approver.department == previous.employee.department:
            if approver.level <= previous.employee.level:
                raise ApprovalError(
                    f"{approver.name} (L{approver.level}) must be higher level "
                    f"than {previous.employee.name} (L{previous.employee.level})."
                )

        # Rule 2 — different department: must appear later in the chain
        current_step = next(s for s in steps if s.employee_id == approver.pk)
        if previous and current_step.order <= previous.order:
            raise ApprovalError(
                f"{approver.name} is not positioned after {previous.employee.name} in the chain."
            )

        # Rule 3 — skip everyone below the current approver
        self.approval_steps.filter(order__lt=current_step.order, status="pending").update(
            status="skipped"
        )
