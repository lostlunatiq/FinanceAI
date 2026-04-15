# Phase 3 — Integration & Vendor Management (Days 13–15)

## Goal
Wire up vendor management, refine D365/OCR/anomaly, cross-module integration testing.

---

## Day 13: Vendor Management Module

### Step 13.1 — Vendor Onboarding
- Admin creates vendor: legal name, GSTIN, PAN, bank, category
- GSTIN validation (mock or real)
- Vendor status: PENDING_KYC → ACTIVE
- 2-step approval chain: Admin → CFO
- On approval: create vendor user account (email + temporary password)
- Seed L1 mapping (Admin assigns)

### Step 13.2 — Bank Account Change Flow
```python
class BankChangeService:
    def request_change(self, vendor, new_bank_data, requested_by):
        # Create pending bank account
        new_account = VendorBankAccount.objects.create(
            vendor=vendor, is_primary=False, is_verified=False,
            change_requested_at=timezone.now(), **new_bank_data
        )
        # Start 3-step approval: Vendor → 48h cooling → CFO verify
        # Hold all pending payments to this vendor
        vendor.payment_hold = True
        vendor.save()
        AuditWriter.log('vendor.bank_change_requested', ...)
        NotificationDispatcher().send(cfo, 'vendor.bank_change_request', ...)
    
    def approve_change(self, vendor, new_account, approved_by):
        # Check 48h cooling period passed
        if timezone.now() - new_account.change_requested_at < timedelta(hours=48):
            raise ValidationError("48-hour cooling period not elapsed")
        # Deactivate old primary
        vendor.bank_accounts.filter(is_primary=True).update(is_primary=False)
        new_account.is_primary = True
        new_account.is_verified = True
        new_account.verified_at = timezone.now()
        new_account.change_approved_by = approved_by
        new_account.save()
        # Resume payments
        vendor.payment_hold = False
        vendor.save()
```

### Step 13.3 — Vendor Admin Frontend
- `/admin/vendors` → Vendor list (CRUD)
- `/admin/vendors/create` → Onboarding form
- `/admin/vendors/{id}` → Vendor detail with:
  - KYC status
  - Bank accounts (current + history)
  - L1 mapping management
  - Bill history (linked to expense module)
  - Performance score (avg processing time, rejection rate)

### Step 13.4 — L1 Mapping Admin
- Admin assigns L1 employees to vendors
- Auto-routing: when vendor submits bill, assigned L1 gets it
- Backup L1 configuration

**Exit**: Admin onboards vendor → vendor gets account → submits bills → payment hold on bank change.

---

## Day 14: D365 + OCR Refinement

### Step 14.1 — D365 Adapter Refinement
- Field mapping: expense domain → D365 purchase invoice schema
- Invoice field mapping: invoice domain → D365 sales invoice schema
- Idempotency key on every request (UUID generated at call time)
- Webhook HMAC signature verification
- Retry logic: exponential backoff, max 3 attempts, DLQ

```python
class WebhookView(APIView):
    def post(self, request):
        # Verify HMAC
        signature = request.headers.get('X-D365-Signature')
        expected = hmac.new(settings.D365_WEBHOOK_SECRET.encode(),
                           request.body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            AuditWriter.log('webhook.auth_failed', ...)
            return Response(status=401)
        
        # Idempotency
        idem_key = request.data.get('idempotency_key')
        if WebhookEvent.objects.filter(idempotency_key=idem_key).exists():
            return Response(status=200)  # Already processed
        
        # Process
        event_type = request.data['event_type']
        if event_type == 'posted':
            expense = Expense.objects.get(d365_doc_no=request.data['document_no'])
            StateMachineEngine().transition_to(expense, 'POSTED_D365', ...)
        elif event_type == 'paid':
            expense = Expense.objects.get(d365_doc_no=request.data['document_no'])
            expense.payment_utr = request.data.get('utr', '')
            expense.save()
            StateMachineEngine().transition_to(expense, 'PAID', ...)
        
        WebhookEvent.objects.create(idempotency_key=idem_key, ...)
        return Response(status=200)
```

### Step 14.2 — OCR Refinement
- Support PDF / JPG / PNG detection
- PDF: render first page to image (using Pillow or pdf2image)
- Auto-rotate rotated images (EXIF orientation)
- Low DPI warning (< 1000px width)
- Extraction prompt with structured output schema
- Per-field confidence threshold (0.85)
- Frontend: amber highlight for low-confidence fields, edit in place

### Step 14.3 — OCR Graceful UI
When OCR is unavailable (no API key):
- Upload still works (file stored in MinIO)
- Form shows all fields empty with message: "OCR unavailable — please fill manually"
- No error, no blocking — smooth manual workflow

**Exit**: D365 webhooks process correctly. OCR handles multiple formats. Everything works without API keys.

---

## Day 15: Anomaly Refinement + Cross-Module Testing

### Step 15.1 — Anomaly Rule Refinement
Test each of the 8 rules with seed data:
1. Create duplicate bill → verify AUTO_REJECT
2. Change vendor bank → submit bill next day → verify HIGH flag
3. Submit bill at 3 AM → verify LOW flag
4. Submit round amount (₹50,000.00) + new vendor → verify MEDIUM flag
5. Submit amount just under threshold → verify flag
6. Vendor GSTIN suspended → verify HIGH flag

### Step 15.2 — Override UX
- Anomaly badge on bill detail (color-coded)
- Click to expand: list of signals with weights + details
- Override button: only if severity HIGH/CRITICAL
- Override dialog: reason (min 50 chars) + checkbox confirmation
- Override creates audit log entry + marks anomaly result
- Downstream approvers see yellow warning: "Anomaly overridden by {name}"

### Step 15.3 — Cross-Module Integration Testing
Test complete flows:
1. **Vendor bill e2e**: vendor submits → OCR → anomaly → 6-step → D365 → PAID
2. **On-behalf e2e**: L1 files → SoD check → backup L1 routing → chain → PAID
3. **Rejection broadcast**: reject at Fin L1 → verify only thread members notified
4. **Query loop**: Fin L1 queries → vendor responds → Fin L1 queries again → reject
5. **Invoice e2e**: create → send → overdue → Stage 1 → client pays → PAID
6. **Dispute e2e**: client disputes → dunning paused → resolve → CN issued
7. **Bank recon e2e**: upload statement → auto-match → partial pay → full pay

### Step 15.4 — SoD Verification
Test each of 8 SoD rules:
1. Vendor tries to approve own bill → 403
2. L1 tries to approve at L2 after approving at L1 → 403
3. Admin tries to approve expense → 403
4. Filer-on-behalf is assigned L1 → auto-routes to backup → verify
5. CFO submits own expense → CFO cannot Fin Head approve → 403

**Exit**: All cross-module flows work. All SoD rules enforced. All edge cases handled.
