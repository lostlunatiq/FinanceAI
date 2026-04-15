# 03 — Data Models (Django ORM)

## 3.1 Overview

All models are Django ORM classes using PostgreSQL 16. Key design patterns:
- **Version field** on all stateful models (optimistic locking)
- **AuditLog** with hash-chaining (immutable, append-only)
- **FileRef** with SHA256 deduplication
- **JSONB** for OCR payloads, anomaly signals, flexible metadata
- **Soft delete** not used — all deletions are state transitions (CANCELLED, SUSPENDED)

---

## 3.2 Core App Models

### User & Auth

```python
# apps/accounts/models.py

class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    head = models.ForeignKey('User', null=True, on_delete=models.SET_NULL,
                             related_name='headed_departments')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class UserRole(models.TextChoices):
    VENDOR = 'VENDOR', 'Vendor'
    EMP_L1 = 'EMP_L1', 'Employee L1'
    EMP_L2 = 'EMP_L2', 'Employee L2'
    HOD = 'HOD', 'Department Head'
    FIN_L1 = 'FIN_L1', 'Finance L1'
    FIN_L2 = 'FIN_L2', 'Finance L2'
    CFO = 'CFO', 'CFO / Finance Head'
    CEO = 'CEO', 'CEO'
    ADMIN = 'ADMIN', 'Admin'
    AUDITOR = 'AUDITOR', 'Internal Auditor'
    EXTERNAL_CA = 'EXTERNAL_CA', 'External CA'


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid4)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=UserRole.choices)
    department = models.ForeignKey(Department, null=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Vendor-specific (null for internal users)
    vendor = models.ForeignKey('vendors.Vendor', null=True, blank=True,
                               on_delete=models.SET_NULL, related_name='users')

    # Delegation
    delegate = models.ForeignKey('self', null=True, blank=True,
                                 on_delete=models.SET_NULL,
                                 related_name='delegated_from')
    delegate_start = models.DateTimeField(null=True, blank=True)
    delegate_end = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']

    class Meta:
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['department']),
            models.Index(fields=['vendor']),
        ]
```

### AuditLog (Hash-Chained, Immutable)

```python
# apps/core/models.py

class AuditLog(models.Model):
    """
    Append-only, hash-chained audit log.
    DB trigger: only INSERT allowed — no UPDATE/DELETE.
    """
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # Actor
    actor_id = models.UUIDField(db_index=True)    # User UUID or 'SYSTEM'
    actor_role = models.CharField(max_length=20)
    actor_ip = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(blank=True, default='')
    session_id = models.CharField(max_length=100, blank=True, default='')
    request_id = models.CharField(max_length=100, blank=True, default='')

    # Target
    action = models.CharField(max_length=100, db_index=True)  # e.g. 'expense.approved_l1'
    target_type = models.CharField(max_length=50, db_index=True)
    target_id = models.UUIDField(db_index=True)

    # Snapshots
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True, default='')
    metadata = models.JSONField(null=True, blank=True)

    # Hash chain
    prev_hash = models.CharField(max_length=64, blank=True, default='')
    entry_hash = models.CharField(max_length=64)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['actor_id', 'created_at']),
            models.Index(fields=['action']),
        ]
        # Partition by month for archival (managed via raw SQL migration)
```

### FileRef (SHA256 Deduplicated)

```python
class FileRef(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    sha256 = models.CharField(max_length=64, unique=True)
    bucket = models.CharField(max_length=50)      # 'bills', 'invoices', 'evidence', 'exports'
    key = models.CharField(max_length=500)
    size_bytes = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    original_filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    storage_class = models.CharField(max_length=20, default='HOT')  # HOT, WARM, COLD
    archive_after = models.DateField(null=True)
    delete_after = models.DateField(null=True)
```

---

## 3.3 Vendor Models

