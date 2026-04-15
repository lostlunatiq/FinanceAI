# 02 — System Architecture

## 2.1 Architecture Overview

FinanceAI uses a **decoupled frontend + backend** architecture:
- **Frontend**: React 18 SPA (Vite + TypeScript) — single SPA with role-based routing
- **Backend**: Django 5 + DRF — REST API with JWT authentication
- **Async**: Celery workers for OCR, anomaly detection, notifications, SLA enforcement
- **Data**: PostgreSQL 16 (primary), Redis (broker + cache), MinIO (S3 blob storage)
- **AI**: Claude API (accessed only via masking middleware)

---

## 2.2 Hackathon Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                      │
│  Vendor Browser │ Employee Browser │ Finance/CFO Browser │ Admin Browser  │
├──────────────────────────────────────────────────────────────────────────┤
│                 FRONTEND — React 18 + Vite + TypeScript                   │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐           │
│  │ Vendor Portal│ Employee     │ Finance      │ Admin        │           │
│  │ /vendor/*    │ Portal       │ Dashboard    │ Console      │           │
│  │              │ /employee/*  │ /finance/*   │ /admin/*     │           │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘           │
│         │              │              │              │                    │
│         └──────────────┴──────┬───────┴──────────────┘                    │
│                    Shared UI Components (shadcn/ui + Tailwind)            │
├──────────────────────────────────────────────────────────────────────────┤
│                     REST + JWT │ via Nginx Reverse Proxy                  │
├──────────────────────────────────────────────────────────────────────────┤
│                    BACKEND — Django 5 + DRF                               │
│                                                                           │
│  ┌─ Django Apps ──────────────────────────────────────────────────────┐   │
│  │ accounts │ vendors │ expenses │ invoices │ approvals │ ocr │       │   │
│  │ anomaly  │ notifications │ mock_d365 │ core (AuditLog, FileRef)   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─ Service Layer ────────────────────────────────────────────────────┐   │
│  │ d365_adapter (OData client) │ storage_service (S3/MinIO)          │   │
│  │ masking_service (tokenize PII) │ state_machine (generic engine)   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────┤
│                    ASYNC WORKERS — Celery + Redis                         │
│  ┌────────────┬────────────┬────────────────┬────────────────┐           │
│  │ OCR Worker │ Anomaly    │ Notification   │ Celery Beat    │           │
│  │ (Claude)   │ Worker     │ Worker + SLA   │ (scheduler)    │           │
│  └────────────┴────────────┴────────────────┴────────────────┘           │
├──────────────────────────────────────────────────────────────────────────┤
│                    DATA LAYER                                             │
│  ┌────────────────┬────────────────┬────────────────┐                    │
│  │ PostgreSQL 16  │ Redis          │ MinIO          │                    │
│  │ (Primary DB)   │ (Broker+Cache) │ (S3 Blob)      │                    │
│  └────────────────┴────────────────┴────────────────┘                    │
├──────────────────────────────────────────────────────────────────────────┤
│                    EXTERNAL APIs                                          │
│  Claude API (via masking) │ Mailtrap SMTP │ Mock D365 (in-process)       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2.3 Django Project Structure

```
financeai/                          # Django project root
├── manage.py
├── config/                         # Project settings
│   ├── __init__.py
│   ├── settings/
│   │   ├── base.py                 # Shared settings
│   │   ├── development.py          # Dev overrides
│   │   ├── production.py           # Prod overrides
│   │   └── testing.py              # Test overrides
│   ├── urls.py                     # Root URL conf
│   ├── celery.py                   # Celery app config
│   ├── wsgi.py
│   └── asgi.py
│
├── apps/                           # All Django apps
│   ├── __init__.py
│   │
│   ├── accounts/                   # Authentication & RBAC
│   │   ├── models.py               # User, UserRole, Department
│   │   ├── serializers.py
│   │   ├── views.py                # Login, register, me, refresh
│   │   ├── permissions.py          # Role-based permission classes
│   │   ├── middleware.py           # JWT auth middleware
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── tests/
│   │
│   ├── core/                       # Shared models & services
│   │   ├── models.py               # AuditLog, FileRef
│   │   ├── audit.py                # AuditWriter, @audited decorator
│   │   ├── file_service.py         # Upload, download, SHA256 dedupe
│   │   ├── state_machine.py        # StateMachineEngine
│   │   ├── masking.py              # MaskingMiddleware
│   │   ├── exceptions.py           # Custom exceptions
│   │   ├── pagination.py           # Standard pagination
│   │   ├── mixins.py               # Audit mixin, version mixin
│   │   ├── utils.py                # Formatters, validators
│   │   └── tests/
│   │
│   ├── vendors/                    # Vendor management
│   │   ├── models.py               # Vendor, VendorContact, VendorBankAccount
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py             # VendorService
│   │   ├── urls.py
│   │   └── tests/
│   │
│   ├── expenses/                   # Expense / vendor bill management
│   │   ├── models.py               # Expense, ExpenseApprovalStep, ExpenseQuery
│   │   │                           # VendorL1Mapping, BackupApproverConfig
│   │   ├── serializers.py
│   │   ├── views.py                # VendorBillViewSet, OnBehalfViewSet,
│   │   │                           # QueueViewSet, ApprovalActionViewSet,
│   │   │                           # QueryViewSet, D365BookingViewSet
│   │   ├── services.py             # SubmissionService, ApprovalService,
│   │   │                           # TransitionService, ThreadComputer
│   │   ├── state_machine.py        # ExpenseStateMachine (20+ states)
│   │   ├── urls.py
│   │   ├── tasks.py                # Celery tasks (anomaly check, SLA)
│   │   └── tests/
│   │
│   ├── invoices/                   # Sales invoice management
│   │   ├── models.py               # Invoice, InvoiceLineItem, CreditNote,
│   │   │                           # Dispute, DunningEvent, Receipt, BankStatement
│   │   ├── serializers.py
│   │   ├── views.py                # InvoiceViewSet, DunningViewSet,
│   │   │                           # ReconcileViewSet, DisputeViewSet, CNViewSet
│   │   ├── services.py             # InvoiceCreationService, TemplateRenderer,
│   │   │                           # EInvoiceService, DunningEngine,
│   │   │                           # ReconciliationService, BankMatchService
│   │   ├── state_machine.py        # InvoiceStateMachine
│   │   ├── templates/              # PDF templates per service line
│   │   │   ├── saas.html
│   │   │   ├── aaas.html
│   │   │   ├── transport.html
│   │   │   └── warehouse.html
│   │   ├── urls.py
│   │   ├── tasks.py                # Celery tasks (dunning beat, recon)
│   │   └── tests/
│   │
│   ├── approvals/                  # Generic approval engine
│   │   ├── models.py               # ApprovalChain, ChainStep, Decision, Query
│   │   ├── engine.py               # ApprovalEngine (init, advance, query, reject)
│   │   ├── sod.py                  # 8 hard-coded SoD rules
│   │   ├── templates.py            # Chain templates (expense_6_step, etc.)
│   │   ├── urls.py
│   │   └── tests/
│   │
│   ├── ocr/                        # OCR pipeline
│   │   ├── models.py               # OcrTask, OcrResult
│   │   ├── views.py                # Trigger OCR, poll result
│   │   ├── services.py             # OCR pipeline (detect, convert, extract)
│   │   ├── tasks.py                # Celery OCR task
│   │   ├── urls.py
│   │   └── tests/
│   │
│   ├── anomaly/                    # Anomaly detection
│   │   ├── models.py               # AnomalyResult, AnomalySignal
│   │   ├── rules.py                # 8 rule-based checks
│   │   ├── ml.py                   # Isolation Forest wrapper
│   │   ├── services.py             # AnomalyService (rules + ML combine)
│   │   ├── tasks.py                # Celery anomaly task + nightly retrain
│   │   └── tests/
│   │
│   ├── notifications/              # Multi-channel notifications
│   │   ├── models.py               # Notification, NotificationTemplate
│   │   ├── dispatcher.py           # NotificationDispatcher
│   │   ├── channels.py             # EmailChannel, InAppChannel
│   │   ├── tasks.py                # Celery email/SMS/Slack tasks
│   │   ├── urls.py                 # In-app notification list/mark-read
│   │   └── tests/
│   │
│   ├── mock_d365/                  # Mock D365 Business Central
│   │   ├── models.py               # MockPurchaseInvoice, MockSalesInvoice
│   │   ├── views.py                # OData-like endpoints
│   │   ├── webhook_sim.py          # Simulates D365 webhooks (5s delay)
│   │   ├── urls.py
│   │   └── tests/
│   │
│   └── d365_adapter/               # D365 integration layer
│       ├── interface.py            # Abstract D365Adapter
│       ├── mock_client.py          # MockD365Client → calls mock_d365 app
│       ├── bc_client.py            # BCODataClient → calls real BC (Phase 2)
│       ├── field_mapping.py        # Domain → D365 schema mapping
│       └── tests/
│
├── services/                       # Cross-cutting services (not Django apps)
│   ├── __init__.py
│   ├── storage.py                  # S3/MinIO client wrapper
│   └── masking.py                  # MaskingMiddleware (PII tokenization)
│
├── templates/                      # Django templates (emails, PDFs)
│   ├── emails/
│   │   ├── bill_submitted.html
│   │   ├── bill_approved.html
│   │   ├── bill_rejected.html
│   │   ├── query_raised.html
│   │   └── payment_confirmation.html
│   └── pdf/
│       ├── remittance_advice.html
│       └── invoice/
│           ├── saas.html
│           ├── aaas.html
│           ├── transport.html
│           └── warehouse.html
│
├── static/                         # Static files (if needed)
├── media/                          # User uploads (dev only)
│
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
│
├── docker/
│   ├── Dockerfile                  # Multi-stage Django Dockerfile
│   ├── Dockerfile.frontend         # React build
│   └── nginx/
│       └── nginx.conf              # Reverse proxy config
│
├── docker-compose.yml              # Full stack: web + worker + beat + db + redis + minio + nginx
├── Makefile                        # make up, make migrate, make seed, make test
├── .env.example
├── .gitignore
└── README.md
```

---

## 2.4 Frontend Project Structure

```
frontend/                           # React SPA root
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root with router
│   │
│   ├── api/                        # API client layer
│   │   ├── client.ts               # Axios instance + JWT interceptor
│   │   ├── auth.ts                 # Login, logout, refresh
│   │   ├── expenses.ts             # Expense API calls
│   │   ├── invoices.ts             # Invoice API calls
│   │   ├── vendors.ts
│   │   └── notifications.ts
│   │
│   ├── hooks/                      # React Query hooks
│   │   ├── useAuth.ts
│   │   ├── useExpenses.ts
│   │   ├── useInvoices.ts
│   │   ├── useNotifications.ts
│   │   └── useApprovalQueue.ts
│   │
│   ├── stores/                     # Zustand stores
│   │   ├── authStore.ts            # Auth state + JWT tokens
│   │   ├── uiStore.ts              # Sidebar, theme, modals
│   │   └── notificationStore.ts
│   │
│   ├── components/                 # Shared UI components
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Breadcrumb.tsx
│   │   ├── data/
│   │   │   ├── DataTable.tsx       # TanStack Table wrapper
│   │   │   ├── KPICard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── CurrencyDisplay.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── forms/
│   │   │   ├── FileUpload.tsx
│   │   │   ├── ApprovalActions.tsx
│   │   │   └── CommentThread.tsx
│   │   └── feedback/
│   │       ├── LoadingState.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── pages/                      # Route pages
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── vendor/                 # Vendor portal pages
│   │   │   ├── BillSubmitPage.tsx
│   │   │   ├── BillListPage.tsx
│   │   │   ├── BillDetailPage.tsx
│   │   │   └── VendorProfilePage.tsx
│   │   ├── employee/               # Employee (L1) pages
│   │   │   ├── OnBehalfPage.tsx
│   │   │   ├── ValidationQueuePage.tsx
│   │   │   └── BillDetailPage.tsx
│   │   ├── finance/                # Finance pages
│   │   │   ├── ApprovalQueuePage.tsx
│   │   │   ├── BillDetailPage.tsx
│   │   │   ├── InvoiceListPage.tsx
│   │   │   ├── InvoiceCreatePage.tsx
│   │   │   ├── InvoiceDetailPage.tsx
│   │   │   └── ReconciliationPage.tsx
│   │   ├── admin/
│   │   │   ├── UserManagementPage.tsx
│   │   │   ├── VendorOnboardingPage.tsx
│   │   │   └── ApprovalConfigPage.tsx
│   │   ├── audit/
│   │   │   ├── AuditLogPage.tsx
│   │   │   └── AccessLogPage.tsx
│   │   └── reports/
│   │       ├── ReportHubPage.tsx
│   │       └── CFODashboardPage.tsx
│   │
│   ├── routes/
│   │   ├── index.tsx               # Route definitions
│   │   ├── ProtectedRoute.tsx      # Auth guard
│   │   └── RoleRoute.tsx           # Role-based guard
│   │
│   ├── lib/
│   │   ├── utils.ts                # cn(), formatCurrency(), etc.
│   │   └── constants.ts            # Status colors, role names
│   │
│   └── types/
│       ├── expense.ts
│       ├── invoice.ts
│       ├── vendor.ts
│       ├── auth.ts
│       └── common.ts
│
├── public/
│   └── favicon.svg
└── .env.example
```

---

## 2.5 Data Flow: Bill Submission to Payment

```
1. Vendor logs into portal (JWT)
2. Uploads invoice PDF
   → PDF stored in MinIO via FileService (SHA256 dedupe)
   → FileRef row created in PostgreSQL
3. Triggers OCR
   → Celery task enqueued
   → OCR Worker fetches PDF from MinIO
   → Masking middleware strips PII
   → Claude Vision API called with masked context
   → Results unmasked and stored as OcrTask
   → Frontend polls for completion
4. Vendor reviews auto-filled form, submits
   → Server validates fields + uniqueness
   → Expense created (status=SUBMITTED)
   → AuditLog entry written
   → Anomaly task enqueued
5. Anomaly Worker runs
   → 8 rule-based checks + Isolation Forest ML
   → If hard duplicate → AUTO_REJECT (terminal)
   → If clean/low → status=PENDING_L1, notify L1
6. L1 reviews PDF + data + vendor history
   → Approves → status=PENDING_L2, notify L2
   → Or rejects/raises query
7. Chain continues: L2 → HoD → Fin L1 → Fin L2 → Fin Head
   → Each step: SoD check → state transition → audit → notify
8. CFO clicks "Book in D365"
   → D365Adapter.create_purchase_invoice(payload)
   → Mock D365 returns 201 + document_no
   → Status=BOOKED_D365
9. Mock D365 fires webhook (5s later)
   → Status=POSTED_D365
10. Payment webhook
    → Status=PAID, UTR recorded
    → Full thread + vendor notified
```

---

## 2.6 Trust Boundaries & PII Masking

### Trust Boundary Zones

| Zone | What's Inside | Security Level |
|------|--------------|----------------|
| **3SC Internal Network** | Django, PostgreSQL, Redis, MinIO, all raw data | Full access to PII |
| **External 3rd Parties** | Claude API, Email SMTP, SMS Gateway | PII-masked data only |
| **Statutory APIs** | D365 BC, GST Portal, Bank API | Encrypted (TLS/mTLS), PII in transit |
| **Client Access** | Vendor browsers, employee browsers | JWT-authenticated, role-filtered |

### PII Masking Matrix

| Field | In Database | Sent to Claude | Sent to D365 | In Email | In SMS |
|-------|------------|----------------|--------------|----------|--------|
| Vendor legal name | Plaintext | `vendor_token_x7f` | Plaintext (TLS) | Plaintext | Initials |
| Vendor GSTIN | Plaintext | `gstin_token` | Plaintext | Last 4 only | Never |
| Vendor PAN | Plaintext | Not sent | Plaintext | Not sent | Never |
| Bank account number | **Encrypted** | Not sent | Plaintext | Last 4 only | Never |
| Invoice amount | Plaintext | `amount_bucket_50k_100k` | Plaintext | Plaintext | Bucket |
| Employee name | Plaintext | `emp_token` | Plaintext | First name | Never |
| Employee email | Plaintext | Not sent | Plaintext | Plaintext | Never |
| Internal notes | Plaintext | Not sent | Not sent | Never | Never |

The **masking middleware** is the single chokepoint for all data leaving 3SC → Claude. No service may bypass it.

---

## 2.7 Docker Compose Stack

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: financeai
      POSTGRES_USER: financeai
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: financeai
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  web:
    build:
      context: .
      dockerfile: docker/Dockerfile
    command: >
      gunicorn config.wsgi:application
      --bind 0.0.0.0:8000
      --workers 4
      --timeout 120
    environment:
      - DATABASE_URL=postgresql://financeai:${DB_PASSWORD}@db:5432/financeai
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio:9000
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    depends_on:
      - db
      - redis
      - minio

  celery_worker:
    build:
      context: .
      dockerfile: docker/Dockerfile
    command: >
      celery -A config.celery worker
      -l info
      -Q default,ocr,anomaly,notifications
      --concurrency=4
    depends_on:
      - db
      - redis

  celery_beat:
    build:
      context: .
      dockerfile: docker/Dockerfile
    command: celery -A config.celery beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/Dockerfile.frontend
    volumes:
      - frontend_build:/app/dist

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - frontend_build:/usr/share/nginx/html
    depends_on:
      - web
      - frontend

volumes:
  postgres_data:
  minio_data:
  frontend_build:
```

---

## 2.8 Target Production Architecture (Phase 2+)

| Layer | Hackathon | Target | Why |
|-------|-----------|--------|-----|
| Hosting | Docker Compose | Kubernetes (EKS/AKS) | HA, auto-scaling |
| DB | Single Postgres | PG HA + 2 read replicas | Reliability, read scale |
| Storage | MinIO local | AWS S3 + CloudFront | Production scale |
| Auth | Email+password / JWT | Azure AD SSO + MFA + magic link | Enterprise-grade |
| D365 | Mock Django app | Real BC OData v4 | Production accounting |
| Analytics | None | ClickHouse + Debezium CDC | OLAP separate from OLTP |
| BI | None | Power BI + Metabase | CFO dashboards |
| Email | Mailtrap | AWS SES | Production volume |
| Observability | Console logs | Prometheus + Grafana + Loki + Sentry | Production ops |
| Secrets | .env files | HashiCorp Vault | Compliance |

### Migration Path (No Rewrites)

1. `mock_d365` → real BC: same `d365_adapter` interface, change base URL
2. MinIO → S3: same `boto3` API, change endpoint
3. Mailtrap → SES: Django email backend swap
4. Single Postgres → HA: standard managed RDS migration
5. Single Django → multi-pod: stateless already, just deploy
6. Add ClickHouse: Debezium watches Postgres, no app code change
