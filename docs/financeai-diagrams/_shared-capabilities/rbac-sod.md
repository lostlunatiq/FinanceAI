# Shared Capability — RBAC & SoD

Role-based access control with hard-coded Segregation of Duties enforcement.

## Role Hierarchy

```mermaid
flowchart TB
    CEO[CEO]
    CFO[CFO / Finance Head]
    FinL2[Finance L2]
    FinL1[Finance L1]
    HoD[Department Head]
    EmpL2[Employee L2]
    EmpL1[Employee L1]
    Vendor[Vendor]
    Admin[Admin]
    Auditor[Internal Auditor]
    External[External CA]

    CEO --> CFO
    CFO --> FinL2
    FinL2 --> FinL1
    HoD --> EmpL2
    EmpL2 --> EmpL1
    Admin -.-> CFO
    Auditor -.-> CFO
    External -.-> Auditor

    classDef exec fill:#fff9c4,stroke:#f57f17
    classDef fin fill:#e1f5ff,stroke:#0288d1
    classDef dept fill:#e8f5e9,stroke:#388e3c
    classDef ext fill:#fff4e1,stroke:#f57c00
    classDef admin fill:#f3e5f5,stroke:#7b1fa2

    class CEO,CFO exec
    class FinL2,FinL1 fin
    class HoD,EmpL2,EmpL1 dept
    class Vendor,External ext
    class Admin,Auditor admin
```

## Permission Matrix (Excerpt)

| Permission | Vendor | EmpL1 | EmpL2 | HoD | FinL1 | FinL2 | CFO | CEO | Admin | Auditor |
|---|---|---|---|---|---|---|---|---|---|---|
| Submit own bill | ✅ | — | — | — | — | — | — | — | — | — |
| File bill on behalf | — | ✅ | — | — | — | — | — | — | — | — |
| Approve at L1 | — | ✅ | — | — | — | — | — | — | — | — |
| Approve at L2 | — | — | ✅ | — | — | — | — | — | — | — |
| Approve at HoD | — | — | — | ✅ | — | — | — | — | — | — |
| Approve at Fin L1 | — | — | — | — | ✅ | — | — | — | — | — |
| Approve at Fin L2 | — | — | — | — | — | ✅ | — | — | — | — |
| Approve at Fin Head | — | — | — | — | — | — | ✅ | — | — | — |
| Book in D365 | — | — | — | — | — | — | ✅ | — | — | — |
| Create vendor | — | — | — | — | — | — | — | — | ✅ | — |
| Approve vendor | — | — | — | — | — | — | ✅ | — | ✅ | — |
| Lock budget | — | — | — | — | — | — | ✅ | — | — | — |
| Approve BRR (intra-dept) | — | — | — | ✅ | — | — | ✅ | — | — | — |
| Approve BRR (inter-dept) | — | — | — | — | — | — | ✅ | ✅ | — | — |
| View audit log | — | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ |
| Export audit log | — | — | — | — | — | — | ✅ | — | — | ✅ |
| Manage users | — | — | — | — | — | — | — | — | ✅ | — |
| Override anomaly | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |

## SoD Enforcement (Cascade)

```mermaid
flowchart TB
    Request[Action request] --> L1[Layer 1: Permission check<br/>Does user have role?]
    L1 -->|No| Deny1[403 Forbidden]
    L1 -->|Yes| L2[Layer 2: SoD code rule<br/>actor != submitter<br/>actor != filer<br/>actor not in chain history]
    L2 -->|No| Deny2[403 SoD violation]
    L2 -->|Yes| L3[Layer 3: State machine<br/>current state matches expected]
    L3 -->|No| Deny3[409 Invalid state]
    L3 -->|Yes| L4[Layer 4: Object-level<br/>e.g. dept membership, vendor mapping]
    L4 -->|No| Deny4[403 Not authorized for this object]
    L4 -->|Yes| Allow[Allow + audit log]

    classDef sec fill:#ffebee,stroke:#c62828
    classDef ok fill:#e8f5e9,stroke:#388e3c
    class L1,L2,L3,L4,Deny1,Deny2,Deny3,Deny4 sec
    class Allow ok
```

## Hard-Coded SoD Rules

These cannot be configured. They are enforced in `apps/approvals/sod.py`:

1. **No self-approval** — `actor.id != target.submitter.id`
2. **No double-approval** — `actor.id not in target.approval_history`
3. **No vendor-as-approver** — `actor.role != Vendor`
4. **No admin financial approval** — `actor.role != Admin` for money-flow transitions
5. **No filer-on-behalf as L1 validator** — if `target.filer_on_behalf == actor`, route to backup L1
6. **No delegate already in chain** — if delegate previously approved this chain, auto-skip
7. **CFO cannot approve their own expense** — even though they're at the top of the chain
8. **Reviewer cannot review own audit findings** — internal auditor cannot self-clear

## SoD Violation Detection (Continuous)

The SoD scanner runs hourly to catch any violations that slipped through (e.g., due to race conditions or schema changes):

```mermaid
flowchart LR
    Beat[Hourly beat] --> Scan[Scan recent approvals]
    Scan --> Find[Find any rule violations]
    Find --> Alert{Found?}
    Alert -->|Yes| Critical[Critical alert CFO + Admin<br/>+ lock the record]
    Alert -->|No| Done[Done]

    classDef bad fill:#ffebee,stroke:#c62828
    classDef ok fill:#e8f5e9,stroke:#388e3c
    class Critical bad
    class Done ok
```

## Backup Approver Configuration

Each role has a configurable backup. When the primary is unavailable (deactivated, on leave, in conflict), the backup is auto-routed:

| Primary | Backup |
|---|---|
| L1 mapped to vendor | Backup L1 (admin-configured) |
| HoD on leave | Backup HoD (configurable) |
| CFO unreachable for >24h on critical | CEO (escalation) |

The backup also obeys SoD — it gets the same checks as the primary.
