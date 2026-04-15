# Phase 2 — Invoice Module Build (Days 9–12)

## Goal
Complete sales invoice lifecycle: creation → send → dunning → payment → reconciliation.

---

## Day 9: Models + Invoice Creation

### Step 9.1 — Invoice Models
Create/extend `apps/invoices/` with:
- `Client`, `Invoice`, `InvoiceLineItem`, `CreditNote`, `CreditNoteLineItem`
- `Dispute`, `DunningEvent`, `Receipt`, `BankStatement`
- `InvoiceStatus` enum (14 states — see 03-data-models.md)
- `ServiceLine` enum: SAAS, AAAS, TRANSPORT, WAREHOUSE
- `ref_no` auto-generation: `INV-{year}-{counter:04d}`

Seed: 3 demo clients with GSTIN, payment terms, TDS sections.

### Step 9.2 — Invoice State Machine
```python
# apps/invoices/state_machine.py
class InvoiceStateMachine(StateMachine):
    states = ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID',
              'OVERDUE', 'STAGE_1', 'STAGE_2', 'STAGE_3',
              'LEGAL_REFERRAL', 'BAD_DEBT', 'DISPUTED', 'CREDIT_NOTED', 'CANCELLED']
    transitions = [
        Transition('DRAFT', 'SENT', action='sent'),
        Transition('DRAFT', 'CANCELLED', action='cancelled'),
        Transition('SENT', 'VIEWED', action='viewed'),
        Transition('SENT', 'PARTIAL_PAID', action='partial_paid'),
        Transition('SENT', 'PAID', action='paid'),
        Transition('SENT', 'OVERDUE', action='overdue'),
        # ... all transitions from 08-module-invoice-management.md
    ]
```

### Step 9.3 — Invoice Creation Service
```python
# apps/invoices/services.py
class InvoiceCreationService:
    def create_draft(self, client_id, service_line, line_items, created_by):
        client = Client.objects.get(id=client_id)
        
        # Validate GSTIN (graceful skip if no GST API)
        gstin_valid = self._validate_gstin(client.gstin)
        
        # Calculate tax
        tax = self._calculate_gst(
            client.state_code, settings.COMPANY_STATE_CODE,
            sum(item['amount'] for item in line_items)
        )
        
        invoice = Invoice.objects.create(
            client=client, service_line=service_line,
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=client.payment_terms_days),
            pre_gst_amount=sum(item['amount'] for item in line_items),
            cgst_amount=tax['cgst'], sgst_amount=tax['sgst'], igst_amount=tax['igst'],
            gst_amount=tax['total_gst'], total_amount=tax['grand_total'],
            balance_due=tax['grand_total'],
            is_inter_state=(client.state_code != settings.COMPANY_STATE_CODE),
            place_of_supply=client.state_code,
            created_by=created_by, status='DRAFT',
        )
        for item in line_items:
            InvoiceLineItem.objects.create(invoice=invoice, **item)
        return invoice

    def _calculate_gst(self, client_state, company_state, pre_gst_amount):
        if client_state == company_state:
            # Same state → CGST + SGST
            return {'cgst': pre_gst_amount * Decimal('0.09'),
                    'sgst': pre_gst_amount * Decimal('0.09'),
                    'igst': 0, 'total_gst': pre_gst_amount * Decimal('0.18'),
                    'grand_total': pre_gst_amount * Decimal('1.18')}
        else:
            # Different state → IGST
            return {'cgst': 0, 'sgst': 0,
                    'igst': pre_gst_amount * Decimal('0.18'),
                    'total_gst': pre_gst_amount * Decimal('0.18'),
                    'grand_total': pre_gst_amount * Decimal('1.18')}
```

### Step 9.4 — Invoice API
```python
# GET  /api/v1/invoices/           → list (filterable by status, client, service_line)
# POST /api/v1/invoices/           → create draft
# GET  /api/v1/invoices/{id}/      → detail
# PATCH /api/v1/invoices/{id}/     → update draft
# POST /api/v1/invoices/{id}/send/ → send to client
```

