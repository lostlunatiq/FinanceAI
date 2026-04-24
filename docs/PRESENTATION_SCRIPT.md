# FinanceAI — Demo Presentation Script

**Duration:** ~25–30 minutes  
**Audience:** Stakeholders, investors, or product evaluators  
**Prerequisites:** App running locally at `http://localhost:8000`

---

## Opening (2 min)

> "What we've built is an AI-powered finance automation platform designed to eliminate the manual work that finance teams spend 60–70% of their time on — invoice processing, approval routing, anomaly detection, and cash flow forecasting. Let me walk you through it persona by persona, starting from how a vendor submits a bill all the way through to how the CFO sees it."

---

## Act 1: Login & Persona Selection (2 min)

**URL:** `http://localhost:8000`

1. **Show the login screen.**

> "The platform supports multiple personas — AP Clerks, Finance Managers, Finance Admins, and employees who submit expenses. Each persona gets a tailored dashboard. We also support Microsoft Azure AD single sign-on for enterprise deployments."

2. Log in as `fin_admin / demo1234`.

> "Let me log in as the Finance Admin — the highest visibility role — and we'll drill into each area."

---

## Act 2: AI Command Center / Dashboard (4 min)

**Navigate to:** Dashboard

> "This is the CFO Command Center. At a glance you see: total spend, pending approvals, flagged anomalies, and budget utilization. The AI has already analyzed the current queue."

**Key points to highlight:**

- **Approval Queue** — show the pending invoices awaiting action. Each card shows vendor, amount, days pending, and risk flag.
- **AI Insight Panel** — point to the AI-generated recommendations.

> "Notice the AI insight panel on the right. The system has analyzed all pending invoices and is surfacing the ones that need attention — not just by value, but by anomaly risk score and policy breach likelihood."

- **Cash Flow Projection Chart** — point to the 6-month trend.

> "The cash flow projection uses Prophet time-series forecasting trained on historical spend patterns. The system can tell the CFO what the cash position will look like in 90 days, factoring in pending payables."

- **KPI Tiles** — Total Spend, Pending Count, Anomaly Count, Budget Utilization.

---

## Act 3: Accounts Payable Hub (4 min)

**Navigate to:** AP Hub

> "The AP Hub is where the AP team lives day-to-day. Every invoice in the system appears here, with real-time status tracking."

**Show:**

1. **Invoice table** — filter by status (Pending, Approved, Rejected).

> "Each invoice shows vendor, amount, submission date, current status, and an AI confidence score for the OCR extraction."

2. **Click into an invoice** — open the Bill Detail view.

> "When you open an invoice, you see the extracted fields side-by-side with the original document. Our OCR pipeline — built on a vision-language model — extracts vendor name, invoice number, line items, GST components, and total. The confidence score tells the AP clerk how much they need to verify manually."

3. **Show the approval chain** — the step-by-step workflow with assigned approvers.

> "The approval workflow is configurable by grade and department. A ₹50,000 expense goes to the department head; above ₹2 lakh it escalates to the Finance Manager; above ₹10 lakh it requires CFO sign-off. The system enforces separation of duties — the person who submits cannot approve."

4. **Show AI Match score** — the PO matching panel.

> "For invoices that reference a Purchase Order, the system cross-references against our D365 ERP integration and computes a match confidence score. High confidence means straight-through processing; low confidence flags it for manual review."

---

## Act 4: AP Match & Fraud Control (3 min)

**Navigate to:** AP Match

> "AP Match is our three-way matching and fraud control layer."

**Show:**

1. **Match status table** — Matched, Partial Match, No Match.

> "A green match means the invoice, PO, and goods receipt all align — this bill can go straight to payment. A yellow partial match means one field differs — quantity, unit price, or delivery terms. The AP team reviews just the exceptions."

2. **Fraud control flags** — duplicate detection, vendor anomalies.

> "The system automatically detects potential duplicates — same vendor, same amount, within a configurable window. It also flags first-time vendors, invoices just below approval thresholds (a classic expense manipulation pattern), and round-number amounts that statistically appear more often in fraudulent submissions."

---

## Act 5: Anomaly Detection (3 min)

**Navigate to:** Anomaly Detection

> "This is where finance gets genuinely intelligent. The anomaly detection engine runs on an Isolation Forest model trained on historical spend data."

**Show:**

1. **Anomaly table** — show severity (High / Medium / Low), anomaly type, and amount.

> "Each flagged transaction shows why it was flagged: statistical outlier, duplicate risk, vendor watchlist match, policy violation, or behavioral deviation from this vendor's historical pattern."

2. **Click an anomaly** — show the detail panel with contributing factors.

> "The explanation panel breaks down the contributing signals. This invoice is flagged because: the amount is 4.2 standard deviations above this vendor's average, the submission happened outside normal business hours, and the vendor hasn't submitted in 180 days."

3. **Mark as Safe / Escalate buttons.**

