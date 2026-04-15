from __future__ import annotations
import uuid
from datetime import datetime
from dataclasses import dataclass, asdict
from django.conf import settings


@dataclass
class OmegaEvent:
    event_id: str
    event_type: str
    entity_type: str
    entity_id: str
    actor_id: str
    actor_role: str
    department_id: str
    vendor_id: str
    amount: float
    currency: str
    status_from: str
    status_to: str
    anomaly_severity: str
    category: str
    metadata: str
    event_ts: datetime


CREATE_TABLE_SQL = """
    CREATE TABLE IF NOT EXISTS omega_events(
        event_id UUID,
        event_type LowCardinality(String),
        entity_type LowCardinality(String),
        entity_id UUID,
        actor_id UUID,
        actor_role LowCardinality(String),
        department_id UUID,
        vendor_id String,
        amount Decimal(18, 2),
        currency LowCardinality(String) DEFAULT 'INR',
        status_from LowCardinality(String),
        status_to LowCardinality(String),
        anomaly_severity LowCardinality(String) DEFAULT 'NONE',
        category LowCardinality(String),
        metadata String DEFAULT '{}',
        event_ts DateTime64(3)
    )

    ENGINE = MergeTree()
    PARTITION BY (toYYYYMM(event_ts), department_id)
    ORDER BY (department_id, event_type, event_ts)
    SETTINGS index_granularity = 8192;
"""


def _get_client():
    import clickhouse_connect

    return clickhouse_connect.get_client(
        host=settings.CLICKHOUSE_HOST,
        port=getattr(settings, "CLICKHOUSE_PORT", 8123),
        database=getattr(settings, "CLICKHOUSE_DATABASE", "financeai"),
        username=getattr(settings, "CLICKHOUSE_USER", "default"),
        password=getattr(settings, "CLICKHOUSE_PASSWORD", ""),
    )


def ensure_schema():
    client = _get_client()
    client.command(CREATE_TABLE_SQL)


def append_event(event: OmegaEvent) -> None:
    client = _get_client()
    client.insert(
        "omega_events",
        [
            [
                uuid.UUID(event.event_id),
                event.event_type,
                event.entity_type,
                uuid.UUID(event.entity_id),
                uuid.UUID(event.actor_id)
                if event.actor_id != "system"
                else uuid.UUID(int=0),
                event.actor_role,
                uuid.UUID(event.department_id)
                if event.department_id
                else uuid.UUID(int=0),
                event.vendor_id,
                event.amount,
                event.currency,
                event.status_from,
                event.status_to,
                event.anomaly_severity,
                event.category,
                event.metadata,
                event.event_ts,
            ]
        ],
        column_names=[
            "event_id",
            "event_type",
            "entity_type",
            "entity_id",
            "actor_id",
            "actor_role",
            "department_id",
            "vendor_id",
            "amount",
            "currency",
            "status_from",
            "status_to",
            "anomaly_severity",
            "category",
            "metadata",
            "event_ts",
        ],
    )


def fold_total_spend(department_id: str = None, since: datetime = None) -> float:
    client = _get_client()
    where = "status_to = 'PAID'"
    params = {}

    if department_id:
        where += " AND department_id = {dept:UUID}"
        params["dept"] = department_id
    if since:
        where += " AND event_ts >= {since:DateTime}"
        params["dept"] = since

    result = client.query(
        f"SELECT sum(amount) FROM omega_events WHERE {where}", parameters=params
    )

    return float(result.first_row[0] or 0)


def fold_spend_by_category(department_id: str = "") -> dict:
    client = _get_client()
    where = "status_to = 'PAID'"
    params = {}

    if department_id:
        where += " AND department_id = {dept:UUID}"
        params["dept"] = department_id

    result = client.query(
        f"SELECT category, sum(amount) FROM omega_events WHERE {where} GROUP BY category",
        parameters=params,
    )
    return {row[0]: float(row[1]) for row in result.result_rows}


def fold_anomoly_rate() -> dict:
    client = _get_client()
    result = client.query("""
        SELECT
            countIf(anomaly_severity != 'NONE') as flagged,
            count() AS total
        FROM omega_events
        WHERE event_type = 'expense.submitted'
    """)

    row = result.first_row
    flagged, total = int(row[0]), int(row[1])
    return {
        "flagged": flagged,
        "total": total,
        "rate": round(flagged / total, 4) if total > 0 else 0.0,
    }


def fold_avg_cycle_time() -> float:
    client = _get_client()
    result = client.query("""
        SELECT avg(dateDiff('day', submitted_ts, paid_ts))
        FROM (
            SELECT
                entity_id,
                minIf(event_ts, status_to = 'SUBMITTED') AS submitted_ts,
                minIf(event_ts, status_to = 'PAID') AS paid_ts
            FROM omega_events
            WHERE status_to IN ('SUBMITTED', 'PAID')
            GROUP_BY entity_id
            HAVING paid_ts > submitted_ts
        )
    """)

    return float(result.first_row[0] or 0)
