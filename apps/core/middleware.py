"""
Request context middleware for audit logging.
Captures IP, user agent, and session hash into thread-local storage.
"""

import hashlib
import threading
from typing import Any, Dict, Optional
from django.http import HttpRequest
from django.utils.deprecation import MiddlewareMixin


thread_local = threading.local()


def get_request_context() -> Dict[str, Any]:
    """
    Get the current request context from thread-local storage.
    
    Returns:
        Dict with ip_address, user_agent, session_id_hash
        For Celery tasks or no request context, returns "system" placeholders
        
    Returns:
        {
            "ip_address": str,
            "user_agent": str,
            "session_id_hash": str,
            "request_id": Optional[str]  # if available
        }
    """
    context = getattr(thread_local, 'request_context', None)
    
    if context is None:
        # No request context (Celery task or background job)
        return {
            'ip_address': 'system',
            'user_agent': 'system',
            'session_id_hash': 'system',
            'request_id': 'system'
        }
    
    # Ensure default values
    return {
        'ip_address': context.get('ip_address', 'system'),
        'user_agent': context.get('user_agent', 'system'),
        'session_id_hash': context.get('session_id_hash', 'system'),
        'request_id': context.get('request_id', 'system')
    }


def set_request_context(context: Dict[str, Any]) -> None:
    """
    Set request context in thread-local storage.
    
    Args:
        context: Dict with ip_address, user_agent, session_id_hash, request_id
    """
    thread_local.request_context = context


class AuditContextMiddleware(MiddlewareMixin):
    """
    Middleware to capture request metadata for audit logging.
    
    Captures:
    - IP address from X-Forwarded-For (first entry: original client IP)
    - User agent from request.META['HTTP_USER_AGENT']
    - Session ID hash (SHA-256, never raw)
    - HTTP request ID if present (for distributed tracing)
    """
    
    def process_request(self, request: HttpRequest) -> None:
        """
        Capture request context on each request.
        
        Args:
            request: Django HttpRequest
        """
        context = self._extract_context(request)
        set_request_context(context)
    
    def _extract_context(self, request: HttpRequest) -> Dict[str, str]:
        """
        Extract request metadata for audit logging.
        
        Args:
            request: Django HttpRequest
            
        Returns:
            Dict with extracted context fields
        """
        # Extract IP from X-Forwarded-For (first entry = client IP)
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip_address = self._extract_real_ip(forwarded_for, request.META.get('REMOTE_ADDR'))
        
        # Extract user agent
        user_agent = request.META.get('HTTP_USER_AGENT', 'unknown')
        
        # Compute SHA-256 hash of session ID (never store raw)
        session_id_hash = self._hash_session_id(request.session.session_key)
        
        # Extract request ID for distributed tracing (if present)
        request_id = request.META.get('HTTP_X_REQUEST_ID') or request.META.get('HTTP_CF_CONNECTING_IP')
        
        return {
            'ip_address': ip_address,
            'user_agent': user_agent,
            'session_id_hash': session_id_hash,
            'request_id': request_id or 'system'
        }
    
    def _extract_real_ip(self, forwarded_for: Optional[str], remote_addr: Optional[str]) -> str:
        """
        Extract the original client IP from X-Forwarded-For chain.
        
        When behind reverse proxies, X-Forwarded-For contains:
        "client, proxy1, proxy2, ..."
        The FIRST entry is the original client IP.
        
        Args:
            forwarded_for: X-Forwarded-For header value
            remote_addr: REMOTE_ADDR from server
            
        Returns:
            Client IP address as string
        """
        if forwarded_for:
            # Take the first entry (original client IP)
            ips = [ip.strip() for ip in forwarded_for.split(',') if ip.strip()]
            if ips:
                return ips[0]
        
        # Fall back to REMOTE_ADDR
        return remote_addr or '127.0.0.1'
    
    def _hash_session_id(self, session_id: Optional[str]) -> str:
        """
        Compute SHA-256 hash of session ID.
        
        Never stores raw session ID for security.
        
        Args:
            session_id: Raw session ID from Django session
            
        Returns:
            Hex digest of SHA-256 hash
        """
        if not session_id:
            return 'system'
        
        return hashlib.sha256(session_id.encode('utf-8')).hexdigest()
