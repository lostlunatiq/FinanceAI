# class ClickHouseRouter:
#     CLICKHOUSE_APP = "core"
#     CLICKHOUSE_MODELS = {"invoiceevent"}
#
#     def db_for_read(self, model, **hints):
#         if model._meta.model_name in self.CLICKHOUSE_MODELS:
#             return "clickhouse"
#         return "default"
#
#     def db_for_write(self, model, **hints):
#         if model._meta.model_name in self.CLICKHOUSE_MODELS:
#             return "clickhouse"
#         return "default"
#
#     def allow_relation(self, obj1, obj2, **hints):
#         if obj1._state.db == obj2._state.db:
#             return True
#         return None
#
#     def allow_migrate(self, db, app_label, model_name=None, **hints):
#         if model_name is None:
#             return db != "clickhouse"
#
#         if db == "clickhouse":
#             return model_name in self.CLICKHOUSE_MODELS
#         else:
#             return model_name not in self.CLICKHOUSE_MODELS

from clickhouse_backend.models import ClickhouseModel


def get_subclass(class_):
    classes = class_.__subclass__()

    index = 0
    while index < len(classes):
        classes.extend(classes[index].__subclass__())
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
        if f"{app_label}.{model_name}" in self.route_model_names or hints.get(
            "clickhouse"
        ):
            return db == "clickhouse"

        elif db == "clickhouse":
            return False

        else:
            return None