```python
# apps/vendors/models.py

class VendorStatus(models.TextChoices):
    PENDING_KYC = 'PENDING_KYC'
    ACTIVE = 'ACTIVE'
    SUSPENDED = 'SUSPENDED'
    BLACKLISTED = 'BLACKLISTED'


class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    legal_name = models.CharField(max_length=255)
    trade_name = models.CharField(max_length=255, blank=True)
    gstin = models.CharField(max_length=15, unique=True)
    pan = models.CharField(max_length=10, unique=True)
    vendor_type = models.CharField(max_length=50)   # Service, Supply, Contractor
    category = models.CharField(max_length=100)

    # Contact
    primary_email = models.EmailField()
    primary_phone = models.CharField(max_length=20, blank=True)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)

    # Status
    status = models.CharField(max_length=20, choices=VendorStatus.choices,
                              default=VendorStatus.PENDING_KYC)
    version = models.PositiveIntegerField(default=1)

    # MSME
    is_msme = models.BooleanField(default=False)
    msme_registration_no = models.CharField(max_length=50, blank=True)

    # D365
    d365_vendor_no = models.CharField(max_length=50, blank=True)

    # Metadata
    onboarded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['gstin']),
            models.Index(fields=['status']),
        ]


class VendorBankAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='bank_accounts')
    account_number_encrypted = models.TextField()   # Encrypted at rest
    ifsc_code = models.CharField(max_length=11)
    bank_name = models.CharField(max_length=100)
    branch_name = models.CharField(max_length=100, blank=True)
    is_primary = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True)
    change_requested_at = models.DateTimeField(null=True)
    change_approved_at = models.DateTimeField(null=True)
    change_approved_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)


class VendorL1Mapping(models.Model):
    """Maps which Employee L1 is responsible for which vendor."""
    id = models.UUIDField(primary_key=True, default=uuid4)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='l1_mappings')
    l1_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vendor_mappings')
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                    related_name='assigned_mappings')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['vendor', 'l1_user']
```

---

## 3.4 Expense Models

