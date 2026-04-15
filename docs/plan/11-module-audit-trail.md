# 11 — Audit Trail Module

## 11.1 Module Overview

The Audit Trail module provides complete, immutable tracking of all data changes, user actions, and system events across the application. It's designed to meet internal compliance requirements and external audit standards (SOX, internal audit frameworks).

---

## 11.2 Feature Breakdown

### 11.2.1 Automatic Audit Logging

Every data mutation in the system is automatically logged through a centralized audit service. The audit service is called from the service layer, ensuring no mutation can bypass audit logging.

**Events Automatically Logged:**

| Event Category | Actions Tracked |
|---------------|-----------------|
| **Data Mutations** | CREATE, UPDATE, DELETE on all entities |
| **Status Changes** | Every status transition (e.g., DRAFT → SUBMITTED → APPROVED) |
| **Approvals** | Approval, rejection, escalation actions with comments |
| **Authentication** | Login, logout, failed login attempts |
| **File Operations** | Upload, download, delete of attachments |
| **Exports** | Report generation and data exports |
| **Configuration** | Changes to system settings, policies, workflows |
| **User Management** | User creation, role changes, deactivation |

**Audit Log Entry Structure:**
```typescript
interface AuditLogEntry {
  id: bigint;                     // Auto-increment ID
  userId: string;                 // Who performed the action
  userName: string;               // Denormalized for query performance
  action: AuditAction;            // CREATE, UPDATE, DELETE, STATUS_CHANGE, etc.
  entityType: string;             // "vendor", "expense", "invoice", etc.
  entityId: string;               // UUID of the affected record
  entityDisplayName: string;      // "EXP-2026-0042" for human readability
  
  // Change details
  fieldName: string | null;       // Specific field (null for CREATE/DELETE)
  previousValue: string | null;   // JSON string of old value
  newValue: string | null;        // JSON string of new value
  changeSummary: string;          // "Status changed from DRAFT to SUBMITTED"
  
  // Full entity snapshots (for critical changes)
  beforeSnapshot: object | null;  // Complete entity state before change
  afterSnapshot: object | null;   // Complete entity state after change
  
  // Request context
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  requestId: string;              // Correlate multiple changes in one request
  
  // Metadata
  metadata: object | null;        // Additional context (approval comments, etc.)
  timestamp: Date;
}
```

### 11.2.2 Audit Service Implementation

```typescript
// src/services/audit.service.ts

class AuditService {
  /**
   * Log a single change
   */
  async logChange(params: {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    fieldName?: string;
    previousValue?: any;
    newValue?: any;
    changeSummary?: string;
    metadata?: any;
  }): Promise<void>;

  /**
   * Log entity creation with full snapshot
   */
  async logCreate(params: {
    userId: string;
    entityType: string;
    entityId: string;
    entityData: object;
  }): Promise<void>;

  /**
   * Log entity update with before/after diff
   */
  async logUpdate(params: {
    userId: string;
    entityType: string;
    entityId: string;
    beforeState: object;
    afterState: object;
    changedFields: string[];
  }): Promise<void>;

  /**
   * Log entity deletion with final snapshot
   */
  async logDelete(params: {
    userId: string;
    entityType: string;
    entityId: string;
    entityData: object;
  }): Promise<void>;

  /**
   * Get change history for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    options?: { page: number; pageSize: number }
  ): Promise<PaginatedResult<AuditLogEntry>>;

  /**
   * Search audit logs with filters
   */
  async searchLogs(filters: AuditSearchFilters): Promise<PaginatedResult<AuditLogEntry>>;

  /**
   * Compare two snapshots and generate diff
   */
  private generateDiff(before: object, after: object): FieldChange[];

  /**
   * Generate human-readable change summary
   */
  private generateChangeSummary(
    action: AuditAction,
    entityType: string,
    changes: FieldChange[]
  ): string;
}
```

### 11.2.3 Audit Log Viewer

