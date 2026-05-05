# 🧪 Cross-Cutting Concerns: Stress Tests & Integration
**Component Scope:** Multi-feature end-to-end flows, concurrency, replication lag, idempotency, data consistency
**Objective:** After running individual feature checklists, verify system-wide resilience: no data corruption under load, eventual consistency works, and all features integrate without cascading failures.

### 1. Setup
- [ ] Full demo dataset: 100+ expenses, 20+ vendors, 10+ users across all grades, 5+ budgets.
- [ ] `CELERY_TASK_ALWAYS_EAGER=true` (tasks run inline; easier to verify).
- [ ] Monitoring: tail Django logs, Celery output, and database logs.
- [ ] Load testing tool ready: `curl` / `apache-bench` / custom script.

### 2. Data Consistency & Idempotency

#### 2.1 Idempotent approval
- [ ] Approve an expense; record the request body.
- [ ] Re-send the same request (identical JSON).
- [ ] **Assert:** second request returns `400` (invalid state transition) OR succeeds and is a no-op (record observed behavior).
- [ ] **Assert DB:** only one `ExpenseApprovalStep` row at final level; no duplicate step rows.

#### 2.2 Concurrent approval attempts
- [ ] Submit an expense; open two browser tabs, both logged in as `l1_approver`.
- [ ] Both click approve simultaneously.
- [ ] **Assert:** exactly one approval succeeds; the other receives error (409 Conflict / 400 Invalid State / 403 Not Assigned).
- [ ] **Assert DB:** one APPROVED step row; expense at correct next level (not skipped doubly).

#### 2.3 Reject after concurrent approve
- [ ] Same as above; one approves, one tries to reject.
- [ ] **Assert:** reject fails (`400` invalid state — already APPROVED).
- [ ] **Assert notifications:** submitter receives only one notification (not two).

#### 2.4 Expense state machine integrity
- [ ] Trigger every valid transition pair from VALID_TRANSITIONS dict programmatically (via management shell or API).
- [ ] **Assert:** each transition succeeds and leaves DB in consistent state.
- [ ] Attempt every invalid transition.
- [ ] **Assert:** all raise exception or return error; no silent partial-updates.

#### 2.5 Budget amount atomicity
- [ ] Approve 5 expenses (₹10k each) in the same budget period concurrently.
- [ ] **Assert:** budget `spent_amount` accumulates to ₹50k (sum is correct, no lost updates).
- [ ] **Assert:** utilization_pct correctly reflects final sum.

### 3. Notification Idempotency

#### 3.1 Email not sent twice
- [ ] Approve an expense; note email sent count.
- [ ] Re-approve (impossible by state machine, but simulate via task replay).
- [ ] **Assert:** only one email in outbox (not two).
- [ ] Check Celery task logs for task dedupe (Celery idempotency key, or record if none exists).

#### 3.2 Async task failure doesn't lose data
- [ ] Approve an expense; approve step succeeds; async D365 export task fails (mock by breaking exports/ dir).
- [ ] **Assert:** Expense.status=APPROVED (data saved, not rolled back).
- [ ] **Assert:** AuditLog includes the approval (not lost).
- [ ] **Assert:** notification sent OR queued for retry (not lost).

### 4. Concurrency Under Load

#### 4.1 Bulk submit (100 expenses in 10 seconds)
- [ ] Script: `for i in {1..100}; do curl -X POST /api/v1/invoices/submit/ -d <payload> &; done; wait`.
- [ ] **Assert:** all 100 POSTs succeed; 200 Created.
- [ ] **Assert DB:** 100 Expense rows created (no lost inserts).
- [ ] **Assert:** ref_no is unique across all 100 (auto-increment not broken under contention).

#### 4.2 Bulk approve (100 approvals in 10 seconds)
- [ ] Submit 100; approve all as `fin_admin`.
- [ ] Script: `for id in list; do curl -X POST /api/v1/invoices/finance/bills/$id/approve/ &; done`.
- [ ] **Assert:** all succeed; DB consistent.
- [ ] **Assert:** no approval step duplicated; no expense state corrupted.

#### 4.3 Concurrent OCR extractions
- [ ] Upload 20 files from `vendor1`; extract OCR for all in parallel.
- [ ] **Assert:** all 20 complete; FileRef rows created.
- [ ] **Assert:** no OCR results overwrite each other.

#### 4.4 Concurrent anomaly scans
- [ ] 20 expenses; scan anomaly on all simultaneously.
- [ ] **Assert:** all 20 complete; anomaly_severity + flags set correctly.
- [ ] **Assert:** no race condition in vendor stats lookup (no "division by zero" or stale stats).

### 5. Replication Lag & Eventual Consistency

#### 5.1 Read-after-write with processing lag
- [ ] Approve an expense (approval logic completes synchronously).
- [ ] Immediately call `GET /api/v1/invoices/finance/bills/<id>/` (read view).
- [ ] **Assert:** status reflects APPROVED or next level, not SUBMITTED (no lag visible in this sync stack).
- [ ] Check analytics endpoint immediately (`GET /analytics/spend-intelligence/`).
- [ ] **Assert:** newly approved amount included in YTD (no stale data).

