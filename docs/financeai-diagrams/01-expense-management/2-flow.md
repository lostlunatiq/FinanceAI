# Expense Management — Flow Diagrams

Comprehensive flows for the vendor bill / expense module: state machine, happy paths, bad paths, and edge cases. This is the deepest module spec.

## 1. Master State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: L1 starts on-behalf draft
    [*] --> SUBMITTED: Vendor submits self-service

    DRAFT --> SUBMITTED: L1 submits
    DRAFT --> [*]: L1 abandons draft

    SUBMITTED --> AUTO_REJECT: Hard duplicate
    SUBMITTED --> WITHDRAWN: Vendor withdraws
    SUBMITTED --> PENDING_L1: Anomaly check passes

    PENDING_L1 --> PENDING_L2: L1 approves
    PENDING_L1 --> REJECTED: L1 rejects
    PENDING_L1 --> QUERY_L1: L1 raises query
    PENDING_L1 --> EXPIRED: SLA breach
    QUERY_L1 --> PENDING_L1: Vendor responds

    PENDING_L2 --> PENDING_HOD: L2 approves
    PENDING_L2 --> REJECTED: L2 rejects
    PENDING_L2 --> QUERY_L2: L2 raises query
    PENDING_L2 --> EXPIRED: SLA breach
    QUERY_L2 --> PENDING_L2: Vendor responds

    PENDING_HOD --> PENDING_FIN_L1: HoD approves
    PENDING_HOD --> REJECTED: HoD rejects
    PENDING_HOD --> QUERY_HOD: HoD raises query
    PENDING_HOD --> EXPIRED: SLA breach
    QUERY_HOD --> PENDING_HOD: Vendor responds

    PENDING_FIN_L1 --> PENDING_FIN_L2: Fin L1 approves
    PENDING_FIN_L1 --> REJECTED: Fin L1 rejects
    PENDING_FIN_L1 --> QUERY_FIN_L1: Fin L1 raises query
    PENDING_FIN_L1 --> EXPIRED: SLA breach
    QUERY_FIN_L1 --> PENDING_FIN_L1: Vendor responds

    PENDING_FIN_L2 --> PENDING_FIN_HEAD: Fin L2 approves
    PENDING_FIN_L2 --> REJECTED: Fin L2 rejects
    PENDING_FIN_L2 --> QUERY_FIN_L2: Fin L2 raises query
    PENDING_FIN_L2 --> EXPIRED: SLA breach
    QUERY_FIN_L2 --> PENDING_FIN_L2: Vendor responds

    PENDING_FIN_HEAD --> APPROVED: Fin Head approves
    PENDING_FIN_HEAD --> REJECTED: Fin Head rejects
    PENDING_FIN_HEAD --> QUERY_FIN_HEAD: Fin Head raises query
    PENDING_FIN_HEAD --> EXPIRED: SLA breach
    QUERY_FIN_HEAD --> PENDING_FIN_HEAD: Vendor responds

    APPROVED --> PENDING_D365: CFO clicks Book in D365

    PENDING_D365 --> BOOKED_D365: D365 returns success
    PENDING_D365 --> APPROVED: D365 returns failure (rollback)

    BOOKED_D365 --> POSTED_D365: D365 webhook fires
    POSTED_D365 --> PAID: Payment webhook fires

    EXPIRED --> PENDING_L1: Admin reactivates from L1
    EXPIRED --> PENDING_L2: Admin reactivates from L2
    EXPIRED --> PENDING_HOD: Admin reactivates from HoD
    EXPIRED --> PENDING_FIN_L1: Admin reactivates from FinL1
    EXPIRED --> PENDING_FIN_L2: Admin reactivates from FinL2
    EXPIRED --> PENDING_FIN_HEAD: Admin reactivates from FinHead

    AUTO_REJECT --> [*]
    WITHDRAWN --> [*]
    REJECTED --> [*]
    PAID --> [*]
