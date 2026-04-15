# 08 — Invoice Management Module (Complete Specification)

## 8.1 Module Overview

The invoice management module handles **sales invoices** — invoices that 3SC issues TO clients. Covers creation across 4 service lines (SaaS, AAAS, Transport, Warehouse), e-invoice/IRN generation, automated dunning, payment reconciliation, credit notes, and dispute handling.

### Actors & Their Journeys

| Actor | Entry Point | Key Actions |
|-------|-------------|-------------|
| **Finance L1** | `/finance/invoices` | Create draft, build line items, validate GSTIN, send to client, reconcile payments, track Form 16A |
| **Finance L2** | `/finance/invoices` | Stage 2 dunning, issue credit notes, resolve disputes, export register |
| **CFO** | `/finance/invoices` | Stage 3 escalation, mark legal referral |
| **Client** (external) | Email + portal link | View invoice, raise dispute, pay |
| **System** | Celery workers | GSTIN validation, GST calc, IRN generation, dunning triggers, bank recon |

---

## 8.2 Use Case Index (25 Use Cases)

| ID | Use Case | Actor | Notes |
|----|----------|-------|-------|
| UC1 | Create draft invoice | Fin L1 | Starts in Draft state |
| UC2 | Select service-line template | Fin L1 | SaaS / AAAS / Transport / Warehouse |
| UC3 | Pull client master data | Fin L1 | Auto-populates GSTIN, address, terms |
| UC4 | Validate GSTIN live | System | Calls GST portal (mock if no API key) |
| UC5 | Validate SAC code | System | Against HSN/SAC master table |
| UC6 | Auto-calc CGST SGST IGST | System | Based on Place of Supply |
| UC7 | Auto-calc TDS | System | From client TDS section |
| UC8 | Apply currency conversion | System | RBI rate on invoice date for USD |
| UC9 | Generate e-invoice IRN | System | If client turnover > ₹5Cr (mock in hackathon) |
| UC10 | Embed QR code in PDF | System | After IRN generation |
| UC11 | Send invoice to client | Fin L1 | Email + portal link |
| UC12 | Track view receipts | System | Email open tracking (mock) |
| UC13 | Track overdue status | System | Day-after-due trigger |
| UC14 | Trigger Stage 1 reminder | System | Day +1, friendly tone |
| UC15 | Trigger Stage 2 notice | Fin L2 | Day +7, firm tone, FM email |
| UC16 | Trigger Stage 3 escalation | CFO | Day +15, formal, CFO email |
| UC17 | Mark legal referral | CFO | Day +30 |
| UC18 | Reconcile bank receipt | Fin L1 | Bank statement + auto-match |
| UC19 | Apply partial payment | Fin L1 | Tracks remaining balance |
| UC20 | Issue credit note | Fin L2 | Auto-generates with GST reversal |
| UC21 | Mark dispute | Client | Via email or portal link |
| UC22 | Resolve dispute | Fin L2 | Closes dispute, may issue CN |
| UC23 | Track Form 16A | Fin L1 | Quarterly tracker |
| UC24 | Sync to D365 | System | Posted Sales Invoice |
| UC25 | Export invoice register | Fin L2 | Monthly + on-demand |

---

## 8.3 State Machine

```
Entry:
  [*] → DRAFT                (Fin L1 creates)

Sending:
  DRAFT → SENT               (Fin L1 sends to client)
  DRAFT → CANCELLED          (Fin L2 cancels draft)

Client interaction:
  SENT → VIEWED              (Client opens email/portal)
  SENT → PARTIAL_PAID        (Client pays portion)
  SENT → PAID                (Full payment received)
  SENT → OVERDUE             (Due date passed)
  VIEWED → PARTIAL_PAID / PAID / OVERDUE

Payment:
  PARTIAL_PAID → PAID        (Remaining received)
  PARTIAL_PAID → OVERDUE     (Due date passed before full)

Dunning (automated):
  OVERDUE → STAGE_1          (Day +1 reminder)
  STAGE_1 → STAGE_2          (Day +7 notice)
  STAGE_2 → STAGE_3          (Day +15 escalation)
  STAGE_3 → LEGAL_REFERRAL   (Day +30)

Late payment (any dunning stage → PAID):
  OVERDUE / STAGE_1 / STAGE_2 / STAGE_3 → PAID
  LEGAL_REFERRAL → PAID      (Settled)
  LEGAL_REFERRAL → BAD_DEBT  (Written off)

Dispute:
  SENT / VIEWED / OVERDUE → DISPUTED
  DISPUTED → SENT            (Resolved, no CN — resume dunning)
  DISPUTED → CREDIT_NOTED    (CN issued)

Terminal: PAID, BAD_DEBT, CANCELLED, CREDIT_NOTED
```

