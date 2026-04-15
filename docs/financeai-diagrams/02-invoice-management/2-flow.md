# Invoice Management — Flow Diagrams

## State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Fin L1 creates
    Draft --> Sent: Fin L1 sends to client
    Draft --> Cancelled: Fin L2 cancels draft
    Sent --> Viewed: Client opens email/portal
    Sent --> PartialPaid: Client pays portion
    Sent --> Paid: Full payment received
    Sent --> Overdue: Due date passed
    Viewed --> PartialPaid
    Viewed --> Paid
    Viewed --> Overdue
    PartialPaid --> Paid: Remaining received
    PartialPaid --> Overdue: Due date passed before full
    Overdue --> Stage1: Day +1 reminder
    Stage1 --> Stage2: Day +7 notice
    Stage2 --> Stage3: Day +15 escalation
    Stage3 --> LegalReferral: Day +30
    Overdue --> Paid: Late payment
    Stage1 --> Paid
    Stage2 --> Paid
    Stage3 --> Paid
    LegalReferral --> Paid: Settled
    LegalReferral --> BadDebt: Written off
    Sent --> Disputed: Client raises
    Viewed --> Disputed
    Overdue --> Disputed
    Disputed --> Sent: Resolved no CN
    Disputed --> CreditNoted: CN issued
    CreditNoted --> [*]
    Paid --> [*]
    BadDebt --> [*]
    Cancelled --> [*]
```

## Happy Path — SaaS Subscription Invoice

```mermaid
flowchart TD
    Trigger[SaaS subscription renewal date] --> AutoDraft[System auto-creates draft<br/>SaaS template]
    AutoDraft --> PullClient[Pull client master:<br/>GSTIN, address, terms]
    PullClient --> ValidateGSTIN{GSTIN valid?}
    ValidateGSTIN -->|No| BlockSend[Block - notify Fin L1]
    ValidateGSTIN -->|Yes| BuildLines[Build line items:<br/>seat count × price, period]
    BuildLines --> CalcGST[Auto-calc CGST/SGST or IGST<br/>based on Place of Supply]
    CalcGST --> CheckEInv{Client > ₹5Cr<br/>turnover?}
    CheckEInv -->|Yes| GenIRN[Call GST portal for IRN]
    GenIRN --> EmbedQR[Embed QR in PDF]
    CheckEInv -->|No| StdPDF[Standard PDF]
    EmbedQR --> Review[Fin L1 reviews]
    StdPDF --> Review
    Review --> Send[Click Send]
    Send --> EmailClient[Email + portal link]
    EmailClient --> Sent[State: Sent]
    Sent --> ClientOpens[Client opens]
    ClientOpens --> Viewed[State: Viewed]
    Viewed --> ClientPays[Client pays via NEFT]
    ClientPays --> BankReceipt[Bank statement received]
    BankReceipt --> AutoMatch[Auto-match: amount + UTR + IFSC]
    AutoMatch --> Match{Matched?}
    Match -->|Yes| Paid[State: Paid]
    Match -->|No| ManualRecon[Fin L1 manual reconcile]
    ManualRecon --> Paid
    Paid --> SyncD365[Sync to D365 Sales Invoice]
    SyncD365 --> NotifyClient[Receipt confirmation to client]

    classDef happy fill:#e8f5e9,stroke:#388e3c
    classDef state fill:#fff9c4,stroke:#f57f17
    classDef ext fill:#e0f7fa,stroke:#00838f
    class Trigger,AutoDraft,PullClient,BuildLines,CalcGST,Review,Send,EmailClient,ClientOpens,ClientPays,AutoMatch,SyncD365,NotifyClient happy
    class Sent,Viewed,Paid state
    class GenIRN,EmbedQR,BankReceipt ext