```

## 2. Happy Path A — Vendor Self-Service Clean Submission

```mermaid
flowchart TD
    Start([Vendor logs in]) --> ClickNew[Click 'Submit New Bill']
    ClickNew --> Form[Form auto-pre-fills<br/>vendor master data]
    Form --> Upload[Vendor uploads invoice PDF]
    Upload --> OCR[OCR extracts data<br/>~6 seconds]
    OCR --> Review[Vendor reviews<br/>auto-filled fields]
    Review --> SelectL1[Select mapped L1 contact]
    SelectL1 --> Submit[Click Submit]
    Submit --> Validate{Server validates<br/>fields and uniqueness}
    Validate -->|Fail| Error[Return errors]
    Error --> Review
    Validate -->|Pass| Created[Bill created in SUBMITTED]
    Created --> Ack[Vendor sees ack page<br/>BILL-2026-0042]
    Created --> EnqAnomaly[Enqueue anomaly task]

    EnqAnomaly --> Anomaly[Anomaly worker runs]
    Anomaly --> AnomResult{Severity?}
    AnomResult -->|Clean / Low| L1State[State: PENDING_L1]
    AnomResult -->|Hard duplicate| AutoRej[State: AUTO_REJECT]

    L1State --> NotifyL1[Notify mapped L1]
    NotifyL1 --> L1Open[L1 opens queue]
    L1Open --> L1Review[L1 reviews PDF + data + history]
    L1Review --> L1Approve[L1 approves with note]
    L1Approve --> L2State[State: PENDING_L2]

    L2State --> L2Approve[L2 approves]
    L2Approve --> HoDState[State: PENDING_HOD]
    HoDState --> HoDApprove[HoD approves]
    HoDApprove --> FinL1State[State: PENDING_FIN_L1]

    FinL1State --> FinL1Check[Fin L1 checks<br/>tax, PO, credit]
    FinL1Check --> FinL1Approve[Fin L1 approves]
    FinL1Approve --> FinL2State[State: PENDING_FIN_L2]
    FinL2State --> FinL2Approve[Fin L2 approves]
    FinL2Approve --> FinHeadState[State: PENDING_FIN_HEAD]
    FinHeadState --> CFOApprove[CFO approves]
    CFOApprove --> ApprovedState[State: APPROVED]

    ApprovedState --> CFOBook[CFO clicks Book in D365]
    CFOBook --> D365Call[Call mock D365 OData]
    D365Call --> D365OK{Success?}
    D365OK -->|No| Rollback[Rollback to APPROVED]
    Rollback --> CFOBook
    D365OK -->|Yes| Booked[State: BOOKED_D365]
    Booked --> WaitPost[Wait for posted webhook ~5s]
    WaitPost --> Posted[State: POSTED_D365]
    Posted --> WaitPay[Wait for payment webhook]
    WaitPay --> Paid[State: PAID]
    Paid --> NotifyAll[Notify full thread + vendor]
    NotifyAll --> End([Done])

    classDef start fill:#c8e6c9,stroke:#2e7d32
    classDef happy fill:#e8f5e9,stroke:#388e3c
    classDef state fill:#fff9c4,stroke:#f57f17
    classDef ai fill:#f3e5f5,stroke:#7b1fa2
    classDef ext fill:#e0f7fa,stroke:#00838f
    classDef done fill:#c8e6c9,stroke:#2e7d32

    class Start,End start
    class ClickNew,Form,Upload,Review,SelectL1,Submit,Ack,L1Review,L1Approve,L2Approve,HoDApprove,FinL1Check,FinL1Approve,FinL2Approve,CFOApprove,CFOBook,NotifyAll happy
    class Created,L1State,L2State,HoDState,FinL1State,FinL2State,FinHeadState,ApprovedState,Booked,Posted,Paid,AutoRej state
    class OCR,Anomaly,EnqAnomaly,AnomResult,AnomResult ai
    class D365Call,D365OK,WaitPost,WaitPay ext
