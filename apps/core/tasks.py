import logging
from celery import shared_task
from .models import AuditLog

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def log_approval_action(
    self, *, function_name, module, args, kwargs, result, exception, status, duration_ms
):
    try:
        FunctionCallLog.objects.create(
            function_name=function_name,
            module=module,
            args=args,
            kwargs=kwargs,
            result=result,
            exception=exception,
            status=status,
            duration_ms=duration_ms,
        )
    except Exception as exc:
        logger.exception("Failed to write function log")
        raise self.retry(exc=exc)
