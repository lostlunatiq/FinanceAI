# Vendor Management — Flow Diagrams

## Vendor Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Drafted: Admin starts entry
    Drafted --> KYCPending: Admin saves draft
    KYCPending --> KYCFailed: Validation fails
    KYCFailed --> KYCPending: Admin fixes
    KYCPending --> AwaitingApproval: KYC passes
    AwaitingApproval --> Active: Admin approves
    AwaitingApproval --> Rejected: Admin rejects
    Active --> Suspended: Compliance issue
    Suspended --> Active: Issue resolved
    Active --> BankChangePending: Bank update requested
    BankChangePending --> Active: Approved + cooling done
    BankChangePending --> Active: Rejected (old bank stays)
    Active --> Inactive: Manual deactivation
    Inactive --> Active: Reactivated
    Rejected --> [*]
```

## Happy Path — New Vendor Onboarding

```mermaid
flowchart TD
    Start[Admin clicks New Vendor] --> Form[Fill KYC form]
    Form --> Save[Save Draft]
    Save --> ValidateGSTIN[System: Validate GSTIN<br/>via GST portal]
    ValidateGSTIN --> GSTIN_OK{Valid?}
    GSTIN_OK -->|No| Block[Block submission<br/>show error]
    GSTIN_OK -->|Yes| ValidatePAN[Validate PAN format<br/>Luhn-style check]
    ValidatePAN --> PAN_OK{Valid?}
    PAN_OK -->|No| Block
    PAN_OK -->|Yes| ValidateIFSC[Validate IFSC code]
    ValidateIFSC --> IFSC_OK{Valid?}
    IFSC_OK -->|Yes| MSMECheck{Claims MSME?}
    IFSC_OK -->|No| Block
    MSMECheck -->|Yes| Udyam[Verify Udyam registration]
    MSMECheck -->|No| Skip[Skip MSME check]
    Udyam --> Skip
    Skip --> Upload[Admin uploads contract PDF]
    Upload --> SubmitForApproval[Submit for approval]
    SubmitForApproval --> AwaitState[State: AwaitingApproval]
    AwaitState --> AdminReview[Admin/Senior reviews]
    AdminReview --> Approve[Approve]
    Approve --> Active[State: Active]
    Active --> SyncD365[Sync to D365 vendor master]
    SyncD365 --> NotifyAll[Notify creator + finance team]

    classDef happy fill:#e8f5e9,stroke:#388e3c
    classDef sys fill:#f3e5f5,stroke:#7b1fa2
    classDef bad fill:#ffebee,stroke:#c62828
    class Start,Form,Save,Upload,SubmitForApproval,AdminReview,Approve happy
    class ValidateGSTIN,ValidatePAN,ValidateIFSC,Udyam,SyncD365 sys
    class Block bad
```

## Critical Flow — Bank Account Change (Fraud Risk)

```mermaid
sequenceDiagram
    autonumber
    participant V as Vendor
    participant Sys as System
    participant CFO
    participant Bank as Bank verification

    V->>Sys: Request bank change via portal
    Sys->>Sys: State: BankChangePending
    Sys->>Sys: HOLD all pending payments to vendor
    Sys->>CFO: Urgent notification
    Sys->>V: Email confirmation request to registered email

    V->>Sys: Confirm via email link
    Sys->>Sys: Start 48-hour cooling timer

    Note over Sys: 48 hours pass

    Sys->>CFO: Cooling done, ready for verification
    CFO->>Bank: Call vendor on registered phone
    Bank-->>CFO: Verbal confirmation
    CFO->>Sys: Mark verified + approve

    alt Approved
        Sys->>Sys: Update bank account in master
        Sys->>Sys: Lift payment hold
        Sys->>V: Confirmation email
    else Rejected
        Sys->>Sys: Discard new bank, keep old
        Sys->>V: Rejection email with reason
    end

    Sys->>Sys: Audit log entry (always)
```

## Bad Path — GSTIN Suspended After Onboarding

```mermaid
flowchart TD
    Active[Vendor Active] --> Beat[Daily GSTIN re-validation beat]
    Beat --> Check[Re-check all active vendors]
    Check --> Found[GSTIN status changed to Suspended]
    Found --> AutoSuspend[State: Suspended]
    AutoSuspend --> NotifyAdmin[Notify Admin + CFO]
    AutoSuspend --> BlockNew[Block new bills from this vendor]
    AutoSuspend --> HoldPayment[Hold pending payments]
    HoldPayment --> AdminInvestigate[Admin investigates]
    AdminInvestigate --> Outcome{Outcome}
    Outcome -->|Vendor fixed GSTIN| Reactivate[Reactivate]
    Outcome -->|Vendor in default| Terminate[Terminate vendor]
    Reactivate --> Active
    Terminate --> Inactive[State: Inactive]

    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef bad fill:#ffebee,stroke:#c62828
    classDef good fill:#e8f5e9,stroke:#388e3c
    class Beat,Check,Found,AutoSuspend,NotifyAdmin,BlockNew,HoldPayment warn
    class Terminate,Inactive bad
    class Reactivate,Active good
```

## Edge Cases

| ID | Edge Case | Resolution |
|---|---|---|
| VEC1 | Duplicate vendor (same PAN, different name) | Block creation, show existing vendor |
| VEC2 | Vendor changes legal name (M&A) | Allow update with audit, retain old name in history |
| VEC3 | MSME status expires (annual renewal) | Auto-flag, warn 30 days before, alert if not renewed |
| VEC4 | Vendor deactivated but has pending bills | Block deactivation, show pending bills, require cleanup |
| VEC5 | Same vendor in two D365 companies | Allow, link via shared parent record |
| VEC6 | Vendor exceeds credit limit mid-bill | Block at booking, require CFO override |
| VEC7 | Bank IFSC merged/changed by RBI | Daily IFSC sync, auto-update with audit |
| VEC8 | Vendor portal email bounces | Mark email as bounced, alert Admin to update |
| VEC9 | L1 mapped to vendor leaves company | Auto-reassign to backup L1, alert Admin |
| VEC10 | Concentration risk: vendor >40% of category spend | CFO alert, suggest diversification |