#### 5.2 Cache staleness
- [ ] Get monthly summary (caches in MonthlyFinancialSummary).
- [ ] Approve a new expense in that month.
- [ ] Get monthly summary again (without `regenerate=1`).
- [ ] **Assert:** data is stale (still reflects pre-approval amounts) — this is acceptable eventual-consistency behavior.
- [ ] **Assert:** with `regenerate=1`, data is fresh.
- [ ] Document the staleness window (e.g., 24h TTL, manual refresh, or immediate).

### 6. Error Propagation & Graceful Degradation

#### 6.1 LLM failure doesn't break approval
- [ ] Mock OPENROUTER timeout (30s+) during anomaly scan.
- [ ] Approve the expense without waiting for scan to complete.
- [ ] **Assert:** approval succeeds (not blocked by stalled anomaly pipeline).
- [ ] **Assert:** anomaly_severity remains null OR carries a SYSTEM_ERROR flag (fallback state).

#### 6.2 Email backend failure doesn't block approval
- [ ] Break the email backend (e.g., kill SMTP service).
- [ ] Approve an expense.
- [ ] **Assert:** approval succeeds; email task fails/retries silently.
- [ ] Restore email backend.
- [ ] **Assert:** pending tasks eventually deliver (or are manually retried).

#### 6.3 Database connection pool exhaustion
- [ ] Open 100+ long-running queries (via other test client).
- [ ] Try to approve an expense.
- [ ] **Assert:** request waits for a free connection; does not 500 immediately (depends on Django connection pool size).
- [ ] After queries complete, approve succeeds.

#### 6.4 File system out of space
- [ ] Fill exports/ directory (or MEDIA_ROOT).
- [ ] Approve an expense (triggers D365 export).
- [ ] **Assert:** task fails gracefully; error logged; does not cascade (approval still succeeded earlier).
- [ ] Free up space; manually retry export task.

### 7. Security & Access Control Under Concurrent Load

#### 7.1 HOD scoping with concurrent reads
- [ ] As `hod` (dept A), list budgets; simultaneously approve expense in dept B (impossible by design, but test access checks are enforced).
- [ ] **Assert:** hod cannot see dept B's data in any response.

#### 7.2 Grade gate bypass attempt
- [ ] As `employee1` (grade 1), try to create budget (grade 4 required).
- [ ] Simultaneously, another process upgrades employee1 to grade 4.
- [ ] First request should fail with cached/stale grade (or succeed if reloaded; record behavior).

#### 7.3 Token expiry under load
- [ ] Issue 100 requests with a token that expires during the batch.
- [ ] Some requests succeed (before expiry); later ones get `401`.
- [ ] **Assert:** no cross-contamination (one user's expired token doesn't affect another user's valid token).

### 8. Cascading Failures (Failure Domain Isolation)

#### 8.1 Anomaly service down
- [ ] Kill anomaly pipeline (or mock timeout).
- [ ] Submit and approve expenses.
- [ ] **Assert:** approval works; anomaly step is skipped or marked with error, but doesn't block financial flow.

#### 8.2 Notification service down
- [ ] Kill email backend / Teams webhook.
- [ ] Approve expense.
- [ ] **Assert:** approval works; notifications fail silently (logged).

#### 8.3 D365 integration down
- [ ] Break D365 export (already done: app missing).
- [ ] Approve expense.
- [ ] **Assert:** approval works in mock mode; D365 push fails silently.

### 9. Data Correctness Spot Checks

#### 9.1 Audit trail completeness
- [ ] Run 50 random operations (submit, approve, reject, query, scan-anomaly, settle).
- [ ] **Assert:** every operation has a corresponding AuditLog entry.
- [ ] No gaps; sequence is chronological.

#### 9.2 Expense status consistency
- [ ] Query all APPROVED expenses; verify:
  - All have a final approval step with status=APPROVED.
  - All are not in REJECTED/WITHDRAWN states (impossible by FSM).
  - All have a submitter assigned.

#### 9.3 Budget utilization math
- [ ] Pick 5 budgets; manually sum all APPROVED/PAID/BOOKED_D365 expenses within their period.
- [ ] Compare to `Budget.spent_amount`.
- [ ] **Assert:** match exactly (no over/under-counting).

### 10. Operational Signoff Checklist

- [ ] All individual feature checklists (01–14) completed and passed.
- [ ] At least one concurrency test (2.1–4.4) executed.
- [ ] At least one eventual-consistency test (5.1–5.2) verified.
- [ ] Database integrity check: `PRAGMA integrity_check;` (SQLite) or equiv. passes.
- [ ] Audit log has > 500 entries (if bulk testing); review for anomalies.
- [ ] No unhandled exceptions in logs; all errors have corresponding log messages at INFO/WARNING level.
- [ ] Performance: approval flow completes <1s; analytics queries complete <5s; OCR <30s (record actual times).
- [ ] Known issues documented (e.g., D365 app missing, Monthly Summary cache staleness, Approve view triple-loop).