```python
# apps/expenses/models.py

class ExpenseStatus(models.TextChoices):
    DRAFT = 'DRAFT'
    SUBMITTED = 'SUBMITTED'
    AUTO_REJECT = 'AUTO_REJECT'
    WITHDRAWN = 'WITHDRAWN'
    PENDING_L1 = 'PENDING_L1'
    QUERY_L1 = 'QUERY_L1'
    PENDING_L2 = 'PENDING_L2'
    QUERY_L2 = 'QUERY_L2'
    PENDING_HOD = 'PENDING_HOD'
    QUERY_HOD = 'QUERY_HOD'
    PENDING_FIN_L1 = 'PENDING_FIN_L1'
    QUERY_FIN_L1 = 'QUERY_FIN_L1'
    PENDING_FIN_L2 = 'PENDING_FIN_L2'
    QUERY_FIN_L2 = 'QUERY_FIN_L2'
    PENDING_FIN_HEAD = 'PENDING_FIN_HEAD'
    QUERY_FIN_HEAD = 'QUERY_FIN_HEAD'
    APPROVED = 'APPROVED'
    PENDING_D365 = 'PENDING_D365'
    BOOKED_D365 = 'BOOKED_D365'
    POSTED_D365 = 'POSTED_D365'
    PAID = 'PAID'
    REJECTED = 'REJECTED'
    EXPIRED = 'EXPIRED'


class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    ref_no = models.CharField(max_length=20, unique=True)  # BILL-2026-0042

    # Parties
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.PROTECT,
                               related_name='expenses')
    submitted_by = models.ForeignKey(User, on_delete=models.PROTECT,
                                     related_name='submitted_expenses')
    filer_on_behalf = models.ForeignKey(User, null=True, blank=True,
                                        on_delete=models.SET_NULL,
                                        related_name='on_behalf_expenses')
    is_on_behalf = models.BooleanField(default=False)
    assigned_l1 = models.ForeignKey(User, on_delete=models.PROTECT,
                                    related_name='assigned_expenses')
    department = models.ForeignKey('accounts.Department', on_delete=models.PROTECT)

    # Financial
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField()
    amount_pre_gst = models.DecimalField(max_digits=15, decimal_places=2)
    gst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tds_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    description = models.TextField(blank=True)
    business_purpose = models.TextField(blank=True)

    # Category & GL
    category = models.CharField(max_length=100, blank=True)
    gl_account = models.CharField(max_length=20, blank=True)
    cost_center = models.CharField(max_length=20, blank=True)
    po_reference = models.CharField(max_length=50, blank=True)

    # Status & state machine
    status = models.CharField(max_length=20, choices=ExpenseStatus.choices,
                              default=ExpenseStatus.DRAFT)
    version = models.PositiveIntegerField(default=1)

    # Files
    invoice_file = models.ForeignKey('core.FileRef', null=True, on_delete=models.SET_NULL,
                                     related_name='expense_invoices')
    evidence_files = models.ManyToManyField('core.FileRef', blank=True,
                                           related_name='expense_evidence')

    # OCR & Anomaly links
    ocr_task = models.ForeignKey('ocr.OcrTask', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    anomaly_result = models.ForeignKey('anomaly.AnomalyResult', null=True, blank=True,
                                       on_delete=models.SET_NULL)
    anomaly_severity = models.CharField(max_length=20, blank=True, default='')

    # D365
    d365_doc_no = models.CharField(max_length=50, blank=True)
    d365_booked_at = models.DateTimeField(null=True)
    d365_posted_at = models.DateTimeField(null=True)
    payment_utr = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField(null=True)

    # Resubmission
    replaces_bill = models.ForeignKey('self', null=True, blank=True,
                                      on_delete=models.SET_NULL,
                                      related_name='replacement_bills')

    # Timestamps
    submitted_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['vendor', 'status']),
            models.Index(fields=['assigned_l1', 'status']),
            models.Index(fields=['submitted_by']),
            models.Index(fields=['department']),
            models.Index(fields=['ref_no']),
        ]


class ExpenseApprovalStep(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE,
                                related_name='approval_steps')
    step_order = models.PositiveSmallIntegerField()  # 1=L1, 2=L2, 3=HoD, 4=FinL1, 5=FinL2, 6=FinHead
    step_name = models.CharField(max_length=50)       # 'L1', 'L2', 'HoD', 'FIN_L1', etc.
    required_role = models.CharField(max_length=20)
    assigned_to = models.ForeignKey(User, on_delete=models.PROTECT,
                                    related_name='assigned_approval_steps')
    actual_actor = models.ForeignKey(User, null=True, on_delete=models.SET_NULL,
                                     related_name='acted_approval_steps')
    decision = models.CharField(max_length=20, blank=True)  # 'APPROVED', 'REJECTED', 'SKIPPED'
    reason = models.TextField(blank=True)
    decided_at = models.DateTimeField(null=True)
    sla_deadline = models.DateTimeField()  # 48h from assignment
    is_anomaly_override = models.BooleanField(default=False)
    override_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['step_order']
        unique_together = ['expense', 'step_order']


class ExpenseQuery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE,
                                related_name='queries')
    raised_by = models.ForeignKey(User, on_delete=models.PROTECT,
                                  related_name='raised_queries')
    raised_at_step = models.CharField(max_length=50)
    message = models.TextField()
    attachments = models.ManyToManyField('core.FileRef', blank=True)
    # Response
    responded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL,
                                     related_name='responded_queries')
    response_message = models.TextField(blank=True)
    response_attachments = models.ManyToManyField('core.FileRef', blank=True,
                                                   related_name='query_responses')
    responded_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class BackupApproverConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    role = models.CharField(max_length=20)
    department = models.ForeignKey('accounts.Department', null=True,
                                   on_delete=models.CASCADE)
    primary_user = models.ForeignKey(User, on_delete=models.CASCADE,
                                     related_name='backup_for')
    backup_user = models.ForeignKey(User, on_delete=models.CASCADE,
                                    related_name='backup_of')
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['role', 'department', 'primary_user']
```

---

## 3.5 Invoice Models

