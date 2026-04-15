# Compliance Management — Use Case Diagram

GST, TDS, MSME, and statutory compliance support. Status: 🟡 Phase 2.

## 🚫 Anti-Requirement
**The system NEVER auto-files returns with any government portal.** It only prepares data and generates files. The CA always files manually. This is non-negotiable to avoid liability for incorrect filings.

```mermaid
flowchart LR
    FinL1((Fin L1))
    FinL2((Fin L2))
    CFO((CFO))
    CA((External CA))
    System((System))
    GST((GST Portal))

    subgraph CM["Compliance Management"]
        UC1[Generate GSTR-1 file]
        UC2[Reconcile GSTR-2A]
        UC3[Identify ITC mismatches]
        UC4[Generate TDS challan data]
        UC5[Track Form 16A receipt]
        UC6[Reconcile Form 26AS]
        UC7[Generate MSME compliance report]
        UC8[Compute MSME interest exposure]
        UC9[Track upcoming due dates]
        UC10[Send filing reminder to CA]
        UC11[Mark filed by CA]
        UC12[Upload filing acknowledgment]
        UC13[Generate compliance dashboard]
        UC14[Audit compliance gaps]
        UC15[Generate Tax Audit data]
        UC16[Track e-invoice IRN coverage]
    end

    FinL1 --> UC1
    FinL1 --> UC4
    FinL1 --> UC5
    FinL1 --> UC6
    FinL2 --> UC2
    FinL2 --> UC3
    FinL2 --> UC7
    FinL2 --> UC15
    CFO --> UC13
    CFO --> UC14
    CA --> UC11
    CA --> UC12
    System -.-> UC9
    System -.-> UC10
    System -.-> UC13
    System -.-> UC16
    GST -.-> UC2

    classDef actor fill:#e1f5ff,stroke:#0288d1
    classDef ext fill:#fff4e1,stroke:#f57c00
    class FinL1,FinL2,CFO,CA actor
    class System,GST ext
```

## Use Case Index

| ID | Use Case | Actor | Notes |
|---|---|---|---|
| UC1 | Generate GSTR-1 file | Fin L1 | JSON for portal upload, CA uploads |
| UC2 | Reconcile GSTR-2A | Fin L2 | Match 2A vs purchase register |
| UC3 | Identify ITC mismatches | Fin L2 | Vendor not filed yet, etc. |
| UC4 | Generate TDS challan data | Fin L1 | CSV for portal, CA pays |
| UC5 | Track Form 16A receipt | Fin L1 | Quarterly, vendor-side |
| UC6 | Reconcile Form 26AS | Fin L1 | Annual, against TDS book |
| UC7 | Generate MSME report | Fin L2 | Half-yearly Form MSME-1 |
| UC8 | Compute MSME interest | System | Section 16 MSMED Act |
| UC9 | Upcoming due dates | System | Calendar of compliances |
| UC10 | Send reminder to CA | System | T-7, T-3, T-1 |
| UC11 | Mark filed by CA | CA | After portal upload |
| UC12 | Upload acknowledgment | CA | ARN/receipt number |
| UC13 | Compliance dashboard | CFO | Heatmap by area |
| UC14 | Audit compliance gaps | CFO | Drill-down |
| UC15 | Tax Audit data | Fin L2 | Section 44AB pack |
| UC16 | E-invoice coverage | System | Audit IRN-required invoices |
