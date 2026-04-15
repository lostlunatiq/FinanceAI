# 00 — FinanceAI Master Plan Index

## Quick Start for AI

Read these documents **in order**. Each builds on the previous. After reading all, you will have full context to build the FinanceAI application.

```
PHASE 0 — UNDERSTAND THE SYSTEM
01 → Project Overview          (goals, actors, tech stack, modules)
02 → System Architecture       (Django + React, layers, deployment, DFD)
03 → Data Models               (Django ORM models, relationships, seeds)
04 → API Specifications        (DRF endpoints, request/response, OpenAPI)
05 → Auth, Security & RBAC     (JWT, 10+ roles, SoD cascade, PII masking)
14 → Shared Capabilities       (OCR, anomaly, approval engine, state machine,
                                 masking, audit, storage, notifications, D365)

PHASE 1 — BUILD THE MODULES (priority order)
07 → Expense Management        (50 use cases, 20+ states, full actor flows)
08 → Invoice Management        (25 use cases, dunning, e-invoice, bank recon)
06 → Vendor Management         (onboarding, KYC, bank change, performance)
09 → Budget Management         (allocations, BRR, thresholds, forecasting)
10 → Reporting & Analytics     (dashboards, standard reports, NL query)
11 → Audit Trail               (hash-chained log, compliance reports)

PHASE 2 — EXTENDED MODULES (Phase 2+ scope)
AP → Accounts Payable          (PO, GRN, 3-way match, payment runs)
AR → Accounts Receivable       (aging, receipts, TDS, reconciliation)
CF → Cash Flow Forecasting     (Prophet, scenario, AI narrative)
CM → Compliance Management     (GST, TDS, MSME, Form 16A)

IMPLEMENTATION
13 → Implementation Roadmap    (master plan + per-phase details)
12 → UI/UX Design System       (tokens, components, layouts)

PER-PHASE BUILD GUIDES
roadmap/phase-0-foundation.md  (Django setup, auth, DB, shared services)
roadmap/phase-1-expense.md     (full expense module build)
roadmap/phase-2-invoice.md     (full invoice module build)
roadmap/phase-3-integration.md (vendor, D365, OCR, anomaly workers)
roadmap/phase-4-intelligence.md(dashboard, reporting, NL query, polish)
```

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend: React 18 + Vite + TypeScript + shadcn/ui + Tailwind  │
│  (Vendor Portal │ Employee Portal │ Finance Dashboard │ Admin)   │
├──────────────────────────────────────────────────────────────────┤
│                    Nginx / API Gateway                           │
├──────────────────────────────────────────────────────────────────┤
│  Backend: Django 5 + Django REST Framework                       │
│  Apps: accounts│vendors│expenses│invoices│approvals│ocr│anomaly  │
│        notifications│mock_d365│core(audit,files)                 │
│  Services: d365_adapter│storage_service│masking_service          │
├──────────────────────────────────────────────────────────────────┤
│  Async: Celery Beat + Workers (OCR, Anomaly, Notify, SLA)       │
├──────────────────────────────────────────────────────────────────┤
│  Data: PostgreSQL 16 │ Redis │ MinIO (S3-compatible)            │
├──────────────────────────────────────────────────────────────────┤
│  External: Claude API (masked) │ Mock D365 │ Mailtrap SMTP      │
└──────────────────────────────────────────────────────────────────┘
```

## Module Status

| # | Module | Phase | Status |
|---|--------|-------|--------|
| 01 | Expense Management | 🟢 Hackathon | Full spec in this plan |
| 02 | Invoice Management (Sales) | 🟢 Hackathon | Full spec in this plan |
| 03 | Vendor Management | 🟢/🟡 Hybrid | Spec in plan + diagrams |
| 04 | Budget Management | 🟡 Phase 2 | Spec in plan |
| 05 | Accounts Receivable | 🟡 Phase 2 | Diagrams only |
| 06 | Accounts Payable | 🟡 Phase 2 | Diagrams only |
| 07 | Cash Flow Forecasting | 🔵 Phase 3 | Diagrams only |
| 08 | Reporting & Analytics | 🟡 Phase 2 | Spec in plan |
| 09 | Compliance Management | 🟡 Phase 2 | Diagrams only |
| 10 | Audit & Governance | 🟢 Hackathon | Spec in plan |

## Actors

| Actor | Type | Modules |
|-------|------|---------|
| Vendor | External | Expense (submit bills), Vendor (bank change) |
| Employee L1 | Internal | Expense (file on-behalf, validate, L1 approve) |
| Employee L2 | Internal | Expense (L2 approve) |
| Department Head | Internal | Expense (HoD approve), Budget (BRR, consumption) |
| Finance L1 | Internal | Expense (Fin approve), Invoice (create, recon), AP/AR |
| Finance L2 | Internal | Expense (Fin approve), Invoice (dunning, CN), AP |
| CFO / Finance Head | Internal | All modules (final approve, D365 booking) |
| CEO | Internal | Budget (high-amount BRR), Reporting |
| Admin | Internal | Vendor mgmt, User mgmt, System config |
| External CA | External | Compliance (GST/TDS filing — system never auto-files) |
| System / AI | Automated | OCR, anomaly, alerts, summaries, SLA enforcement |
| D365 BC | External system | Accounting ledger (mock in hackathon) |
| GST Portal | External system | GSTIN validation, e-invoice IRN |
| Bank | External system | Payment execution, statement reconciliation |

## Reference Diagrams

All architecture and flow diagrams live in `docs/financeai-diagrams/`. These plan documents are the **implementation spec** derived from those diagrams.
