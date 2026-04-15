# Audit & Governance — Flow Diagrams

## Audit Log Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Written: Any state-changing action
    Written --> Hashed: Hash chain computed
    Hashed --> Verified: Periodic verification
    Verified --> Archived: After 1 year
    Archived --> ColdStorage: After 3 years
    ColdStorage --> Purged: After 7 years (statutory)
    Purged --> [*]

    Verified --> Verified: Continuous re-verification
    Hashed --> Exported: On audit request
    Verified --> Exported
    Archived --> Exported
```

## Happy Path — Write Audit Log Entry

```mermaid
flowchart TD
    Action[Any state change anywhere] --> Hook[Auto-emitted by TransitionService<br/>or signal handler]
    Hook --> Build[Build entry:<br/>actor, action, target, before, after, ip, ts]
    Build --> PrevHash[Fetch previous entry hash]
    PrevHash --> Hash[Compute SHA256 of<br/>entry + prev_hash]
    Hash --> Store[INSERT into audit_log table]
    Store --> AppendOnly[Marked append-only via DB trigger:<br/>UPDATE/DELETE = error]
    AppendOnly --> Done[Done]

    classDef sec fill:#ffebee,stroke:#c62828,stroke-width:3px
    classDef ok fill:#e8f5e9,stroke:#388e3c
    class Hash,AppendOnly sec
    class Build,Store,Done ok
```

## SoD Violation Detection (Continuous)

```mermaid
flowchart TD
    Beat[Hourly SoD scanner] --> Scan[Scan recent approvals]
    Scan --> Check1{Same user appears<br/>twice in same chain?}
    Check1 -->|Yes| V1[Violation: double-approval]
    Check1 -->|No| Check2{Filer = approver<br/>at any step?}
    Check2 -->|Yes| V2[Violation: self-approval]
    Check2 -->|No| Check3{Approver beneficiary?<br/>e.g. own dept]
    Check3 -->|Yes| V3[Possible conflict]
    Check3 -->|No| Check4{Vendor = current user?}
    Check4 -->|Yes| V4[Violation: vendor approval]
    Check4 -->|No| Done[Done]

    V1 --> Alert[Critical alert CFO + Admin]
    V2 --> Alert
    V3 --> Investigate[Send to investigation queue]
    V4 --> Alert

    Alert --> Lock[Lock the record]
    Lock --> Audit[Audit log violation]

    classDef bad fill:#ffebee,stroke:#c62828
    classDef warn fill:#fff3e0,stroke:#ef6c00
    classDef good fill:#e8f5e9,stroke:#388e3c
    class V1,V2,V4,Alert,Lock,Audit bad
    class V3,Investigate warn
    class Done good
```

## AI Audit Query Flow

```mermaid
sequenceDiagram
    autonumber
    participant Auditor
    participant UI
    participant API
    participant Mask
    participant Claude
    participant DB
    participant Audit

    Auditor->>UI: "Find all expense approvals where the<br/>same user appears more than once last quarter"
    UI->>API: POST /audit/query
    API->>DB: Pre-filter audit_log to scope
    API->>Mask: Mask user names → tokens
    Mask->>Claude: Generate analysis SQL + interpretation
    Claude-->>Mask: SQL + natural language analysis
    Mask->>Mask: Validate SQL safety
    Mask->>DB: Execute on read replica
    DB-->>Mask: Result rows
    Mask->>Mask: Un-tokenize for display
    Mask-->>API: Result
    API->>Audit: Log audit query
    API-->>UI: Display findings
```

## Edge Cases

| ID | Edge Case | Resolution |
|---|---|---|
| AGEC1 | Audit log corruption suspected | Run hash chain verification, alert if break, identify break point |
| AGEC2 | User deactivated mid-action | Action completes if API call already started, no new actions allowed |
| AGEC3 | Role revoked during pending approval | Pending step reassigned to backup, audit logged |
| AGEC4 | Two admins assign conflicting roles | Last-write-wins with audit log of both |
| AGEC5 | External auditor requests sensitive data | Read-only export with watermark, time-limited URL |
| AGEC6 | Audit log query returns >10k rows | Paginate, force CSV export for large results |
| AGEC7 | DB rollback after partial transaction | Audit log uses same transaction, rollback rolls back log too |
| AGEC8 | Clock skew between servers | Use DB server timestamp authoritatively, not app server |
