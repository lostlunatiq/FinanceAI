# 3SC FinanceAI — Architecture & Flow Diagrams

This package contains comprehensive diagrams for every module of the 3SC Finance Automation Portal ("FinanceAI"). All diagrams are written in **Mermaid** so they render natively in GitHub, GitLab, and most markdown viewers.

## How to Read This Package

Each module folder contains four files:

| File | Purpose | Audience |
|---|---|---|
| `1-use-case.md` | Use case diagram — actors and what they can do | Product, stakeholders |
| `2-flow.md` | Flow diagrams — happy path, bad paths, edge cases | Engineers, QA |
| `3-architecture.md` | Component & deployment architecture | Engineers, DevOps |
| `4-data-flow.md` | Data flow / sequence diagrams | Engineers, security review |

The `00-whole-app/` folder contains the application-level view that ties all modules together.

The `_shared-capabilities/` folder documents the cross-cutting capabilities (OCR, anomaly detection, approval engine, etc.) that multiple modules consume.

## Architecture Variants

Architecture diagrams come in two variants:

- **Hackathon** — what we're building in 4 weeks: Django + React + Postgres + Celery + MinIO + Mock D365.
- **Target** — the full production state: real D365 BC OData, ClickHouse warehouse, Power BI, Azure AD SSO, Kubernetes deployment, etc.

The Whole-App diagram has both variants. Module-level architectures are shown in hackathon form (because that's what we're building first); target enhancements are noted inline.

## Module Index

| # | Module | Status | Folder |
|---|---|---|---|
| 00 | Whole App | — | `00-whole-app/` |
| 01 | Expense Management | 🟢 Hackathon | `01-expense-management/` |
| 02 | Invoice Management (Sales) | 🟡 Phase 2 | `02-invoice-management/` |
| 03 | Budget Management | 🟡 Phase 2 | `03-budget-management/` |
| 04 | Vendor Management | 🟢/🟡 Hybrid | `04-vendor-management/` |
| 05 | Accounts Receivable | 🟡 Phase 2 | `05-accounts-receivable/` |
| 06 | Accounts Payable | 🟡 Phase 2 | `06-accounts-payable/` |
| 07 | Cash Flow Forecasting | 🔵 Phase 3 | `07-cash-flow-forecasting/` |
| 08 | Reporting | 🟡 Phase 2 | `08-reporting/` |
| 09 | Compliance Management | 🟡 Phase 2 | `09-compliance-management/` |
| 10 | Audit & Governance | 🟢 Hackathon | `10-audit-governance/` |
| — | Shared Capabilities | — | `_shared-capabilities/` |

## Mermaid Tips

- GitHub renders Mermaid automatically inside fenced ```` ```mermaid ```` blocks.
- For VSCode previews, install the "Markdown Preview Mermaid Support" extension.
- For standalone rendering, paste any code block into <https://mermaid.live>.
- Sequence diagrams use `sequenceDiagram`, flow diagrams use `flowchart TD/LR`, use case diagrams use `flowchart` with subgraphs (mermaid has no native UML use case syntax).

## Notation Conventions

| Symbol | Meaning |
|---|---|
| 🟢 | Hackathon scope |
| 🟡 | Phase 2 |
| 🔵 | Phase 3+ |
| ⭐ | Currently designing |
| 🚫 | Anti-requirement (will not build) |
| `[Rectangle]` | System component / service |
| `((Circle))` | Actor / external user |
| `{Diamond}` | Decision point |
| `[(Cylinder)]` | Database / data store |
| Solid arrow `-->` | Synchronous call / data flow |
| Dashed arrow `-.->` | Async / event / notification |

## Source

These diagrams are derived from:
- FRD v2.0 (April 2026)
- `PLANNING.md` (hackathon planning)
- `EXPENSE_MANAGEMENT.md` (detailed expense module spec)
