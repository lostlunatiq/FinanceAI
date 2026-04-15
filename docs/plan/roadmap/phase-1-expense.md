# Phase 1 — Expense Module Build (Days 4–8)

## Goal
Complete vendor bill lifecycle: submission → OCR → anomaly → 6-step approval → D365 → payment.

---

## Day 4: Models + Vendor API

### Step 4.1 — Vendor Models
Create `apps/vendors/` with:
- `Vendor`, `VendorBankAccount`, `VendorL1Mapping` models (see 03-data-models.md)
- `VendorSerializer` with nested bank accounts
- `VendorViewSet` (CRUD — admin only)
- Seed 5 demo vendors with bank accounts + L1 mappings

### Step 4.2 — Expense Models
Create `apps/expenses/` with:
- `Expense`, `ExpenseApprovalStep`, `ExpenseQuery`, `BackupApproverConfig` models
- `ExpenseStatus` enum (20+ states)
- `ref_no` auto-generation: `BILL-{year}-{counter:04d}`

### Step 4.3 — Expense State Machine
```python
# apps/expenses/state_machine.py
class ExpenseStateMachine(StateMachine):
    states = [all 20+ states]
    transitions = [
        # Submission
        Transition('DRAFT', 'SUBMITTED', guard=fields_complete),
        Transition('SUBMITTED', 'AUTO_REJECT', guard=hard_duplicate),
        Transition('SUBMITTED', 'PENDING_L1', guard=anomaly_clean),
        Transition('SUBMITTED', 'WITHDRAWN', guard=no_l1_action_yet),
        # Dept chain
        Transition('PENDING_L1', 'PENDING_L2', action='approved_l1'),
        Transition('PENDING_L1', 'REJECTED', action='rejected'),
        Transition('PENDING_L1', 'QUERY_L1', action='query_raised'),
        Transition('QUERY_L1', 'PENDING_L1', action='query_responded'),
        # ... repeat for L2, HoD, FinL1, FinL2, FinHead
        # D365
        Transition('APPROVED', 'PENDING_D365', action='booked_d365'),
        Transition('PENDING_D365', 'BOOKED_D365', action='d365_confirmed'),
        Transition('BOOKED_D365', 'POSTED_D365', action='d365_posted'),
        Transition('POSTED_D365', 'PAID', action='paid'),
    ]
```

### Step 4.4 — Basic API
```python
# apps/expenses/views.py
class VendorBillViewSet(ModelViewSet):
    # GET /api/v1/vendor/bills/ — list own bills
    # POST /api/v1/vendor/bills/ — submit new bill
    # GET /api/v1/vendor/bills/{id}/ — bill detail
    permission_classes = [IsAuthenticated, IsVendor]
    
    def perform_create(self, serializer):
        expense = SubmissionService.create_bill(
            vendor=self.request.user.vendor,
            submitted_by=self.request.user,
            data=serializer.validated_data,
        )
        return expense
```

**Exit**: Vendor can submit a bill via API → creates Expense in SUBMITTED state → audit logged.

---

## Day 5: Vendor Portal + On-Behalf Flow

### Step 5.1 — Vendor Portal Frontend
Create pages:
- `/vendor/bills` → `BillListPage.tsx`: Table with status badges, date, amount, ref_no
- `/vendor/bills/new` → `BillSubmitPage.tsx`:
  - Vendor master data pre-filled (read-only)
  - File upload component (drag & drop, max 10MB)
  - If OCR available: "Processing..." → auto-fill → amber highlights for low confidence
  - If OCR unavailable: manual form with all fields
  - Submit button → POST `/api/v1/vendor/bills/`
  - Success → redirect to bill detail
- `/vendor/bills/{id}` → `BillDetailPage.tsx`:
  - Status timeline (vertical steps showing current position)
  - Bill details (vendor, amounts, dates)
  - Query thread (if any)
  - Action buttons: Withdraw (if SUBMITTED), Respond to Query (if QUERY_*)

### Step 5.2 — File Upload API
```python
# POST /api/v1/files/upload/
class FileUploadView(APIView):
    parser_classes = [MultiPartParser]
    def post(self, request):
        file = request.FILES['file']
        validate_file(file)  # size ≤10MB, type in [PDF, JPG, PNG, XLSX]
        file_ref = FileService().upload(file, bucket='bills', uploaded_by=request.user)
        return Response({'file_ref_id': str(file_ref.id), 'filename': file.name})
```

### Step 5.3 — OCR Trigger API
```python
# POST /api/v1/vendor/bills/extract/
class OcrExtractView(APIView):
    def post(self, request):
        file_ref_id = request.data['file_ref_id']
        try:
            task = OcrService.enqueue(file_ref_id)
            return Response({'task_id': str(task.id), 'status': 'PENDING'})
        except AIServiceUnavailable:
            return Response({'task_id': None, 'status': 'SKIPPED',
                            'message': 'OCR not available, please fill manually'})

# GET /api/v1/vendor/bills/extract/{task_id}/
class OcrResultView(APIView):
    def get(self, request, task_id):
        task = OcrTask.objects.get(id=task_id)
        return Response({'status': task.status, 'result': task.result})
```

