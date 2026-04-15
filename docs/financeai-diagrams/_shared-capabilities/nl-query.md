# Shared Capability — NL Query Engine

Translates natural language questions to safe SQL on the read replica.

## Architecture

```mermaid
flowchart TB
    User[User question] --> API[NLQueryAPI]
    API --> Catalog[Schema catalog]
    Catalog --> Mask[Mask service]
    Mask --> Claude[Claude API<br/>with schema + question]
    Claude --> SQL[Generated SQL]
    SQL --> Parser[sqlglot parser]
    Parser --> Validator[Safety validator]

    Validator --> Check1{SELECT only?}
    Check1 -->|No| Reject1[Reject]
    Check1 -->|Yes| Check2{Allowed tables?}
    Check2 -->|No| Reject2[Reject]
    Check2 -->|Yes| Check3{Safe functions?}
    Check3 -->|No| Reject3[Reject]
    Check3 -->|Yes| Check4{Reasonable joins?}
    Check4 -->|No| Reject4[Reject]
    Check4 -->|Yes| Inject[Inject LIMIT + timeout]

    Inject --> Execute[Execute on read replica]
    Execute --> Format[Format result]
    Format --> Audit[Audit log query]
    Audit --> Return[Return to user]

    Reject1 --> Error[Safe error message]
    Reject2 --> Error
    Reject3 --> Error
    Reject4 --> Error

    classDef ai fill:#fce4ec,stroke:#c2185b
    classDef sec fill:#ffebee,stroke:#c62828
    classDef ok fill:#e8f5e9,stroke:#388e3c
    class Mask,Claude ai
    class Validator,Check1,Check2,Check3,Check4,Reject1,Reject2,Reject3,Reject4 sec
    class Execute,Format,Audit,Return ok
```

## Validation Rules

| Rule | Action if violated |
|---|---|
| Statement is SELECT | Reject |
| All tables in allowlist | Reject |
| No `pg_*` system functions | Reject |
| No `lo_import`, `lo_export` | Reject |
| No `COPY` | Reject |
| Joins ≤ 5 tables | Reject |
| No subquery deeper than 4 levels | Reject |
| Result rows ≤ 10,000 (LIMIT injected) | Force limit |
| Statement timeout 30s | Force timeout |

## Allowlist of Tables

NL queries can read from but not modify:
- expenses, expense_approval_steps, expense_queries
- invoices, invoice_line_items, credit_notes, dunning_events
- budgets, budget_allocations, budget_consumption, brrs
- vendors, vendor_bank_accounts, vendor_scorecards
- ar_ledger, aging_snapshots, receipts
- ap_aging, payment_runs, msme_register
- audit_log (read-only by definition)
- forecast_snapshots, daily_projections

NL queries are **explicitly blocked** from:
- users, user_sessions (PII)
- file_refs raw paths (security)
- API keys, tokens, secrets

## Example Translations

| Question | Generated SQL Pattern |
|---|---|
| "Top 10 vendors by overdue amount" | `SELECT v.legal_name, SUM(a.balance) FROM ar_ledger a JOIN vendors v ... WHERE a.bucket != 'Current' GROUP BY v.id ORDER BY 2 DESC LIMIT 10` |
| "Bills approved by Rahul last month" | `SELECT * FROM expenses WHERE id IN (SELECT expense_id FROM expense_approval_steps WHERE actor=... AND decided_at BETWEEN ...)` |
| "Departments over 90% budget" | `SELECT d.name, b.consumed/b.allocated FROM budget_consumption b ... WHERE consumed/allocated > 0.9` |
