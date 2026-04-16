import functools
from typing import Dict, List, Callable, Optional, Any
from django.db import models
from django.db.models import F
from django.utils import timezone

from .audit import audit_writer


class StateTransitionError(Exception):
    """Base exception for state transition errors"""
    pass


class IllegalTransition(StateTransitionError):
    """Raised when transition is not allowed"""
    pass


class GuardFailed(StateTransitionError):
    """Raised when a guard condition fails"""
    pass


class ConcurrentModification(StateTransitionError):
    """Raised when optimistic locking fails"""
    pass


class Transition:
    """Represents a state transition"""
    
    def __init__(
        self,
        source: str,
        target: str,
        action: str,
        description: str = "",
        guards: List[Callable] = None,
        side_effects: List[Callable] = None,
        after_hooks: List[Callable] = None
    ):
        self.source = source
        self.target = target
        self.action = action
        self.description = description
        self.guards = guards or []
        self.side_effects = side_effects or []
        self.after_hooks = after_hooks or []
    
    def add_guard(self, guard: Callable):
        """Add a guard condition"""
        self.guards.append(guard)
        return self
    
    def add_side_effect(self, side_effect: Callable):
        """Add a side effect"""
        self.side_effects.append(side_effect)
        return self
    
    def add_after_hook(self, hook: Callable):
        """Add an after hook"""
        self.after_hooks.append(hook)
        return self


class StateMachine:
    """State machine definition"""
    
    def __init__(self, name: str):
        self.name = name
        self.transitions: Dict[str, Dict[str, Transition]] = {}
        self.states: List[str] = []
    
    def add_state(self, state: str):
        """Add a state to the machine"""
        if state not in self.states:
            self.states.append(state)
            self.transitions[state] = {}
        return self
    
    def add_transition(self, transition: Transition):
        """Add a transition to the machine"""
        if transition.source not in self.states:
            self.add_state(transition.source)
        if transition.target not in self.states:
            self.add_state(transition.target)
        
        self.transitions[transition.source][transition.target] = transition
        return self
    
    def get_transition(self, source: str, target: str) -> Optional[Transition]:
        """Get transition from source to target state"""
        if source not in self.transitions:
            return None
        return self.transitions[source].get(target)
    
    def get_available_transitions(self, source: str) -> List[Transition]:
        """Get all available transitions from a source state"""
        if source not in self.transitions:
            return []
        return list(self.transitions[source].values())