```

## 3. Happy Path B — L1 Files on Behalf of Vendor

```mermaid
flowchart TD
    Start([Vendor emails bill PDF to L1 Rahul]) --> L1Open[Rahul opens 'File on Behalf' page]
    L1Open --> SelectVendor[Selects vendor XYZ Transport<br/>only mapped vendors visible]
    SelectVendor --> AutoFill[Vendor master data auto-loads]
    AutoFill --> UploadPDF[Rahul uploads PDF received via email]
    UploadPDF --> OCR[OCR extracts data]
    OCR --> AddEvidence[Rahul adds business purpose<br/>+ attaches email thread as evidence]
    AddEvidence --> Toggle[Toggle 'Filed on behalf' acknowledgement]
    Toggle --> Submit[Submit]
    Submit --> Created[Bill created<br/>is_on_behalf=True<br/>filer_on_behalf=Rahul]
    Created --> NotifyVendor[Vendor notified by email:<br/>'A bill was filed on your behalf']
    Created --> Anomaly[Anomaly check runs]
    Anomaly --> SoDCheck{Is L1 validator<br/>= filer?}
    SoDCheck -->|Yes - Rahul| RouteBackup[Route to backup L1 Sanjay]
    SoDCheck -->|No| NormalRoute[Route to assigned L1]
    RouteBackup --> SanjayReview[Sanjay reviews evidence + history]
    SanjayReview --> SanjayApprove[Sanjay approves]
    SanjayApprove --> Continue[Continue normal 5 remaining steps]
    Continue --> End([... eventually PAID])

    VendorPortal[Vendor sees bill in their portal<br/>even though they never typed]
    Created -.-> VendorPortal

    classDef happy fill:#e8f5e9,stroke:#388e3c
    classDef sod fill:#fff3e0,stroke:#ef6c00,stroke-width:3px
    classDef vendor fill:#e3f2fd,stroke:#1976d2
    class Start,L1Open,SelectVendor,AutoFill,UploadPDF,OCR,AddEvidence,Toggle,Submit,Created,SanjayReview,SanjayApprove,Continue,End,NotifyVendor happy
    class SoDCheck,RouteBackup sod
    class VendorPortal vendor
```

## 4. Happy Path C — Anomaly Override

```mermaid
flowchart TD
    Submit[Vendor submits ₹1,15,000 bill<br/>vendor avg is ₹80,000] --> Anomaly[Anomaly worker runs]
    Anomaly --> ML[Isolation Forest:<br/>z-score = 2.8]
    ML --> Flag[Severity: HIGH<br/>signal: Amount Deviation]
    Flag --> L1State[State: PENDING_L1<br/>anomaly_severity=HIGH]
    L1State --> L1Open[L1 sees amber-highlighted bill]
    L1Open --> AnomPanel[Anomaly panel shows:<br/>43% above 6-mo average<br/>last 6 amounts: ~₹80k]
    AnomPanel --> L1Investigate[L1 checks email for context]
    L1Investigate --> Found[Finds HoD email<br/>'New staging env approved']
    Found --> Override[Click Approve<br/>mandatory override modal]
    Override --> ReasonInput[Enter override reason<br/>min 50 chars]
    ReasonInput --> Audit[Audit log: anomaly_override<br/>severity, reason, user]
    Audit --> L2State[State: PENDING_L2]
    L2State --> L2View[L2 sees anomaly + override reason<br/>prominently displayed]
    L2View --> L2Approve[L2 approves without re-investigation]
    L2Approve --> Continue[Continue chain]
    Continue --> Paid([... eventually PAID])

    classDef ai fill:#f3e5f5,stroke:#7b1fa2
    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef happy fill:#e8f5e9,stroke:#388e3c
    class Anomaly,ML,Flag,AnomPanel ai
    class L1State,Override,ReasonInput,Audit warn
    class Submit,L1Open,L1Investigate,Found,L2State,L2View,L2Approve,Continue,Paid happy
