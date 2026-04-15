# Accounts Payable — Flow Diagrams

## P2P (Procure-to-Pay) State Machine

```mermaid
stateDiagram-v2
    [*] --> PORequested: Fin L1 creates PO
    PORequested --> POApproved: Fin L2 approves
    POApproved --> POSent: Email to vendor
    POSent --> GoodsReceived: Emp enters GRN
    GoodsReceived --> InvoiceReceived: Vendor sends bill
    InvoiceReceived --> Matching: 3-way match runs
    Matching --> Matched: All match
    Matching --> Exception: Mismatch found
    Exception --> Matching: Resolved
    Matching --> Rejected: Cannot resolve
    Matched --> ReadyToPay: Approved + budget OK
    ReadyToPay --> InPaymentRun: Added to run
    InPaymentRun --> Paid: Bank confirms
    InPaymentRun --> PaymentFailed: Bank reject
    PaymentFailed --> ReadyToPay: Retry
    Paid --> Reconciled: Bank statement match
    Reconciled --> [*]
    Rejected --> [*]
```

## Happy Path — Standard P2P

```mermaid
flowchart TD
    Need[Department needs goods/services] --> CreatePO[Fin L1 creates PO]
    CreatePO --> POApprove[Fin L2 approves PO<br/>budget pre-check]
    POApprove --> SendPO[Send PO to vendor]
    SendPO --> Wait[Wait for delivery]
    Wait --> Delivery[Goods delivered]
    Delivery --> GRN[Emp L1 enters GRN<br/>quantity received]
    GRN --> Invoice[Vendor sends invoice<br/>via Expense module]
    Invoice --> ThreeWay[3-Way Match Engine]

    ThreeWay --> MatchPO{PO match?<br/>vendor + items + price}
    MatchPO -->|Yes| MatchGRN{GRN match?<br/>quantity}
    MatchGRN -->|Yes| MatchInv{Invoice match?<br/>amount}
    MatchInv -->|Yes| Matched[All matched]
    Matched --> BudgetCheck[Real-time budget check]
    BudgetCheck --> ApprovalChain[6-step approval chain]
    ApprovalChain --> ReadyPay[Ready to Pay]
    ReadyPay --> AddRun[Added to next payment run]
    AddRun --> RunSchedule[Payment run scheduled<br/>weekly Tue/Fri]
    RunSchedule --> CFOApprove[CFO approves run]
    CFOApprove --> Execute[Execute via bank API]
    Execute --> BankConfirm[Bank confirms NEFT]
    BankConfirm --> Paid[State: Paid]
    Paid --> ReconBank[Auto-reconcile next bank statement]
    ReconBank --> Reconciled[State: Reconciled]
    Reconciled --> SyncD365[Sync to D365]
    SyncD365 --> NotifyVendor[Notify vendor with UTR]

    classDef happy fill:#e8f5e9,stroke:#388e3c
    classDef sys fill:#f3e5f5,stroke:#7b1fa2
    classDef ext fill:#e0f7fa,stroke:#00838f
    class CreatePO,POApprove,GRN,Matched,ApprovalChain,CFOApprove,Reconciled,SyncD365 happy
    class ThreeWay,MatchPO,MatchGRN,MatchInv,BudgetCheck sys
    class Execute,BankConfirm,ReconBank ext
```

## Critical Flow — MSME 45-Day Rule Enforcement

Section 43B(h) of Income Tax Act: payments to MSME vendors beyond 45 days are disallowed as deduction. This triggers automatic enforcement.

