# Budget Management — Use Case Diagram

Hierarchical budgeting with real-time threshold enforcement at the moment of invoice booking. Status: 🟡 Phase 2.

```mermaid
flowchart LR
    CFO((CFO))
    HoD((Dept Head))
    FinL1((Fin L1))
    CEO((CEO))
    System((System))
    D365((D365))

    subgraph BM["Budget Management"]
        UC1[Create annual budget]
        UC2[Define hierarchy<br/>Co→BU→Dept→CC→Project]
        UC3[Allocate to dept]
        UC4[Review allocated budget]
        UC5[Request revision]
        UC6[Approve allocation]
        UC7[Lock budget period]
        UC8[Auto-derive Q + monthly]
        UC9[Track real-time consumption]
        UC10[Fire 70% alert]
        UC11[Fire 85% alert with ack]
        UC12[Block at 100%]
        UC13[Submit BRR]
        UC14[Approve BRR L1]
        UC15[Approve BRR L2]
        UC16[Override block]
        UC17[Generate B vs A monthly]
        UC18[Generate quarterly deck]
        UC19[Sync to D365 budget ledger]
        UC20[Export Excel/PDF]
    end

    CFO --> UC1
    CFO --> UC2
    CFO --> UC6
    CFO --> UC7
    CFO --> UC15
    CFO --> UC16
    HoD --> UC4
    HoD --> UC5
    HoD --> UC13
    HoD --> UC14
    FinL1 --> UC3
    FinL1 --> UC17
    CEO --> UC15
    System -.-> UC8
    System -.-> UC9
    System -.-> UC10
    System -.-> UC11
    System -.-> UC12
    System -.-> UC17
    System -.-> UC18
    D365 -.-> UC19

    classDef actor fill:#e1f5ff,stroke:#0288d1
    classDef ext fill:#fff4e1,stroke:#f57c00
    class CFO,HoD,FinL1,CEO actor
    class System,D365 ext
```

## Use Case Index

| ID | Use Case | Actor | Notes |
|---|---|---|---|
| UC1 | Create annual budget | CFO | FY Apr–Mar |
| UC2 | Define hierarchy | CFO | 5-level: Co → BU → Dept → CC → Project |
| UC3 | Allocate to dept | Fin L1 | Per cost centre and category |
| UC4 | Review allocated budget | HoD | Accept or request revision |
| UC5 | Request revision | HoD | With justification |
| UC6 | Approve allocation | CFO | Final lock-in |
| UC7 | Lock budget period | CFO | Locked = no changes without BRR |
| UC8 | Auto-derive Q + monthly | System | From annual budget |
| UC9 | Track real-time consumption | System | At every invoice booking |
| UC10 | Fire 70% alert | System | Yellow, no block |
| UC11 | Fire 85% alert with ack | System | Amber, requires HoD ack on next booking |
| UC12 | Block at 100% | System | Hard block on D365 booking |
| UC13 | Submit BRR | HoD | Budget Reallocation Request |
| UC14 | Approve BRR L1 | HoD | Self if intra-dept |
| UC15 | Approve BRR L2 | CFO + CEO | If inter-dept or > threshold |
| UC16 | Override block | CFO | Emergency only, full audit |
| UC17 | Generate B vs A monthly | System | Auto on 2nd of month |
| UC18 | Generate quarterly deck | System | PDF auto-distributed |
| UC19 | Sync to D365 budget ledger | System | Bidirectional |
| UC20 | Export Excel/PDF | Any approver | On-demand |
