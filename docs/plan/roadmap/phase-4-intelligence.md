# Phase 4 — Intelligence & Polish (Days 16–18)

## Goal
Role-specific dashboards, audit log viewer, reporting, NL query, demo-ready polish.

---

## Day 16: Dashboards + Audit Log Viewer

### Step 16.1 — Role-Specific Dashboard
Each role sees different KPIs and pending actions on their dashboard.

**Vendor Dashboard** (`/vendor/dashboard`):
- KPIs: Total bills submitted, pending approval, paid this month
- Recent bills table (last 10)
- Active queries requiring response
- Payment history chart (monthly)

**Employee L1 Dashboard** (`/employee/dashboard`):
- KPIs: Bills in my queue, avg processing time, SLA compliance
- Validation queue (PENDING_L1 assigned to me)
- Recent actions taken
- Vendor-wise bill volume chart

**Finance Dashboard** (`/finance/dashboard`):
- KPIs: Total payable, overdue invoices, this month's approvals
- Approval queue (filtered by role)
- Invoice aging chart
- Expense category breakdown pie chart
- Recent activity feed

**CFO Dashboard** (`/finance/cfo-dashboard`):
- KPIs: Total monthly spend, AR outstanding, budget utilization
- Pending Fin Head approvals
- AR aging snapshot (Current, 30+, 60+, 90+)
- Monthly trend chart (expenses, invoices, payments)
- Cash position indicator
- AI summary (if Claude available)

**Admin Dashboard** (`/admin/dashboard`):
- KPIs: Active vendors, pending onboarding, SoD violations (should be 0)
- System health indicators
- Recent user activity
- Disputes pending

### Step 16.2 — Dashboard API
```python
# GET /api/v1/dashboard/
class DashboardView(APIView):
    def get(self, request):
        role = request.user.role
        if role == 'VENDOR':
            return Response(self._vendor_dashboard(request.user))
        elif role in ('EMP_L1', 'EMP_L2'):
            return Response(self._employee_dashboard(request.user))
        elif role in ('FIN_L1', 'FIN_L2', 'CFO'):
            return Response(self._finance_dashboard(request.user))
        elif role == 'ADMIN':
            return Response(self._admin_dashboard(request.user))
        return Response(self._default_dashboard(request.user))

# GET /api/v1/dashboard/kpis/
# GET /api/v1/dashboard/charts/monthly-trend/
# GET /api/v1/dashboard/charts/category-breakdown/
# GET /api/v1/dashboard/pending-actions/
```

### Step 16.3 — Charts (Recharts)
```tsx
// components/charts/MonthlyTrendChart.tsx
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={monthlyData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis tickFormatter={formatCurrency} />
    <Tooltip formatter={formatCurrency} />
    <Area type="monotone" dataKey="expenses" stackId="1"
          fill="hsl(220, 70%, 50%)" fillOpacity={0.3} />
    <Area type="monotone" dataKey="invoices" stackId="1"
          fill="hsl(150, 70%, 50%)" fillOpacity={0.3} />
  </AreaChart>
</ResponsiveContainer>
```

### Step 16.4 — Audit Log Viewer
`/audit/logs` → `AuditLogPage.tsx`:
- Search by: actor, action, target type, target ID, date range
- Filter by module (expense, invoice, vendor, accounts, audit)
- Each entry shows:
  - Timestamp, actor (name + role), action
  - Before/after diff (collapsible JSON diff view)
  - Reason (if any)
  - IP address + session
- Hash chain indicator: verified ✅ / tamper detected ❌
- Export button (CSV/Excel — CFO + Auditor only)

```python
# POST /api/v1/audit/verify-chain/
class AuditVerifyView(APIView):
    def post(self, request):
        entries = AuditLog.objects.order_by('id')[:request.data.get('limit', 1000)]
        prev_hash = ''
        for entry in entries:
            expected = compute_hash(entry, prev_hash)
            if expected != entry.entry_hash:
                return Response({
                    'verified': False,
                    'broken_at': entry.id,
                    'message': f'Hash mismatch at entry {entry.id}'
                })
            prev_hash = entry.entry_hash
        return Response({'verified': True, 'entries_checked': entries.count()})
```

