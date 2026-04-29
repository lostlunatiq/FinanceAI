"""
Middleware for capturing request context and injecting it into audit logs.
"""

import uuid


class AuditLogMiddleware:
    """
    Attaches request metadata to the current thread so that
    log_audit_event() can pick up IP, user-agent and a correlation id
    without every view having to pass them explicitly.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Generate or reuse a request correlation id
        request_id = request.headers.get("x-request-id", "")
        if not request_id:
            request_id = str(uuid.uuid4())[:16]
        request.audit_request_id = request_id

        # Capture client IP (respects common proxy headers)
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        request.audit_ip_address = ip

        request.audit_user_agent = request.META.get("HTTP_USER_AGENT", "")[:512]

        response = self.get_response(request)

        # Optionally tag the response so the client can correlate too
        response["X-Request-ID"] = request_id
        return response
