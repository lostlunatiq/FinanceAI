# Vendor Management — Data Flow Diagram

## Data Model

```mermaid
erDiagram
    Vendor ||--|{ VendorBankAccount : "has"
    Vendor ||--o{ VendorContract : "signed"
    Vendor ||--o{ VendorL1Mapping : "assigned to"
    Vendor ||--o| VendorScorecard : "scored as"
    Vendor ||--o{ BankChangeRequest : "requests"
    Vendor ||--o{ Expense : "submits"
    Vendor ||--o{ MSMERegistration : "may have"
    VendorL1Mapping }o--|| User : "L1 user"
    BankChangeRequest }o--|| User : "approved by"

    Vendor {
        uuid id PK
        string legal_name
        string trade_name
        string gstin UK
        string pan UK
        string udyam_number
        enum vendor_type
        enum status
        decimal credit_limit
        string tds_section
        date onboarded_at
        date last_kyc_check
        decimal concentration_pct
    }

    VendorBankAccount {
        uuid id PK
        uuid vendor_id FK
        string account_number_encrypted
        string ifsc
        string bank_name
        string branch
        boolean is_primary
        timestamp verified_at
        uuid verified_by FK
    }

    VendorScorecard {
        uuid id PK
        uuid vendor_id FK
        decimal invoice_accuracy_pct
        integer credit_notes_12m
        integer avg_payment_days
        decimal msme_compliance_score
        decimal concentration_risk
        date last_calculated
    }
```

## Sequence: KYC Validation Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant Admin
    participant API
    participant KYC as KYCValidator
    participant GST as GST Portal
    participant Udyam
    participant IFSC
    participant DB
    participant Audit

    Admin->>API: Submit vendor with KYC fields
    API->>KYC: validate(payload)

    par Parallel validations
        KYC->>GST: Check GSTIN status
        GST-->>KYC: {valid, name, address, status}
    and
        KYC->>KYC: PAN format check (regex + Luhn)
    and
        KYC->>IFSC: Lookup IFSC
        IFSC-->>KYC: {bank_name, branch, valid}
    and
        opt MSME claimed
            KYC->>Udyam: Verify Udyam number
            Udyam-->>KYC: {valid, category, expiry}
        end
    end

    KYC->>KYC: Aggregate results
    alt All valid
        KYC-->>API: {valid: true}
        API->>DB: INSERT vendor status=AwaitingApproval
        API->>Audit: log kyc_passed
    else Any invalid
        KYC-->>API: {valid: false, errors}
        API-->>Admin: Show errors
        API->>Audit: log kyc_failed
    end
```

## Scorecard Calculation Sources

```mermaid
flowchart LR
    subgraph Sources["Data Sources"]
        Bills[All bills 12 months]
        Payments[Payment history]
        CN[Credit notes issued]
        MSME[MSME compliance events]
        SpendData[Total category spend]
    end

    subgraph Metrics["Calculated Metrics"]
        Acc[Invoice accuracy %<br/>= bills_passed_first_try / total]
        CNRate[CN frequency<br/>= count / total]
        AvgDays[Avg payment days<br/>= mean(paid_at - approved_at)]
        MSMEScore[MSME compliance<br/>0-100]
        Conc[Concentration %<br/>= vendor_spend / category_total]
    end

    subgraph Scorecard["Scorecard Output"]
        Output[VendorScorecard row]
    end

    Bills --> Acc
    Bills --> CNRate
    CN --> CNRate
    Payments --> AvgDays
    MSME --> MSMEScore
    SpendData --> Conc
    Bills --> Conc

    Acc --> Output
    CNRate --> Output
    AvgDays --> Output
    MSMEScore --> Output
    Conc --> Output

    Output --> Alert{Concentration > 40%?}
    Alert -->|Yes| AlertCFO[Alert CFO]

    classDef src fill:#e3f2fd,stroke:#1976d2
    classDef calc fill:#fff9c4,stroke:#f57f17
    classDef out fill:#e8f5e9,stroke:#388e3c
    class Bills,Payments,CN,MSME,SpendData src
    class Acc,CNRate,AvgDays,MSMEScore,Conc calc
    class Output,AlertCFO out
```