> "The AP team can mark it safe — which feeds back into the model — or escalate it for investigation. Every action is audit-logged with timestamp and user."

---

## Act 6: AI Hub — Natural Language Query (3 min)

**Navigate to:** AI Hub

> "The AI Hub is our conversational interface to the finance data. Instead of building 50 custom reports, finance teams can just ask."

**Demo queries to run:**

1. Type: `"Show me the top 5 vendors by spend this quarter"`

> "Watch how the system translates natural language into a structured database query and returns the result in seconds."

2. Type: `"Which invoices are past their SLA?"`

> "SLA tracking is built into every approval step. The system knows exactly how long each invoice has been waiting at each stage."

3. Type: `"What is our current budget utilization for the IT department?"`

> "The response pulls live data from the budget module — we're not querying a static report; this is real-time."

**Also show:**

- **AI Report Generation** — click "Generate Report" to show a scheduled report being queued.
- **Scheduled Insights** — the weekly digest configuration.

---

## Act 7: Finance Automation — Policy & Compliance (2 min)

**Navigate to:** Finance Automation → Policy Compliance

> "The Finance Admin can define and manage compliance policies directly in the UI — no code required."

**Show:**

1. **Policy list** — spend limits, vendor blacklist rules, duplicate detection windows.

> "Each policy has a severity (Warn / Block), a scope (global, department, or vendor), and can be toggled on/off without a deployment."

2. **Policy compliance dashboard** — the real-time compliance heatmap.

> "This heatmap shows which departments are generating the most policy flags. Right now IT is clean; Operations has 3 active flags."

---

## Act 8: Persona Dashboards (2 min)

**Navigate to:** Persona Dashboards → cycle through roles

> "Let me quickly show how the experience changes by role."

- **AP Clerk view:** Queue-focused. Shows my assigned invoices, SLA countdown timers, and quick approve/reject actions.
- **Finance Manager view:** Budget and team view. Approval chain, team spend trends, and budget burn rate.
- **Employee view:** Expense submission. Simple form — attach receipt, enter amount, department auto-populated from HR.

> "Every persona sees exactly what they need, nothing more. The Finance Admin's view is the only one with full cross-departmental visibility."

---

## Act 9: Vendor Portal / IAM (2 min)

**Navigate to:** IAM (Identity & Access Management)

> "Finance Admins manage all users and vendors from one place."

**Show:**

1. **User list** — grade, department, active/inactive status.
2. **Vendor management** — activate, suspend, blacklist a vendor.

> "Vendor lifecycle management is fully tracked. Every status change is logged with who did it and when — critical for audit trails."

---

## Closing (2 min)

> "To summarize what you've seen:"

**Slide / verbal summary:**

| Capability | Technology |
|---|---|
| Invoice ingestion & OCR | Vision-language model via OpenRouter |
| Approval routing | Configurable state machine with SoD enforcement |
| Anomaly detection | Isolation Forest (scikit-learn) |
| Cash flow forecasting | Prophet time-series model |
| Natural language query | LLM + structured query layer |
| PO matching | Three-way matching with ERP integration |
| Compliance policies | Rule engine with real-time evaluation |
| Audit trail | Immutable log on every state transition |

> "The platform is built on Django with a PostgreSQL backend, Redis-backed async task queue for OCR and ML inference, and deployed via Docker. The architecture is designed to integrate with existing ERP systems — we have connectors for D365 and can build adapters for SAP, Oracle, or any REST-capable system."

> "Questions?"

---

## Backup / Deep Dive Topics

**If asked about security:**
> "All data flows over TLS. Authentication uses JWT tokens with rotating refresh tokens plus Microsoft Azure AD SSO for enterprise clients. Role-based access is enforced at both the API and UI layer, with a grade-based hierarchy aligned to your organizational structure."

**If asked about AI accuracy:**
> "The OCR pipeline achieves 92%+ field extraction accuracy on standard invoice formats. The anomaly model has a configurable sensitivity threshold — we tune it to balance catch rate vs. false positive rate based on your historical data. Every AI decision is explainable and auditable."

**If asked about integration:**
> "We have a REST API with OpenAPI documentation. Integration with ERP systems, HR systems (for employee grade sync), and banking systems (for UTR-based payment confirmation) can be done via webhook or scheduled sync."

**If asked about the tech stack:**
> "Django 5.2 ASGI for the backend — async-capable for high-throughput API calls. Celery for background tasks (OCR, ML inference, report generation). PostgreSQL for transactional data, ClickHouse for analytics queries. Redis for caching and the task queue. The frontend is a lightweight React application with Material UI components."

**If asked about multi-tenancy:**
> "The current architecture is single-tenant. Multi-tenancy via schema isolation or row-level tenancy is on the roadmap for Q3."

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Finance Admin | `fin_admin` | `demo1234` |
| AP Clerk | `vendor1` | `demo1234` |

> Note: Remove these credentials before sharing this document externally.
