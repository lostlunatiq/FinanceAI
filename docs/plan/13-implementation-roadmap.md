# 13 — Implementation Roadmap

## Master Overview

The implementation follows **5 phases**, each with specific deliverables. Early phases build the foundation and shared services; later phases add feature modules and intelligence.

**Key principle**: Every phase produces a **runnable application**. No phase depends on external API keys being configured.

```
Phase 0: Foundation (Days 1–3)     → Django project, auth, DB, Docker, shared services
Phase 1: Expense Module (Days 4–8) → Full vendor bill lifecycle
Phase 2: Invoice Module (Days 9–12)→ Sales invoicing with dunning
Phase 3: Integration (Days 13–15)  → Vendor mgmt, D365, OCR, anomaly workers
Phase 4: Polish (Days 16–18)       → Dashboard, reporting, final polish
```

---

## Phase Summary

### Phase 0 — Foundation (Days 1–3)

**Goal**: Running Django + React stack with auth, RBAC, and all shared services wired up.

| Day | Deliverable | Details |
|-----|-------------|---------|
| 1 | Project scaffold | Django project, Docker Compose, PostgreSQL, Redis, MinIO, Nginx |
| 1 | Auth system | User model, JWT login/logout/refresh, seed users (1 per role) |
| 2 | Core services | AuditLog (hash-chained), FileRef (SHA256 dedupe), State Machine Engine |
| 2 | Approval Engine | Generic multi-step with SoD rules |
| 3 | Masking middleware | PII tokenizer/bucketizer/stripper |
| 3 | Notifications | In-app + email (console fallback) |
| 3 | Frontend scaffold | React + Vite + shadcn/ui, login page, role-based routing |

**Exit criteria**: Login as any role → see role-specific empty dashboard. AuditLog records login events.

Detailed: [roadmap/phase-0-foundation.md](roadmap/phase-0-foundation.md)

---

### Phase 1 — Expense Module (Days 4–8)

**Goal**: Complete vendor bill lifecycle from submission to payment.

| Day | Deliverable | Details |
|-----|-------------|---------|
| 4 | Vendor models + API | Vendor, VendorBankAccount, VendorL1Mapping models + CRUD |
| 4 | Expense models + state machine | Expense model, 20+ states, state machine declaration |
| 5 | Vendor portal | Bill submission, file upload, OCR trigger (or manual), bill list |
| 5 | L1 on-behalf flow | Draft, file on behalf, SoD check for filer-is-l1 |
| 6 | Approval chain | 6-step approval queue, approve/reject/query UI |
| 6 | Query loop | Raise query, respond, continue/reject |
| 7 | D365 booking | CFO book action, mock D365 webhook, POSTED/PAID states |
| 7 | Anomaly detection | 8 rule-based checks, severity scoring, override flow |
| 8 | OCR pipeline | Claude Vision extraction (or SKIPPED), confidence display |
| 8 | Notifications | Submission ack, step approval, rejection broadcast, SLA reminder |

**Exit criteria**: 
- Vendor can submit bill → OCR extracts → anomaly checked → 6-step approval → D365 booked → PAID
- All works without Claude API key (OCR=manual, anomaly=rules only)
- All works without Mock D365 (stays APPROVED)

Detailed: [roadmap/phase-1-expense.md](roadmap/phase-1-expense.md)

---

### Phase 2 — Invoice Module (Days 9–12)

**Goal**: Complete sales invoice lifecycle with dunning and reconciliation.

| Day | Deliverable | Details |
|-----|-------------|---------|
| 9 | Invoice models + state machine | Invoice, LineItem, Client models, state machine |
| 9 | Invoice creation | Template selector, line item builder, tax calculation |
| 10 | PDF generation | 4 service-line templates, e-invoice mock |
| 10 | Send + track | Email send, view tracking, status progression |
| 11 | Dunning engine | Celery Beat daily check, 4-stage escalation |
| 11 | Dispute flow | Client dispute, Fin L1 investigate, resolve/CN |
| 12 | Bank reconciliation | Statement upload, parse, match, apply |
| 12 | Credit notes | CN creation, approval, GST reversal |

**Exit criteria**:
- Fin L1 can create SaaS invoice → send → client pays → auto-reconciled → PAID
- Overdue invoice triggers 4-stage dunning (Celery Beat)
- All works without SMTP (emails logged to console)

Detailed: [roadmap/phase-2-invoice.md](roadmap/phase-2-invoice.md)

---

### Phase 3 — Integration (Days 13–15)

**Goal**: Wire up vendor management, D365 flows, OCR/anomaly workers.

| Day | Deliverable | Details |
|-----|-------------|---------|
| 13 | Vendor management | Onboarding, KYC, bank change (48h cooling), L1 mapping admin |
| 14 | D365 adapter refinement | Field mapping, webhook processing, resilience patterns |
| 14 | OCR refinement | Multi-format support, confidence UI, edge cases |
| 15 | Anomaly refinement | ML training pipeline (if data sufficient), override UX |
| 15 | Cross-module testing | End-to-end flows across expense + invoice |

**Exit criteria**: Admin can onboard vendor → vendor submits bill → OCR → anomaly → approval → D365

Detailed: [roadmap/phase-3-integration.md](roadmap/phase-3-integration.md)

---

### Phase 4 — Intelligence & Polish (Days 16–18)

**Goal**: Dashboards, reporting, final UX polish, demo readiness.

| Day | Deliverable | Details |
|-----|-------------|---------|
| 16 | Role-specific dashboards | KPI cards, charts (Recharts), pending actions |
| 16 | Audit log viewer | Timeline, search, filter, hash verification |
| 17 | Report hub | Standard reports, export (CSV/Excel/PDF) |
| 17 | NL query (basic) | If Claude enabled: natural language → SQL |
| 18 | Final polish | Loading states, empty states, error boundaries |
| 18 | Demo script | Seed data for demo, walkthrough document |

**Exit criteria**: Complete demo flow showing all features end-to-end.

Detailed: [roadmap/phase-4-intelligence.md](roadmap/phase-4-intelligence.md)

---

## Technology Dependencies

| Dependency | Required For | When Needed |
|-----------|-------------|-------------|
| PostgreSQL | Everything | Phase 0 (Docker) |
| Redis | Celery tasks | Phase 0 (Docker) |
| MinIO | File storage | Phase 0 (Docker) — fallback: local disk |
| Claude API key | OCR + anomaly ML + NL query | Phase 1 (optional) |
| SMTP config | Email notifications | Phase 0 (optional — console fallback) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Claude API rate limits | Cache OCR results, batch anomaly checks |
| Celery worker crashes | Celery auto-retry with backoff, DLQ for persistent failures |
| PostgreSQL performance | Index strategy defined in data models, audit log partitioned |
| Demo day failures | Every feature has a graceful fallback, seed data pre-loaded |
| Scope creep | Phase 2+ modules (Budget, AP, AR) scoped to diagrams-only, not built |
