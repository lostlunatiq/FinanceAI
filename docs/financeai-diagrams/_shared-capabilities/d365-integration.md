# Shared Capability — D365 Integration

The D365 adapter is the single interface to D365 Business Central. Hackathon uses Mock D365; Phase 2 swaps to real BC OData v4 with no caller code changes.

## Adapter Architecture

```mermaid
flowchart TB
    Caller[Any module] --> Adapter[D365Adapter Interface]

    subgraph Methods["Adapter Methods"]
        M1[create_purchase_invoice]
        M2[create_sales_invoice]
        M3[upsert_vendor]
        M4[upsert_customer]
        M5[get_gl_balance]
        M6[get_budget_ledger]
        M7[record_payment]
        M8[reverse_invoice]
    end

    Adapter --> Methods
    Methods --> Impl{Implementation}
    Impl -->|Hackathon| Mock[MockD365Client<br/>in-process Django app]
    Impl -->|Production| Real[BCODataClient<br/>real OData v4]

    Mock --> MockDB[(Mock D365 tables)]
    Real --> BCAPI[D365 BC OData v4 API]

    classDef api fill:#e8f5e9,stroke:#388e3c
    classDef impl fill:#fff9c4,stroke:#f57f17
    classDef ext fill:#fce4ec,stroke:#c2185b
    class Adapter,Methods,M1,M2,M3,M4,M5,M6,M7,M8 api
    class Mock,Real impl
    class BCAPI ext
```

## Outbound Sequence: Booking a Purchase Invoice

```mermaid
sequenceDiagram
    autonumber
    participant Caller as Expense Module
    participant Adapter as D365Adapter
    participant Mock as MockD365 / Real BC
    participant DB
    participant Q as Celery
    participant Webhook as Webhook handler

    Caller->>Adapter: create_purchase_invoice(payload)
    Adapter->>Adapter: Map domain → D365 schema
    Adapter->>Adapter: Add idempotency key
    Adapter->>Mock: POST /purchaseInvoices
    Mock->>Mock: Create record
    Mock-->>Adapter: 201 + document_no
    Adapter->>DB: Store document_no on caller record
    Adapter-->>Caller: Success

    Note over Mock,Webhook: 5 seconds later (mock simulator)

    Mock->>Q: Enqueue webhook delivery
    Q->>Webhook: POST /webhooks/d365 status=posted
    Webhook->>Webhook: Verify HMAC
    Webhook->>DB: Update caller record state=POSTED_D365
    Webhook->>Caller: Trigger downstream callbacks
```

## Inbound Webhook Processing

```mermaid
flowchart TD
    Inbound[Webhook arrives] --> Verify[Verify HMAC signature]
    Verify --> OK{Valid?}
    OK -->|No| Reject[401 + log attempt]
    OK -->|Yes| Parse[Parse payload]
    Parse --> Idem{Idempotency key seen?}
    Idem -->|Yes| Ack[200 OK no-op]
    Idem -->|No| Process[Process event]
    Process --> Type{Event type}
    Type -->|posted| UpdatePosted[Update record state=POSTED_D365]
    Type -->|paid| UpdatePaid[Update record state=PAID + UTR]
    Type -->|reversed| UpdateRev[Update record state=REVERSED]
    Type -->|gl_entry| UpdateGL[Update GL mirror]
    UpdatePosted --> Audit[Audit log]
    UpdatePaid --> Audit
    UpdateRev --> Audit
    UpdateGL --> Audit
    Audit --> RespondAck[200 OK]

    classDef sec fill:#ffebee,stroke:#c62828
    classDef proc fill:#e8f5e9,stroke:#388e3c
    class Verify,OK,Reject,Idem sec
    class Parse,Process,UpdatePosted,UpdatePaid,UpdateRev,UpdateGL,Audit,RespondAck proc
```

## Mock vs Real — Migration Path

| Concern | Hackathon (Mock) | Production (Real BC) |
|---|---|---|
| Transport | In-process Django views | HTTPS OData v4 |
| Auth | None | OAuth 2.0 client credentials |
| Endpoint | `/mock-d365/api/v2.0/...` | `https://api.businesscentral.dynamics.com/v2.0/{tenant}/...` |
| Webhook delivery | Celery delay 5s | Real-time from D365 |
| Webhook auth | Static HMAC secret | Azure AD signed tokens |
| Idempotency | UUID key in payload | Same |
| Error handling | Return 4xx/5xx as configured | Real BC error responses |
| Schema | Subset matching real BC | Full BC schema |

The adapter interface stays identical. Only the `Impl` module is swapped. No caller code changes.

## Resilience Patterns

```mermaid
flowchart TD
    Call[Adapter call] --> Try[Try real call]
    Try --> Result{Result}
    Result -->|2xx| OK[Success]
    Result -->|4xx| Bad[Bad request - do not retry]
    Result -->|5xx or timeout| Retry[Retry with backoff]
    Retry --> Attempt{Attempts < 3?}
    Attempt -->|Yes| Try
    Attempt -->|No| DLQ[Dead letter queue<br/>alert admin]

    Bad --> LogBad[Log + return to caller]
    OK --> LogOK[Log + return to caller]
    DLQ --> LogDLQ[Log + return error]

    classDef good fill:#e8f5e9,stroke:#388e3c
    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef bad fill:#ffebee,stroke:#c62828
    class OK,LogOK good
    class Retry,Attempt warn
    class Bad,DLQ,LogBad,LogDLQ bad
```