```

## 5. Bad Path A — L1 Rejection (Wrong Amount)

```mermaid
flowchart TD
    Submit[Vendor submits ₹2,50,000<br/>agreed was ₹2,00,000] --> Anomaly[Anomaly clean - within range]
    Anomaly --> L1State[PENDING_L1]
    L1State --> L1Knows[L1 knows from email<br/>amount is wrong]
    L1Knows --> ClickReject[Click Reject]
    ClickReject --> Modal[Reject modal:<br/>- Reason dropdown<br/>- Free text 30+ chars<br/>- Optional evidence]
    Modal --> Submit2[Submit rejection]
    Submit2 --> Rejected[State: REJECTED - terminal]
    Rejected --> Notify[Notify thread-so-far]
    Notify --> NotifyVendor[Vendor: full reason + evidence]
    Notify --> NotifyL1[L1: confirmation]
    Notify --> NotNotified[L2/HoD/Finance NOT notified<br/>they never touched it]
    NotifyVendor --> VendorSees[Vendor sees rejection in portal<br/>+ Revise & Resubmit button]
    VendorSees --> Resubmit[Vendor clicks Resubmit]
    Resubmit --> NewBill[NEW bill created<br/>replaces_bill_id=old<br/>status=SUBMITTED]
    NewBill --> StartFresh[Old stays REJECTED<br/>new starts fresh]

    classDef bad fill:#ffebee,stroke:#c62828
    classDef neutral fill:#eceff1,stroke:#455a64
    class ClickReject,Modal,Submit2,Rejected,Notify,NotifyVendor bad
    class NotNotified,Resubmit,NewBill,StartFresh neutral
```

## 6. Bad Path B — Mid-Chain Rejection (HoD on Budget)

```mermaid
flowchart TD
    PrevApprovals[L1 approved → L2 approved] --> HoDState[PENDING_HOD]
    HoDState --> HoDOpens[HoD opens bill]
    HoDOpens --> HoDSees[Sees: dept at 95% of budget<br/>this bill pushes to 110%]
    HoDSees --> HoDReject[Reject with reason]
    HoDReject --> Reason["Department at 95% budget.<br/>Defer or get CFO budget reallocation."]
    Reason --> Rejected[State: REJECTED]
    Rejected --> Broadcast[Broadcast to thread-so-far]
    Broadcast --> N1[Vendor]
    Broadcast --> N2[L1 Rahul - approved earlier]
    Broadcast --> N3[L2 Priya - approved earlier]
    Broadcast --> N4[HoD Amit - rejecter]
    Broadcast --> N5[Finance NOT notified]

    Feedback[L1 dashboard shows:<br/>'Bill you approved was rejected by HoD']
    N2 --> Feedback

    classDef bad fill:#ffebee,stroke:#c62828
    classDef neutral fill:#eceff1
    classDef feedback fill:#fff3e0,stroke:#ef6c00
    class HoDReject,Reason,Rejected,Broadcast bad
    class N1,N2,N3,N4,N5 neutral
    class Feedback feedback
```

## 7. Bad Path C — Query Loop Leading to Rejection

```mermaid
sequenceDiagram
    participant Vendor
    participant FinL1
    participant System
    participant Thread

    Note over Vendor,Thread: Bill at PENDING_FIN_L1 after dept chain approved

    FinL1->>System: Raise query: "Need signed acceptance doc"
    System->>System: State → QUERY_RAISED
    System->>Thread: Notify thread-so-far + vendor
    System->>Vendor: Email with question

    Vendor->>System: Respond with unsigned doc
    System->>System: State → PENDING_FIN_L1
    System->>FinL1: Notify response received

    FinL1->>System: Raise 2nd query: "Doc unsigned and wrong project"
    System->>System: State → QUERY_RAISED again
    System->>Vendor: Email second question

    Vendor->>System: Respond: "We agreed verbally, no signed doc"
    System->>System: State → PENDING_FIN_L1
    System->>FinL1: Notify response received

    FinL1->>System: Reject: "Cannot process without signed acceptance"
    System->>System: State → REJECTED (terminal)
    System->>Thread: Broadcast to all who touched: vendor + L1 + L2 + HoD + FinL1