```python
# apps/invoices/models.py

class ServiceLine(models.TextChoices):
    SAAS = 'SAAS', 'SaaS'
    AAAS = 'AAAS', 'Analytics as a Service'
    TRANSPORT = 'TRANSPORT', 'Transport'
    WAREHOUSE = 'WAREHOUSE', 'Warehouse'


class InvoiceStatus(models.TextChoices):
    DRAFT = 'DRAFT'
    SENT = 'SENT'
    VIEWED = 'VIEWED'
    PARTIAL_PAID = 'PARTIAL_PAID'
    PAID = 'PAID'
    OVERDUE = 'OVERDUE'
    STAGE_1 = 'STAGE_1'       # Day +1 friendly reminder
    STAGE_2 = 'STAGE_2'       # Day +7 firm notice
    STAGE_3 = 'STAGE_3'       # Day +15 formal escalation
    LEGAL_REFERRAL = 'LEGAL_REFERRAL'  # Day +30
    BAD_DEBT = 'BAD_DEBT'
    DISPUTED = 'DISPUTED'
    CREDIT_NOTED = 'CREDIT_NOTED'
    CANCELLED = 'CANCELLED'


class Client(models.Model):
    """Clients to whom 3SC issues sales invoices."""
    id = models.UUIDField(primary_key=True, default=uuid4)
    legal_name = models.CharField(max_length=255)
    trade_name = models.CharField(max_length=255, blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    tds_section = models.CharField(max_length=20, blank=True)  # 194C, 194J, etc.
    annual_turnover = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    billing_email = models.EmailField()
    billing_address = models.TextField(blank=True)
    payment_terms_days = models.PositiveIntegerField(default=30)
    state_code = models.CharField(max_length=2, blank=True)  # For GST Place of Supply
    currency = models.CharField(max_length=3, default='INR')
    d365_customer_no = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    ref_no = models.CharField(max_length=20, unique=True)  # INV-2026-0098
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='invoices')
    service_line = models.CharField(max_length=20, choices=ServiceLine.choices)

    # Dates
    invoice_date = models.DateField()
    due_date = models.DateField()

    # Amounts
    pre_gst_amount = models.DecimalField(max_digits=15, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=15, decimal_places=2)
    tds_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    balance_due = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, default=1)

    # GST
    sac_code = models.CharField(max_length=8, blank=True)
    place_of_supply = models.CharField(max_length=2, blank=True)  # State code
    is_inter_state = models.BooleanField(default=False)

    # E-Invoice
    irn = models.CharField(max_length=100, blank=True)
    irn_generated_at = models.DateTimeField(null=True)
    qr_code_data = models.TextField(blank=True)

    # Status
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices,
                              default=InvoiceStatus.DRAFT)
    version = models.PositiveIntegerField(default=1)

    # Files
    pdf_file = models.ForeignKey('core.FileRef', null=True, on_delete=models.SET_NULL)

    # D365
    d365_doc_no = models.CharField(max_length=50, blank=True)

    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    sent_at = models.DateTimeField(null=True)
    viewed_at = models.DateTimeField(null=True)
    paid_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['ref_no']),
        ]


class InvoiceLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE,
                                related_name='line_items')
    description = models.TextField()
    sac_code = models.CharField(max_length=8, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    # Service-line specific fields in JSONB
    metadata = models.JSONField(null=True, blank=True)
    # e.g. SaaS: {seat_count, period_start, period_end, mrr}
    # Transport: {shipment_ids, route, freight_type}


class CreditNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    ref_no = models.CharField(max_length=20, unique=True)  # CN-2026-0005
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='credit_notes')
    reason = models.TextField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    gst_reversal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='DRAFT')  # DRAFT, APPROVED, ISSUED
    issued_by = models.ForeignKey(User, on_delete=models.PROTECT)
    approved_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL,
                                    related_name='approved_credit_notes')
    pdf_file = models.ForeignKey('core.FileRef', null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)


class DunningEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='dunning_events')
    stage = models.PositiveSmallIntegerField()  # 1, 2, 3, 4(legal)
    sent_at = models.DateTimeField(auto_now_add=True)
    sent_to = models.EmailField()
    cc_emails = models.JSONField(default=list)
    email_template = models.CharField(max_length=50)
    delivery_status = models.CharField(max_length=20, default='SENT')


class Dispute(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='disputes')
    raised_by_email = models.EmailField()  # Client email
    reason = models.TextField()
    status = models.CharField(max_length=20, default='OPEN')  # OPEN, RESOLVED, CN_ISSUED
    resolved_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    resolution_note = models.TextField(blank=True)
    credit_note = models.ForeignKey(CreditNote, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True)


class Receipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='receipts')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    utr_number = models.CharField(max_length=100, blank=True)
    payment_mode = models.CharField(max_length=20, default='NEFT')
    received_date = models.DateField()
    bank_statement = models.ForeignKey('BankStatement', null=True, on_delete=models.SET_NULL)
    is_auto_matched = models.BooleanField(default=False)
    matched_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)


class BankStatement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    file_ref = models.ForeignKey('core.FileRef', on_delete=models.PROTECT)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    bank_name = models.CharField(max_length=100)
    account_last4 = models.CharField(max_length=4)
    statement_date = models.DateField()
    total_credits = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_debits = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    rows_parsed = models.PositiveIntegerField(default=0)
    rows_matched = models.PositiveIntegerField(default=0)
    rows_unmatched = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 3.6 OCR & Anomaly Models

```python
# apps/ocr/models.py

