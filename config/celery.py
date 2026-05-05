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
    # Auto-generate monthly financial summary on 1st of each month at 6:00 AM IST
    "auto-generate-monthly-report": {
        "task": "apps.invoices.tasks.auto_generate_monthly_report",
        "schedule": crontab(day_of_month=1, hour=6, minute=0),
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
    },
)
