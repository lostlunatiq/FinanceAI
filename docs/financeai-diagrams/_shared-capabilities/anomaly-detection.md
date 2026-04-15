# Shared Capability — Anomaly Detection

Hybrid rules + ML approach to detect suspicious bills, payments, and invoice patterns.

## Detection Pipeline

```mermaid
flowchart TB
    Trigger[New record] --> Load[Load history for entity]
    Load --> Rules[Rule-based checks]

    subgraph RuleSet["Rule Checks"]
        R1[Hard duplicate<br/>vendor + invoice_no + amount]
        R2[Round amount<br/>like ₹50,000.00 exactly]
        R3[Out-of-band hours<br/>2 AM submissions]
        R4[Vendor first bill > avg]
        R5[Multiple bills same vendor same day]
        R6[Amount just below approval threshold]
        R7[GSTIN status mismatch]
        R8[Bank account just changed]
    end

    Rules --> R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8
    R1 --> Aggregate
    R2 --> Aggregate
    R3 --> Aggregate
    R4 --> Aggregate
    R5 --> Aggregate
    R6 --> Aggregate
    R7 --> Aggregate
    R8 --> Aggregate

    Aggregate[Rule signals collected] --> ML[ML model:<br/>Isolation Forest on numeric features]
    ML --> Score[ML anomaly score]
    Score --> Combine[Combine rules + ML]

    Combine --> Severity{Severity}
    Severity -->|Critical hard dup| AutoReject[Auto-reject]
    Severity -->|High| Flag[Flag with override required]
    Severity -->|Medium| Warn[Show amber warning]
    Severity -->|Low/None| Pass[Continue normally]

    AutoReject --> Audit[Audit log all signals]
    Flag --> Audit
    Warn --> Audit

    classDef rule fill:#fff9c4,stroke:#f57f17
    classDef ml fill:#e1bee7,stroke:#4a148c
    classDef bad fill:#ffebee,stroke:#c62828
    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef good fill:#e8f5e9,stroke:#388e3c
    class R1,R2,R3,R4,R5,R6,R7,R8,Rules rule
    class ML,Score ml
    class AutoReject bad
    class Flag,Warn warn
    class Pass good
```

## Severity Computation

```mermaid
flowchart LR
    Signals[Signal collection] --> Score[Score = sum(weights)]
    Score --> Tier{Score range}
    Tier -->|>= 100| Crit[CRITICAL<br/>auto-reject]
    Tier -->|50-99| High[HIGH<br/>override required]
    Tier -->|20-49| Med[MEDIUM<br/>warning]
    Tier -->|0-19| Low[LOW<br/>pass through]

    classDef bad fill:#ffebee
    classDef warn fill:#fff3e0
    classDef ok fill:#e8f5e9
    class Crit bad
    class High,Med warn
    class Low ok
```

## Signal Weights (Configurable)

| Signal | Weight | Notes |
|---|---|---|
| Hard duplicate (same vendor+inv_no+amount) | 100 | Auto-reject |
| Bank account changed within 7 days | 60 | Possible fraud |
| Amount > 3σ above vendor average | 40 | Statistical outlier |
| Round amount + first bill from vendor | 30 | Suspicious pattern |
| Submitted between 11 PM - 5 AM | 15 | Off-hours |
| Amount within 5% of approval threshold | 25 | Threshold gaming |
| GSTIN suspended in last 30 days | 50 | Compliance risk |
| Vendor concentration > 40% of category | 10 | Single-vendor risk |

## ML Component

- **Algorithm**: Isolation Forest (sklearn)
- **Features**: amount, day_of_month, day_of_week, hour, days_since_last_bill, ratio_to_vendor_avg, ratio_to_category_avg
- **Training**: Nightly retrain on rolling 12-month window
- **Score**: -1 to 1; threshold at -0.3 contributes 30 points to severity
