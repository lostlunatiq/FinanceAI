# 04 — API Specifications (Django REST Framework)

## 4.1 API Overview

- **Base URL**: `/api/v1/`
- **Auth**: JWT Bearer token (`Authorization: Bearer <access_token>`)
- **Format**: JSON request/response
- **Pagination**: `?page=1&page_size=20` (default 20, max 100)
- **Filtering**: `?status=PENDING_L1&vendor=uuid`
- **Ordering**: `?ordering=-created_at`
- **OpenAPI**: Auto-generated via `drf-spectacular` at `/api/schema/`
- **Swagger UI**: Available at `/api/docs/` (dev only)

### Standard Response Envelope

```json
// Success (list)
{"count": 42, "next": "url", "previous": null, "results": [...]}

// Success (single)
{"id": "uuid", "ref_no": "BILL-2026-0042", ...}

// Error
{"detail": "Error message", "code": "error_code"}

// Validation Error
{"field_name": ["Error message 1", "Error message 2"]}
```

### Standard Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `validation_error` | Invalid input |
| 401 | `not_authenticated` | Missing/expired JWT |
| 403 | `permission_denied` | Role insufficient |
| 403 | `sod_violation` | Segregation of Duties violation |
| 404 | `not_found` | Resource not found |
| 409 | `conflict` | Optimistic lock conflict (version mismatch) or invalid state transition |
| 429 | `throttled` | Rate limit exceeded |

---

## 4.2 Auth Endpoints

```
POST   /api/v1/auth/login/            # Login → {access, refresh, user}
POST   /api/v1/auth/refresh/           # Refresh → {access}
POST   /api/v1/auth/logout/            # Blacklist refresh token
GET    /api/v1/auth/me/                # Current user profile
PATCH  /api/v1/auth/me/                # Update profile (name, password)
```

---

## 4.3 Expense (Vendor Bill) Endpoints

### Vendor Portal
```
GET    /api/v1/vendor/profile/                      # Vendor master data
GET    /api/v1/vendor/bills/                         # My submitted bills (paginated, filterable)
POST   /api/v1/vendor/bills/                         # Submit new bill
GET    /api/v1/vendor/bills/{id}/                    # Bill detail (full timeline)
POST   /api/v1/vendor/bills/{id}/withdraw/           # Withdraw (only if SUBMITTED, no L1 action)
POST   /api/v1/vendor/bills/{id}/dispute/            # Dispute on-behalf filing
POST   /api/v1/vendor/bills/{id}/resubmit/           # Resubmit after rejection (creates new bill)
POST   /api/v1/vendor/bills/upload-file/             # Upload PDF → FileRef ID
POST   /api/v1/vendor/bills/extract/                 # Trigger OCR → task_id (poll for result)
GET    /api/v1/vendor/bills/extract/{task_id}/       # Poll OCR result
GET    /api/v1/vendor/bills/{id}/remittance-pdf/     # Download remittance PDF (PAID only)
```

### Employee (L1) Portal
```
GET    /api/v1/employee/mapped-vendors/              # Vendors mapped to this L1
POST   /api/v1/employee/bills/draft/                 # Save draft on behalf
POST   /api/v1/employee/bills/                       # File bill on behalf (submit)
GET    /api/v1/employee/bills/                        # Bills I filed on behalf
GET    /api/v1/employee/bills/queue/                  # My L1 validation queue
```

### Finance / Approval Queue
```
GET    /api/v1/finance/bills/queue/                   # My approval queue (filtered by role + status)
GET    /api/v1/finance/bills/{id}/                    # Bill detail with full context
POST   /api/v1/finance/bills/{id}/approve/            # Approve at current step
POST   /api/v1/finance/bills/{id}/reject/             # Reject with reason
POST   /api/v1/finance/bills/{id}/query/              # Raise query
POST   /api/v1/finance/bills/{id}/respond-query/      # Respond to query (vendor/filer)
POST   /api/v1/finance/bills/{id}/override-anomaly/   # Override with reason (≥50 chars)
POST   /api/v1/finance/bills/{id}/book-d365/          # Book in D365 (CFO only)
POST   /api/v1/finance/bills/{id}/retry-d365/         # Retry failed booking
GET    /api/v1/finance/bills/stats/                    # Dashboard stats (counts by status)
```

### Webhooks (System)
```
POST   /api/v1/webhooks/d365/                        # D365 webhook (posted, payment)
       Headers: X-D365-Signature: HMAC-SHA256
```

---

## 4.4 Invoice Endpoints

