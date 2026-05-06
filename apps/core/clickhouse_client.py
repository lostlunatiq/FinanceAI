"""
ClickHouse client for FinanceAI audit logging and analytics.
Uses clickhouse-connect library with connection pooling.
"""

from typing import Any, Dict, List, Optional

from clickhouse_connect import driver
from django.conf import settings

CH_HOST = getattr(settings, 'CLICKHOUSE_HOST', 'localhost')
CH_PORT = getattr(settings, 'CLICKHOUSE_PORT', 8123)
CH_USER = getattr(settings, 'CLICKHOUSE_USER', 'default')
CH_PASSWORD = getattr(settings, 'CLICKHOUSE_PASSWORD', '')
CH_DATABASE = getattr(settings, 'CLICKHOUSE_DATABASE', 'financeai')


def get_client() -> driver.Client:
    """
    Get ClickHouse client instance with connection pooling.
    
    Returns:
        driver.Client: ClickHouse client
    """
    return driver.create_client(
        host=CH_HOST,
        port=CH_PORT,
        user=CH_USER,
        password=CH_PASSWORD,
        database=CH_DATABASE,
        compression='lz4',
    )


def ensure_schema() -> None:
    """
    Create all ClickHouse tables if they don't exist.
    Uses IF NOT EXISTS to make it idempotent.
    Exact column spec as per FinanceAI spec.
    """
    client = get_client()

    tables_sql = [
        # ──────────────────────────────────────────────
        # AUDIT EVENTS TABLE (Exact spec)
        # ──────────────────────────────────────────────
        """
        CREATE TABLE IF NOT EXISTS audit_events (
            id UUID DEFAULT generateUUIDv4(),
            user_id Nullable(UUID),
            actor_name String,
            actor_grade Int8,
            action String,
            entity_type String,
            entity_id Nullable(UUID),
            context JSON,
            payload JSON,
            created_at DateTime64(3) DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(created_at)
        ORDER BY (actor_grade, created_at, id)
        SETTINGS index_granularity = 8192
        """,

        # ──────────────────────────────────────────────
        # AI INFERENCE LOG (Exact spec)
        # ──────────────────────────────────────────────
        """
        CREATE TABLE IF NOT EXISTS ai_inference_log (
            id UUID DEFAULT generateUUIDv4(),
            pipeline String,
            entity_type String,
            entity_id UUID,
            user_id Nullable(UUID),
            model_used String,
            input_hash String,
            confidence Nullable(Float32),
            latency_ms UInt32,
            success Bool,
            created_at DateTime64(3) DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(created_at)
        ORDER BY (pipeline, entity_type, entity_id, created_at)
        SETTINGS index_granularity = 8192
        """,

        # ──────────────────────────────────────────────
        # AI FEEDBACK - OCR
        # ──────────────────────────────────────────────
        """
        CREATE TABLE IF NOT EXISTS ai_feedback_ocr (
            id UUID DEFAULT generateUUIDv4(),
            inference_id UUID,
            document_type String,
            original_text String,
            corrected_text String,
            accuracy_score Nullable(Float32),
            feedback_type String,
            employee_grade Int8,
            user_id Nullable(UUID),
            created_at DateTime64(3) DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(created_at)
        ORDER BY (inference_id, created_at)
        SETTINGS index_granularity = 8192
        """,

        # ──────────────────────────────────────────────
        # AI FEEDBACK - ANOMALY
        # ──────────────────────────────────────────────
        """
        CREATE TABLE IF NOT EXISTS ai_feedback_anomaly (
            id UUID DEFAULT generateUUIDv4(),
            inference_id UUID,
            expense_id UUID,
            detected_anomaly JSON,
            employee_correction JSON,
            resolution_status String,
            employee_grade Int8,
            user_id Nullable(UUID),
            created_at DateTime64(3) DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(created_at)
        ORDER BY (inference_id, created_at)
        SETTINGS index_granularity = 8192
        """,

        # ──────────────────────────────────────────────
        # AI FEEDBACK - FORECAST
        # ──────────────────────────────────────────────
        """
        CREATE TABLE IF NOT EXISTS ai_feedback_forecast (
            id UUID DEFAULT generateUUIDv4(),
            inference_id UUID,
            forecast_type String,
            predicted_value Nullable(Float64),
            actual_value Nullable(Float64),
            variance_pct Nullable(Float32),
            employee_feedback String,
            model_adjusted Bool DEFAULT false,
            employee_grade Int8,
            user_id Nullable(UUID),
            created_at DateTime64(3) DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(created_at)
        ORDER BY (inference_id, created_at)
        SETTINGS index_granularity = 8192
        """,

        # ──────────────────────────────────────────────
        # AI FEEDBACK - NL QUERY
        # ──────────────────────────────────────────────
        """
        CREATE TABLE IF NOT EXISTS ai_feedback_nl_query (
            id UUID DEFAULT generateUUIDv4(),
            query_id UUID,
            user_query String,
            generated_sql String,
            query_summary String,
            execution_ms Nullable(UInt32),
            correctness_rating Nullable(UInt8),
            employee_grade Int8,
            user_id Nullable(UUID),
            created_at DateTime64(3) DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(created_at)
        ORDER BY (query_id, created_at)
        SETTINGS index_granularity = 8192
        """,

        # ──────────────────────────────────────────────
        # AI FEEDBACK - SUGGESTION
        # ──────────────────────────────────────────────
        """
        CREATE TABLE IF NOT EXISTS ai_feedback_suggestion (
            id UUID DEFAULT generateUUIDv4(),
            suggestion_id UUID,
            suggestion_type String,
            action_taken String,
            user_accepted Bool,
            explanation String,
            confidence_score Nullable(Float32),
            employee_grade Int8,
            user_id Nullable(UUID),
            created_at DateTime64(3) DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(created_at)
        ORDER BY (suggestion_id, created_at)
        SETTINGS index_granularity = 8192
        """
    ]

    for table_sql in tables_sql:
        client.command(table_sql)

    client.close()


