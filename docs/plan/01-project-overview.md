# 01 — Project Overview

## 1.1 Project Name & Goal

**FinanceAI** — 3SC Finance Automation Portal

An internal company finance application that automates vendor bill processing, sales invoicing, budgeting, reporting, and audit governance. Built for a company hackathon with a clear migration path to production.

### Core Value Proposition
1. **Vendor self-service**: Vendors submit bills via portal → OCR extracts data → 6-step approval chain → D365 booking → payment tracking
2. **AI-powered processing**: Claude Vision OCR, anomaly detection (rules + ML), NL query engine
3. **Compliance-first**: PII masking, hash-chained audit, SoD enforcement, GST/TDS automation
4. **End-to-end visibility**: Every actor (vendor, employee, finance, CFO, admin) has role-specific dashboards

---

## 1.2 User Personas (Actors)

| Actor | Role | Primary Actions |
|-------|------|----------------|
| **Vendor** | External user with portal access | Submit bills, track status, respond to queries, dispute filings, download remittance PDF, request bank changes |
| **Employee L1** | Internal - mapped to vendor(s) | File bills on behalf, validate OCR data, L1 approval, cross-check vendor history |
| **Employee L2** | Internal - department | L2 departmental approval, anomaly override |
| **Department Head (HoD)** | Internal - department leader | HoD approval, budget review, budget reallocation requests |
| **Finance L1** | Internal - finance team | Tax compliance validation, invoice creation, AR/AP operations, Fin L1 approval |
| **Finance L2** | Internal - senior finance | Fin L2 approval, dunning, credit notes, payment runs |
| **CFO / Finance Head** | Internal - C-level | Final approval, D365 booking, budget locking, cash flow oversight, NL queries |
| **CEO** | Internal - C-level | High-amount BRR approval, executive summaries |
| **Admin** | Internal - system admin | Vendor onboarding, user management, approval chain config, system settings |
| **Internal Auditor** | Internal | View/export audit logs, run AI audit queries |
| **External CA** | External - chartered accountant | GST/TDS return filing (system prepares data, CA files) |
| **System / AI** | Automated | OCR extraction, anomaly detection, SLA monitoring, AI summaries, notifications |

---

## 1.3 Technology Stack

### Backend (Python)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Django 5.x | Auth, ORM, admin, migrations |
| API | Django REST Framework (DRF) | REST API with JWT |
| API Schema | drf-spectacular | OpenAPI 3.0 auto-generation |
| Auth | djangorestframework-simplejwt | JWT access + refresh tokens |
| Async | Celery 5.x | OCR, anomaly, notifications, SLA timers |
| Broker | Redis | Celery broker + caching layer |
| Database | PostgreSQL 16 | Primary data store with JSONB |
| File Storage | MinIO (S3-compatible) | Bill PDFs, evidence, exports |
| AI/OCR | Claude Sonnet 4 (Anthropic) | Vision OCR + text (via masking middleware) |
| ML | scikit-learn | Isolation Forest for anomaly detection |
| Email | Mailtrap (dev) / AWS SES (prod) | Notification delivery |
| Task Scheduler | Celery Beat | SLA checks, dunning, SoD scans |

### Frontend (TypeScript)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 18 + Vite | SPA with role-based routing |
| Language | TypeScript | Type safety |
| UI Library | shadcn/ui + Tailwind CSS | Component library + styling |
| State (Server) | TanStack Query (React Query) | API data fetching + caching |
| State (Client) | Zustand | Client-side UI state |
| Tables | TanStack Table | Data tables with sort/filter/page |
| Charts | Recharts | Dashboard visualizations |
| Forms | React Hook Form + Zod | Form state + validation |
| Icons | Lucide React | Consistent iconography |
| Search | cmdk | Command palette (Cmd+K) |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Containerization | Docker + Docker Compose | One `make up` runs everything |
| Reverse Proxy | Nginx | API gateway, static files, CORS |
| CI | GitHub Actions | Lint + test on PR |
| D365 | Mock Django app (in-process) | Same process, separate URL prefix |

### External Systems

| System | Integration | Hackathon vs Target |
|--------|------------|---------------------|
| D365 Business Central | OData v4 adapter | Mock (Django app) → Real BC API |
| GST Portal | GSTIN validation, e-invoice IRN | Mocked → Real API |
| Bank | Statements, NEFT, UTRs | Manual upload → Bank API |
| Claude API | OCR + NL queries | Real (via masking middleware) |