### Step 9.5 — Invoice Creation Frontend
Create pages:
- `/finance/invoices` → `InvoiceListPage.tsx`: table with status, client, amount, due date
- `/finance/invoices/create` → `InvoiceCreatePage.tsx`:
  - Service line selector (4 tabs with specific form fields)
  - Client dropdown → auto-loads master data
  - Line item builder (add/remove rows)
  - Tax calculation shown in real-time
  - Save as Draft / Send to Client buttons

**Exit**: Fin L1 creates draft invoice for SaaS client → auto-calculates GST → saves.

---

## Day 10: PDF Generation + Send

### Step 10.1 — Template Renderer
```python
# apps/invoices/services.py
class TemplateRenderer:
    TEMPLATES = {
        'SAAS': 'pdf/invoice/saas.html',
        'AAAS': 'pdf/invoice/aaas.html',
        'TRANSPORT': 'pdf/invoice/transport.html',
        'WAREHOUSE': 'pdf/invoice/warehouse.html',
    }
    
    def render_pdf(self, invoice):
        template = get_template(self.TEMPLATES[invoice.service_line])
        html = template.render({
            'invoice': invoice,
            'line_items': invoice.line_items.all(),
            'company': settings.COMPANY_INFO,
        })
        # Use weasyprint or xhtml2pdf to generate PDF
        pdf_bytes = HTML(string=html).write_pdf()
        
        # E-invoice IRN (if applicable + API available)
        if self._should_generate_irn(invoice):
            try:
                irn_data = EInvoiceService().generate_irn(invoice)
                pdf_bytes = self._embed_qr(pdf_bytes, irn_data['qr'])
                invoice.irn = irn_data['irn']
                invoice.save()
            except Exception:
                pass  # Graceful skip
        
        file_ref = FileService().upload_bytes(pdf_bytes, 'invoices',
                                               f'{invoice.ref_no}.pdf')
        invoice.pdf_file = file_ref
        invoice.save()
        return file_ref
```

### Step 10.2 — E-Invoice Service (Mock)
```python
class EInvoiceService:
    def generate_irn(self, invoice):
        if not settings.IRN_API_ENABLED:
            raise ServiceUnavailable("IRN API not configured")
        # In hackathon: return mock IRN
        return {
            'irn': f'IRN{uuid4().hex[:12].upper()}',
            'qr': f'https://einvoice.gst.gov.in/{invoice.ref_no}',
        }
```

### Step 10.3 — Send Flow
```python
# POST /api/v1/invoices/{id}/send/
def send_invoice(invoice, actor):
    # Generate PDF
    pdf_ref = TemplateRenderer().render_pdf(invoice)
    
    # Send email (graceful skip if no SMTP)
    try:
        send_invoice_email.delay(
            to=invoice.client.billing_email,
            subject=f'Invoice {invoice.ref_no} from 3SC',
            pdf_file_ref_id=str(pdf_ref.id),
        )
    except Exception:
        logger.info(f"Email skipped for {invoice.ref_no}")
    
    # Transition state
    StateMachineEngine().transition_to(invoice, 'SENT', actor)
```

### Step 10.4 — Invoice Detail Frontend
`InvoiceDetailPage.tsx`:
- Status badge with state-colored indicator
- Invoice details: client, amounts, dates, service line
- PDF preview (embedded or download link)
- Timeline: Draft → Sent → Viewed → Paid (with timestamps)
- Dunning history section
- Payments/receipts section
- Actions: Send (if DRAFT), Mark Paid (manual)

**Exit**: Invoice created → PDF generated (SaaS template) → sent to client (or logged).

---

## Day 11: Dunning Engine + Dispute Flow

