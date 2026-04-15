# 07 — Expense Management Module (Complete Specification)

## 7.1 Module Overview

The expense management module handles vendor bill submission, OCR extraction, anomaly detection, 6-step approval chain, D365 booking, and payment tracking. It is the **primary hackathon deliverable** with the most complex workflows.

### Actors & Their Journeys

| Actor | Entry Point | Key Actions |
|-------|-------------|-------------|
| **Vendor** | `/vendor/login` → `/vendor/bills` | Submit bill, upload PDF, track status, respond to queries, dispute on-behalf filing, download remittance PDF |
| **Employee L1** | `/login` → `/employee/bills` | File on behalf, validate OCR data, L1 approve/reject/query, override anomaly |
| **Employee L2** | `/login` → `/employee/approvals` | L2 approve/reject/query |
| **HoD** | `/login` → `/approvals` | HoD approve/reject/query (sees budget impact) |
| **Finance L1** | `/login` → `/finance/bills/queue` | Tax compliance check, PO validation, Fin L1 approve/reject/query |
| **Finance L2** | `/login` → `/finance/bills/queue` | Fin L2 approve/reject |
| **CFO** | `/login` → `/finance/bills/queue` | Final approve, Book in D365, retry failed bookings |
| **Admin** | `/login` → `/admin` | Map L1↔vendor, configure backup approvers, reactivate expired bills, reassign deactivated approvers |
| **System** | Celery workers | OCR extraction, anomaly detection, SLA monitoring, notification dispatch |

---

## 7.2 Use Case Index (50 Use Cases)

### Submission (UC1–UC7)
| ID | Use Case | Actor | Preconditions |
|----|----------|-------|---------------|
| UC1 | Submit bill self-service | Vendor | Account active, has mapped L1 |
| UC2 | Save draft on behalf | Emp L1 | Vendor mapped to L1 |
| UC3 | File bill on behalf | Emp L1 | Vendor mapped, evidence available |
| UC4 | Upload invoice file | Vendor/L1 | File ≤10MB, PDF/JPG/PNG |
| UC5 | Withdraw submission | Vendor | Bill in SUBMITTED, no L1 action yet |
| UC6 | Dispute on-behalf filing | Vendor | Bill `is_on_behalf=True` |
| UC7 | Resubmit after rejection | Vendor/L1 | Original bill REJECTED |

### AI Support (UC8–UC11)
| UC8 | Trigger OCR | System | File uploaded (skipped if no API key) |
| UC9 | Run anomaly detection | System | Bill in SUBMITTED |
| UC10 | Override anomaly with reason | Any approver | Severity HIGH/CRITICAL, reason≥50 chars |
| UC11 | Get AI explanation | System | Anomaly flagged (disabled if no API key) |

### Validation — L1 (UC12–UC16)
| UC12 | Review extracted data | L1 | Bill in PENDING_L1 |
| UC13 | Validate against PO | L1 | PO reference present |
| UC14 | Validate against communication | L1 | — |
| UC15 | Cross-check vendor history | L1 | Vendor has prior bills |
| UC16 | Add validation note | L1 | Bill in PENDING_L1 |

### Department Chain Approval (UC17–UC21)
| UC17 | Approve at L1 | L1 | L1 ≠ filer (SoD) |
| UC18 | Approve at L2 | L2 | L2 ≠ L1 of this bill |
| UC19 | Approve at HoD | HoD | HoD ≠ L1, L2 of this bill |
| UC20 | Reject at any dept step | L1/L2/HoD | Reason ≥30 chars |
| UC21 | Raise query at any dept step | L1/L2/HoD | — |

### Finance Chain Approval (UC22–UC28)
| UC22 | Validate tax compliance | Fin L1 | — |
| UC23 | Check vendor credit limit | Fin L1 | — |
| UC24 | Approve at Fin L1 | Fin L1 | Bill in PENDING_FIN_L1 |
| UC25 | Approve at Fin L2 | Fin L2 | Bill in PENDING_FIN_L2 |
| UC26 | Approve at Fin Head | CFO | Bill in PENDING_FIN_HEAD |
| UC27 | Reject at any fin step | Fin L1/L2/Head | Reason ≥30 chars |
| UC28 | Raise query at any fin step | Fin L1/L2/Head | — |

### Query Loop (UC29–UC31)
| UC29 | Respond to query | Vendor / Filer L1 | Bill in QUERY_* state |
| UC30 | Attach evidence to response | Vendor / Filer L1 | — |
| UC31 | Continue thread | Any participant | — |