```

## 8. Bad Path D — Mock D365 Booking Failure

```mermaid
flowchart TD
    Approved[State: APPROVED] --> CFOClick[CFO clicks Book in D365]
    CFOClick --> Pending[State: PENDING_D365]
    Pending --> AdapterCall[d365_adapter.create_purchase_invoice]
    AdapterCall --> MockReturn[Mock returns 400:<br/>InvalidGLAccount]
    MockReturn --> LogError[Log full request/response]
    LogError --> Rollback[State rolls back to APPROVED]
    Rollback --> CFOError[Error banner to CFO:<br/>D365 booking failed]
    CFOError --> AdminNotify[Admin notified with payload]
    AdminNotify --> Investigate[Admin investigates GL mapping]
    Investigate --> Fix[Fix mapping config]
    Fix --> CFORetry[CFO clicks Retry]
    CFORetry --> AdapterCall2[Retry call]
    AdapterCall2 --> Success[Success]
    Success --> Booked[State: BOOKED_D365]

    Note[NOTE: Bill never moves backward<br/>through approval chain.<br/>D365 failure = infra problem,<br/>not approval problem.]

    Pending -.-> Note

    classDef bad fill:#ffebee,stroke:#c62828
    classDef recovery fill:#fff3e0,stroke:#ef6c00
    classDef note fill:#fffde7,stroke:#fbc02d
    class MockReturn,LogError,Rollback,CFOError,AdminNotify bad
    class Investigate,Fix,CFORetry,AdapterCall2,Success recovery
    class Note note
```

## 9. Edge Case — Approver Deactivated Mid-Flow

```mermaid
sequenceDiagram
    participant Bill
    participant Admin
    participant System
    participant OldApprover as Amit (HoD)
    participant Backup as Priya (Backup HoD)
    participant Thread

    Bill->>System: State = PENDING_HOD, assigned to Amit
    Admin->>System: Deactivate Amit (resigned)
    System->>System: Sweep all PENDING_* with Amit as approver
    System->>System: For each: find role backup → reassign
    System->>Bill: Reassign approver to Priya
    System->>System: Audit log: approver_reassigned, reason=user_deactivated
    System->>Backup: Notify "Bill reassigned to you"
    System->>Thread: Notify "HoD step reassigned to Priya"
    Backup->>System: Reviews and approves
    System->>System: Continue chain normally
```

## 10. Edge Case — Delegate Already In Chain

```mermaid
flowchart TD
    Start[L1 Priya approved at L1 step] --> HoDState[State: PENDING_HOD]
    HoDState --> Check{HoD Amit on leave?}
    Check -->|Yes| Delegate[delegate_id = Priya]
    Delegate --> SoDCheck{Is delegate Priya<br/>already in chain?}
    SoDCheck -->|Yes - approved L1| AutoSkip[Auto-skip HoD step<br/>cannot self-double-approve]
    SoDCheck -->|No| RouteDelegate[Route to Priya as HoD delegate]
    AutoSkip --> AuditNote[Audit: step_skipped<br/>reason: delegate_already_in_chain]
    AuditNote --> NextState[State: PENDING_FIN_L1]
    AuditNote --> WarnDownstream[Yellow warning shown to<br/>downstream approvers]

    classDef sod fill:#fff3e0,stroke:#ef6c00,stroke-width:3px
    classDef neutral fill:#eceff1
    class SoDCheck,AutoSkip,AuditNote sod
    class HoDState,Delegate,NextState,WarnDownstream neutral
```

## 11. Edge Case — Vendor Disputes On-Behalf Filing

```mermaid
sequenceDiagram
    participant Vendor
    participant System
    participant L1 as Filer L1
    participant Admin
    participant Thread

    L1->>System: Files bill on behalf of vendor XYZ
    System->>Vendor: Email "A bill was filed on your behalf by L1"
    Vendor->>System: Click "Dispute Submission" in portal
    System->>System: State → QUERY_RAISED
    System->>System: Auto-message: "Vendor disputed authorship"
    System->>Thread: Notify all + Admin (always notified on dispute)

    alt Dispute is valid
        Admin->>System: Reject bill, reason: "Vendor dispute - unauthorized"
        Admin->>System: Investigate why L1 filed
    else Dispute is misunderstanding
        L1->>System: Attach evidence (email trail)
        Vendor->>System: Withdraw dispute
        System->>System: State → previous PENDING_*
    end
