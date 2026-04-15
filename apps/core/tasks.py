import json
from celery import shared_task
from datetime import timezone as tz


@shared_task
def mirror_event_to_clickhouse(
    event_id: str,
    event_type: str,
    entity_type: str,
    entity_id: str,
    actor_id: str,
    actor_role: str,
    department_id: str,
    vendor_id: str,
    amount: float,
    status_from: str,
    status_to: str,
    anomaly_severity: str,
    category: str,
    metadata: dict,
    event_ts: str,
):
    from apps.core.clickhouse import OmegaEvent, append_event
    from datetime import datetime

    event = OmegaEvent(
        event_id=event_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        actor_role=actor_role,
        department_id=department_id,
        vendor_id=vendor_id,
        amount=amount,
        currency="INR",
        status_from=status_from,
        status_to=status_to,
        anomaly_severity=anomaly_severity,
        category=category,
        metadata=json.dumps(metadata),
        event_ts=datetime.fromisoformat(event_ts),
    )
    append_event(event)