```
GET    /api/v1/invoices/                              # List invoices (filterable)
POST   /api/v1/invoices/                              # Create draft invoice
GET    /api/v1/invoices/{id}/                         # Invoice detail
PATCH  /api/v1/invoices/{id}/                         # Update draft
DELETE /api/v1/invoices/{id}/                         # Cancel draft (→ CANCELLED)
POST   /api/v1/invoices/{id}/send/                    # Send to client
POST   /api/v1/invoices/{id}/mark-paid/               # Manual mark as paid (with UTR)
GET    /api/v1/invoices/{id}/dunning-history/         # Dunning events for this invoice
POST   /api/v1/invoices/{id}/trigger-dunning/         # Manual dunning trigger

# Reconciliation
POST   /api/v1/invoices/reconcile/upload/             # Upload bank statement
GET    /api/v1/invoices/reconcile/{statement_id}/     # View match results
POST   /api/v1/invoices/reconcile/{statement_id}/apply/ # Apply matched receipts

# Credit Notes
GET    /api/v1/credit-notes/                          # List credit notes
POST   /api/v1/credit-notes/                          # Issue credit note
GET    /api/v1/credit-notes/{id}/                     # CN detail
POST   /api/v1/credit-notes/{id}/approve/             # Approve CN (CFO)

# Disputes
GET    /api/v1/disputes/                              # List disputes
POST   /api/v1/disputes/                              # Create dispute (client)
PATCH  /api/v1/disputes/{id}/resolve/                 # Resolve dispute

# Clients
GET    /api/v1/clients/                               # List clients
POST   /api/v1/clients/                               # Create client
GET    /api/v1/clients/{id}/                          # Client detail
```

---

## 4.5 Vendor Management Endpoints

```
GET    /api/v1/vendors/                               # List vendors (admin/finance)
POST   /api/v1/vendors/                               # Create vendor (admin)
GET    /api/v1/vendors/{id}/                          # Vendor detail
PATCH  /api/v1/vendors/{id}/                          # Update vendor
POST   /api/v1/vendors/{id}/suspend/                  # Suspend vendor
POST   /api/v1/vendors/{id}/activate/                 # Activate vendor

# L1 Mappings
GET    /api/v1/vendors/{id}/l1-mappings/              # List L1 mappings
POST   /api/v1/vendors/{id}/l1-mappings/              # Add L1 mapping (admin)
DELETE /api/v1/vendors/{id}/l1-mappings/{mapping_id}/ # Remove mapping

# Bank Accounts
POST   /api/v1/vendors/{id}/bank-change-request/      # Vendor requests change
POST   /api/v1/vendors/{id}/bank-change-approve/      # CFO approves (after 48h cooling)
```

---

## 4.6 Notification Endpoints

```
GET    /api/v1/notifications/                         # My notifications (paginated)
GET    /api/v1/notifications/unread-count/            # Count of unread
POST   /api/v1/notifications/{id}/mark-read/          # Mark as read
POST   /api/v1/notifications/mark-all-read/           # Mark all as read
```

---

## 4.7 Audit Endpoints

```
GET    /api/v1/audit/logs/                            # Search audit logs (CFO/Admin/Auditor)
GET    /api/v1/audit/logs/entity/{type}/{id}/         # Change history for specific entity
GET    /api/v1/audit/logs/export/                     # Export audit logs (CSV/Excel)
GET    /api/v1/audit/access-logs/                     # Access logs (page views, API calls)
POST   /api/v1/audit/verify-chain/                    # Verify hash chain integrity
```

---

## 4.8 Admin Endpoints

```
GET    /api/v1/admin/users/                           # List users
POST   /api/v1/admin/users/                           # Create user
PATCH  /api/v1/admin/users/{id}/                      # Update user
POST   /api/v1/admin/users/{id}/deactivate/           # Deactivate (triggers approver reassignment)
GET    /api/v1/admin/departments/                     # List departments
GET    /api/v1/admin/backup-approvers/                # List backup configs
POST   /api/v1/admin/backup-approvers/                # Configure backup
GET    /api/v1/admin/disputes/                        # View pending disputes
```

---

## 4.9 Dashboard / Reports Endpoints

```
GET    /api/v1/dashboard/                             # Role-specific dashboard data
GET    /api/v1/dashboard/kpis/                        # KPI cards data
GET    /api/v1/dashboard/charts/monthly-trend/        # Monthly expense/invoice trend
GET    /api/v1/dashboard/charts/category-breakdown/   # Expense by category
GET    /api/v1/dashboard/pending-actions/             # Items requiring my action
GET    /api/v1/dashboard/recent-activity/             # Recent activity feed
```

---

## 4.10 File Endpoints

```
POST   /api/v1/files/upload/                          # Upload file → FileRef
GET    /api/v1/files/{id}/                            # Get presigned download URL (15 min TTL)
```