### Step 5.4 — L1 On-Behalf Flow
```python
# POST /api/v1/employee/bills/
class OnBehalfViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsEmployeeL1]
    
    def create(self, request):
        vendor_id = request.data['vendor_id']
        # Check L1 is mapped to this vendor
        if not VendorL1Mapping.objects.filter(
            vendor_id=vendor_id, l1_user=request.user, is_active=True
        ).exists():
            raise PermissionDenied("You are not mapped to this vendor")
        
        expense = SubmissionService.create_on_behalf(
            vendor_id=vendor_id,
            filer=request.user,
            data=request.data,
        )
        return Response(ExpenseSerializer(expense).data, status=201)
```

Frontend: `/employee/bills/new` page with vendor dropdown (only mapped vendors).

**Exit**: Vendor submits bill from portal UI. L1 files bill on behalf. OCR fills form or user fills manually.

---

## Day 6: Approval Chain + Query Loop

### Step 6.1 — Approval Queue API
```python
# GET /api/v1/finance/bills/queue/
class ApprovalQueueViewSet(ReadOnlyModelViewSet):
    def get_queryset(self):
        user = self.request.user
        role = user.role
        # Map role → status filter
        role_status_map = {
            'EMP_L1': 'PENDING_L1',
            'EMP_L2': 'PENDING_L2',
            'HOD': 'PENDING_HOD',
            'FIN_L1': 'PENDING_FIN_L1',
            'FIN_L2': 'PENDING_FIN_L2',
            'CFO': 'PENDING_FIN_HEAD',
        }
        status = role_status_map.get(role)
        qs = Expense.objects.filter(status=status)
        # Object-level filter
        if role == 'EMP_L1': qs = qs.filter(assigned_l1=user)
        elif role == 'HOD': qs = qs.filter(department__head=user)
        return qs
```

### Step 6.2 — Approve/Reject/Query Actions
```python
# POST /api/v1/finance/bills/{id}/approve/
class ApproveView(APIView):
    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        actor = request.user
        try:
            ApprovalService.approve(expense, actor, note=request.data.get('note', ''))
        except SoDViolation as e:
            return Response({'detail': str(e), 'code': 'sod_violation'}, status=403)
        except IllegalTransition as e:
            return Response({'detail': str(e), 'code': 'invalid_state'}, status=409)
        except ConcurrentModification:
            return Response({'detail': 'Record was modified, please refresh'}, status=409)
        return Response(ExpenseSerializer(expense).data)

# POST /api/v1/finance/bills/{id}/reject/
# POST /api/v1/finance/bills/{id}/query/
# POST /api/v1/finance/bills/{id}/respond-query/ (vendor/filer)
```

### Step 6.3 — Approval Queue Frontend
Create `ApprovalQueuePage.tsx`:
- Data table: bill ref, vendor, amount, status, submitted date, SLA timer
- Click row → `BillDetailPage.tsx` (finance version):
  - Full bill details + PDF viewer (embedded iframe or download link)
  - Anomaly indicators (severity badge, signal list)
  - Approval timeline (steps with decided/pending)
  - Action buttons: Approve, Reject, Raise Query
  - Approve modal: optional note
  - Reject modal: reason dropdown + free text (min 30 chars)
  - Query modal: message + optional file attachment

### Step 6.4 — Query Loop Frontend
In BillDetailPage:
- Query thread section (chronological messages)
- "Raise Query" button → modal → creates ExpenseQuery
- Vendor/filer sees query in their portal → "Respond" button → text + files
- After response: bill returns to PENDING_* state

**Exit**: Full 6-step approval chain works. SoD enforced (no self-approve). Query loop with responses.

---

## Day 7: D365 Booking + Anomaly Detection

### Step 7.1 — D365 Mock App
```python
# apps/mock_d365/
# Minimal OData-like endpoints:
# POST /mock-d365/api/v2.0/purchaseInvoices → create + return doc_no
# GET /mock-d365/api/v2.0/purchaseInvoices/{id} → retrieve

# apps/mock_d365/webhook_sim.py
# After purchase invoice creation:
# 5 seconds later → enqueue Celery task → POST /api/v1/webhooks/d365 {status: 'posted'}
# 10 seconds later → POST /api/v1/webhooks/d365 {status: 'paid', utr: 'UTR123'}
```

### Step 7.2 — D365 Adapter
```python
# apps/d365_adapter/mock_client.py
class MockD365Client(D365Adapter):
    def create_purchase_invoice(self, payload):
        if not getattr(settings, 'MOCK_D365_ENABLED', True):
            raise D365Unavailable("Mock D365 is disabled")
        response = requests.post(f'{self.base_url}/purchaseInvoices', json=mapped_payload)
        return response.json()['documentNo']
```

