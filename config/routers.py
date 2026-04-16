"""
Database routers for multi-DB setup.
In dev mode with SQLite, this router is disabled via DATABASE_ROUTERS = [].
"""

try:
    from clickhouse_backend.models import ClickhouseModel

    def get_subclass(class_):
        classes = class_.__subclasses__()
        index = 0
        while index < len(classes):
            classes.extend(classes[index].__subclasses__())
            index += 1
        return list(set(classes))

    class ClickHouseRouter:
        def __init__(self):
            self.route_model_names = set()
            for model in get_subclass(ClickhouseModel):
                if model._meta.abstract:
                    continue
                self.route_model_names.add(model._meta.label_lower)

        def db_for_read(self, model, **hints):
            if model._meta.label_lower in self.route_model_names or hints.get("clickhouse"):
                return "clickhouse"
            return None

        def db_for_write(self, model, **hints):
            if model._meta.label_lower in self.route_model_names or hints.get("clickhouse"):
                return "clickhouse"
            return None

        def allow_migrate(self, db, app_label, model_name=None, **hints):
            if f"{app_label}.{model_name}" in self.route_model_names or hints.get("clickhouse"):
                return db == "clickhouse"
            elif db == "clickhouse":
                return False
            else:
                return None

except ImportError:
    # clickhouse_backend not installed — provide a no-op router
    class ClickHouseRouter:
        def db_for_read(self, model, **hints):
            return None

        def db_for_write(self, model, **hints):
            return None

        def allow_migrate(self, db, app_label, model_name=None, **hints):
            return None