class OcrTaskStatus(models.TextChoices):
    PENDING = 'PENDING'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    SKIPPED = 'SKIPPED'   # When Claude API key not configured


class OcrTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    file_ref = models.ForeignKey('core.FileRef', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=OcrTaskStatus.choices,
                              default=OcrTaskStatus.PENDING)
    result = models.JSONField(null=True, blank=True)
    # Result schema: {field_name: {value: ..., confidence: 0.0-1.0}}
    confidence_avg = models.FloatField(null=True)
    error_message = models.TextField(blank=True)
    processing_time_ms = models.PositiveIntegerField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True)


# apps/anomaly/models.py

class AnomalySeverity(models.TextChoices):
    NONE = 'NONE'
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    CRITICAL = 'CRITICAL'   # Hard duplicate → auto-reject


class AnomalyResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    target_type = models.CharField(max_length=50)  # 'expense', 'invoice'
    target_id = models.UUIDField()
    severity = models.CharField(max_length=20, choices=AnomalySeverity.choices)
    total_score = models.PositiveIntegerField(default=0)
    signals = models.JSONField(default=list)
    # [{name: 'hard_duplicate', weight: 100, detail: '...'},
    #  {name: 'amount_deviation', weight: 40, detail: 'z=2.8'}]
    ml_score = models.FloatField(null=True)  # Isolation Forest score
    is_overridden = models.BooleanField(default=False)
    overridden_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    override_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 3.7 Notification Models

```python
# apps/notifications/models.py

class NotificationChannel(models.TextChoices):
    EMAIL = 'EMAIL'
    IN_APP = 'IN_APP'
    SMS = 'SMS'      # Phase 2
    SLACK = 'SLACK'  # Phase 2


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE,
                                  related_name='notifications')
    channel = models.CharField(max_length=10, choices=NotificationChannel.choices)
    template_key = models.CharField(max_length=50)  # 'bill.submitted_ack'
    title = models.CharField(max_length=255)
    body = models.TextField()
    target_type = models.CharField(max_length=50, blank=True)
    target_id = models.UUIDField(null=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True)
    delivery_status = models.CharField(max_length=20, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]
```

---

## 3.8 Seed Data Strategy

### MVP Seed Script (`manage.py seed_demo`)

```python
# Creates:
# 1. Users: 1 per role (vendor, emp_l1, emp_l2, hod, fin_l1, fin_l2, cfo, admin)
# 2. Departments: Engineering, Finance, Operations
# 3. Vendors: 5 vendors with bank accounts
# 4. VendorL1Mappings: Each vendor → L1 employee
# 5. BackupApproverConfigs: HoD → backup HoD
# 6. Sample expenses: 3 in various states (DRAFT, PENDING_L1, APPROVED)
# 7. Sample invoices: 2 in various states (DRAFT, SENT)
# 8. Sample clients: 3 clients
# All passwords: "hackathon2026"
```

---

## 3.9 Graceful Degradation

All external dependencies have fallbacks for MVP:

| Dependency | If Not Configured | Fallback |
|-----------|-------------------|----------|
| Claude API key | OCR task status → SKIPPED | Manual form fill (no OCR) |
| SMTP / Mailtrap | Notification delivery_status → SKIPPED | In-app notifications only, console log |
| MinIO | File upload fails | Use local filesystem via Django's default storage |
| Redis | Celery tasks fail | Run tasks synchronously with `CELERY_ALWAYS_EAGER=True` |
| Mock D365 | D365 booking skipped | Status stays APPROVED, manual progression |
