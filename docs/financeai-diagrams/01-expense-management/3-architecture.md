# Expense Management — Architecture Diagram

Component-level architecture of the expense management module. Shows how Django apps, Celery workers, services, and external interfaces compose to deliver the module.

## Module Component Architecture

```mermaid
flowchart TB
    subgraph FE["Frontend - React"]
        VPortal[Vendor Portal<br/>/vendor/bills/*]
        EPortal[Employee Portal<br/>/employee/bills/*]
        FQueue[Finance Queue<br/>/finance/bills/*]
        CFODash[CFO Dashboard<br/>/cfo/*]
    end

    Gateway[API Gateway / Nginx]
    VPortal --> Gateway
    EPortal --> Gateway
    FQueue --> Gateway
    CFODash --> Gateway

    subgraph DjangoApp["Django: apps/expenses"]
        direction TB

        subgraph API["API Layer - DRF Views"]
            VVApi[VendorBillViewSet]
            EVApi[OnBehalfViewSet]
            QApi[QueueViewSet]
            ApprApi[ApprovalActionViewSet]
            QryApi[QueryViewSet]
            BookApi[D365BookingViewSet]
            HookApi[WebhookViewSet]
        end

        subgraph Domain["Domain Layer"]
            ExpenseModel[Expense Model<br/>+ State Machine]
            StepModel[ExpenseApprovalStep]
            QueryModel[ExpenseQuery]
            Mapping[VendorL1Mapping]
            BackupCfg[BackupApproverConfig]
        end

        subgraph Services["Service Layer"]
            SubSvc[SubmissionService]
            ApproveSvc[ApprovalService<br/>delegates to engine]
            TransitionSvc[TransitionService<br/>state machine guard]
            NotifSvc[NotificationDispatcher]
            ThreadSvc[ThreadComputer]
        end
    end

    Gateway --> VVApi
    Gateway --> EVApi
    Gateway --> QApi
    Gateway --> ApprApi
    Gateway --> QryApi
    Gateway --> BookApi
    Gateway --> HookApi

    VVApi --> SubSvc
    EVApi --> SubSvc
    SubSvc --> ExpenseModel
    SubSvc --> TransitionSvc

    ApprApi --> ApproveSvc
    ApproveSvc --> TransitionSvc
    TransitionSvc --> ExpenseModel
    TransitionSvc --> StepModel
    TransitionSvc --> NotifSvc
    NotifSvc --> ThreadSvc

    QryApi --> QueryModel
    QryApi --> TransitionSvc

    BookApi --> D365Adapter[d365_adapter.py]
    HookApi --> TransitionSvc

    subgraph SharedCaps["Shared Capabilities"]
        OcrApp[apps/ocr]
        AnomApp[apps/anomaly]
        ApprovalApp[apps/approvals<br/>generic engine]
        AuditApp[apps/core - AuditLog]
        FilesApp[apps/core - FileRef]
        AccountsApp[apps/accounts<br/>RBAC]
        NotifApp[apps/notifications]
    end

    SubSvc --> OcrApp
    SubSvc --> AnomApp
    SubSvc --> FilesApp
    ApproveSvc --> ApprovalApp
    TransitionSvc --> AuditApp
    NotifSvc --> NotifApp
    ApprApi --> AccountsApp
    BookApi --> AccountsApp

    subgraph Workers["Celery Workers"]
        OcrWorker[OCR Worker]
        AnomWorker[Anomaly Worker]
        SlaWorker[SLA Beat Worker]
        NotifWorker[Notification Worker]
    end

    OcrApp -.->|enqueue| OcrWorker
    AnomApp -.->|enqueue| AnomWorker
    NotifApp -.->|enqueue| NotifWorker

    Beat[Celery Beat] -.->|every 5min| SlaWorker
    SlaWorker --> StepModel
    SlaWorker --> NotifApp

    subgraph Storage["Storage"]
        PG[(PostgreSQL<br/>expenses tables)]
        Minio[(MinIO<br/>bill PDFs)]
        Redis[(Redis<br/>broker)]
    end

    ExpenseModel --> PG
    StepModel --> PG
    QueryModel --> PG
    Mapping --> PG
    BackupCfg --> PG
    AuditApp --> PG
    FilesApp --> Minio
    OcrWorker --> Redis
    AnomWorker --> Redis
    NotifWorker --> Redis
    SlaWorker --> Redis

    subgraph External["External"]
        Claude[Claude Vision API<br/>via mask service]
        MockD365[Mock D365 App]
        SMTP[Email SMTP]
    end

    OcrWorker --> Claude
    D365Adapter --> MockD365
    NotifWorker --> SMTP
    MockD365 -.->|webhook 5s later| HookApi

    classDef fe fill:#e1f5ff,stroke:#0288d1
    classDef api fill:#e8f5e9,stroke:#388e3c
    classDef domain fill:#dcedc8,stroke:#558b2f
    classDef svc fill:#fff9c4,stroke:#f9a825
    classDef shared fill:#f3e5f5,stroke:#7b1fa2
    classDef worker fill:#fff3e0,stroke:#f57c00
    classDef store fill:#f5f5f5,stroke:#616161
    classDef ext fill:#fce4ec,stroke:#c2185b

    class VPortal,EPortal,FQueue,CFODash fe
    class VVApi,EVApi,QApi,ApprApi,QryApi,BookApi,HookApi api
    class ExpenseModel,StepModel,QueryModel,Mapping,BackupCfg domain
    class SubSvc,ApproveSvc,TransitionSvc,NotifSvc,ThreadSvc svc
    class OcrApp,AnomApp,ApprovalApp,AuditApp,FilesApp,AccountsApp,NotifApp shared
    class OcrWorker,AnomWorker,SlaWorker,NotifWorker,Beat worker
    class PG,Minio,Redis store
    class Claude,MockD365,SMTP ext
```

