# Whole App — Data Flow Diagram

Tracks how data moves through the entire system, from ingestion to analytics. Includes trust boundaries, encryption points, and PII masking.

## DFD Level 0 — Context

```mermaid
flowchart LR
    Vendor((Vendor))
    Employee((Employee / Approver))
    CFO((CFO))
    Admin((Admin))
    CA((External CA))

    System[FinanceAI Portal]

    D365[(D365 BC)]
    GST[(GST Portal)]
    Bank[(Bank API)]
    Claude[(Claude API)]

    Vendor -->|Bills, profile updates| System
    System -->|Status, payments, queries| Vendor

    Employee -->|Approvals, validations| System
    System -->|Queues, notifications| Employee

    CFO -->|Approvals, NL queries| System
    System -->|Reports, dashboards, summaries| CFO

    Admin -->|User mgmt, vendor onboarding| System
    System -->|Audit logs, alerts| Admin

    System -->|GSTR data, TDS data| CA
    CA -->|Filed status, Form 16A| System

    System <-->|OData: vendors, invoices, GL, payments| D365
    System <-->|GSTIN validation, GSTR-2A, IRN| GST
    System <-->|Statements, NEFT, UTRs| Bank
    System -->|Masked OCR + NL queries| Claude
    Claude -->|Extracted fields, AI text| System

    classDef actor fill:#e1f5ff,stroke:#0288d1
    classDef ext fill:#fff4e1,stroke:#f57c00
    classDef sys fill:#e8f5e9,stroke:#388e3c

    class Vendor,Employee,CFO,Admin,CA actor
    class D365,GST,Bank,Claude ext
    class System sys
```

## DFD Level 1 — Major Processes & Data Stores

```mermaid
flowchart TB
    subgraph Inputs["Data Inputs"]
        VForm[Vendor Forms]
        EForm[Employee Forms]
        Files[Uploaded Files]
        Bank[Bank Statements]
        D365In[D365 Webhooks]
        GSTIn[GST Portal Sync]
    end

    subgraph Processes["Core Processes"]
        P1[1. Ingest & Validate]
        P2[2. Extract & Enrich<br/>OCR + Anomaly]
        P3[3. Approve<br/>Engine + Workflows]
        P4[4. Book & Sync<br/>D365 Adapter]
        P5[5. Reconcile<br/>Payments + TDS]
        P6[6. Aggregate<br/>Reports + Forecast]
        P7[7. Audit & Notify]
    end

    subgraph DataStores["Data Stores"]
        D1[(D1: Users & Roles)]
        D2[(D2: Vendors)]
        D3[(D3: Bills / Expenses)]
        D4[(D4: Invoices Sales)]
        D5[(D5: Approval Steps)]
        D6[(D6: Audit Log<br/>immutable)]
        D7[(D7: OCR Results)]
        D8[(D8: Anomaly Results)]
        D9[(D9: Files - S3/MinIO)]
        D10[(D10: Notifications)]
        D11[(D11: D365 mirror)]
    end

    VForm --> P1
    EForm --> P1
    Files --> P1
    Bank --> P5
    D365In --> P4
    GSTIn --> P1

    P1 --> D2
    P1 --> D3
    P1 --> D4
    P1 --> D9
    P1 -.-> P7

    P1 --> P2
    P2 --> D7
    P2 --> D8
    P2 --> P3

    P3 --> D5
    P3 --> D3
    P3 -.-> P7
    P3 --> P4

    P4 --> D11
    P4 --> D3
    P4 -.-> P7

    P5 --> D3
    P5 --> D4
    P5 -.-> P7

    P6 --> D3
    P6 --> D4
    P6 --> D11

    P7 --> D6
    P7 --> D10

    classDef proc fill:#e8f5e9,stroke:#388e3c
    classDef store fill:#f3e5f5,stroke:#7b1fa2
    classDef input fill:#e3f2fd,stroke:#1976d2
    class P1,P2,P3,P4,P5,P6,P7 proc
    class D1,D2,D3,D4,D5,D6,D7,D8,D9,D10,D11 store
    class VForm,EForm,Files,Bank,D365In,GSTIn input
```

## DFD Level 2 — Trust Boundaries & Masking

This is the **compliance-critical view**. It shows what data crosses which trust boundaries, where PII is masked, and what reaches third-party services.

