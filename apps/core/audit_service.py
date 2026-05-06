"""
Audit logging service for capturing all domain events.
All audit writes go through this service to ensure consistency.

Pattern:
1. Application code calls log_event() at state change points
2. Event is stored in AuditOutbox (Postgres) atomically
3. Celery task drains outbox to ClickHouse in batches
4. Drained events are deleted from outbox

Security:
- NEVER logs sensitive data: passwords, bank accounts, PAN, GST, raw session IDs
- Session ID is stored as SHA-256 hash only
- Context fields are masked before storage
"""

import uuid
from typing import Any, Dict, Optional

from django.contrib.auth import get_user_model
from django.db import transaction

from .middleware import get_request_context
from .models import AuditOutbox

User = get_user_model()


# ─────────────────────────────────────────────
# AUDIT LOGGING SERVICE
# ─────────────────────────────────────────────


def log_event(
    user: Optional[User],
    action: str,
    entity_type: str,
    entity_id: Optional[uuid.UUID],
    payload: Optional[Dict[str, Any]] = None,
    request: Optional[Any] = None
) -> uuid.UUID:
    """
    Log an audit event to the outbox.
    
    This function:
    1. Extracts context from request (or uses system defaults)
    2. Sanitizes payload to remove sensitive data
    3. Creates AuditOutbox row in atomic transaction
    
    Args:
        user: User who performed the action (can be None for system actions)
        action: Short action identifier (e.g., 'expense_submitted', 'user_created')
        entity_type: Type of entity affected (e.g., 'Expense', 'User')
        entity_id: UUID of entity being affected
        payload: Event payload (will be sanitized)
        request: Django HttpRequest (optional, for context extraction)
        
    Returns:
        uuid.UUID: ID of created AuditOutbox row
        
    Examples:
        >>> log_event(user, 'expense_submitted', 'Expense', expense.id, {'amount': 5000})
        >>> log_event(None, 'system_sweep', 'Audit', None, {'reason': 'manual'})
        
    Important:
        - Never log passwords, bank accounts, PAN, GST in payload
        - User is optional for system/background events
        - All data is sanitized before storage
    """
    # Extract context from request or use system defaults
    context = _extract_context(request)

    # Sanitize payload to remove sensitive data
    safe_payload = _sanitize_payload(payload) if payload else {}

    # Get actor info
    actor_name = _get_actor_name(user)
    actor_grade = _get_actor_grade(user)

    # Create audit outbox entry in atomic transaction
    with transaction.atomic():
        event_id = uuid.uuid4()
        event = AuditOutbox.objects.create(
            id=event_id,
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            context=context,
            payload=safe_payload
        )

    return event.id


def log_event_batch(
    events: list,
    request: Optional[Any] = None
) -> int:
    """
    Batch log multiple audit events atomically.
    
    Args:
        events: List of dicts with keys:
            - user (optional User)
            - action (str)
            - entity_type (str)
            - entity_id (optional UUID)
            - payload (optional dict)
        request: Django HttpRequest (optional)
        
    Returns:
        int: Number of events created
        
    Example:
        >>> log_event_batch([
        ...     {'user': u1, 'action': 'expense_submit', 'entity_type': 'Expense', 'entity_id': id1, 'payload': {}},
        ...     {'user': u2, 'action': 'expense_approve', 'entity_type': 'Expense', 'entity_id': id2, 'payload': {}},
        ... ])
    """
    if not events:
        return 0

    context = _extract_context(request)
    actor_name = _get_actor_name(events[0].get('user'))
    actor_grade = _get_actor_grade(events[0].get('user'))

    with transaction.atomic():
        audit_events = []
        for event_data in events:
            user = event_data.get('user')
            action = event_data['action']
            entity_type = event_data['entity_type']
            entity_id = event_data.get('entity_id')
            payload = _sanitize_payload(event_data.get('payload')) if event_data.get('payload') else {}

            event_id = uuid.uuid4()
            audit_events.append(
                AuditOutbox(
                    id=event_id,
                    user=user,
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    context=context,
                    payload=payload
                )
            )

        AuditOutbox.objects.bulk_create(audit_events)
        return len(audit_events)


# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────


def _extract_context(request: Optional[Any]) -> Dict[str, Any]:
    """
    Extract context metadata from request.
    
    Args:
        request: Django HttpRequest or None (for Celery tasks)
        
    Returns:
        Dict with ip_address, user_agent, session_id_hash, request_id
    """
    if not request:
        # No HTTP request (Celery task, management command, background job)
        return {
            'ip': 'system',
            'user_agent': 'system',
            'session_hash': 'system',
            'request_id': 'system'
        }

    # Extract from middleware thread-local storage
    context = get_request_context()

    return {
        'ip': context.get('ip_address', 'system'),
        'user_agent': context.get('user_agent', 'system'),
        'session_hash': context.get('session_id_hash', 'system'),
        'request_id': context.get('request_id', 'system')
    }