### D365 Booking (UC32–UC35)
| UC32 | Book in D365 | CFO | Bill APPROVED |
| UC33 | Retry failed booking | CFO/Admin | Bill rolled back to APPROVED |
| UC34 | Receive posted webhook | System | Bill BOOKED_D365 |
| UC35 | Receive payment webhook | System | Bill POSTED_D365 |

### Visibility & Tracking (UC36–UC40)
| UC36 | View own bill list | Vendor / L1 | Authenticated |
| UC37 | View bill timeline | Thread member | — |
| UC38 | View thread participants | Thread member | — |
| UC39 | Download remittance PDF | Vendor | Bill PAID |
| UC40 | Search and filter bills | Any role | — |

### Admin Operations (UC41–UC45)
| UC41 | Map L1 to vendor | Admin | Vendor exists |
| UC42 | Configure backup approver | Admin | — |
| UC43 | Reactivate expired bill | Admin | Bill EXPIRED |
| UC44 | Reassign deactivated approver | Admin/System | Approver deactivated |
| UC45 | View dispute alerts | Admin | Disputes pending |

### Notifications (UC46–UC50)
| UC46 | Receive submission ack | System→Vendor | Bill created |
| UC47 | Receive step approval notice | System→Thread | Step decided |
| UC48 | Receive rejection broadcast | System→Thread | Bill rejected |
| UC49 | Receive SLA reminder | System→Approver | 12h before deadline |
| UC50 | Receive payment confirmation | System→Thread+Vendor | Bill PAID |

---

## 7.3 Master State Machine (20+ States)

```
Entry points:
  [*] → DRAFT          (L1 starts on-behalf draft)
  [*] → SUBMITTED      (Vendor submits self-service)

Submission phase:
  DRAFT → SUBMITTED                (L1 submits)
  DRAFT → [*]                      (L1 abandons)
  SUBMITTED → AUTO_REJECT          (Hard duplicate detected)
  SUBMITTED → WITHDRAWN            (Vendor withdraws)
  SUBMITTED → PENDING_L1           (Anomaly check passes)

Department approval chain:
  PENDING_L1 → PENDING_L2          (L1 approves)
  PENDING_L1 → REJECTED            (L1 rejects)
  PENDING_L1 → QUERY_L1            (L1 raises query)
  PENDING_L1 → EXPIRED             (48h SLA breach)
  QUERY_L1 → PENDING_L1            (Vendor/filer responds)

  PENDING_L2 → PENDING_HOD         (L2 approves)
  PENDING_L2 → REJECTED / QUERY_L2 / EXPIRED
  QUERY_L2 → PENDING_L2

  PENDING_HOD → PENDING_FIN_L1     (HoD approves)
  PENDING_HOD → REJECTED / QUERY_HOD / EXPIRED
  QUERY_HOD → PENDING_HOD

Finance approval chain:
  PENDING_FIN_L1 → PENDING_FIN_L2  (Fin L1 approves)
  PENDING_FIN_L1 → REJECTED / QUERY_FIN_L1 / EXPIRED
  QUERY_FIN_L1 → PENDING_FIN_L1

  PENDING_FIN_L2 → PENDING_FIN_HEAD  (Fin L2 approves)
  PENDING_FIN_L2 → REJECTED / QUERY_FIN_L2 / EXPIRED
  QUERY_FIN_L2 → PENDING_FIN_L2

  PENDING_FIN_HEAD → APPROVED       (CFO approves)
  PENDING_FIN_HEAD → REJECTED / QUERY_FIN_HEAD / EXPIRED
  QUERY_FIN_HEAD → PENDING_FIN_HEAD

D365 booking:
  APPROVED → PENDING_D365           (CFO clicks Book)
  PENDING_D365 → BOOKED_D365        (D365 returns success)
  PENDING_D365 → APPROVED           (D365 returns failure — rollback)
  BOOKED_D365 → POSTED_D365         (D365 webhook)
  POSTED_D365 → PAID                (Payment webhook)

Reactivation:
  EXPIRED → PENDING_L1..FIN_HEAD    (Admin reactivates at specific step)

Terminal states: AUTO_REJECT, WITHDRAWN, REJECTED, PAID
```

---

## 7.4 End-to-End Flow: Vendor Self-Service (Happy Path)