### Step 11.1 — Dunning Engine
```python
# apps/invoices/tasks.py
@shared_task
def daily_dunning_check():
    """Celery Beat: runs daily at 9 AM"""
    today = date.today()
    
    # Check for new overdue
    newly_overdue = Invoice.objects.filter(
        status__in=['SENT', 'VIEWED'],
        due_date__lt=today
    )
    for inv in newly_overdue:
        StateMachineEngine().transition_to(inv, 'OVERDUE', actor=system_user)
    
    # Stage 1 → Day +1
    stage1_candidates = Invoice.objects.filter(
        status='OVERDUE',
        due_date__lte=today - timedelta(days=1)
    )
    for inv in stage1_candidates:
        DunningEngine.trigger_stage(inv, stage=1)
    
    # Stage 2 → Day +7
    stage2_candidates = Invoice.objects.filter(
        status='STAGE_1',
        dunning_events__stage=1,
        dunning_events__sent_at__lte=timezone.now() - timedelta(days=6)
    )
    for inv in stage2_candidates:
        DunningEngine.trigger_stage(inv, stage=2)
    
    # Stage 3 → Day +15, Legal → Day +30 (similar)
```

```python
class DunningEngine:
    TEMPLATES = {
        1: {'subject': 'Reminder: Invoice {ref_no} is overdue',
            'tone': 'friendly', 'sender': 'no-reply@3sc.in'},
        2: {'subject': 'Notice: Invoice {ref_no} payment overdue',
            'tone': 'firm', 'sender': 'finance.manager@3sc.in'},
        3: {'subject': 'Formal Notice: Invoice {ref_no}',
            'tone': 'formal', 'sender': 'cfo@3sc.in'},
    }
    
    @staticmethod
    def trigger_stage(invoice, stage):
        template = DunningEngine.TEMPLATES[stage]
        # Send email (graceful skip)
        # Create DunningEvent record
        # Transition state
        DunningEvent.objects.create(invoice=invoice, stage=stage,
                                    sent_to=invoice.client.billing_email, ...)
        next_status = {1: 'STAGE_1', 2: 'STAGE_2', 3: 'STAGE_3'}
        StateMachineEngine().transition_to(invoice, next_status[stage], actor=system_user)
```

### Step 11.2 — Dispute Flow
```python
# POST /api/v1/disputes/
class DisputeCreateView(APIView):
    def post(self, request):
        invoice = get_object_or_404(Invoice, pk=request.data['invoice_id'])
        dispute = Dispute.objects.create(
            invoice=invoice,
            raised_by_email=request.data['email'],
            reason=request.data['reason'],
        )
        # Pause dunning
        StateMachineEngine().transition_to(invoice, 'DISPUTED', actor=system_user,
                                           reason=f'Dispute: {dispute.reason[:100]}')
        # Notify Fin L1
        NotificationDispatcher().send(invoice.created_by, 'invoice.disputed', {...})
        return Response(DisputeSerializer(dispute).data, status=201)

# PATCH /api/v1/disputes/{id}/resolve/
class DisputeResolveView(APIView):
    def patch(self, request, pk):
        dispute = get_object_or_404(Dispute, pk=pk)
        resolution = request.data['resolution']  # 'no_cn' or 'issue_cn'
        if resolution == 'issue_cn':
            # Create credit note
            cn = CreditNoteService.create(dispute.invoice, request.data['cn_amount'], ...)
            dispute.credit_note = cn
            StateMachineEngine().transition_to(dispute.invoice, 'CREDIT_NOTED', ...)
        else:
            StateMachineEngine().transition_to(dispute.invoice, 'SENT', ...)
        dispute.status = 'RESOLVED'
        dispute.resolved_by = request.user
        dispute.resolved_at = timezone.now()
        dispute.save()
```

### Step 11.3 — Frontend
- Dunning history in invoice detail page (collapsible timeline)
- Dispute section: status, reason, resolution
- Manual dunning trigger button (Fin L2 for Stage 2, CFO for Stage 3)

**Exit**: Overdue invoices auto-trigger dunning. Client disputes pause dunning. Fin L2 can issue CN.

---