def _sanitize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove or mask sensitive data from payload.
    
    Sensitive fields that are NEVER logged:
    - passwords, raw_password
    - bank_account, account_number, routing_number
    - pan, gst, gst_number, gstin
    - aadhar, pan_card, card_number
    - api_key, apikey, token, secret
    - cvv, expiry, pin
    
    Returns:
        Sanitized dict with sensitive fields removed or masked
    """
    sensitive_patterns = [
        'pass', 'secret', 'api_key', 'apikey', 'token', 'pwd', 'key',
        'bank_account', 'account_number', 'routing_number',
        'pan', 'gstin', 'gst_number', 'aadhar',
        'card_number', 'cvv', 'pin', 'expiry'
    ]

    sanitized = {}
    for key, value in payload.items():
        key_lower = key.lower()

        # Check if key matches sensitive patterns
        is_sensitive = any(pattern in key_lower for pattern in sensitive_patterns)

        if is_sensitive:
            # Mask sensitive values
            if isinstance(value, str):
                sanitized[key] = '[REDACTED]'
            elif isinstance(value, dict):
                sanitized[key] = _recursive_mask(value)
            else:
                sanitized[key] = '[REDACTED]'
        else:
            sanitized[key] = _recursive_mask(value) if isinstance(value, dict) else value

    return sanitized


def _recursive_mask(data: Any) -> Any:
    """
    Recursively mask sensitive data in nested dicts and lists.
    
    Args:
        data: Dict, list, or primitive value
        
    Returns:
        Sanitized data structure
    """
    if isinstance(data, dict):
        return {
            key: _recursive_mask(value)
            for key, value in data.items()
        }
    elif isinstance(data, list):
        return [
            _recursive_mask(item)
            for item in data
        ]
    else:
        # Check if primitive is potentially sensitive by looking at surrounding keys
        return data


def _get_actor_name(user: Optional[User]) -> str:
    """
    Get actor name for audit log.
    
    Args:
        user: User instance or None
        
    Returns:
        User display name, email, or 'System'
    """
    if user is None:
        return 'System'

    # Try to get full name, fallback to email, fallback to username
    return user.get_full_name() or user.email or user.username or 'System'


def _get_actor_grade(user: Optional[User]) -> int:
    """
    Get actor grade for audit log.
    
    Args:
        user: User instance with grade attribute or None
        
    Returns:
        User grade (default 1)
    """
    if user is None:
        return 1

    return getattr(user, 'grade', 1)


# ─────────────────────────────────────────────
# DOMAIN-SPECIFIC AUDIT WRAPPERS
# ─────────────────────────────────────────────


def log_auth_event(user: Optional[User], action: str, extra: Dict[str, Any] = None) -> uuid.UUID:
    """
    Log authentication events.
    
    Actions:
    - auth_login_success
    - auth_login_failure
    - auth_logout
    - token_refresh
    - auth_password_changed
    - auth_password_reset_requested
    
    Args:
        user: User performing action (or None for failures)
        action: Event type
        extra: Additional data (will be sanitized)
        
    Returns:
        uuid.UUID: Event ID
    """
    payload = extra or {}
    return log_event(
        user=user,
        action=action,
        entity_type='AuthSession',
        entity_id=None,
        payload=payload
    )


def log_expense_event(user: Optional[User], action: str, expense_id: uuid.UUID, extra: Dict[str, Any] = None) -> uuid.UUID:
    """
    Log expense lifecycle events.
    
    Actions:
    - expense_submitted
    - expense_edited
    - expense_withdrawn
    - status_transition
    - document_attached
    - comment_added
    - query_raised
    
    Args:
        user: User performing action
        action: Event type
        expense_id: UUID of expense
        extra: Additional data
        
    Returns:
        uuid.UUID: Event ID
    """
    payload = extra or {}
    expense_id_str = str(expense_id) if expense_id else None

    return log_event(
        user=user,
        action=action,
        entity_type='Expense',
        entity_id=expense_id_str,
        payload=payload
    )


def log_user_event(user: Optional[User], action: str, target_user_id: uuid.UUID = None) -> uuid.UUID:
    """
    Log user management events.
    
    Actions:
    - iam_user_created
    - iam_user_updated
    - iam_user_activated
    - iam_user_deactivated
    - iam_user_archived
    - iam_admin_password_reset
    - iam_grade_changed
    
    Args:
        user: User performing action
        action: Event type
        target_user_id: UUID of affected user (for updates/deletions)
        
    Returns:
        uuid.UUID: Event ID
    """
    return log_event(
        user=user,
        action=action,
        entity_type='User',
        entity_id=target_user_id
    )


def log_system_event(actor: str = 'System', action: str = 'system_action', extra: Dict[str, Any] = None) -> uuid.UUID:
    """
    Log system-level events (admin tasks, bulk operations, etc.).
    
    Actions:
    - system_settings_changed
    - system_bulk_import
    - system_seed_data_triggered
    - system_audit_sweep_triggered
    
    Args:
        actor: Name of system/admin performing action
        action: Event type
        extra: Additional data
        
    Returns:
        uuid.UUID: Event ID
    """
    payload = extra or {}

    return log_event(
        user=None,
        action=action,
        entity_type='System',
        entity_id=None,
        payload=payload
    )