```

## 12. Edge Case — Race Condition (Optimistic Lock)

```mermaid
sequenceDiagram
    participant L2 as L2 Priya
    participant HoD as HoD Amit
    participant API
    participant DB

    Note over L2,HoD: Both have bill open in browser

    L2->>API: POST approve, version=5
    HoD->>API: POST approve, version=5

    par Race
        API->>DB: UPDATE WHERE version=5 SET version=6 (L2 first)
        DB-->>API: 1 row updated
    and
        API->>DB: UPDATE WHERE version=5 (HoD second)
        DB-->>API: 0 rows updated
    end

    API-->>L2: 200 OK, state moved to PENDING_HOD
    API-->>HoD: 409 Conflict<br/>"Already acted on - please refresh"

    Note over HoD: HoD also fails state validation:<br/>HoD step requires PENDING_HOD state,<br/>not PENDING_L2 anyway
```

## 13. Edge Case — SLA Breach and Reactivation

```mermaid
flowchart TD
    Pending[State: PENDING_FIN_L1<br/>SLA: 48h] --> Wait[48 hours pass<br/>no action]
    Wait --> BeatTask[Celery beat: check SLA]
    BeatTask --> Breach{SLA breached?}
    Breach -->|Yes| Expire[State: EXPIRED]
    Expire --> NotifyAll[Notify current approver + Admin + thread]
    NotifyAll --> AdminAction[Admin investigates]

    AdminAction --> Choice{Decision}
    Choice -->|Reactivate| Reactivate[Click Reactivate]
    Choice -->|Reject| AdminReject[Admin rejects on behalf]

    Reactivate --> Restore[State: PENDING_FIN_L1<br/>SLA timer reset]
    Restore --> NotifyApprover[Notify Fin L1 again]
    AdminReject --> Rejected[State: REJECTED]

    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef bad fill:#ffebee,stroke:#c62828
    classDef good fill:#e8f5e9,stroke:#388e3c
    class Wait,BeatTask,Breach,Expire,NotifyAll warn
    class AdminReject,Rejected bad
    class Reactivate,Restore,NotifyApprover good
```

## 14. Edge Case — Vendor Bank Account Change Holds Payment

```mermaid
flowchart TD
    Booked[Bill: BOOKED_D365<br/>awaiting payment] --> VendorReq[Vendor requests<br/>bank account change]
    VendorReq --> Hold[All payments to this vendor HELD]
    Hold --> Banner[Show banner on bill:<br/>'Payment held - bank change in review']
    Banner --> CFOReview[CFO reviews change request]
    CFOReview --> Cooling[48-hour cooling period]
    Cooling --> Verify[Physical / video verification call]
    Verify --> Approved{Approved?}
    Approved -->|Yes| UpdateBank[Update vendor master]
    Approved -->|No| Reject[Reject change<br/>old bank stays]
    UpdateBank --> Resume[Resume payments]
    Reject --> Resume
    Resume --> Paid[Bill: PAID]

    classDef hold fill:#fff3e0,stroke:#ef6c00
    classDef good fill:#e8f5e9,stroke:#388e3c
    class Hold,Banner,Cooling,Verify hold
    class Resume,Paid good
```

## 15. Notification Broadcast on Rejection

```mermaid
flowchart LR
    subgraph Thread["Thread members at time of rejection"]
        Vendor
        L1
        L2
        HoD
        FinL1[Finance L1<br/>rejecter]
    end

    subgraph NotInThread["Not yet in thread - not notified"]
        FinL2[Finance L2]
        FinHead[Finance Head]
    end

    Reject[REJECTED at FinL1 step] -.-> Vendor
    Reject -.-> L1
    Reject -.-> L2
    Reject -.-> HoD
    Reject -.-> FinL1
    Reject -.x FinL2
    Reject -.x FinHead

    classDef in fill:#e8f5e9,stroke:#388e3c
    classDef out fill:#eceff1,stroke:#90a4ae
    classDef rej fill:#ffebee,stroke:#c62828
    class Vendor,L1,L2,HoD,FinL1 in
    class FinL2,FinHead out
    class Reject rej
```
