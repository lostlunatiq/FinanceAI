from django.core.management.base import BaseCommand
from apps.core.clickhouse import ensure_schema


class Command(BaseCommand):
    help = "Initialize ClickHouse Omega event log schema"

    def handle(self, *args, **kwargs):
        try:
            ensure_schema()
            self.stdout.write(
                self.style.SUCCESS(
                    "ClickHouse schema initialized — omega_events table ready."
                )
            )
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"ClickHouse init failed: {e}"))
            raise
