import logging
from celery import shared_task
from .models import AuditLog

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def log_approval_action(
    self, *, function_name, module, args, kwargs, result, exception, status, duration_ms
):
    """
    Async helper for logging function-level approval actions.
    Stores the data in AuditLog.metadata for traceability.
    """
    try:
        AuditLog.objects.create(
            action="system.function_call",
            entity_type="System",
            entity_display_name=function_name,
            metadata={
                "module": module,
                "args": str(args)[:500],
                "kwargs": str(kwargs)[:500],
                "result": str(result)[:500],
                "exception": str(exception)[:500],
                "status": status,
                "duration_ms": duration_ms,
            },
        )
    except Exception as exc:
        logger.exception("Failed to write function log")
        raise self.retry(exc=exc)