```

## Bad Path — Overdue Triggering Dunning Sequence

```mermaid
flowchart TD
    Sent[Invoice in Sent state] --> DueDate{Due date passed?}
    DueDate -->|No| Wait[Wait]
    Wait --> DueDate
    DueDate -->|Yes| Overdue[State: Overdue]
    Overdue --> Day1[Day +1 trigger]
    Day1 --> Stage1[Stage 1: friendly reminder<br/>system email no-reply@3sc.in]
    Stage1 --> Wait7[Wait 6 days]
    Wait7 --> Day7[Day +7]
    Day7 --> Stage2[Stage 2: firm notice<br/>Fin Manager personal email<br/>CC client manager]
    Stage2 --> Wait15[Wait 8 days]
    Wait15 --> Day15[Day +15]
    Day15 --> Stage3[Stage 3: formal escalation<br/>CFO email<br/>7-day legal ultimatum]
    Stage3 --> Wait30[Wait 15 days]
    Wait30 --> Day30[Day +30]
    Day30 --> LegalRef[Legal Referral flag<br/>Bad Debt potential]

    Sent -.->|client pays at any time| Paid[State: Paid<br/>dunning stops]
    Stage1 -.-> Paid
    Stage2 -.-> Paid
    Stage3 -.-> Paid

    classDef bad fill:#ffebee,stroke:#c62828
    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef good fill:#e8f5e9,stroke:#388e3c
    class Day1,Day7,Day15,Day30,Stage1,Stage2,Stage3,LegalRef warn
    class Overdue bad
    class Paid good
```

## Bad Path — Client Disputes

```mermaid
sequenceDiagram
    participant C as Client
    participant Sys as System
    participant FinL1
    participant FinL2

    Sys->>C: Send invoice
    C->>Sys: Mark Disputed via portal
    Sys->>Sys: State → Disputed, dunning paused
    Sys->>FinL1: Notify dispute raised
    FinL1->>FinL1: Investigate dispute
    alt Dispute valid - issue CN
        FinL1->>FinL2: Request CN issuance
        FinL2->>Sys: Issue Credit Note with GST reversal
        Sys->>C: Send CN PDF
        Sys->>Sys: State → CreditNoted
    else Dispute invalid - resolve
        FinL1->>C: Provide clarification
        C->>Sys: Withdraw dispute
        Sys->>Sys: State → Sent (resume dunning)
    end
```

## Edge Cases

```mermaid
flowchart TD
    EC1[Partial Payment] --> EC1Detail[Apply ₹X to invoice<br/>track remaining<br/>continue dunning on balance]
    EC2[GSTIN suspended<br/>before invoice send] --> EC2Detail[Block send<br/>notify Fin L1 + Admin<br/>require client GSTIN update]
    EC3[Currency mismatch<br/>USD invoice] --> EC3Detail[Show INR equivalent<br/>at RBI rate on invoice date<br/>fixed for life of invoice]
    EC4[E-invoice IRN portal down] --> EC4Detail[Queue retry every 15min<br/>block send until IRN received]
    EC5[Bank statement<br/>match ambiguous] --> EC5Detail[Multiple invoices same amount<br/>flag for Fin L1 manual<br/>do not auto-apply]
    EC6[TDS deducted by client<br/>but no Form 16A] --> EC6Detail[Quarterly alert<br/>track in Form 16A pending<br/>contact client]
    EC7[Credit note issued<br/>after partial payment] --> EC7Detail[CN amount cannot exceed<br/>net unpaid<br/>refund flow if needed]
    EC8[Invoice cancelled<br/>after send] --> EC8Detail[Cancellation requires CN<br/>cannot just delete<br/>audit trail preserved]

    classDef ec fill:#f3e5f5,stroke:#7b1fa2
    classDef detail fill:#fff9c4,stroke:#f57f17
    class EC1,EC2,EC3,EC4,EC5,EC6,EC7,EC8 ec
    class EC1Detail,EC2Detail,EC3Detail,EC4Detail,EC5Detail,EC6Detail,EC7Detail,EC8Detail detail
```