---

## 8.4 End-to-End Flow: SaaS Subscription Invoice (Happy Path)

```
1. Fin L1 logs in → /finance/invoices → "Create Invoice"
2. Selects service line: SaaS
3. Selects client from dropdown → master data auto-loads:
   - GSTIN, billing address, payment terms (Net 30)
   - TDS section (194J or 194C), state code
4. System validates GSTIN:
   - If GST API configured: live validation
   - If not: skip validation, proceed with stored data
5. Builds line items using SaaS template:
   - Seat count × price per seat × period (monthly/quarterly)
   - SAC code auto-filled from template
6. System auto-calculates tax:
   - Place of Supply = client state code
   - If same state as 3SC → CGST + SGST (9% + 9%)
   - If different state → IGST (18%)
   - TDS amount from client's TDS section
7. Fin L1 reviews totals, adds notes
8. Clicks Save → Invoice created (DRAFT, ref=INV-2026-0098)
9. Clicks Send:
   a. TemplateRenderer renders SaaS PDF
      - Seat breakdown, period, MRR
   b. Check: client turnover > ₹5Cr?
      - If yes + IRN API available: generate IRN, embed QR in PDF
      - If no or API unavailable: standard PDF
   c. PDF stored in MinIO
   d. Email sent to client with PDF + portal link
   e. Status: DRAFT → SENT
   f. AuditLog: invoice.sent
10. Client opens email → email open tracked → status: VIEWED
11. Client pays via NEFT before due date
12. Bank statement uploaded → ReconWorker parses rows:
    - Match by: amount + UTR + IFSC
    - Single match → auto-apply → Receipt created → status: PAID
    - Multiple match → flag for Fin L1 manual review
    - No match → suspense account
13. D365 sync: sales invoice posted (if mock D365 enabled)
14. Receipt confirmation email sent to client
```

---

## 8.5 Dunning Sequence (Bad Path: Overdue)

```
Invoice in SENT state → due date passes → Celery Beat detects

Day +1:
  → Status: OVERDUE → STAGE_1
  → System sends friendly reminder (no-reply@3sc.in)
  → Template: "This is a gentle reminder that invoice {ref_no} is past due."

Day +7 (no payment):
  → Status: STAGE_1 → STAGE_2
  → Fin L2 triggers (or Celery auto-sends)
  → Personal email from Finance Manager
  → CC: client relationship manager
  → Template: firm but professional tone

Day +15 (no payment):
  → Status: STAGE_2 → STAGE_3
  → CFO email (or Celery auto-sends)
  → Formal letter with 7-day ultimatum
  → Legal language

Day +30 (no payment):
  → Status: STAGE_3 → LEGAL_REFERRAL
  → Bad debt potential flag set
  → CFO dashboard alert
  → Manual decision: continue collections or write off

At ANY point: if payment received → status → PAID, dunning stops.
```

---

## 8.6 Client Dispute Flow

```
1. Client views invoice and disagrees (wrong amount, wrong service, etc.)
2. Client clicks "Dispute" in email portal link or replies to invoice email
3. System creates Dispute record:
   - Invoice status → DISPUTED
   - Dunning PAUSED (no more reminders while disputed)
   - Fin L1 notified
4. Fin L1 investigates:
   Option A — Dispute valid:
     → Request CN from Fin L2
     → Fin L2 issues Credit Note with GST reversal
     → CN PDF sent to client
     → Invoice status → CREDIT_NOTED
   Option B — Dispute invalid:
     → Fin L1 provides clarification to client
     → Client withdraws dispute
     → Invoice status → SENT (dunning resumes from where it left off)
```

---

## 8.7 Bank Reconciliation Flow