def insert_audit_events(rows: List[Dict[str, Any]]) -> int:
    """
    Batch insert audit events into ClickHouse.
    
    Args:
        rows: List of dicts with event data
        
    Returns:
        int: Number of rows inserted
    """
    if not rows:
        return 0

    client = get_client()

    formatted_rows = []
    for row in rows:
        formatted_rows.append(
            (
                row.get('event_id'),
                row.get('event_type'),
                row.get('employee_id'),
                row.get('performed_by'),
                row.get('action_type'),
                row.get('target_type'),
                row.get('target_id'),
                row.get('status'),
                row.get('details', '{}'),
                row.get('context', '{}'),
                row.get('created_at'),
                row.get('ip_address'),
                row.get('user_agent'),
                row.get('session_id_hash'),
            )
        )

    columns = [
        'event_id', 'event_type', 'employee_id', 'performed_by',
        'action_type', 'target_type', 'target_id', 'status',
        'details', 'context', 'created_at', 'ip_address',
        'user_agent', 'session_id_hash'
    ]

    client.insert('audit_events', formatted_rows, column_names=columns)
    client.close()

    return len(formatted_rows)


def query_audit_events(
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 100,
    offset: int = 0,
    sort_order: str = 'DESC'
) -> Dict[str, Any]:
    """
    Query audit events with flexible filtering.
    
    Args:
        filters: Dict of column values to filter by
        limit: Max rows to return
        offset: Rows to skip
        sort_order: ASC or DESC
        
    Returns:
        Dict with 'rows', 'total', 'has_more'
    """
    client = get_client()

    # Build WHERE clause
    where_conditions = []
    if filters:
        for key, value in filters.items():
            if value is not None:
                where_conditions.append(f"{key} = '{value}'")

    where_clause = ' WHERE ' + ' AND '.join(where_conditions) if where_conditions else ''

    # Query total count
    count_query = f"SELECT count() as total FROM audit_events{where_clause}"
    count_result = client.query(count_query)
    total = count_result.result_rows[0][0] if count_result.result_rows else 0

    # Query actual data
    query = f"""
        SELECT * FROM audit_events{where_clause}
        ORDER BY created_at {sort_order}
        LIMIT {limit} OFFSET {offset}
    """

    result = client.query(query)
    rows = []
    for row in result.result_rows:
        row_dict = dict(zip(result.column_names, row))
        rows.append(row_dict)

    client.close()

    return {
        'rows': rows,
        'total': total,
        'has_more': offset + len(rows) < total
    }


def query_audit_events_by_employee(
    employee_id: int,
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Query audit events for a specific employee.
    
    Args:
        employee_id: Employee ID to filter by
        limit: Max rows
        offset: Rows to skip
        
    Returns:
        Dict with 'rows', 'total'
    """
    return query_audit_events(
        filters={'employee_id': employee_id},
        limit=limit,
        offset=offset
    )


def insert_ai_inference_log(
    inference_type: str,
    request_data: Dict[str, Any],
    response_data: Dict[str, Any],
    model_name: Optional[str] = None,
    tokens_used: Optional[int] = None,
    latency_ms: Optional[float] = None,
    confidence_score: Optional[float] = None,
    employee_id: Optional[int] = None
) -> str:
    """
    Insert AI inference log entry.
    
    Returns:
        str: inference_id
    """
    from uuid import uuid4

    log_id = str(uuid4())
    client = get_client()

    client.insert(
        'ai_inference_log',
        [(
            log_id,
            inference_type,
            str(request_data),
            str(response_data),
            model_name,
            tokens_used,
            latency_ms,
            confidence_score,
            None,
            None,
            employee_id,
        )]
    )

    client.close()
    return log_id


def insert_ai_feedback(
    table_name: str,
    feedback_data: Dict[str, Any]
) -> None:
    """
    Generic helper to insert AI feedback records.
    
    Args:
        table_name: One of ai_feedback_* tables
        feedback_data: Dict with feedback fields
        
    Raises:
        ValueError: If table_name is invalid
    """
    valid_tables = [
        'ai_feedback_ocr',
        'ai_feedback_anomaly',
        'ai_feedback_forecast',
        'ai_feedback_nl_query',
        'ai_feedback_suggestion'
    ]

    if table_name not in valid_tables:
        raise ValueError(f"Invalid table: {table_name}. Must be one of {valid_tables}")

    client = get_client()
    client.insert(table_name, [feedback_data])
    client.close()


# Initialization check
def is_connected() -> bool:
    """
    Check if ClickHouse connection is healthy.
    
    Returns:
        bool: True if connected
    """
    try:
        client = get_client()
        client.ping()
        client.close()
        return True
    except Exception:
        return False
