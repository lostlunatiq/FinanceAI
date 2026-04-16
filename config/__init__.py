try:
    from config.celery import app as celery_app
    __all__ = ("celery_app",)
except ImportError:
    # Celery not installed — running in local dev mode without task queue
    celery_app = None
    __all__ = ()