### Step 7.3 — CFO Book Action
```python
# POST /api/v1/finance/bills/{id}/book-d365/
class D365BookView(APIView):
    permission_classes = [IsAuthenticated, IsCFO]
    def post(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk, status='APPROVED')
        try:
            doc_no = D365BookingService.book(expense, request.user)
            return Response({'d365_doc_no': doc_no, 'status': 'BOOKED_D365'})
        except D365Unavailable:
            return Response({'detail': 'D365 integration not available',
                           'status': expense.status}, status=200)
```

### Step 7.4 — Anomaly Detection Service
```python
# apps/anomaly/services.py
class AnomalyService:
    def check(self, expense):
        signals = []
        signals += self._check_hard_duplicate(expense)    # weight: 100
        signals += self._check_bank_change_recent(expense) # weight: 60
        signals += self._check_amount_deviation(expense)   # weight: 40
        signals += self._check_round_amount(expense)       # weight: 30
        signals += self._check_off_hours(expense)          # weight: 15
        signals += self._check_threshold_gaming(expense)   # weight: 25
        signals += self._check_gstin_suspended(expense)    # weight: 50
        signals += self._check_vendor_concentration(expense) # weight: 10
        
        total_score = sum(s['weight'] for s in signals)
        severity = self._compute_severity(total_score)
        
        return AnomalyResult.objects.create(
            target_type='expense', target_id=expense.id,
            severity=severity, total_score=total_score, signals=signals
        )
```

### Step 7.5 — Anomaly UI
In BillDetailPage:
- Anomaly badge (color-coded: green/amber/red/critical)
- Expandable signal list with details
- Override button (if HIGH/CRITICAL): requires reason (min 50 chars)
- Override creates audit log entry

**Exit**: CFO can book bill to D365, receives webhooks, bill reaches PAID. Anomaly detection flags suspicious bills.

---

## Day 8: OCR Pipeline + Notifications + Polish

### Step 8.1 — OCR Celery Worker
```python
# apps/ocr/tasks.py
@shared_task(queue='ocr')
def ocr_extract(task_id):
    task = OcrTask.objects.get(id=task_id)
    task.status = 'PROCESSING'; task.save()
    try:
        file_ref = task.file_ref
        image = prepare_image(file_ref)  # PDF→image, resize, contrast
        masking = MaskingService()
        result = masking.process(
            data={'image': image, 'prompt': EXTRACTION_PROMPT},
            schema=OCR_FIELD_SCHEMA
        )
        validated = validate_ocr_result(result)
        task.result = validated
        task.status = 'COMPLETED'
        task.confidence_avg = avg_confidence(validated)
    except AIServiceUnavailable:
        task.status = 'SKIPPED'
        task.error_message = 'Claude API not configured'
    except Exception as e:
        task.status = 'FAILED'
        task.error_message = str(e)
    task.completed_at = timezone.now()
    task.save()
```

### Step 8.2 — Notification Templates
Seed notification templates:
```python
templates = [
    {'key': 'bill.submitted_ack', 'title': 'Bill {ref_no} submitted', 'channels': ['EMAIL', 'IN_APP']},
    {'key': 'bill.assigned_to_you', 'title': 'Bill {ref_no} needs your approval', 'channels': ['EMAIL', 'IN_APP']},
    {'key': 'bill.approved_step', 'title': 'Bill {ref_no} approved at {step}', 'channels': ['IN_APP']},
    {'key': 'bill.rejected', 'title': 'Bill {ref_no} rejected', 'channels': ['EMAIL', 'IN_APP']},
    {'key': 'bill.query_raised', 'title': 'Query on bill {ref_no}', 'channels': ['EMAIL', 'IN_APP']},
    {'key': 'bill.paid', 'title': 'Bill {ref_no} payment confirmed', 'channels': ['EMAIL', 'IN_APP']},
    {'key': 'bill.sla_reminder', 'title': 'SLA reminder: bill {ref_no}', 'channels': ['EMAIL', 'IN_APP']},
]
```

### Step 8.3 — SLA Worker
```python
# apps/expenses/tasks.py
@shared_task
def check_sla_breaches():
    """Run by Celery Beat every 5 minutes"""
    pending_statuses = ['PENDING_L1', 'PENDING_L2', 'PENDING_HOD',
                       'PENDING_FIN_L1', 'PENDING_FIN_L2', 'PENDING_FIN_HEAD']
    for expense in Expense.objects.filter(status__in=pending_statuses):
        current_step = expense.approval_steps.filter(decided_at__isnull=True).first()
        if current_step and timezone.now() > current_step.sla_deadline:
            StateMachineEngine().transition_to(expense, 'EXPIRED', actor=system_user)
```

### Step 8.4 — Frontend Polish
- Notification bell with unread count badge
- Toast notifications on action success/failure
- Loading states (skeleton loaders)
- Empty states (no bills yet)
- Error boundaries
- Status timeline component (reusable)

**Exit criteria — Phase 1 complete**:
- Vendor submits bill → OCR (or manual) → anomaly checked → 6-step approval → D365 → PAID
- All works without Claude API key
- All works without Mock D365
- Notifications sent for every state change