```
1. Vendor logs into /vendor/login (email + password → JWT)
2. Dashboard shows: My Bills (list), Submit New Bill
3. Clicks "Submit New Bill"
   → Form pre-fills vendor master data (name, GSTIN, bank, mapped L1)
4. Uploads invoice PDF (max 10MB, PDF/JPG/PNG)
   → PDF stored in MinIO via FileService with SHA256 dedupe
   → If CLAUDE_API_KEY configured: OCR task enqueued
   → If not: user fills all fields manually
5. (If OCR) ~6 seconds later, form auto-fills extracted fields
   → Fields with confidence <0.85 highlighted in amber
   → Vendor reviews/corrects each field
6. Vendor selects mapped L1 contact, adds business purpose
7. Clicks Submit
   → Server validates: required fields, uniqueness, vendor active, L1 mapped
   → Expense created (status=SUBMITTED, ref=BILL-2026-0042)
   → AuditLog entry: expense.created
   → Anomaly task enqueued (if rules module active)
   → Vendor sees acknowledgment page with bill ref
   → Notification: submission_ack → vendor
8. Anomaly worker processes (async):
   → If hard duplicate: AUTO_REJECT + notify vendor+L1+admin
   → If clean/low: status → PENDING_L1 + notify L1
9. L1 opens approval queue → sees bill with anomaly indicators
   → Views PDF (presigned MinIO URL, 15min TTL)
   → Reviews vendor history, OCR confidence, PO reference
   → Clicks Approve with optional note
   → SoD check: L1 ≠ submitter, L1 ≠ filer_on_behalf
   → State: PENDING_L1 → PENDING_L2 (version++)
   → Notify L2
10. L2 → HoD → Fin L1 → Fin L2 → Fin Head (same flow, SoD at each step)
11. CFO approves → status: APPROVED
12. CFO clicks "Book in D365"
    → status: PENDING_D365
    → d365_adapter.create_purchase_invoice(payload)
    → If mock D365 not enabled: stays APPROVED (graceful skip)
    → If success: BOOKED_D365 (d365_doc_no stored)
    → If failure: rollback to APPROVED + error banner
13. Mock D365 webhook fires (5s delay):
    → BOOKED_D365 → POSTED_D365
    → Another webhook: POSTED_D365 → PAID (UTR recorded)
    → Full thread + vendor notified
14. Vendor downloads remittance PDF from portal
```

---

## 7.5 End-to-End Flow: L1 Files On Behalf

```
1. L1 (Rahul) logs in → /employee/bills → "File on Behalf"
2. Selects vendor from dropdown (only mapped vendors visible)
3. Vendor master data auto-loads
4. Uploads PDF received via email from vendor
5. If OCR available: data extracted, otherwise manual fill
6. Rahul adds business purpose + attaches email thread as evidence
7. Toggles "Filed on behalf" acknowledgment
8. Submits → Bill created with is_on_behalf=True, filer_on_behalf=Rahul
9. Vendor notified: "A bill was filed on your behalf by Rahul"
10. Vendor sees bill in their portal (even though they didn't submit)
11. Anomaly check + SoD check:
    → If assigned L1 validator = Rahul (the filer) → SoD violation
    → System auto-routes to backup L1 (Sanjay)
    → Audit: step_rerouted, reason=filer_is_l1
12. Sanjay reviews evidence + vendor history → approves
13. Chain continues normally
```

---

## 7.6 Bad Path: Rejection

```
At any approval step:
1. Approver clicks Reject
2. Modal appears:
   - Reason dropdown (Wrong Amount, Missing Document, Duplicate, etc.)
   - Free text field (minimum 30 characters)
   - Optional evidence upload
3. Submits rejection
4. Bill → REJECTED (terminal state)
5. Rejection broadcast:
   - Notify ONLY users who have touched this bill (thread-so-far)
   - Users who would have been in later steps are NOT notified
   - Example: Rejected at Fin L1 → notify Vendor + L1 + L2 + HoD + Fin L1
   - NOT: Fin L2, CFO (they never saw it)
6. Vendor sees rejection in portal with full reason
7. "Revise & Resubmit" button → creates NEW bill (replaces_bill_id=old)
```

---

## 7.7 Bad Path: Query Loop

```
1. Fin L1 sees bill at PENDING_FIN_L1
2. Clicks "Raise Query": "Need signed acceptance document"
3. Bill → QUERY_FIN_L1
4. Vendor + filer notified by email
5. Vendor responds: uploads unsigned doc
6. Bill → PENDING_FIN_L1 (filer notified response received)
7. Fin L1 raises 2nd query: "Document unsigned and wrong project"
8. Bill → QUERY_FIN_L1 again
9. Vendor responds: "We agreed verbally, no signed doc"
10. Fin L1 rejects: "Cannot process without signed acceptance"
11. Bill → REJECTED (terminal)
12. Broadcast to all who touched: vendor + L1 + L2 + HoD + Fin L1
```

---

## 7.8 Edge Cases