**Audit Log Page** (`/audit`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          AUDIT TRAIL                                      │
│──────────────────────────────────────────────────────────────────────────│
│                                                                           │
│  ┌── Filters ──────────────────────────────────────────────────────────┐ │
│  │ Date Range: [📅 Apr 1] to [📅 Apr 15]  User: [▼ All Users____]    │ │
│  │ Entity:     [▼ All Types_____]           Action: [▼ All Actions_]  │ │
│  │ Search:     [🔍 Search in changes...________________________]       │ │
│  │ [Apply Filters]  [Clear]  [Export Logs ↓]                           │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  Total Records: 1,247 | Showing 1-20                                     │
│                                                                           │
│  ┌── Audit Log Table ──────────────────────────────────────────────────┐ │
│  │ Timestamp          │ User          │ Action  │ Entity        │ Dets │ │
│  │────────────────────│───────────────│─────────│───────────────│──────│ │
│  │ Apr 15 10:32 AM    │ John Doe      │ CREATE  │ Expense       │  👁  │ │
│  │                    │               │         │ EXP-2026-0042 │      │ │
│  │ Apr 15 10:35 AM    │ John Doe      │ STATUS  │ Expense       │  👁  │ │
│  │                    │               │ CHANGE  │ EXP-2026-0042 │      │ │
│  │ Apr 15 10:36 AM    │ System        │ CREATE  │ Notification  │  👁  │ │
│  │                    │               │         │ (approval req)│      │ │
│  │ Apr 15 11:20 AM    │ Jane Manager  │APPROVAL │ Expense       │  👁  │ │
│  │                    │               │         │ EXP-2026-0042 │      │ │
│  │ Apr 15 02:15 PM    │ Bob Acct.     │ UPDATE  │ Invoice       │  👁  │ │
│  │                    │               │         │ INV-2026-0098 │      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  [← Prev]  Page 1 of 63  [Next →]                                       │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Detail View (expand row or side panel):**
```
┌── Change Detail ────────────────────────────────────────────────────────┐
│                                                                          │
│  Action:    STATUS_CHANGE                                                │
│  Entity:    Expense — EXP-2026-0042                                      │
│  User:      John Doe (john@company.com)                                  │
│  Timestamp: Apr 15, 2026 10:35:22 AM UTC                                │
│  IP:        192.168.1.100                                                │
│  Session:   sess_abc123                                                  │
│                                                                          │
│  Summary:   Status changed from DRAFT to SUBMITTED                       │
│                                                                          │
│  ┌── Field Changes ──────────────────────────────────────────────────┐  │
│  │ Field        │ Previous Value     │ New Value                      │  │
│  │──────────────│────────────────────│────────────────────────────────│  │
│  │ status       │ DRAFT              │ SUBMITTED                      │  │
│  │ submittedAt  │ null               │ 2026-04-15T10:35:22Z          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  [View Full Entity Snapshot]  [View Related Changes]                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 11.2.4 Entity Change History

Every entity detail page (vendor, expense, invoice, budget, etc.) includes an **Activity** or **History** tab that shows the complete change history for that specific entity.

**Change History Timeline Component:**
```
┌── Change History for EXP-2026-0042 ────────────────────────────┐
│                                                                  │
│  ● Created                                     Apr 14, 10:00 AM │
│  │ John Doe created expense "Client dinner"                     │
│  │ Amount: $245.50 | Category: Meals                            │
│  │                                                               │
│  ● Attachment Added                             Apr 14, 10:02 AM │
│  │ John Doe uploaded "receipt-apr14.pdf"                         │
│  │                                                               │
│  ● Submitted for Approval                       Apr 14, 10:05 AM │
│  │ John Doe submitted expense for approval                      │
│  │ Status: DRAFT → SUBMITTED                                    │
│  │                                                               │
│  ● Approved (Level 1)                           Apr 15, 11:20 AM │
│  │ Jane Manager approved                                        │
│  │ Comment: "Valid business expense. Approved."                  │
│  │ Status: SUBMITTED → APPROVED                                 │
│  │                                                               │
│  ● Reimbursement Processed                      Apr 16, 02:00 PM │
│  │ Bob Accountant marked as reimbursed                          │
│  │ Ref: REIMB-2026-0019                                         │
│  │ Status: APPROVED → REIMBURSED                                │
│  │                                                               │
│  ──── End of History ────                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 11.2.5 Access Logs

**Access Log Page** (`/audit/access-logs`)

Tracks all user authentication and page access events:

| Field | Description |
|-------|-------------|
| Timestamp | When the action occurred |
| User | Who performed it |
| Action | LOGIN, LOGOUT, FAILED_LOGIN, PAGE_VIEW, API_CALL |
| Resource | URL or API endpoint accessed |
| Method | HTTP method (GET, POST, PUT, DELETE) |
| Status Code | HTTP response code |
| IP Address | Client IP |
| User Agent | Browser/device info |
| Duration | Request time in ms |

**Security Monitoring Features:**
- Failed login attempt tracking with lockout at threshold
- Unusual access pattern detection (different IP, unusual hours)
- Session activity summary per user
- Concurrent session detection

### 11.2.6 Compliance Reports

**Pre-Built Compliance Reports:**

1. **User Activity Report**
   - All actions by a specific user in a date range
   - Login/logout history
   - Data access patterns
   
2. **Data Modification Report**
   - All data changes with before/after values
   - Grouped by entity type
   - Filterable by user, date, action type

3. **Approval Workflow Report**
   - All approval decisions with timestamps
   - Average approval time
   - Rejection rates
   - Escalation history

4. **Access Control Report**
   - User role assignments
   - Permission usage tracking
   - Unauthorized access attempts

5. **Financial Data Integrity Report**
   - All changes to financial values (amounts, totals)
   - Before/after comparison for every monetary change
   - Flagged anomalies (large adjustments, after-approval edits)

---

## 11.3 Audit Export

**Export Format:**
- Excel with multiple sheets (Summary, Detail, Metadata)
- PDF for formal audit reports  
- CSV for raw log data

**Export Includes:**
- Report header (generated date, generated by, filters applied)
- Summary statistics (total events, events by type, events by user)
- Detailed log entries
- Digital signature / hash for integrity verification

---

## 11.4 Data Retention & Archival

| Data Type | Retention Period | Archive Strategy |
|-----------|-----------------|------------------|
| Audit Logs | 7 years | Move to cold storage after 1 year |
| Access Logs | 1 year | Auto-delete after retention |
| Entity Snapshots | 7 years | Compressed JSON storage |
| Login History | 2 years | Auto-delete after retention |

---

## 11.5 Business Rules

1. **Immutability**: Audit logs can NEVER be modified or deleted (even by SUPER_ADMIN)
2. **Automatic Capture**: All mutations go through the audit service — no bypass possible
3. **Timestamp Integrity**: All timestamps use server-side UTC (never client-provided)
4. **Request Correlation**: All changes within a single API request share the same `requestId`
5. **Sensitive Data Masking**: Bank account numbers, SSN, passwords are masked in logs
6. **Performance**: Audit logging is asynchronous (fire-and-forget) to not block user operations
7. **Index Strategy**: Indexes on (entityType, entityId), (userId), (timestamp), (action) for fast queries
8. **Snapshot Strategy**: 
   - Full snapshots saved for: CREATE, DELETE, and STATUS_CHANGE actions
   - Field-level diffs for UPDATE actions
9. **System Actions**: System-triggered events (auto-overdue, scheduled reports) logged with userId = "SYSTEM"
10. **Compliance Lock**: During audit periods, additional restrictions can be applied to prevent data modifications