```mermaid
flowchart TD
    Bill[MSME vendor bill received] --> Tag[Tag as MSME at intake]
    Tag --> Calc[Compute deadline = invoice_date + 45 days]
    Calc --> Track[Track in MSME 45-day register]
    Track --> Daily[Daily beat: check days remaining]

    Daily --> Bucket{Days remaining}
    Bucket -->|>15| Green[Green - normal]
    Bucket -->|10-15| Yellow[Yellow alert<br/>Fin L2 notified]
    Bucket -->|5-10| Amber[Amber alert<br/>CFO notified]
    Bucket -->|0-5| Red[Red alert<br/>auto-include in next payment run<br/>cannot be excluded]
    Bucket -->|<0| Breach[BREACH<br/>Section 43B impact<br/>CFO + tax team alerted]

    Red --> ForceInclude[Force include in payment run]
    ForceInclude --> Paid[Paid before deadline]

    Breach --> CalcImpact[Calculate tax impact<br/>amount × 30%]
    CalcImpact --> RecordLiab[Record in Section 43B register]
    RecordLiab --> CAReport[Include in CA monthly export]

    classDef ok fill:#e8f5e9,stroke:#388e3c
    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef bad fill:#ffebee,stroke:#c62828
    class Green,Paid ok
    class Yellow,Amber,Red,ForceInclude warn
    class Breach,CalcImpact,RecordLiab,CAReport bad
```

## Bad Path — 3-Way Match Exception

```mermaid
flowchart TD
    Match[3-way match runs] --> Result{Match result?}
    Result -->|Quantity mismatch| QtyExc[Exception: GRN qty != Invoice qty]
    Result -->|Price mismatch| PriceExc[Exception: PO price != Invoice price]
    Result -->|Vendor mismatch| VendExc[Exception: Wrong vendor]
    Result -->|Item mismatch| ItemExc[Exception: Item not on PO]
    Result -->|Amount tolerance| TolExc[Exception: > 5% variance]

    QtyExc --> ExcQueue[Exception queue Fin L1]
    PriceExc --> ExcQueue
    VendExc --> ExcQueue
    ItemExc --> ExcQueue
    TolExc --> ExcQueue

    ExcQueue --> FinL1Action{Fin L1 action}
    FinL1Action -->|Update GRN| FixGRN[Update GRN qty]
    FinL1Action -->|Request CN from vendor| ReqCN[Vendor issues credit note]
    FinL1Action -->|Approve override| Override[Override with reason<br/>Fin L2 sign-off]
    FinL1Action -->|Reject bill| Reject[Reject bill]

    FixGRN --> Rematch[Re-run match]
    ReqCN --> Rematch
    Override --> Continue[Continue to approval]
    Rematch --> MatchOK{OK?}
    MatchOK -->|Yes| Continue
    MatchOK -->|No| ExcQueue
    Reject --> RejectFlow[Standard reject flow]

    classDef exc fill:#fff3e0,stroke:#ef6c00
    classDef bad fill:#ffebee,stroke:#c62828
    classDef good fill:#e8f5e9,stroke:#388e3c
    class QtyExc,PriceExc,VendExc,ItemExc,TolExc,ExcQueue,Rematch exc
    class Reject,RejectFlow bad
    class Continue,FixGRN good
```

## Edge Cases

| ID | Edge Case | Resolution |
|---|---|---|
| APEC1 | Invoice received before GRN | Hold in pending GRN queue, alert dept |
| APEC2 | GRN entered for partial qty | Match against partial, balance in pending |
| APEC3 | Vendor sends multiple invoices for one PO | Match each invoice cumulatively against PO balance |
| APEC4 | Early payment discount available | Auto-flag, calculate savings, prioritize in run |
| APEC5 | Bank API timeout during payment run | Retry per-vendor, isolate failures, do not re-pay successes |
| APEC6 | UTR returned but bank later reverses | Listen for reversal webhook, revert state, alert |
| APEC7 | Vendor bank changed during pending bill | Pause this bill until bank change cleared |
| APEC8 | MSME bill stuck in dispute > 45 days | Tax team alerted, dispute does not pause Section 43B clock |
| APEC9 | Foreign vendor (no GST) | Skip GST checks, apply RBI rate, track FX |
| APEC10 | Duplicate invoice from vendor | Hard reject via dedupe (vendor + invoice_no + amount) |
