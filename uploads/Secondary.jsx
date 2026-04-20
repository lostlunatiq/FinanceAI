// Tijori AI — Secondary Screens (Vendors, Expenses, Budget, Guardrails, Audit, Settings, Vendor Portal)

// ─── VENDOR MANAGEMENT ───────────────────────────────────────────────────────

const VENDORS = [
  { id: 'VND-001', name: 'TechLogistics Solutions Global', gst: '27AABCT3518Q1ZL', category: 'Logistics', status: 'ACTIVE', outstanding: '₹3,40,000' },
  { id: 'VND-002', name: 'NovaBridge Infra Ltd.', gst: '29AACCN2609R1ZP', category: 'Infrastructure', status: 'ACTIVE', outstanding: '₹8,40,000' },
  { id: 'VND-003', name: 'GlobalSync Technologies', gst: '06AACGG1234K1ZA', category: 'IT Services', status: 'ACTIVE', outstanding: '₹1,22,500' },
  { id: 'VND-004', name: 'Sigma Electrical Works', gst: '09AACGS5678M1ZB', category: 'Electrical', status: 'PENDING', outstanding: '₹2,15,500' },
  { id: 'VND-005', name: 'Acme Office Supplies', gst: '24AACGA9012N1ZC', category: 'Supplies', status: 'ACTIVE', outstanding: '₹45,200' },
  { id: 'VND-006', name: 'ShellBridge Exports', gst: '33AACGS3456P1ZD', category: 'Exports', status: 'SUSPENDED', outstanding: '₹0' },
];