```
1. Fin L1 uploads bank statement (CSV/XLSX)
2. BankStatement record created, file stored in MinIO
3. ReconWorker parses each credit row:
   For each credit entry:
   a. Extract: amount, UTR, IFSC, payer name, date
   b. Search invoices: status IN (SENT, VIEWED, OVERDUE, STAGE_*)
   c. Match logic:
      - Exact amount match + UTR contains invoice ref → HIGH confidence
      - Exact amount match + same IFSC as client → MEDIUM confidence
      - Amount within 5% + payer name fuzzy match → LOW confidence
   d. Single HIGH match → auto-apply:
      - Create Receipt record
      - Update invoice: balance_due -= amount
      - If balance_due <= 0: status → PAID
      - If balance_due > 0: status → PARTIAL_PAID
   e. Multiple matches → flag for manual review
   f. No match → suspense account
4. Generate match report:
   - X rows processed, Y matched, Z unmatched
   - Unmatched flagged for Fin L1 review
```

---

## 8.8 Edge Cases

| # | Edge Case | Handling |
|---|-----------|---------|
| 1 | **Partial payment** | Apply ₹X, track remaining, continue dunning on balance |
| 2 | **GSTIN suspended before send** | Block send, notify Fin L1 + Admin, require client GSTIN update |
| 3 | **Currency mismatch (USD)** | Show INR equivalent at RBI rate on invoice date, rate fixed for life of invoice |
| 4 | **E-invoice IRN portal down** | If IRN API unavailable: proceed without IRN (graceful skip), log warning |
| 5 | **Bank statement ambiguous** | Multiple invoices same amount from same client → flag for Fin L1 manual, never auto-apply |
| 6 | **TDS deducted but no Form 16A** | Quarterly alert, track in Form 16A pending, contact client |
| 7 | **Credit note after partial payment** | CN amount cannot exceed net unpaid, refund flow if needed |
| 8 | **Invoice cancelled after send** | Cancellation requires CN (cannot just delete), audit trail preserved |

---

## 8.9 4 Service-Line Templates

Each service line has its own PDF template with specific fields:

### SaaS Template
```
Line items: seat_count × price_per_seat × period
Fields: subscription_id, period_start, period_end, MRR, plan_name
SAC: 998314 (Software licensing)
```

### AAAS (Analytics as a Service) Template
```
Line items: milestone × completion_percentage × SOW_amount
Fields: sow_reference, milestone_name, deliverable, completion_date
SAC: 998313 (IT consulting)
```

### Transport Template
```
Line items: shipment × route × freight_amount
Fields: shipment_ids[], origin, destination, vehicle_type, weight_tons
SAC: 996511 (Freight transport)
```

### Warehouse Template
```
Line items: storage_period × area × rate
Fields: warehouse_code, storage_sq_ft, handling_units, period_start, period_end
SAC: 996719 (Warehousing)
```

---

## 8.10 Component Architecture

```
Django Apps:
  apps/invoices/
    views.py:
      InvoiceViewSet     → CRUD, send, cancel
      DunningViewSet     → View dunning history, trigger manual dunning
      ReconcileViewSet   → Upload bank statement, review matches
      DisputeViewSet     → Create, resolve disputes
      CreditNoteViewSet  → Issue, approve CN

    services.py:
      InvoiceCreationService  → Draft creation, line item builder
      TemplateRenderer        → Per service-line PDF generation
      EInvoiceService         → IRN generation (mock/real)
      DunningEngine           → Automated dunning stage progression
      ReconciliationService   → Bank statement parsing
      BankMatchService        → Smart matching algorithm

    tasks.py (Celery):
      daily_dunning_check     → Beat: daily scan for overdue invoices
      process_bank_statement  → Async bank recon
      send_invoice_email      → Email delivery

Frontend Pages:
  /finance/invoices              → Invoice list (filterable by status, client, service line)
  /finance/invoices/create       → Create invoice (service line selector → template form)
  /finance/invoices/{id}         → Invoice detail (status, timeline, payments, dunning)
  /finance/invoices/reconcile    → Bank reconciliation (upload + review matches)
  /finance/invoices/{id}/dispute → Dispute management
```

---

## 8.11 Graceful Degradation for MVP

| Feature | If External Dependency Missing | Fallback |
|---------|-------------------------------|----------|
| GSTIN validation | No GST API key | Skip validation, use stored data, log warning |
| E-invoice IRN | No IRN API | Generate standard PDF without QR, log warning |
| Email sending | No SMTP configured | Log email to console, create in-app notification, PDF still generated |
| Bank reconciliation | No bank statement uploaded | Fin L1 manually marks invoice as paid with UTR |
| D365 sync | Mock D365 disabled | Invoice stays in current state, no D365 sync |
| Email open tracking | No tracking pixel service | view_at stays null, status stays SENT until payment |
| Currency conversion | No RBI rate API | Default exchange rate = 1 (INR-only mode) |