**Exit**: Each role sees personalized dashboard. Audit log searchable + hash-verifiable.

---

## Day 17: Report Hub + NL Query

### Step 17.1 — Standard Reports
Create report hub at `/reports`:

| Report | Description | Export Formats | Roles |
|--------|------------|---------------|-------|
| Expense Register | All bills with current status | CSV, Excel | Fin L1+, Auditor |
| Invoice Register | All sales invoices | CSV, Excel | Fin L1+ |
| AR Aging Report | Outstanding invoices by aging bucket | Excel, PDF | CFO, Fin L2 |
| Vendor Ledger | All transactions per vendor | CSV | Fin L1+ |
| Approval SLA Report | Avg time per step, breaches | Excel | Admin, CFO |
| Anomaly Report | Flagged bills + outcomes | Excel | CFO, Auditor |
| Monthly Summary | Expense + invoice totals by month | PDF | CFO |

### Step 17.2 — Export Service
```python
class ExportService:
    def export_csv(self, queryset, columns):
        response = HttpResponse(content_type='text/csv')
        writer = csv.writer(response)
        writer.writerow([col['header'] for col in columns])
        for obj in queryset:
            writer.writerow([col['accessor'](obj) for col in columns])
        return response
    
    def export_excel(self, queryset, columns, sheet_name='Report'):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = sheet_name
        # Headers
        for i, col in enumerate(columns, 1):
            ws.cell(row=1, column=i, value=col['header'])
        # Data rows
        for row_idx, obj in enumerate(queryset, 2):
            for col_idx, col in enumerate(columns, 1):
                ws.cell(row=row_idx, column=col_idx, value=col['accessor'](obj))
        # Store as FileRef
        buffer = BytesIO()
        wb.save(buffer)
        file_ref = FileService().upload_bytes(buffer.getvalue(), 'exports', f'{sheet_name}.xlsx')
        return file_ref
```

### Step 17.3 — Report Frontend
`ReportHubPage.tsx`:
- Card grid: each report as a card with description
- Click → filter form (date range, status, vendor, etc.)
- "Generate" button → API call → download file

### Step 17.4 — NL Query (Basic)
If Claude API is available, enable NL query:
```python
# POST /api/v1/nlquery/
class NLQueryView(APIView):
    permission_classes = [IsAuthenticated, IsCFOOrAuditor]
    
    def post(self, request):
        question = request.data['question']
        
        if not settings.CLAUDE_API_KEY:
            return Response({'detail': 'NL Query requires AI service'}, status=503)
        
        # Get schema catalog
        schema = SchemaService.get_allowed_tables(request.user.role)
        
        # Mask and send to Claude
        masked = MaskingService().mask_question(question)
        sql = ClaudeClient().generate_sql(masked, schema)
        
        # Validate SQL
        validated = SQLValidator.validate(sql)  # SELECT only, allowed tables, etc.
        
        # Execute on default DB (no read replica in hackathon)
        with connection.cursor() as cursor:
            cursor.execute(f"SET statement_timeout = '30s'; {validated}")
            columns = [col.name for col in cursor.description]
            rows = cursor.fetchall()[:10000]
        
        return Response({'sql': validated, 'columns': columns, 'rows': rows})
```

Frontend: Command palette (`Cmd+K`) with NL query input → results displayed in data table.

**Exit**: Reports downloadable as CSV/Excel. NL query works if Claude available (graceful disabled if not).

---

## Day 18: Final Polish + Demo Prep

