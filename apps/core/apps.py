from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "Core"

    def ready(self):
        import sys

        skip_commands = {
            "makemigrations",
            "migrate",
            "collectstatic",
            "shell",
            "dbshell",
            "test",
        }

        if len(sys.argv) > 1 and sys.argv[1] in skip_commands:
            return

        try:
            from apps.core.clickhouse import ensure_schema

            ensure_schema()
        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(f"Clickhouse schema init skipped: {e}")
