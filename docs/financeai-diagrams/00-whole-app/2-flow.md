# Whole App — End-to-End Flow

This diagram shows how data and control flow through the entire FinanceAI portal — from vendor submission, through approvals, into D365, and out as reports/insights. It is the "one diagram that explains the whole product".

## Top-Level End-to-End Flow

```mermaid
flowchart TB
    Start([Vendor delivers service<br/>or 3SC issues invoice])

    subgraph Inputs["INPUTS"]
        direction LR
        VBill[Vendor uploads bill PDF]
        L1File[L1 files bill on-behalf]
        ClientRcv[Client receives sales invoice]
        EmpExp[Employee submits expense]
        BankStmt[Bank statement upload]
    end

    Start --> VBill
    Start --> L1File
    Start --> ClientRcv
    Start --> EmpExp

    subgraph Capabilities["SHARED CAPABILITIES"]
        direction TB
        OCR[OCR Pipeline<br/>Claude Vision]
        Anomaly[Anomaly Detection<br/>Rules + ML]
        Mask[Data Masking<br/>Compliance]
        Approval[Approval Engine<br/>Generic]
        Audit[Audit Log<br/>Immutable]
        Notify[Notifications<br/>Email + In-app]
    end

    VBill --> OCR
    L1File --> OCR
    EmpExp --> OCR
    OCR --> Mask
    Mask --> Anomaly
    Anomaly --> Approval

    subgraph Modules["MODULES"]
        direction TB
        EM[Expense Module]
        IM[Invoice Module]
        VM[Vendor Master]
        BM[Budget Module]
        AP[AP Module]
        AR[AR Module]
    end

    Approval --> EM
    Approval --> IM
    Approval --> VM
    Approval --> BM

    EM --> AP
    IM --> AR
    BankStmt --> AR

    EM -.-> Audit
    IM -.-> Audit
    BM -.-> Audit
    VM -.-> Audit
    AP -.-> Audit
    AR -.-> Audit

    EM -.-> Notify
    IM -.-> Notify
    BM -.-> Notify

    subgraph D365Layer["D365 BUSINESS CENTRAL"]
        D365PI[Purchase Invoice]
        D365SI[Sales Invoice]
        D365Bud[Budget Ledger]
        D365Vend[Vendor Master]
        D365GL[General Ledger]
    end

    AP --> D365PI
    AR --> D365SI
    BM --> D365Bud
    VM --> D365Vend
    D365PI --> D365GL
    D365SI --> D365GL

    subgraph Intelligence["INTELLIGENCE LAYER"]
        direction TB
        CF[Cash Flow Forecasting<br/>Prophet]
        NLQ[NL Query Engine<br/>Claude]
        Sum[AI Summaries<br/>CFO Monthly, AR Flash]
        Reports[Standard Reports]
    end

    D365GL --> CF
    D365GL --> Reports
    AR --> CF
    AP --> CF
    BM --> Reports
    Reports --> NLQ
    Reports --> Sum

    subgraph Outputs["OUTPUTS"]
        direction LR
        VStatus[Vendor sees status]
        EmpStatus[Employee sees reimbursement]
        CFOView[CFO dashboard + summaries]
        CompFile[CA files GST/TDS returns]
        AuditExp[Audit export PDF]
    end

    EM --> VStatus
    EM --> EmpStatus
    CF --> CFOView
    Sum --> CFOView
    NLQ --> CFOView
    Reports --> CompFile
    Audit --> AuditExp

    classDef input fill:#e3f2fd,stroke:#1976d2
    classDef cap fill:#fff3e0,stroke:#f57c00
    classDef mod fill:#e8f5e9,stroke:#388e3c
    classDef d365 fill:#f3e5f5,stroke:#7b1fa2
    classDef intel fill:#fce4ec,stroke:#c2185b
    classDef output fill:#fffde7,stroke:#fbc02d

    class VBill,L1File,ClientRcv,EmpExp,BankStmt input
    class OCR,Anomaly,Mask,Approval,Audit,Notify cap
    class EM,IM,VM,BM,AP,AR mod
    class D365PI,D365SI,D365Bud,D365Vend,D365GL d365
    class CF,NLQ,Sum,Reports intel
    class VStatus,EmpStatus,CFOView,CompFile,AuditExp output
```

## End-to-End Lifecycle (Bill Example)

The single most representative end-to-end journey through the system is a vendor bill from submission to payment to reporting:

```mermaid
flowchart LR
    A[Vendor uploads PDF] --> B[OCR extracts data]
    B --> C[Anomaly check]
    C -->|Clean| D[6-step approval]
    C -->|Flagged| E[Manual review]
    E --> D
    D --> F[Book in D365]
    F --> G[D365 posts invoice]
    G --> H[Payment run]
    H --> I[Bank transfers]
    I --> J[Vendor marked paid]
    J --> K[Audit log frozen]
    K --> L[Appears in MoM report]
    L --> M[Feeds cash flow forecast]
    M --> N[Surfaces in CFO summary]

    style A fill:#e3f2fd
    style N fill:#fce4ec
```

## Cross-Module Interaction Flow

How modules trigger and feed each other:

```mermaid
flowchart TD
    subgraph Trigger["Trigger Events"]
        T1[New vendor bill]
        T2[Sales invoice raised]
        T3[Budget locked]
        T4[Bank statement loaded]
        T5[Month end]
    end

    T1 --> EM[Expense Module]
    EM --> AP[AP Module]
    AP --> BM[Budget Module<br/>real-time threshold check]
    BM -->|Block if over budget| EM
    AP --> CFM[Compliance: TDS, GST]
    AP --> D365[D365 sync]
    AP --> CF[Cash Flow Forecast]

    T2 --> IM[Invoice Module]
    IM --> AR[AR Module]
    AR --> CFM
    AR --> D365
    AR --> CF
    AR --> Dun[Dunning Engine]

    T3 --> BM
    BM --> Reports

    T4 --> AR
    AR --> Recon[Reconciliation]

    T5 --> Reports[Reporting Module]
    Reports --> CFOSum[CFO Monthly Summary]
    Reports --> CompRpt[Compliance Reports]
    CF --> CFOSum

    classDef trig fill:#ffebee,stroke:#c62828
    classDef mod fill:#e8f5e9,stroke:#388e3c
    classDef ext fill:#f3e5f5,stroke:#7b1fa2
    class T1,T2,T3,T4,T5 trig
    class EM,IM,BM,AP,AR,CF,Reports mod
    class D365,CFM ext
```