### Approver Deactivated Mid-Flow
```
Bill at PENDING_HOD assigned to Amit → Admin deactivates Amit (resigned)
→ System sweeps all PENDING_* assigned to Amit
→ Finds backup HoD (Priya) in BackupApproverConfig
→ Reassigns bill to Priya
→ Audit: approver_reassigned, reason=user_deactivated
→ Priya notified: "Bill reassigned to you"
→ Thread notified: "HoD step reassigned to Priya"
```

### Delegate Already In Chain
```
L1 Priya approved at step 1 → HoD Amit on leave → delegate=Priya
→ SoD check: Is Priya already in chain? YES (approved L1)
→ Auto-skip HoD step (cannot self-double-approve)
→ Audit: step_skipped, reason=delegate_already_in_chain
→ Downstream approvers see yellow warning
```

### Vendor Disputes On-Behalf Filing
```
L1 files bill on behalf of vendor XYZ → vendor gets email
→ Vendor clicks "Dispute Submission" in portal
→ Bill → QUERY_RAISED, auto-message: "Vendor disputed authorship"
→ Admin always notified on dispute
→ Admin investigates: if valid, rejects bill; if misunderstanding, vendor withdraws
```

### Race Condition (Optimistic Lock)
```
L2 and HoD both have bill open → both click Approve at version=5
→ L2's request arrives first: UPDATE WHERE version=5 SET version=6 → 1 row updated → OK
→ HoD's request: UPDATE WHERE version=5 → 0 rows → 409 Conflict
→ HoD also fails state validation: HoD step requires PENDING_HOD, not PENDING_L2
```

### SLA Breach
```
Bill at PENDING_FIN_L1, SLA=48h → 48h pass with no action
→ Celery Beat detects breach → status: EXPIRED
→ Notify: current approver + Admin + thread
→ Admin can: Reactivate (SLA timer resets) or Reject on behalf
```

### Bank Account Change Holds Payment
```
Bill at BOOKED_D365 awaiting payment → Vendor requests bank change
→ All payments to this vendor HELD
→ Show banner on bill: 'Payment held - bank change in review'
→ CFO reviews → 48h cooling period → verification → approve/reject change
→ Resume payments → bill PAID
```

---

## 7.9 Component Architecture

```
Frontend:
  /vendor/bills/*         → VendorBillViewSet (submit, list, detail, withdraw)
  /employee/bills/*       → OnBehalfViewSet (draft, file, validate)
  /finance/bills/queue    → QueueViewSet (filtered by role + status)
  /finance/bills/{id}/*   → ApprovalActionViewSet (approve, reject, query)
  /finance/bills/{id}/book → D365BookingViewSet (book, retry)
  /webhooks/d365          → WebhookViewSet (posted, payment webhooks)

Service Layer:
  SubmissionService      → Creates expense, triggers OCR + anomaly
  ApprovalService        → Delegates to approval engine + SoD
  TransitionService      → State machine guard (all state changes)
  ThreadComputer         → Computes who has touched this bill
  NotificationDispatcher → Routes to notification engine

Celery Workers:
  OCR Worker      → Claude Vision (via masking) or SKIPPED
  Anomaly Worker  → 8 rules + Isolation Forest (if trained)
  SLA Worker      → Every 5min, check deadlines
  Notify Worker   → Email + in-app dispatch
```

### Thread Computation

The `ThreadComputer` is the single source of truth for "who has touched this bill":

```python
def get_thread_users(expense):
    users = set()
    users.add(expense.submitted_by)           # Always
    if expense.filer_on_behalf:
        users.add(expense.filer_on_behalf)    # If on-behalf
    users.add(expense.vendor.users.first())   # Vendor user
    for step in expense.approval_steps.filter(decided_at__isnull=False):
        users.add(step.actual_actor)          # Each approver who acted
    users.add(current_pending_approver)       # Current assignee
    for query in expense.queries.all():
        users.add(query.raised_by)
        if query.responded_by:
            users.add(query.responded_by)
    return users
```

Used for: rejection broadcast, timeline visibility, file access authorization.

---

## 7.10 Graceful Degradation for MVP

| Feature | If External Dependency Missing | Fallback |
|---------|-------------------------------|----------|
| OCR extraction | No CLAUDE_API_KEY | Task marked SKIPPED, vendor fills form manually |
| Anomaly ML score | No trained model | Only rule-based checks run, ML score=null |
| Anomaly detection | Rules + ML both skip | Bill goes directly to PENDING_L1 |
| D365 booking | Mock D365 disabled | Bill stays APPROVED, admin can manually mark PAID |
| Email notifications | No SMTP configured | Console log only, in-app notification still created |
| File storage | No MinIO | Django default file storage (local disk) |
| SLA enforcement | Celery Beat not running | SLA not enforced, bills stay pending |
