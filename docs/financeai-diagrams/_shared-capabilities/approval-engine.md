# Shared Capability — Approval Engine

Generic multi-step approval engine used by Expense (6-step), Invoice CN, Budget BRR, Vendor onboarding, Bank change, Payment runs, and PO approvals.

## Architecture

```mermaid
flowchart TB
    Caller[Any module] --> Engine[ApprovalEngine]

    subgraph Engine_Internal["ApprovalEngine"]
        Init[init_chain target, chain_template]
        Step[advance_step actor, decision]
        Query[start_query actor, message]
        Resp[respond_query actor, message]
        Reject[reject actor, reason]
        Cancel[cancel reason]
        Status[get_status]
    end

    Engine --> SoD[SoD Check]
    Engine --> SM[State Machine Check]
    Engine --> Aud[Audit Writer]
    Engine --> Notif[Notification Dispatcher]

    Engine --> DB[(PostgreSQL)]
    DB --> Tables[approval_chains<br/>approval_chain_steps<br/>approval_decisions<br/>approval_queries]
```

## Generic State Machine

```mermaid
stateDiagram-v2
    [*] --> Active: Chain started
    Active --> StepN: Next step assigned
    StepN --> Approved: Actor approves
    StepN --> Rejected: Actor rejects (terminal)
    StepN --> InQuery: Actor raises query
    InQuery --> StepN: Query responded
    Approved --> StepN1: Next step
    Approved --> Completed: All steps done
    Active --> Cancelled: Caller cancels
    Active --> Expired: SLA breach
    Completed --> [*]
    Rejected --> [*]
    Cancelled --> [*]
    Expired --> [*]
```

## Chain Templates

```mermaid
flowchart LR
    subgraph Templates["Templates Defined"]
        T1[expense_6_step:<br/>L1→L2→HoD→FinL1→FinL2→FinHead]
        T2[invoice_cn_2_step:<br/>FinL2→CFO]
        T3[budget_brr_intra:<br/>HoD→CFO]
        T4[budget_brr_inter:<br/>HoD→CFO→CEO]
        T5[vendor_onboard:<br/>Admin→CFO]
        T6[bank_change_3_step:<br/>Vendor→48h cooling→CFO+verify call]
        T7[payment_run_2_step:<br/>FinL2→CFO]
        T8[po_2_step:<br/>FinL1→FinL2]
    end

    classDef tpl fill:#fff9c4,stroke:#f57f17
    class T1,T2,T3,T4,T5,T6,T7,T8 tpl
```

## SoD Rules (Engine-Level)

The engine enforces these regardless of which module uses it:

1. **No self-approval**: actor ≠ submitter at any step
2. **No double-approval**: actor cannot appear twice in same chain
3. **No vendor-as-approver**: vendor role cannot approve their own bill
4. **No admin financial approval**: admin role cannot approve money flow steps
5. **Delegate cannot bypass SoD**: if delegate already approved earlier in chain, step auto-skips
6. **Filer-on-behalf cannot validate**: if `filer_on_behalf` is set, that user's L1 step routes to backup

## Sequence: Generic Step Advancement

```mermaid
sequenceDiagram
    participant Caller
    participant Engine
    participant SoD
    participant SM
    participant DB
    participant Notif
    participant Audit

    Caller->>Engine: advance_step(chain_id, actor, decision='approve')
    Engine->>DB: SELECT chain WITH lock + version
    Engine->>SM: validate transition
    SM-->>Engine: OK
    Engine->>SoD: check actor against chain history
    SoD-->>Engine: OK
    Engine->>DB: INSERT decision row
    Engine->>DB: UPDATE chain.current_step++ + version++
    alt More steps
        Engine->>DB: Set next step assignee
        Engine->>Notif: Notify next assignee
    else Last step
        Engine->>DB: status=Completed
        Engine->>Caller: callback hook completed
    end
    Engine->>Audit: log step_advanced
    Engine-->>Caller: Updated chain status
```
