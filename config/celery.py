import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

app = Celery("financeai")

app.config_from_object("django.conf:settings", namespace="CELERY")

# Autodiscover tasks from all INSTALLED_APPS
app.autodiscover_tasks()


# --- Periodic tasks (Celery Beat) ---
app.conf.beat_schedule = {
    # Expire SLA-breached approval steps every 15 minutes
    "expire-overdue-steps": {
        "task": "apps.invoices.tasks.expire_overdue_steps",
        "schedule": crontab(minute="*/15"),
    },
    # Rebuild Prophet forecast nightly
    "rebuild-cashflow-forecast": {
        "task": "apps.invoices.tasks.rebuild_cashflow_forecast",
        "schedule": crontab(hour=2, minute=0),
    },
}

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,  # re-queue on worker crash
    worker_prefetch_multiplier=1,  # fair dispatch — important for heavy OCR tasks
    task_routes={
        "apps.invoices.tasks.run_ocr_pipeline": {"queue": "ocr"},
        "apps.invoices.tasks.run_anomaly_pipeline": {"queue": "anomaly"},
        "apps.core.tasks.mirror_event_to_clickhouse": {"queue": "analytics"},
        "apps.invoices.tasks.expire_overdue_steps": {"queue": "default"},
        "apps.invoices.tasks.rebuild_cashflow_forecast": {"queue": "default"},
    },
)