```mermaid
flowchart TB
    subgraph TB_Internal["TRUST BOUNDARY: 3SC Internal Network"]
        direction TB

        subgraph CoreData["Raw Financial Data"]
            RawBill[Raw bill PDFs]
            RawAmt[Real amounts]
            RawVend[Vendor names + GSTIN + PAN + bank]
            RawEmp[Employee PII]
        end

        OCRPipe[OCR Pipeline]
        AnomalyEng[Anomaly Engine]
        ApprovalEng[Approval Engine]
        ReportGen[Report Generator]
        Forecaster[Cash Flow Forecaster]
        NLQuery[NL Query Engine]

        Mask[Masking Middleware]

        DB[(PostgreSQL<br/>encrypted at rest)]
        S3Store[(S3 / MinIO<br/>SSE-S3)]
    end

    subgraph TB_External["TRUST BOUNDARY: External 3rd Parties"]
        direction TB
        ClaudeAPI[Claude API<br/>Anthropic]
        EmailSMTP[Email Provider]
        SMSGW[SMS Gateway]
    end

    subgraph TB_Statutory["TRUST BOUNDARY: Statutory APIs"]
        D365BC[D365 Business Central<br/>Microsoft - encrypted OAuth]
        GSTPortal[GST Portal<br/>Govt of India]
        BankAPI[Bank API<br/>Encrypted mTLS]
    end

    RawBill --> OCRPipe
    RawAmt --> AnomalyEng
    RawVend --> AnomalyEng
    RawAmt --> Forecaster
    RawAmt --> ReportGen
    RawAmt --> ApprovalEng
    RawVend --> ApprovalEng
    RawEmp --> ApprovalEng

    OCRPipe --> Mask
    AnomalyEng --> Mask
    NLQuery --> Mask
    Forecaster --> Mask

    Mask -->|Tokenized:<br/>vendor_token_x7f<br/>amount_bucket_50k_100k<br/>no PII| ClaudeAPI
    ClaudeAPI -->|Extracted fields,<br/>severity scores,<br/>narratives| Mask
    Mask --> OCRPipe
    Mask --> AnomalyEng
    Mask --> NLQuery
    Mask --> Forecaster

    OCRPipe --> DB
    AnomalyEng --> DB
    ApprovalEng --> DB
    ReportGen --> DB
    Forecaster --> DB
    DB --> ReportGen
    RawBill --> S3Store
    S3Store --> OCRPipe

    ApprovalEng -->|Encrypted at TLS| D365BC
    D365BC -->|Encrypted at TLS| ApprovalEng

    AnomalyEng --> GSTPortal
    GSTPortal --> AnomalyEng

    ApprovalEng --> BankAPI
    BankAPI --> ApprovalEng

    ApprovalEng -.->|Notification text<br/>limited PII| EmailSMTP
    ApprovalEng -.->|SMS text<br/>amount only| SMSGW

    classDef raw fill:#ffebee,stroke:#c62828
    classDef pipe fill:#e8f5e9,stroke:#388e3c
    classDef mask fill:#fff3e0,stroke:#ef6c00,stroke-width:3px
    classDef store fill:#f3e5f5,stroke:#7b1fa2
    classDef ext fill:#fce4ec,stroke:#c2185b
    classDef statutory fill:#e0f7fa,stroke:#00838f

    class RawBill,RawAmt,RawVend,RawEmp raw
    class OCRPipe,AnomalyEng,ApprovalEng,ReportGen,Forecaster,NLQuery pipe
    class Mask mask
    class DB,S3Store store
    class ClaudeAPI,EmailSMTP,SMSGW ext
    class D365BC,GSTPortal,BankAPI statutory
```

## What Gets Masked Before Leaving 3SC

| Field | In Database | Sent to Claude | Sent to D365 | Sent in Email |
|---|---|---|---|---|
| Vendor legal name | Plaintext | `vendor_token_a8f3` | Plaintext (encrypted TLS) | Plaintext |
| Vendor GSTIN | Plaintext | `gstin_token` | Plaintext | Last 4 only |
| Vendor PAN | Plaintext | Not sent | Plaintext | Not sent |
| Bank account number | **Encrypted** | Not sent | Plaintext | Last 4 only |
| Invoice amount | Plaintext | `amount_bucket_50k_100k` | Plaintext | Plaintext |
| Employee name | Plaintext | `emp_token` | Plaintext | First name only |
| Employee email | Plaintext | Not sent | Plaintext | Plaintext |
| Invoice line items | Plaintext | Description text only, no client name | Plaintext | Summary only |
| Internal notes | Plaintext | Not sent | Not sent | Not sent |
| Audit log | Plaintext | Not sent | Not sent | Not sent |

The **masking middleware** is the single chokepoint for all data leaving 3SC's network bound for Claude. No service may bypass it. This is the ISO 27001 / SOC 2 control point.

## Storage Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Uploaded: User uploads file
    Uploaded --> InMinio: Stored with SHA256 dedupe
    InMinio --> Referenced: FileRef created in DB
    Referenced --> Hot: Used by active records
    Hot --> Warm: Record archived after 1 year
    Warm --> Cold: Moved to Glacier after 3 years
    Cold --> Deleted: Statutory retention expired - 7 yrs
    Deleted --> [*]

    Hot --> Audited: Audit export
    Warm --> Audited
    Cold --> Audited
```

## Data Retention Policy

| Data Type | Retention | Storage |
|---|---|---|
| Active bills, expenses, invoices | Indefinite while live | Hot Postgres |
| Closed records | 7 years (statutory) | Hot for 1y, Warm for 2y, Cold after 3y |
| Audit log | 7 years (immutable) | Hot Postgres + cold backup |
| File attachments | 7 years | Hot S3 → Glacier after 3y |
| OCR raw responses | 90 days | Hot Postgres, then deleted |
| Anomaly model artifacts | Latest + 5 prior | Hot |
| Notifications | 1 year | Hot |
| User session tokens | 24 hours | Redis |
| Cached GSTIN validations | 24 hours | Redis |
