# Shared Capability — State Machine Framework

A generic state machine library used by every module with stateful records (Expense, Invoice, Budget, Vendor, AP).

## Core Concept

Each stateful model declares:
1. A set of states
2. A set of legal transitions (from → to)
3. Per-transition guards (preconditions)
4. Per-transition side effects (post-actions)

The framework enforces:
- Only declared transitions are allowed
- Direct status assignment is forbidden
- Every transition is audit-logged
- Optimistic concurrency via version field

## Architecture

```mermaid
flowchart TB
    Caller[Service code] --> Engine[StateMachineEngine.transition_to]

    subgraph Engine_Internal["Engine"]
        Lookup[Lookup transition def]
        ValidLegal{Transition declared?}
        ValidGuard[Run guards]
        ValidSoD[SoD checks if applicable]
        Lock[Optimistic version lock]
        Apply[Apply state change]
        SideEffect[Run side effects]
        AuditCall[Write audit log]
        NotifyCall[Enqueue notifications]
    end

    Engine --> Lookup
    Lookup --> ValidLegal
    ValidLegal -->|Yes| ValidGuard
    ValidLegal -->|No| Reject1[IllegalTransition]
    ValidGuard --> ValidSoD
    ValidSoD --> Lock
    Lock -->|version conflict| Reject2[ConcurrentModification]
    Lock -->|OK| Apply
    Apply --> SideEffect
    SideEffect --> AuditCall
    AuditCall --> NotifyCall
    NotifyCall --> Done[Return updated record]

    classDef ok fill:#e8f5e9,stroke:#388e3c
    classDef bad fill:#ffebee,stroke:#c62828
    classDef sec fill:#fff3e0,stroke:#ef6c00
    class Apply,Done,SideEffect,AuditCall,NotifyCall ok
    class Reject1,Reject2 bad
    class ValidLegal,ValidGuard,ValidSoD,Lock sec
```

## Declaring a State Machine

Pseudo-Python pattern (each module declares its own):

```python
class ExpenseStateMachine(StateMachine):
    states = [
        "DRAFT", "SUBMITTED", "AUTO_REJECT", "WITHDRAWN",
        "PENDING_L1", "QUERY_L1",
        "PENDING_L2", "QUERY_L2",
        "PENDING_HOD", "QUERY_HOD",
        "PENDING_FIN_L1", "QUERY_FIN_L1",
        "PENDING_FIN_L2", "QUERY_FIN_L2",
        "PENDING_FIN_HEAD", "QUERY_FIN_HEAD",
        "APPROVED", "PENDING_D365", "BOOKED_D365",
        "POSTED_D365", "PAID", "REJECTED", "EXPIRED",
    ]
    
    transitions = [
        ("SUBMITTED", "PENDING_L1", on_anomaly_clean),
        ("SUBMITTED", "AUTO_REJECT", on_hard_duplicate),
        ("PENDING_L1", "PENDING_L2", on_l1_approve),
        ("PENDING_L1", "REJECTED", on_l1_reject),
        # ... etc
    ]
```

## Key Properties

### 1. No Bypass

```mermaid
flowchart LR
    Code[Service code] --> Forbid{Direct status set?}
    Forbid -->|expense.status = X| Block[IllegalAssignment exception]
    Forbid -->|StateMachine.transition_to| Allow[Allowed path]

    classDef bad fill:#ffebee
    classDef ok fill:#e8f5e9
    class Block bad
    class Allow ok
```

The model's `status` property has a setter that raises unless called from within the engine. This prevents accidental state corruption.

### 2. Version-Based Optimistic Lock

```mermaid
sequenceDiagram
    participant A as Actor A
    participant B as Actor B
    participant Engine
    participant DB

    A->>Engine: transition_to(record_v5)
    B->>Engine: transition_to(record_v5)
    
    par Race
        Engine->>DB: UPDATE WHERE version=5 SET version=6 (A first)
        DB-->>Engine: 1 row
    and
        Engine->>DB: UPDATE WHERE version=5 (B second)
        DB-->>Engine: 0 rows
    end
    
    Engine-->>A: Success
    Engine-->>B: ConcurrentModification - retry
```

### 3. Reusable Across Modules

```mermaid
flowchart LR
    Framework[StateMachineEngine] --> Exp[Expense FSM]
    Framework --> Inv[Invoice FSM]
    Framework --> Bud[Budget FSM]
    Framework --> Ven[Vendor FSM]
    Framework --> AP[PO FSM]
    Framework --> Pay[Payment Run FSM]
    Framework --> CN[Credit Note FSM]
```

## Lifecycle Hooks

Each transition can declare:

| Hook | When | Use Case |
|---|---|---|
| `before_transition` | Pre-validation | Compute derived fields |
| `guard` | Validation | Check preconditions |
| `on_transition` | During | Apply side effects |
| `after_transition` | Post-commit | Send notifications, enqueue follow-ups |

## Audit Integration

Every successful transition automatically writes an audit log entry with:
- Module + record type
- From state, to state
- Actor
- Reason (if provided)
- Before/after snapshots
- Timestamp + IP

This is **not optional** — it happens inside the engine, not the caller. Calling code cannot accidentally skip the audit.

## Edge Cases the Framework Handles

| Case | Behavior |
|---|---|
| Null transition (X→X) | Rejected |
| Cyclic transitions | Allowed if explicitly declared |
| Terminal state | Engine raises if any further transition attempted |
| Missing guard return value | Treated as failure |
| Side effect throws | Transaction rolled back; record stays in original state |
| Concurrent transitions | First wins; second gets `ConcurrentModification` |
