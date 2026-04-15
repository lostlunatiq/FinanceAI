# Accounts Receivable — Flow Diagrams

## Receivable Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Open: Invoice posted in D365
    Open --> Current: Within payment terms
    Current --> Overdue1_30: Day 1-30 past due
    Current --> Paid: Full payment received
    Overdue1_30 --> Overdue31_60: Day 31-60
    Overdue1_30 --> Paid
    Overdue31_60 --> Overdue61_90: Day 61-90
    Overdue31_60 --> Paid
    Overdue61_90 --> Overdue90Plus: Day 90+
    Overdue61_90 --> Paid
    Overdue90Plus --> WriteOff: CFO write-off
    Overdue90Plus --> Paid: Late payment
    Overdue90Plus --> Disputed: Client disputes
    Disputed --> Open: Resolved
    Disputed --> WriteOff: Cannot collect
    Open --> PartialPaid: Partial received
    PartialPaid --> Paid: Remainder received
    PartialPaid --> Overdue1_30: Aged
    Paid --> [*]
    WriteOff --> [*]
```

## Happy Path — Auto-Match Bank Receipt

```mermaid
flowchart TD
    Trigger[Bank statement uploaded<br/>or API webhook] --> Parse[Parse credit lines]
    Parse --> Loop[For each credit row]
    Loop --> Extract[Extract: amount, UTR, IFSC, narration]
    Extract --> Match[Run match heuristics]
    Match --> M1{Match by UTR<br/>in narration?}
    M1 -->|Yes| Confidence1[High confidence]
    M1 -->|No| M2{Match by amount +<br/>client GSTIN/PAN?}
    M2 -->|Yes| Confidence2[Medium confidence]
    M2 -->|No| M3{Match by amount<br/>+ client name?}
    M3 -->|Yes| Confidence3[Low confidence]
    M3 -->|No| Suspense[Move to suspense<br/>flag for manual]

    Confidence1 --> Apply[Apply to invoice<br/>state → Paid]
    Confidence2 --> ReviewQueue[Send to Fin L1<br/>1-click confirm queue]
    Confidence3 --> ReviewQueue
    Suspense --> ManualUI[Manual reconcile UI]

    ReviewQueue --> FinL1Choice{Confirm?}
    FinL1Choice -->|Yes| Apply
    FinL1Choice -->|No - wrong| ManualUI

    Apply --> SyncD365[Sync to D365 cash receipt]
    SyncD365 --> NotifyClient[Email confirmation]
    SyncD365 --> UpdateAging[Update aging buckets]

    classDef ok fill:#e8f5e9,stroke:#388e3c
    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef bad fill:#ffebee,stroke:#c62828
    class Apply,SyncD365,NotifyClient,UpdateAging ok
    class ReviewQueue,FinL1Choice,Confidence2,Confidence3 warn
    class Suspense,ManualUI bad
```

## Bad Path — Long-Aging Receivable

```mermaid
flowchart TD
    Open[Invoice Open day 0] --> D30[Day 30: still unpaid]
    D30 --> Bucket1[Bucket: Overdue 1-30]
    Bucket1 --> AutoStage1[Auto-trigger Dunning Stage 1]
    AutoStage1 --> D60[Day 60]
    D60 --> Bucket2[Bucket: 31-60]
    Bucket2 --> AutoStage2[Stage 2 dunning]
    AutoStage2 --> D90[Day 90]
    D90 --> Bucket3[Bucket: 61-90]
    Bucket3 --> AutoStage3[Stage 3 dunning + CFO alert]
    AutoStage3 --> D120[Day 120]
    D120 --> Bucket4[Bucket: 90+]
    Bucket4 --> CFOReview[CFO review meeting]
    CFOReview --> Decision{Decision?}
    Decision -->|Negotiate| Negotiate[Settlement offer]
    Decision -->|Legal| Legal[Legal referral]
    Decision -->|Write-off| Writeoff[Bad debt write-off<br/>requires CFO + audit trail]
    Negotiate --> PartialPaid
    Legal --> WaitOutcome[Track in legal pipeline]
    Writeoff --> WriteOffState[State: WriteOff]
    WriteOffState --> Provision[Provision in books]
    Provision --> SyncD365[Sync to D365 bad debt account]

    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef bad fill:#ffebee,stroke:#c62828
    class Bucket1,Bucket2,Bucket3,AutoStage1,AutoStage2 warn
    class Bucket4,CFOReview,Writeoff,WriteOffState,Legal bad
```

## Edge Cases

| ID | Edge Case | Resolution |
|---|---|---|
| AREC1 | Client pays one lump sum for 5 invoices | Auto-allocate by invoice age (oldest first), Fin L1 can override |
| AREC2 | Payment > invoice amount | Apply to invoice, balance to advance/credit account |
| AREC3 | Client pays in foreign currency | Convert at receipt-date rate, log FX gain/loss |
| AREC4 | TDS deducted but Form 16A missing 6+ months | Auto-escalate to client + flag for CA |
| AREC5 | Client name on bank receipt differs from master | Fuzzy match (>85% Levenshtein) or manual |
| AREC6 | Same UTR appears twice (bank error) | Flag for Fin L1, do not double-apply |
| AREC7 | Aging recalc on weekend | Skip weekends in business-day aging |
| AREC8 | Invoice cancelled after partial payment | Refund flow, cannot just delete |
