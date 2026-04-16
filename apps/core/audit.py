import hashlib
import json
from typing import Optional, Dict, Any
from django.utils import timezone
from django.conf import settings
from django.db import transaction

from .models import AuditLog, User


class AuditWriter:
    """
    Hash-chained audit log writer.
    Based on documentation from docs/plan/14-shared-capabilities.md
    """
    
    @staticmethod
    def _get_client_ip(request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def _compute_hash(payload: str, prev_hash: str) -> str:
        """Compute SHA256 hash of payload + previous hash"""
        return hashlib.sha256(f"{prev_hash}{payload}".encode()).hexdigest()
    
    @staticmethod
    def _create_payload(
        action: str,
        target_type: str,
        target_id: str,
        actor_id: str,
        actor_role: str,
        before: Optional[Dict] = None,
        after: Optional[Dict] = None,
        reason: str = "",
        metadata: Optional[Dict] = None
    ) -> str:
        """Create deterministic payload for hashing"""
        payload_dict = {
            'action': action,
            'target_type': target_type,
            'target_id': target_id,
            'actor_id': actor_id,
            'actor_role': actor_role,
            'timestamp': timezone.now().isoformat(),
            'before': before or {},
            'after': after or {},
            'reason': reason,
            'metadata': metadata or {}
        }
        
        # Sort keys for deterministic JSON
        return json.dumps(payload_dict, sort_keys=True)
    
    @classmethod
    def log(
        cls,
        action: str,
        target_type: str,
        target_id,
        actor,
        before: Optional[Dict] = None,
        after: Optional[Dict] = None,
        reason: str = "",
        metadata: Optional[Dict] = None,
        request=None
    ):
        """
        Create an audit log entry with hash chaining.
        
        Args:
            action: Action performed (e.g., 'expense.approved_l1')
            target_type: Type of target (e.g., 'expense', 'invoice')
            target_id: ID of target object
            actor: User performing the action
            before: State before the action (should be masked)
            after: State after the action (should be masked)
            reason: Reason for the action
            metadata: Additional metadata
            request: Optional request object for IP/user agent
        """
        # Get previous hash
        last_entry = AuditLog.objects.order_by('-created_at').first()
        prev_hash = last_entry.entry_hash if last_entry else '0' * 64
        
        # Create payload and compute hash
        payload = cls._create_payload(
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            actor_id=str(actor.id),
            actor_role=actor.role,
            before=before,
            after=after,
            reason=reason,
            metadata=metadata
        )
        
        entry_hash = cls._compute_hash(payload, prev_hash)
        
        # Create audit log entry
        audit_log = AuditLog(
            user=actor if isinstance(actor, User) else None,
            action=action,
            entity_type=target_type,
            entity_id=target_id,
            masked_before=before,
            masked_after=after,
            prev_hash=prev_hash,
            entry_hash=entry_hash
        )
        
        # Add request info if available
        if request:
            audit_log.ip_address = cls._get_client_ip(request)
            audit_log.user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        audit_log.save()
        return audit_log
    
    @classmethod
    def log_system_action(
        cls,
        action: str,
        target_type: str,
        target_id,
        before: Optional[Dict] = None,
        after: Optional[Dict] = None,
        reason: str = "",
        metadata: Optional[Dict] = None
    ):
        """
        Create an audit log entry for system actions.
        
        Args:
            Same as log(), but without actor (uses SYSTEM)
        """
        # Get previous hash
        last_entry = AuditLog.objects.order_by('-created_at').first()
        prev_hash = last_entry.entry_hash if last_entry else '0' * 64
        
        # Create payload and compute hash
        payload = cls._create_payload(
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            actor_id='SYSTEM',
            actor_role='SYSTEM',
            before=before,
            after=after,
            reason=reason,
            metadata=metadata
        )
        
        entry_hash = cls._compute_hash(payload, prev_hash)
        
        # Create audit log entry
        audit_log = AuditLog(
            action=action,
            entity_type=target_type,
            entity_id=target_id,
            masked_before=before,
            masked_after=after,
            prev_hash=prev_hash,
            entry_hash=entry_hash
        )
        
        audit_log.save()
        return audit_log
    
    @classmethod
    def verify_chain(cls) -> bool:
        """
        Verify the integrity of the audit log hash chain.
        
        Returns:
            True if chain is valid, False otherwise
        """
        entries = AuditLog.objects.all().order_by('created_at')
        
        prev_hash = '0' * 64
        for entry in entries:
            # Recreate payload
            payload = cls._create_payload(
                action=entry.action,
                target_type=entry.entity_type,
                target_id=str(entry.entity_id),
                actor_id=str(entry.user.id) if entry.user else 'SYSTEM',
                actor_role=entry.user.role if entry.user else 'SYSTEM',
                before=entry.masked_before,
                after=entry.masked_after,
                reason='',  # Reason not stored in payload reconstruction
                metadata={}
            )
            
            # Compute expected hash
            expected_hash = cls._compute_hash(payload, prev_hash)
            
            if entry.entry_hash != expected_hash:
                print(f"Hash mismatch at entry {entry.id}:")
                print(f"  Expected: {expected_hash}")
                print(f"  Actual:   {entry.entry_hash}")
                print(f"  Prev hash: {prev_hash}")
                return False
            
            prev_hash = entry.entry_hash
        
        return True


class audited:
    """
    Decorator for automatic audit logging of function calls.
    
    Usage:
        @audited(action='expense.approved', target_type='expense')
        def approve_expense(expense, user, reason=''):
            ...
    """
    
    def __init__(self, action: str, target_type: str, target_param: str = 'id'):
        self.action = action
        self.target_type = target_type
        self.target_param = target_param
    
    def __call__(self, func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract target object
            target_obj = None
            request = None
            
            # Try to find target object in args
            for arg in args:
                if hasattr(arg, self.target_param):
                    target_obj = arg
                    break
            
            # Try to find target object in kwargs
            if not target_obj:
                for key, value in kwargs.items():
                    if hasattr(value, self.target_param):
                        target_obj = value
                        break
            
            # Try to find request object
            for arg in args:
                if hasattr(arg, 'user') and hasattr(arg, 'META'):
                    request = arg
                    break
            
            # Get before state
            before_state = None
            if target_obj and hasattr(target_obj, 'to_dict'):
                before_state = target_obj.to_dict()
            elif target_obj:
                # Simple representation
                before_state = {'id': str(getattr(target_obj, self.target_param))}
            
            # Call the function
            result = func(*args, **kwargs)
            
            # Get after state
            after_state = None
            if target_obj and hasattr(target_obj, 'to_dict'):
                after_state = target_obj.to_dict()
            elif target_obj:
                after_state = {'id': str(getattr(target_obj, self.target_param))}
            
            # Extract actor
            actor = None
            if request:
                actor = request.user
            else:
                # Try to find user in args
                for arg in args:
                    if isinstance(arg, User):
                        actor = arg
                        break
            
            # Log the action
            if actor and target_obj:
                target_id = getattr(target_obj, self.target_param)
                
                # Extract reason from kwargs
                reason = kwargs.get('reason', '')
                
                AuditWriter.log(
                    action=self.action,
                    target_type=self.target_type,
                    target_id=target_id,
                    actor=actor,
                    before=before_state,
                    after=after_state,
                    reason=reason,
                    request=request
                )
            
            return result
        
        return wrapper


# Singleton instance
audit_writer = AuditWriter()