### Step 18.1 — UX Polish
- Loading states: skeleton loaders on all data-fetched components
- Empty states: friendly illustrations + CTAs on empty lists
- Error boundaries: graceful error pages with "Go to Dashboard" button
- Toast notifications: success (green), error (red), info (blue)
- Mobile-responsive: sidebar collapses to hamburger, tables scroll

### Step 18.2 — Command Palette
```tsx
// components/CommandPalette.tsx (using cmdk)
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Search bills, invoices, vendors..." />
  <CommandList>
    <CommandGroup heading="Quick Actions">
      <CommandItem onSelect={() => navigate('/vendor/bills/new')}>
        Submit New Bill
      </CommandItem>
      <CommandItem onSelect={() => navigate('/finance/invoices/create')}>
        Create Invoice
      </CommandItem>
    </CommandGroup>
    <CommandGroup heading="Recent Bills">
      {recentBills.map(bill => (
        <CommandItem key={bill.id} onSelect={() => navigate(`/bills/${bill.id}`)}>
          {bill.ref_no} — {bill.vendor_name} — ₹{bill.total_amount}
        </CommandItem>
      ))}
    </CommandGroup>
    {nlQueryEnabled && (
      <CommandGroup heading="Ask AI">
        <CommandItem onSelect={openNLQuery}>
          Ask a question about your data...
        </CommandItem>
      </CommandGroup>
    )}
  </CommandList>
</CommandDialog>
```

### Step 18.3 — Demo Seed Data
Create comprehensive seed for hackathon demo:
```python
# manage.py seed_demo --full
# Creates:
# - 8 users (1 per role) with password: hackathon2026
# - 5 vendors with bank accounts + L1 mappings
# - 3 clients (SaaS, AAAS, Transport)
# - 10 expenses in various states:
#   - 2 DRAFT, 1 SUBMITTED, 1 PENDING_L1, 1 PENDING_HOD
#   - 1 APPROVED, 1 BOOKED_D365, 1 PAID
#   - 1 REJECTED, 1 QUERY_FIN_L1
# - 5 invoices in various states:
#   - 1 DRAFT, 1 SENT, 1 OVERDUE (Stage 1), 1 PAID, 1 DISPUTED
# - Audit log entries for all state changes
# - 3 anomaly results (1 CRITICAL, 1 HIGH, 1 LOW)
# - 2 notification templates per event
```

### Step 18.4 — Demo Walkthrough Document
Create `docs/DEMO.md`:
```markdown
# FinanceAI Demo Walkthrough

## Setup
1. `make up` → starts all services
2. `make migrate` → runs migrations
3. `make seed` → loads demo data

## Demo Flow (15 min)

### 1. Vendor Journey (3 min)
- Login as vendor@demo.com
- Show dashboard with submitted bills
- Submit new bill → upload PDF → OCR fills fields → submit
- Show status tracking

### 2. Approval Chain (5 min)
- Login as l1@demo.com → show approval queue → approve
- Login as cfo@demo.com → show pending → approve → book D365
- Watch status change to PAID (webhook fires)

### 3. Invoice + Dunning (3 min)
- Login as finl1@demo.com → create SaaS invoice → send
- Show dunning timeline (pre-seeded overdue invoice)
- Show bank reconciliation

### 4. Security + Audit (2 min)
- Try self-approve → show 403 SoD violation
- Show audit log → verify hash chain
- Show anomaly detection on flagged bill

### 5. Dashboard + NL Query (2 min)
- Login as cfo@demo.com → show CFO dashboard
- Cmd+K → "Top 5 vendors by spend this month" → show result
```

### Step 18.5 — README Update
Update project README with:
- Project description
- Tech stack
- Quick start (Docker Compose)
- Test credentials
- Architecture diagram (ASCII)
- Demo walkthrough link

**Exit criteria — Phase 4 complete (HACKATHON READY)**:
- All flows work end-to-end
- Dashboards personalized per role
- Reports downloadable
- Demo seed data loaded
- Everything works with zero external dependencies (graceful degradation)
- Demo walkthrough documented