class StateMachineEngine:
    """
    Generic state machine engine with optimistic locking.
    Based on documentation from docs/plan/14-shared-capabilities.md
    """
    
    def __init__(self):
        self.machines: Dict[str, StateMachine] = {}
    
    def register_machine(self, model_class, machine: StateMachine):
        """Register a state machine for a model class"""
        model_name = model_class._meta.model_name
        self.machines[model_name] = machine
    
    def _get_machine(self, record: models.Model) -> StateMachine:
        """Get state machine for a record"""
        model_name = record._meta.model_name
        if model_name not in self.machines:
            raise ValueError(f"No state machine registered for {model_name}")
        return self.machines[model_name]
    
    def transition_to(
        self,
        record: models.Model,
        target_state: str,
        actor,
        reason: str = "",
        metadata: Optional[Dict] = None
    ) -> models.Model:
        """
        Transition a record to a new state.
        
        Args:
            record: The record to transition
            target_state: Target state
            actor: User performing the transition
            reason: Reason for transition (for audit)
            metadata: Additional metadata for audit
            
        Returns:
            Updated record
            
        Raises:
            IllegalTransition: If transition is not allowed
            GuardFailed: If a guard condition fails
            ConcurrentModification: If optimistic locking fails
        """
        machine = self._get_machine(record)
        transition = machine.get_transition(record.status, target_state)
        
        if not transition:
            raise IllegalTransition(
                f"Cannot transition {record._meta.model_name} "
                f"from {record.status} to {target_state}"
            )
        
        # Check guard conditions
        for guard in transition.guards:
            if not guard(record, actor):
                raise GuardFailed(f"Guard condition failed for {transition.action}")
        
        # Optimistic locking
        updated = type(record).objects.filter(
            id=record.id,
            version=record.version
        ).update(
            status=target_state,
            version=F('version') + 1,
            updated_at=timezone.now()
        )
        
        if updated == 0:
            raise ConcurrentModification(
                f"Concurrent modification detected for {record._meta.model_name} {record.id}"
            )
        
        # Refresh the record
        record.refresh_from_db()
        
        # Execute side effects (within transaction)
        for side_effect in transition.side_effects:
            side_effect(record, actor)
        
        # Audit log (non-bypassable)
        audit_writer.log(
            action=f"{record._meta.model_name}.{transition.action}",
            target_type=record._meta.model_name,
            target_id=record.id,
            actor=actor,
            before=record._before_state,
            after={
                'status': record.status,
                'version': record.version,
                **(metadata or {})
            },
            reason=reason
        )
        
        # Execute post-commit hooks (outside transaction)
        # These are queued as Celery tasks
        for hook in transition.after_hooks:
            # In real implementation, this would be:
            # execute_after_hook.delay(hook.__name__, record.id, actor.id)
            # For now, we'll execute synchronously
            try:
                hook(record, actor)
            except Exception as e:
                # Log but don't fail the transition
                print(f"After hook failed: {e}")
        
        return record
    
    def can_transition(
        self,
        record: models.Model,
        target_state: str,
        actor
    ) -> bool:
        """
        Check if a transition is possible.
        
        Args:
            record: The record to check
            target_state: Target state
            actor: User performing the check
            
        Returns:
            True if transition is possible, False otherwise
        """
        try:
            machine = self._get_machine(record)
            transition = machine.get_transition(record.status, target_state)
            
            if not transition:
                return False
            
            # Check guard conditions
            for guard in transition.guards:
                if not guard(record, actor):
                    return False
            
            return True
            
        except Exception:
            return False
    
    def get_available_transitions(
        self,
        record: models.Model,
        actor
    ) -> List[Transition]:
        """
        Get all available transitions for a record.
        
        Args:
            record: The record to check
            actor: User performing the check
            
        Returns:
            List of available transitions
        """
        machine = self._get_machine(record)
        transitions = machine.get_available_transitions(record.status)
        
        # Filter by guard conditions
        available = []
        for transition in transitions:
            try:
                # Check guard conditions
                guards_ok = all(guard(record, actor) for guard in transition.guards)
                if guards_ok:
                    available.append(transition)
            except Exception:
                continue
        
        return available


# Common guard functions
def require_role(*allowed_roles):
    """Guard that requires actor to have one of the specified roles"""
    def guard(record, actor):
        return actor.role in allowed_roles
    return guard


def require_department(department_field='department'):
    """Guard that requires actor to be in the same department"""
    def guard(record, actor):
        record_dept = getattr(record, department_field, None)
        actor_dept = getattr(actor, 'department', None)
        return record_dept == actor_dept
    return guard


def require_creator():
    """Guard that requires actor to be the creator"""
    def guard(record, actor):
        creator = getattr(record, 'created_by', None)
        return creator == actor
    return guard


def require_amount_lt(max_amount):
    """Guard that requires amount to be less than max_amount"""
    def guard(record, actor):
        amount = getattr(record, 'amount', 0)
        return amount < max_amount
    return guard


def require_no_queries():
    """Guard that requires no pending queries"""
    def guard(record, actor):
        if hasattr(record, 'queries'):
            pending = record.queries.filter(status='PENDING').exists()
            return not pending
        return True
    return guard


def require_no_anomalies():
    """Guard that requires no unresolved anomalies"""
    def guard(record, actor):
        if hasattr(record, 'anomalies'):
            unresolved = record.anomalies.filter(resolved=False).exists()
            return not unresolved
        return True
    return guard


# Common side effect functions
def update_timestamp(field_name='last_updated_at'):
    """Side effect that updates a timestamp field"""
    def side_effect(record, actor):
        setattr(record, field_name, timezone.now())
        record.save(update_fields=[field_name])
    return side_effect


def create_notification(template_key, recipients_field=None):
    """Side effect that creates a notification"""
    def side_effect(record, actor):
        # In real implementation, this would call notification service
        # For now, just a placeholder
        pass
    return side_effect


# Singleton instance
state_machine_engine = StateMachineEngine()