const VendorsScreen = () => {
  const [addOpen, setAddOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [detail, setDetail] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  const filtered = VENDORS.filter(v => {
    const ms = statusFilter === 'ALL' || v.status === statusFilter;
    const mq = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.gst.includes(search);
    return ms && mq;
  });

  const steps = ['Basic Info', 'Bank Details', 'Documents'];

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Vendor Management" subtitle="Registry of all approved, pending, and suspended vendors."
        right={<Btn variant="primary" icon={<span>+</span>} onClick={() => { setAddOpen(true); setStep(0); }}>Add Vendor</Btn>} />

      <StatsRow cards={[
        { label: 'Total Vendors', value: String(VENDORS.length), delta: '↑ 2 this month', deltaType: 'positive' },
        { label: 'Active', value: String(VENDORS.filter(v=>v.status==='ACTIVE').length), delta: 'Verified', deltaType: 'positive', color: '#10B981' },
        { label: 'Pending Approval', value: String(VENDORS.filter(v=>v.status==='PENDING').length), delta: 'Awaiting review', deltaType: 'neutral', color: '#F59E0B' },
        { label: 'Suspended', value: String(VENDORS.filter(v=>v.status==='SUSPENDED').length), delta: 'Blocked', deltaType: 'negative', color: '#EF4444' },
      ]} />

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or GST…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8' }} />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>🔍</span>
        </div>
        {['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", background: statusFilter === f ? '#E8783B' : '#F8F7F5', color: statusFilter === f ? 'white' : '#64748B' }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              {['Vendor Name', 'GST / PAN', 'Category', 'Status', 'Outstanding', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} style={{ borderTop: '1px solid #F1F0EE', height: 52, cursor: 'pointer', transition: 'background 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                onClick={() => setDetail(v)}>
                <td style={{ padding: '0 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.name}</div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>{v.id}</div>
                </td>
                <td style={{ padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#475569' }}>{v.gst}</td>
                <td style={{ padding: '0 16px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.category}</td>
                <td style={{ padding: '0 16px' }}><StatusBadge status={v.status} /></td>
                <td style={{ padding: '0 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#E8783B', letterSpacing: '-0.5px' }}>{v.outstanding}</td>
                <td style={{ padding: '0 16px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Btn variant="secondary" small onClick={() => setDetail(v)}>View</Btn>
                    {v.status === 'SUSPENDED' && <Btn variant="green" small>Activate</Btn>}
                    {v.status === 'ACTIVE' && <Btn variant="destructive" small>Suspend</Btn>}
                    {v.status === 'PENDING' && <Btn variant="primary" small>Approve</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Vendor Modal */}
      <TjModal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Vendor" width={520}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: i <= step ? '#E8783B' : '#F1F5F9', color: i <= step ? 'white' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0, transition: 'all 200ms' }}>{i + 1}</div>
              <span style={{ fontSize: '11px', color: i === step ? '#0F172A' : '#94A3B8', fontWeight: i === step ? 700 : 400, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s}</span>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? '#E8783B' : '#E2E8F0', marginLeft: 4 }} />}
            </div>
          ))}
        </div>
        {step === 0 && <>
          <TjInput label="Vendor Name" placeholder="Full registered business name" />
          <TjInput label="GST Number" placeholder="22AAAAA0000A1Z5" />
          <TjInput label="PAN" placeholder="AAAAA0000A" />
          <TjInput label="Category" placeholder="e.g. IT Services, Logistics" />
          <TjInput label="Primary Contact Email" placeholder="accounts@vendor.com" type="email" />
        </>}
        {step === 1 && <>
          <TjInput label="Account Number" placeholder="•••• •••• 4521" />
          <TjInput label="IFSC Code" placeholder="HDFC0001234" />
          <TjInput label="Bank Name" placeholder="HDFC Bank, Mumbai" />
        </>}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {['GST Certificate', 'PAN Card', 'Cancelled Cheque / Bank Letter'].map(doc => (
              <div key={doc} style={{ border: '1.5px dashed #E2E8F0', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', transition: 'border-color 150ms' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#E8783B'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>📎</div>
                <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{doc}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>PDF, JPG up to 10MB</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(s => s - 1)}>← Back</Btn>}
          {step < 2 && <Btn variant="primary" onClick={() => setStep(s => s + 1)}>Next →</Btn>}
          {step === 2 && <Btn variant="primary" onClick={() => setAddOpen(false)}>Save Vendor</Btn>}
        </div>
      </TjModal>

      {/* Detail Panel */}
      <SidePanel open={!!detail} onClose={() => setDetail(null)} title={detail?.name || ''}>
        {detail && <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '18px', color: 'white' }}>{detail.name[0]}</div>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>{detail.name}</div>
              <StatusBadge status={detail.status} />
            </div>
          </div>
          {[{ l: 'GST', v: detail.gst }, { l: 'Category', v: detail.category }, { l: 'Outstanding', v: detail.outstanding }, { l: 'Vendor ID', v: detail.id }].map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8F7F5' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.l}</span>
              <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, fontFamily: r.l === 'GST' || r.l === 'Vendor ID' ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif" }}>{r.v}</span>
            </div>
          ))}
        </>}
      </SidePanel>
    </div>
  );
};

// ─── EXPENSE MANAGEMENT ───────────────────────────────────────────────────────

const EXPENSES = [
  { id: 'EXP-2024-441', employee: 'Aisha Nair', amount: '₹4,200', date: 'Apr 19', status: 'PENDING_L1', category: 'Travel' },
  { id: 'EXP-2024-440', employee: 'Rahul Desai', amount: '₹12,500', date: 'Apr 18', status: 'APPROVED', category: 'Software' },
  { id: 'EXP-2024-439', employee: 'Priya Mehta', amount: '₹890', date: 'Apr 18', status: 'PAID', category: 'Meals' },
  { id: 'EXP-2024-438', employee: 'Dev Kapoor', amount: '₹6,400', date: 'Apr 17', status: 'REJECTED', category: 'Equipment' },
  { id: 'EXP-2024-437', employee: 'Sunita Rao', amount: '₹2,100', date: 'Apr 16', status: 'PENDING_L1', category: 'Travel' },
];

const ExpensesScreen = () => {
  const [panelOpen, setPanelOpen] = React.useState(false);
  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Internal Expenses" subtitle="Manage employee reimbursements and operational expenditures."
        right={<Btn variant="primary" icon={<span>+</span>} onClick={() => setPanelOpen(true)}>File Expense</Btn>} />
      <StatsRow cards={[
        { label: 'Unapproved Spend', value: '₹12,450', delta: '↑ ₹3.2K', deltaType: 'negative', color: '#EF4444', pulse: true },
        { label: 'Approved This Month', value: '₹48,200', delta: '↑ 12%', deltaType: 'positive', color: '#10B981' },
        { label: 'Reimbursed', value: '₹31,100', delta: 'Settled', deltaType: 'positive', color: '#10B981' },
      ]} />
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              {['Report ID', 'Employee', 'Category', 'Amount', 'Date', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXPENSES.map(e => (
              <tr key={e.id} style={{ borderTop: '1px solid #F1F0EE', height: 52, transition: 'background 150ms' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#FFF8F5'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'white'}>
                <td style={{ padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{e.id}</td>
                <td style={{ padding: '0 16px', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.employee}</td>
                <td style={{ padding: '0 16px' }}>
                  <span style={{ background: '#F8F7F5', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.category}</span>
                </td>
                <td style={{ padding: '0 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#E8783B', letterSpacing: '-0.5px' }}>{e.amount}</td>
                <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.date}</td>
                <td style={{ padding: '0 16px' }}><StatusBadge status={e.status} /></td>
                <td style={{ padding: '0 16px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {e.status.startsWith('PENDING') && <><Btn variant="green" small>Approve</Btn><Btn variant="destructive" small>Reject</Btn></>}
                    {!e.status.startsWith('PENDING') && <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="File Expense / Bill">
        <div style={{ border: '1.5px dashed #E2E8F0', borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '20px', background: '#FAFAF8', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#E8783B'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Upload invoice for AI extraction</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Drag & drop or click to browse</div>
          <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #E8783B22, #8B5CF622)', border: '1px solid #EDE9FE', borderRadius: '999px', padding: '4px 12px' }}>
            <AIBadge small /><span style={{ fontSize: '11px', color: '#5B21B6', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Powered — auto-extracts line items</span>
          </div>
        </div>
        <TjInput label="Category" placeholder="Travel, Software, Equipment…" />
        <TjInput label="Amount (₹)" placeholder="0.00" type="number" />
        <TjInput label="Date" type="date" />
        <TjTextarea label="Description" placeholder="Brief description of the expense…" rows={3} />
        <Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setPanelOpen(false)}>Submit for Approval</Btn>
      </SidePanel>
    </div>
  );
};

// ─── BUDGET MANAGEMENT ────────────────────────────────────────────────────────

const BUDGETS = [
  { dept: 'Engineering', spent: 2.4, total: 2.4, currency: '$', util: 100 },
  { dept: 'Marketing', spent: 1.1, total: 1.3, currency: '$', util: 85 },
  { dept: 'Operations', spent: 0.65, total: 1.5, currency: '$', util: 43 },
  { dept: 'Human Resources', spent: 0.544, total: 0.8, currency: '$', util: 68 },
  { dept: 'Finance', spent: 0.22, total: 0.5, currency: '$', util: 44 },
];

const BudgetScreen = () => {
  const [createOpen, setCreateOpen] = React.useState(false);
  const barColor = (u) => u >= 90 ? '#EF4444' : u >= 70 ? '#F59E0B' : '#10B981';

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Budget Management" subtitle="Monitor departmental budgets, utilisation, and threshold controls."
        right={<Btn variant="primary" icon={<span>+</span>} onClick={() => setCreateOpen(true)}>Create Budget</Btn>} />

      <StatsRow cards={[
        { label: 'Total Budget', value: '$6.5M', delta: 'FY 2026', deltaType: 'positive' },
        { label: 'Total Spent', value: '$4.91M', delta: '75.5% utilized', deltaType: 'neutral', color: '#E8783B' },
        { label: 'Remaining', value: '$1.59M', delta: '↓ vs plan', deltaType: 'positive', color: '#10B981' },
        { label: 'Active Budgets', value: String(BUDGETS.length), delta: 'Departments', deltaType: 'positive' },
      ]} />

      {/* Alert */}
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '16px' }}>⚠</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Budget Alert — </span>
          <span style={{ fontSize: '13px', color: '#B91C1C', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Engineering has reached 100% utilisation. New invoices are suspended pending CFO review.</span>
        </div>
        <Btn variant="destructive" small>View Details</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {BUDGETS.map(b => (
          <Card key={b.dept} style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '18px', color: '#0F172A', letterSpacing: '-0.5px' }}>{b.dept}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={{ background: '#F8F7F5', border: 'none', borderRadius: '6px', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✏</button>
                <button style={{ background: '#FEE2E2', border: 'none', borderRadius: '6px', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✕</button>
              </div>
            </div>
            <div style={{ height: 10, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ height: '100%', width: `${Math.min(b.util, 100)}%`, background: `linear-gradient(90deg, ${barColor(b.util)}, ${barColor(b.util)}cc)`, borderRadius: 5, transition: 'width 800ms ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{b.currency}{b.spent}M / {b.currency}{b.total}M</span>
              <span style={{ background: barColor(b.util) + '22', color: barColor(b.util), padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{b.util}%</span>
            </div>
            {b.util >= 70 && <div style={{ marginTop: '10px', fontSize: '11px', color: b.util >= 90 ? '#EF4444' : '#F59E0B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
              {b.util >= 100 ? '🔴 Booking suspended' : b.util >= 90 ? '⚠ Critical threshold reached' : '⚡ Approaching warning threshold'}
            </div>}
          </Card>
        ))}
      </div>

      <TjModal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Budget">
        <TjInput label="Department" placeholder="e.g. Engineering" />
        <TjInput label="Total Amount (₹)" placeholder="0.00" type="number" />
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}><TjInput label="Warning Threshold (%)" placeholder="70" /></div>
          <div style={{ flex: 1 }}><TjInput label="Critical Threshold (%)" placeholder="90" /></div>
        </div>
        <TjInput label="Period" placeholder="Q3 FY 2026" />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Btn variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={() => setCreateOpen(false)}>Save Budget</Btn>
        </div>
      </TjModal>
    </div>
  );
};

// ─── BUDGETARY GUARDRAILS ─────────────────────────────────────────────────────

const GuardrailsScreen = () => {
  const depts = [
    { name: 'Engineering', spent: 2.4, total: 2.4, color: '#EF4444' },
    { name: 'Marketing', spent: 1.1, total: 1.3, color: '#F59E0B' },
    { name: 'Operations', spent: 0.65, total: 1.5, color: '#10B981' },
    { name: 'Human Resources', spent: 0.544, total: 0.8, color: '#F59E0B' },
  ];
  const logs = [
    { time: '09:14', text: 'System blocked $12,400 transaction for Engineering. Cap exceeded.', entity: 'TechLogistics' },
    { time: '08:52', text: 'Warning email sent to Engineering HOD — 98% threshold crossed.', entity: 'System' },
    { time: 'Apr 18', text: 'System blocked $8,200 transaction for Engineering.', entity: 'GlobalSync' },
    { time: 'Apr 17', text: 'Marketing budget warning triggered at 85%.', entity: 'System' },
  ];
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>Budgetary Guardrails</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Q3 Fiscal Year 2026</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8783B', animation: 'dotPulse 1.5s ease infinite', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', color: '#E8783B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>Updated 4 minutes ago</span>
          </div>
        </div>
      </div>
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '18px' }}>🔴</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Booking Suspension Active — Engineering at 100%</div>
          <div style={{ fontSize: '12px', color: '#B91C1C', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>All new invoices for Engineering are automatically blocked until CFO releases the cap.</div>
        </div>
        <Btn variant="primary" small>Resolve</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '20px' }}>Departmental Utilisation</div>
          {depts.map(d => {
            const pct = Math.round((d.spent / d.total) * 100);
            return (
              <div key={d.name} style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{d.name}</span>
                  <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${d.spent}M / ${d.total}M</span>
                </div>
                <div style={{ height: 10, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: d.color, borderRadius: 5 }} />
                </div>
                <div style={{ textAlign: 'right', marginTop: '3px', fontSize: '11px', color: d.color, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{pct}%</div>
              </div>
            );
          })}
        </Card>
        <Card style={{ padding: '24px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '16px' }}>Enforcement Logs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {logs.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: i < logs.length - 1 ? '1px solid #F8F7F5' : 'none' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', marginTop: 4, flexShrink: 0, animation: i === 0 ? 'dotPulse 2s ease infinite' : 'none' }} />
                <div>
                  <div style={{ fontSize: '12px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>{l.text}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{l.time} · <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E8783B' }}>{l.entity}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

const AUDIT_ENTRIES = [
  { id: 1, user: 'Rohan Kapoor', action: 'approved', entity: 'INV-2024-087', type: 'APPROVAL', time: 'Apr 19, 09:45', detail: '{ "invoice": "INV-2024-087", "amount": 45200, "role": "CFO", "status": "APPROVED" }' },
  { id: 2, user: 'System', action: 'flagged anomaly on', entity: 'INV-2024-082', type: 'SYSTEM', time: 'Apr 19, 09:14', detail: '{ "anomaly_id": "ANO-001", "score": 94, "type": "DUPLICATE_INVOICE" }' },
  { id: 3, user: 'Priya Mehta', action: 'raised query on', entity: 'INV-2024-089', type: 'INVOICE', time: 'Apr 19, 08:30', detail: '{ "invoice": "INV-2024-089", "query": "Please provide original PO reference." }' },
  { id: 4, user: 'Finance Admin', action: 'activated vendor', entity: 'VND-003', type: 'VENDOR', time: 'Apr 18, 17:20', detail: '{ "vendor_id": "VND-003", "name": "GlobalSync Technologies", "status": "ACTIVE" }' },
  { id: 5, user: 'Aisha Nair', action: 'submitted expense', entity: 'EXP-2024-441', type: 'INVOICE', time: 'Apr 18, 23:43', detail: '{ "expense_id": "EXP-2024-441", "amount": 4200, "category": "Travel" }' },
];

const AuditScreen = () => {
  const [view, setView] = React.useState('timeline');
  const [expanded, setExpanded] = React.useState(null);
  const [filterChip, setFilterChip] = React.useState('All');

  const typeColor = { APPROVAL: '#10B981', INVOICE: '#E8783B', VENDOR: '#8B5CF6', SYSTEM: '#94A3B8', USER: '#3B82F6' };
  const chips = ['All', 'Invoice', 'Approval', 'Vendor', 'System'];

  const filtered = AUDIT_ENTRIES.filter(e => filterChip === 'All' || e.type === filterChip.toUpperCase());

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Audit Registry" subtitle="A permanent, immutable record of every transaction and system event."
        right={<><input type="date" style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', outline: 'none', background: '#FAFAF8' }} /><Btn variant="secondary" small>Export CSV ↓</Btn></>}
      />
      {/* Summary */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[['Invoice Actions', 12, '#E8783B'], ['Approvals', 8, '#10B981'], ['Vendor Changes', 3, '#8B5CF6'], ['Login Events', 24, '#3B82F6'], ['System Actions', 7, '#94A3B8']].map(([l, v, c]) => (
          <div key={l} style={{ background: 'white', borderRadius: '10px', padding: '10px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '18px', color: c }}>{v}</span>
            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{l}</span>
          </div>
        ))}
      </div>
      {/* Filters + toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
        {chips.map(c => (
          <button key={c} onClick={() => setFilterChip(c)}
            style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", background: filterChip === c ? '#E8783B' : '#F8F7F5', color: filterChip === c ? 'white' : '#64748B', transition: 'all 150ms' }}>
            {c}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', background: '#F8F7F5', borderRadius: '10px', padding: '4px', display: 'flex', gap: '2px' }}>
          {['timeline', 'table'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", background: view === v ? '#E8783B' : 'transparent', color: view === v ? 'white' : '#64748B', transition: 'all 150ms', textTransform: 'capitalize' }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'timeline' ? (
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, #E8783B, #E8783B44)' }} />
          {filtered.map((e, i) => (
            <div key={e.id} style={{ marginBottom: '16px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: -26, top: 12, width: 12, height: 12, borderRadius: '50%', background: typeColor[e.type] || '#94A3B8', border: '2px solid white', boxShadow: `0 0 0 2px ${typeColor[e.type] || '#94A3B8'}44` }} />
              <div style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #F1F0EE' }} onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: (typeColor[e.type] || '#94A3B8') + '22', color: typeColor[e.type] || '#94A3B8', padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.type}</span>
                    <span style={{ fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>
                      <strong>{e.user}</strong> {e.action} <span style={{ color: '#E8783B', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{e.entity}</span>
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.time}</span>
                </div>
                {expanded === e.id && (
                  <div style={{ marginTop: '10px', background: '#F8F7F5', borderRadius: '8px', padding: '10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#475569', lineHeight: 1.6 }}>
                    {e.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Type', 'User', 'Action', 'Entity', 'Timestamp'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid #F1F0EE', height: 52, transition: 'background 150ms' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#FFF8F5'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '0 16px' }}><span style={{ background: (typeColor[e.type] || '#94A3B8') + '22', color: typeColor[e.type] || '#94A3B8', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.type}</span></td>
                  <td style={{ padding: '0 16px', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.user}</td>
                  <td style={{ padding: '0 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.action}</td>
                  <td style={{ padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{e.entity}</td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

const SettingsScreen = () => {
  const [tab, setTab] = React.useState('Security');
  const [toggles, setToggles] = React.useState({ email: true, alerts: true, push: false, twofa: true });
  const [theme, setTheme] = React.useState('Light');
  const toggleFn = (k) => setToggles(t => ({ ...t, [k]: !t[k] }));

  const Toggle = ({ on, onToggle }) => (
    <div onClick={onToggle} style={{ width: 40, height: 22, borderRadius: 11, background: on ? '#E8783B' : '#E2E8F0', cursor: 'pointer', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: on ? 21 : 3, transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
    </div>
  );

  const sessions = [
    { device: 'MacBook Pro · Chrome', loc: 'Mumbai, India', seen: 'Active now', current: true },
    { device: 'iPhone 15 · Safari', loc: 'Mumbai, India', seen: '2h ago', current: false },
    { device: 'Windows · Edge', loc: 'Delhi, India', seen: '3 days ago', current: false },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Account Architecture" subtitle="Manage your institutional identity, access controls, and intelligence flows." />
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Left: Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '20px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: 'white', margin: '0 auto 14px' }}>RK</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '6px' }}>Rohan Kapoor</div>
            <span style={{ background: 'linear-gradient(135deg, #E8783B22, #FF6B3522)', color: '#E8783B', padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", border: '1px solid #E8783B44' }}>CFO</span>
            <div style={{ marginTop: '16px' }}><Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>Edit Profile</Btn></div>
          </Card>

          <Card style={{ padding: '20px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A', marginBottom: '14px' }}>Notifications</div>
            {[
              { key: 'email', label: 'Email Summaries', sub: 'Daily automated ledger digest' },
              { key: 'alerts', label: 'System Alerts', sub: 'Critical transaction anomalies' },
              { key: 'push', label: 'Mobile Push', sub: 'Real-time transaction alerts' },
            ].map(n => (
              <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: n.key !== 'push' ? '1px solid #F8F7F5' : 'none' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{n.label}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{n.sub}</div>
                </div>
                <Toggle on={toggles[n.key]} onToggle={() => toggleFn(n.key)} />
              </div>
            ))}
          </Card>
        </div>

        {/* Right: Tabs */}
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #F1F0EE', padding: '0 24px' }}>
            {['Security', 'Integrations', 'Appearance'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '16px 0', marginRight: '24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: tab === t ? 700 : 500, color: tab === t ? '#0F172A' : '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", borderBottom: `2px solid ${tab === t ? '#E8783B' : 'transparent'}`, transition: 'all 150ms' }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ padding: '24px' }}>
            {tab === 'Security' && (
              <>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Change Password</div>
                  <TjInput label="Current Password" type="password" placeholder="••••••••" />
                  <TjInput label="New Password" type="password" placeholder="••••••••" />
                  <Btn variant="primary" small>Update Password</Btn>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>Two-Factor Authentication</div>
                    <Toggle on={toggles.twofa} onToggle={() => toggleFn('twofa')} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Protect your account with TOTP-based authentication.</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Active Sessions</div>
                  {sessions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < sessions.length - 1 ? '1px solid #F8F7F5' : 'none' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.current ? '#10B981' : '#E2E8F0' }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.device}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.loc} · {s.seen}</div>
                        </div>
                      </div>
                      {!s.current && <button style={{ fontSize: '12px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Revoke</button>}
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === 'Integrations' && (
              <>
                {[
                  { name: 'Microsoft Dynamics 365', desc: 'ERP sync for GL entries and PO matching', status: 'LIVE' },
                  { name: 'SMTP Email Server', desc: 'Outbound notifications and alerts', status: 'LIVE' },
                  { name: 'Webhook Endpoints', desc: 'Real-time event push to external systems', status: 'MOCK' },
                ].map(int => (
                  <div key={int.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#F8F7F5', borderRadius: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{int.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{int.desc}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <StatusBadge status={int.status} />
                      <Btn variant="secondary" small>Configure</Btn>
                    </div>
                  </div>
                ))}
              </>
            )}
            {tab === 'Appearance' && (
              <>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Theme</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['Light', 'Dark', 'System'].map(t => (
                      <div key={t} onClick={() => setTheme(t)}
                        style={{ flex: 1, padding: '16px', border: `2px solid ${theme === t ? '#E8783B' : '#E2E8F0'}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 150ms', background: t === 'Dark' ? '#0F172A' : 'white' }}>
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>{t === 'Light' ? '☀' : t === 'Dark' ? '🌙' : '⚙'}</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: t === 'Dark' ? 'white' : '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Density</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['Comfortable', 'Compact'].map(d => (
                      <div key={d} style={{ flex: 1, padding: '14px 20px', border: `2px solid ${d === 'Comfortable' ? '#E8783B' : '#E2E8F0'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 150ms' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── VENDOR PORTAL ────────────────────────────────────────────────────────────

const VendorPortalScreen = () => {
  const [activeFilter, setActiveFilter] = React.useState('All');
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);

  const myInvoices = [
    { id: 'INV-2024-082', amount: '₹3,40,000', date: 'Apr 10', status: 'ANOMALY' },
    { id: 'INV-2024-071', amount: '₹3,40,000', date: 'Apr 02', status: 'QUERY_RAISED' },
    { id: 'INV-2024-060', amount: '₹1,85,000', date: 'Mar 20', status: 'PAID' },
    { id: 'INV-2024-051', amount: '₹2,20,000', date: 'Mar 08', status: 'PAID' },
  ];

  const stages = ['Submitted', 'L1 Review', 'HOD', 'Finance Mgr', 'CFO', 'Payment'];
  const currentStage = 1; // for the selected invoice

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Vendor Portal" subtitle="TechLogistics Solutions Global"
        right={<Btn variant="primary" icon={<span>↑</span>} onClick={() => setSubmitOpen(true)}>Submit Invoice</Btn>} />
      <StatsRow cards={[
        { label: 'Pending Payouts', value: '₹6,80,000', delta: '↑ ₹3.4L', deltaType: 'neutral', color: '#F59E0B' },
        { label: 'Total Submitted', value: '4', delta: 'All time', deltaType: 'positive' },
        { label: 'In Progress', value: '2', delta: 'Under review', deltaType: 'neutral', color: '#E8783B' },
        { label: 'Paid', value: '2', delta: '₹4.05L', deltaType: 'positive', color: '#10B981' },
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px' }}>
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F0EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>My Invoices</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['All', 'In Progress', 'Query', 'Paid', 'Rejected'].map(f => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", background: activeFilter === f ? '#E8783B' : '#F8F7F5', color: activeFilter === f ? 'white' : '#64748B', transition: 'all 150ms' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Invoice #', 'Amount', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myInvoices.map(inv => (
                <tr key={inv.id} style={{ borderTop: '1px solid #F1F0EE', height: 52, cursor: 'pointer', transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  onClick={() => setSelected(inv)}>
                  <td style={{ padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{inv.id}</td>
                  <td style={{ padding: '0 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>{inv.amount}</td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.date}</td>
                  <td style={{ padding: '0 16px' }}><StatusBadge status={inv.status} /></td>
                  <td style={{ padding: '0 16px' }}><Btn variant="ghost" small onClick={e => { e.stopPropagation(); setSelected(inv); }}>View →</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card style={{ padding: '22px' }}>
          {selected ? (
            <>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B', marginBottom: '4px' }}>{selected.id}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '18px', color: '#0F172A', marginBottom: '16px' }}>{selected.amount}</div>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>Approval Progress</div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, background: '#F1F5F9' }} />
                {stages.map((s, i) => {
                  const done = i < currentStage;
                  const cur = i === currentStage;
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', position: 'relative' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#10B981' : cur ? '#E8783B' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, animation: cur ? 'dotPulse 2s ease infinite' : 'none', boxShadow: cur ? '0 0 0 4px rgba(232,120,59,0.2)' : 'none' }}>
                        {done ? <span style={{ color: 'white', fontSize: '12px' }}>✓</span> : cur ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'white', display: 'block' }} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#CBD5E1', display: 'block' }} />}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: cur ? 700 : 500, color: done ? '#10B981' : cur ? '#0F172A' : '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 240, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>◱</div>
              Select an invoice to view details
            </div>
          )}
        </Card>
      </div>

      <TjModal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit Invoice for Approval">
        <TjInput label="Invoice Number" placeholder="INV-2024-XXX" />
        <TjInput label="Amount (₹)" placeholder="0.00" type="number" />
        <TjInput label="Invoice Date" type="date" />
        <div style={{ border: '1.5px dashed #E2E8F0', borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '16px', cursor: 'pointer', background: '#FAFAF8' }}>
          <div style={{ fontSize: '22px', marginBottom: '6px' }}>📄</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Upload Invoice PDF</div>
          <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '999px', padding: '3px 10px' }}>
            <AIBadge small /><span style={{ fontSize: '11px', color: '#5B21B6', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI will auto-extract line items</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setSubmitOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={() => setSubmitOpen(false)}>Submit for Approval</Btn>
        </div>
      </TjModal>
    </div>
  );
};

Object.assign(window, { VendorsScreen, ExpensesScreen, BudgetScreen, GuardrailsScreen, AuditScreen, SettingsScreen, VendorPortalScreen });
