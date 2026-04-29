"""
Middleware for capturing request context and injecting it into audit logs.
"""

import hashlib
import threading
import uuid
from typing import Any, Dict, Optional


# Thread-local storage used by audit_service.get_request_context()
_thread_local = threading.local()


def get_request_context() -> Dict[str, Any]:
    """Return the current request context stored by AuditLogMiddleware."""
    ctx = getattr(_thread_local, "request_context", None)
    if ctx is None:
        return {
            "ip_address": "system",
            "user_agent": "system",
            "session_id_hash": "system",
            "request_id": "system",
        }
    return ctx


def _hash_session_id(session_id: Optional[str]) -> str:
    if not session_id:
        return "system"
    return hashlib.sha256(session_id.encode("utf-8")).hexdigest()


class AuditLogMiddleware:
    """
    Attaches request metadata to the current thread so that
    audit_service.log_event() can pick up IP, user-agent and a correlation id
    without every view having to pass them explicitly.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get("x-request-id", "") or str(uuid.uuid4())[:16]
        request.audit_request_id = request_id

        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR", "127.0.0.1")
        request.audit_ip_address = ip

        user_agent = request.META.get("HTTP_USER_AGENT", "")[:512]
        request.audit_user_agent = user_agent

        session_key = getattr(request, "session", None)
        session_key = session_key.session_key if session_key else None

        _thread_local.request_context = {
            "ip_address": ip,
            "user_agent": user_agent,
            "session_id_hash": _hash_session_id(session_key),
            "request_id": request_id,
        }

        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response