## Day 12: Bank Reconciliation + Credit Notes + Polish

### Step 12.1 — Bank Statement Upload + Parse
```python
# POST /api/v1/invoices/reconcile/upload/
class BankStatementUploadView(APIView):
    def post(self, request):
        file = request.FILES['file']
        file_ref = FileService().upload(file, 'evidence', request.user)
        statement = BankStatement.objects.create(file_ref=file_ref, uploaded_by=request.user, ...)
        # Enqueue async processing
        process_bank_statement.delay(str(statement.id))
        return Response({'statement_id': str(statement.id), 'status': 'PROCESSING'})

@shared_task
def process_bank_statement(statement_id):
    statement = BankStatement.objects.get(id=statement_id)
    rows = parse_bank_statement(statement.file_ref)  # CSV/XLSX parser
    
    for row in rows:
        if row['type'] != 'CREDIT': continue
        matches = BankMatchService.find_matches(row)
        if len(matches) == 1 and matches[0]['confidence'] == 'HIGH':
            # Auto-apply
            BankMatchService.apply_receipt(matches[0]['invoice'], row)
        elif len(matches) > 1:
            # Flag for manual
            row['status'] = 'MULTIPLE_MATCH'
        else:
            row['status'] = 'UNMATCHED'
    
    statement.rows_parsed = len(rows)
    statement.rows_matched = count_matched
    statement.save()
```

### Step 12.2 — Smart Matching
```python
class BankMatchService:
    @staticmethod
    def find_matches(bank_row):
        candidates = Invoice.objects.filter(
            status__in=['SENT', 'VIEWED', 'OVERDUE', 'STAGE_1', 'STAGE_2', 'STAGE_3'],
            balance_due__gt=0,
        )
        matches = []
        for inv in candidates:
            score = 0
            if bank_row['amount'] == inv.balance_due: score += 50
            if bank_row.get('utr') and bank_row['utr'] in inv.ref_no: score += 30
            if bank_row.get('ifsc') == inv.client.bank_ifsc: score += 20
            if score >= 50:
                matches.append({'invoice': inv, 'score': score,
                               'confidence': 'HIGH' if score >= 80 else 'MEDIUM'})
        return sorted(matches, key=lambda m: -m['score'])
    
    @staticmethod
    def apply_receipt(invoice, bank_row):
        receipt = Receipt.objects.create(
            invoice=invoice, amount=bank_row['amount'],
            utr_number=bank_row.get('utr', ''), received_date=bank_row['date'],
            is_auto_matched=True,
        )
        invoice.balance_due -= receipt.amount
        if invoice.balance_due <= 0:
            StateMachineEngine().transition_to(invoice, 'PAID', actor=system_user)
        else:
            StateMachineEngine().transition_to(invoice, 'PARTIAL_PAID', actor=system_user)
        invoice.save()
```

### Step 12.3 — Reconciliation Frontend
`ReconciliationPage.tsx`:
- Upload bank statement (drag & drop)
- Processing indicator
- Results table: matched (green), multiple match (amber), unmatched (red)
- For multiple matches: dropdown to select correct invoice → manual apply
- Match report summary

### Step 12.4 — Credit Note Flow
```python
class CreditNoteService:
    @staticmethod
    def create(invoice, amount, reason, issued_by):
        # Validate: amount <= invoice.balance_due
        cn = CreditNote.objects.create(
            invoice=invoice, ref_no=generate_cn_ref(),
            amount=amount, gst_reversal=amount * Decimal('0.18') / Decimal('1.18'),
            reason=reason, issued_by=issued_by,
        )
        # Needs CFO approval (2-step chain)
        ApprovalEngine.init_chain(cn, 'invoice_cn_2_step')
        return cn
```

**Exit criteria — Phase 2 complete**:
- Full invoice lifecycle: create → send → receive payment → reconcile
- Dunning auto-triggers (Celery Beat)
- Dispute → CN flow works
- Bank reconciliation processes statements
- All works without external APIs