---

## 1.4 Module Summary

### Hackathon Scope (🟢)

| Module | Description | Key Flows |
|--------|------------|-----------|
| **Expense Management** | Vendor bill submission → OCR → 6-step approval → D365 → payment | Self-service, on-behalf filing, anomaly override, query loop, SLA breach |
| **Invoice Management** | Sales invoice creation → e-invoice → send → dunning → payment → reconciliation | 4 service-line templates, 4-stage dunning, dispute/CN, bank reconciliation |
| **Audit & Governance** | Immutable hash-chained audit log, access tracking, compliance reports | Hash verification, action catalog, monthly archive |

### Phase 2 (🟡)

| Module | Description |
|--------|------------|
| **Vendor Management** | Onboarding, KYC, bank account changes (48h cooling), L1 mapping, performance scoring |
| **Budget Management** | Annual/quarterly budgets, allocations, BRR (intra/inter-dept), threshold alerts |
| **Accounts Payable** | PO creation, GRN entry, 3-way match, payment runs, MSME compliance |
| **Accounts Receivable** | AR aging, client outstanding, receipt application, TDS tracking |
| **Reporting** | Standard reports, scheduled delivery, NL query engine, CFO summaries |
| **Compliance** | GSTR-1 prep, GSTR-2A reconciliation, TDS challans, Form 16A tracking |

### Phase 3 (🔵)

| Module | Description |
|--------|------------|
| **Cash Flow Forecasting** | Prophet-based projections, scenario analysis, AI narratives |

---

## 1.5 Shared Capabilities

These cross-cutting services are consumed by multiple modules:

| Capability | Used By | Tech |
|-----------|---------|------|
| OCR Pipeline | Expense, Invoice | Claude Vision + masking |
| Anomaly Detection | Expense, AP, Invoice | Rules + Isolation Forest |
| Approval Engine | Expense (6-step), Invoice CN, Budget BRR, Vendor, AP | Generic multi-step with SoD |
| State Machine Framework | All stateful models | Transition declarations + version lock |
| PII Masking Middleware | Any data → Claude | Tokenizer + bucketizer + stripper |
| Audit Trail | All modules | Hash-chained, append-only |
| Document Storage | All with attachments | MinIO + SHA256 dedupe + presigned URLs |
| Notifications | All modules | Multi-channel (email + in-app + SMS + Slack) |
| D365 Integration | Expense, Invoice, Budget, Vendor, AP, AR | Adapter pattern (mock → real) |
| NL Query Engine | Reporting, Audit, CFO | Claude → validated SQL on read replica |
| AI Summaries | CFO dashboard, AR flash | Claude with prompt templates |
| RBAC & SoD | All modules | 4-layer enforcement cascade |

---

## 1.6 Design Principles

1. **Module-first architecture**: Each Django app is self-contained with its own models, views, services, serializers
2. **State machine everywhere**: All stateful records use the shared state machine — no direct status assignment
3. **Audit by default**: Every mutation is automatically logged via the state machine engine — no bypass possible
4. **SoD enforcement**: 8 hard-coded Segregation of Duties rules enforced at the approval engine level
5. **PII masking**: All data leaving 3SC's network goes through the masking middleware — single chokepoint
6. **Adapter pattern**: D365 integration uses an interface — swap mock for real with no caller code changes
7. **Optimistic locking**: Version field on all stateful models prevents race conditions
8. **Thread computation**: Every bill/invoice tracks "who has touched it" for notification broadcaster
9. **Security in depth**: RBAC → SoD → State Machine → Object-level authorization (4-layer cascade)

---

## 1.7 Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Django apps | snake_case | `expenses`, `mock_d365` |
| Django models | PascalCase | `ExpenseApprovalStep` |
| DB tables | snake_case (auto from Django) | `expenses_expense`, `expenses_expenseapprovalstep` |
| API endpoints | kebab-case | `/api/v1/vendor/bills/`, `/api/v1/finance/bills/queue` |
| React components | PascalCase | `BillTimeline`, `ApprovalActions` |
| React files | PascalCase.tsx | `BillTimeline.tsx` |
| CSS classes | BEM within Tailwind | utility classes |
| Environment vars | UPPER_SNAKE | `DATABASE_URL`, `CLAUDE_API_KEY` |
| Bill references | BILL-YYYY-NNNN | `BILL-2026-0042` |
| Invoice references | INV-YYYY-NNNN | `INV-2026-0098` |