## Key Design Patterns

### State Machine Guard
All state changes flow through `TransitionService.transition_to(expense, new_status, actor, reason)`. No code outside this service ever sets `expense.status` directly. Direct assignment raises `IllegalStateAssignment`.

```mermaid
flowchart LR
    Caller[Any service] --> Guard[TransitionService.transition_to]
    Guard --> V1[Validate transition legal]
    V1 --> V2[Validate actor role]
    V2 --> V3[Check SoD rules]
    V3 --> V4[Optimistic lock - version]
    V4 --> Apply[Apply transition]
    Apply --> Audit[Write AuditLog]
    Apply --> Notify[Enqueue notifications]
    Apply --> Save[Save with version bump]
    Save --> Result[Return updated expense]

    V1 --> Reject[Reject if invalid]
    V2 --> Reject
    V3 --> Reject
    V4 --> Reject
```

### Thread Computation
The `ThreadComputer` is the single source of truth for "who has touched this bill". Used for visibility checks and rejection broadcast notifications.

```mermaid
flowchart TB
    Compute[ThreadComputer.get_thread_users expense] --> S1[Add submitter]
    S1 --> S2[Add filer_on_behalf if not None]
    S2 --> S3[Add vendor user]
    S3 --> S4[For each ApprovalStep<br/>where decided_at not None<br/>add actual_actor]
    S4 --> S5[Add current pending approver]
    S5 --> S6[Add anyone who raised query]
    S6 --> S7[Add anyone who responded to query]
    S7 --> Result[Return set of users]
```

### SoD Enforcement Cascade
Self-approval and double-approval are blocked at three layers:

```mermaid
flowchart TB
    Request[Approval request] --> L1Check{Layer 1: Permission<br/>Does user have role?}
    L1Check -->|No| Deny1[403 Forbidden]
    L1Check -->|Yes| L2Check{Layer 2: SoD code rule<br/>user != submitter<br/>user != filer<br/>user not in prior steps}
    L2Check -->|No| Deny2[403 SoD violation]
    L2Check -->|Yes| L3Check{Layer 3: State machine<br/>current state matches<br/>expected for this step}
    L3Check -->|No| Deny3[409 Invalid state]
    L3Check -->|Yes| Allow[Proceed]
```
