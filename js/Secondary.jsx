// Tijori AI — Secondary Screens

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
  const [vendors, setVendors] = React.useState([]);
  const [loadingVendors, setLoadingVendors] = React.useState(true);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [vendorForm, setVendorForm] = React.useState({
    name: '', gstin: '', pan: '', vendor_type: 'general', email: '',
    bank_account_name: '', bank_account_number: '', bank_ifsc: '',
    create_portal_user: false, portal_username: '', portal_password: '',
  });

  const { VendorAPI } = window.TijoriAPI;

  const loadVendors = () => {
    setLoadingVendors(true);
    VendorAPI.listAll()
      .then(data => setVendors(data || []))
      .catch(() => {})
      .finally(() => setLoadingVendors(false));
  };

  React.useEffect(() => { loadVendors(); }, []);

  const filtered = vendors.filter(v => {
    const ms = statusFilter === 'ALL' || v.status === statusFilter;
    const mq = !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.gstin?.includes(search);
    return ms && mq;
  });

  const vf = (field) => (e) => setVendorForm(f => ({ ...f, [field]: e.target.value }));

  const handleSaveVendor = async () => {
    if (!vendorForm.name.trim()) { setSaveError('Vendor name is required.'); return; }
    setSaveLoading(true);
    setSaveError('');
    try {
      const payload = {
        name: vendorForm.name,
        gstin: vendorForm.gstin || '',
        pan: vendorForm.pan || '',
        vendor_type: vendorForm.vendor_type || 'general',
        email: vendorForm.email || '',
        bank_account_name: vendorForm.bank_account_name || vendorForm.name,
        bank_account_number: vendorForm.bank_account_number || '',
        bank_ifsc: vendorForm.bank_ifsc || '',
      };
      if (vendorForm.create_portal_user && vendorForm.portal_username && vendorForm.portal_password) {
        payload.create_portal_user = true;
        payload.portal_username = vendorForm.portal_username;
        payload.portal_password = vendorForm.portal_password;
      }
      await VendorAPI.create(payload);
      setAddOpen(false);
      setVendorForm({ name: '', gstin: '', pan: '', vendor_type: 'general', email: '', bank_account_name: '', bank_account_number: '', bank_ifsc: '', create_portal_user: false, portal_username: '', portal_password: '' });
      loadVendors();
    } catch (err) {
      setSaveError(err.message || 'Failed to save vendor.');
    } finally {
      setSaveLoading(false);
    }
  };

  const steps = ['Basic Info', 'Bank & Portal'];

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Vendor Management" subtitle="Registry of all approved, pending, and suspended vendors."
        right={<Btn variant="primary" icon={<span>+</span>} onClick={() => { setAddOpen(true); setStep(0); }}>Add Vendor</Btn>} />

      <StatsRow cards={[
        { label: 'Total Vendors', value: loadingVendors ? '…' : String(vendors.length), delta: 'registered', deltaType: 'positive' },
        { label: 'Active', value: loadingVendors ? '…' : String(vendors.filter(v => v.status === 'ACTIVE').length), delta: 'Verified', deltaType: 'positive', color: '#10B981' },
        { label: 'Pending Approval', value: loadingVendors ? '…' : String(vendors.filter(v => v.status === 'PENDING_APPROVAL').length), delta: 'Awaiting review', deltaType: 'neutral', color: '#F59E0B' },
        { label: 'Suspended', value: loadingVendors ? '…' : String(vendors.filter(v => v.status === 'SUSPENDED').length), delta: 'Blocked', deltaType: 'negative', color: '#EF4444' },
      ]} />

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
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>{String(v.id).slice(0,8)}</div>
                </td>
                <td style={{ padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#475569' }}>{v.gstin || '—'}</td>
                <td style={{ padding: '0 16px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{v.vendor_type || '—'}</td>
                <td style={{ padding: '0 16px' }}><StatusBadge status={v.status} /></td>
                <td style={{ padding: '0 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#E8783B', letterSpacing: '-0.5px' }}>{v.pending_invoices ? `${v.pending_invoices} pending` : '—'}</td>
                <td style={{ padding: '0 16px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Btn variant="secondary" small onClick={() => setDetail(v)}>View</Btn>
                    {v.status === 'SUSPENDED' && <Btn variant="green" small onClick={async () => { await window.TijoriAPI.VendorAPI.activate(v.id, 'activate'); setVendors(vs => vs.map(x => x.id === v.id ? {...x, status: 'ACTIVE'} : x)); }}>Activate</Btn>}
                    {v.status === 'ACTIVE' && <Btn variant="destructive" small onClick={async () => { await window.TijoriAPI.VendorAPI.activate(v.id, 'suspend'); setVendors(vs => vs.map(x => x.id === v.id ? {...x, status: 'SUSPENDED'} : x)); }}>Suspend</Btn>}
                    {v.status === 'PENDING_APPROVAL' && <Btn variant="primary" small onClick={async () => { await window.TijoriAPI.VendorAPI.activate(v.id, 'activate'); setVendors(vs => vs.map(x => x.id === v.id ? {...x, status: 'ACTIVE', is_approved: true} : x)); }}>Approve</Btn>}
                  </div>
                </td>
              </tr>
            ))}
            {loadingVendors && (
              <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>Loading vendors…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <TjModal open={addOpen} onClose={() => { setAddOpen(false); setSaveError(''); }} title="Add New Vendor" width={520}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: i <= step ? '#E8783B' : '#F1F5F9', color: i <= step ? 'white' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0, transition: 'all 200ms' }}>{i + 1}</div>
              <span style={{ fontSize: '11px', color: i === step ? '#0F172A' : '#94A3B8', fontWeight: i === step ? 700 : 400, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s}</span>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? '#E8783B' : '#E2E8F0', marginLeft: 4 }} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <>
            <TjInput label="Vendor Name *" placeholder="Full registered business name" value={vendorForm.name} onChange={vf('name')} />
            <TjInput label="GST Number" placeholder="22AAAAA0000A1Z5 (15 chars)" value={vendorForm.gstin} onChange={vf('gstin')} />
            <TjInput label="PAN" placeholder="AAAAA0000A (10 chars)" value={vendorForm.pan} onChange={vf('pan')} />
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Category</div>
              <select value={vendorForm.vendor_type} onChange={vf('vendor_type')}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#0F172A', background: '#FAFAF8', outline: 'none' }}>
                {['general','saas','cloud_infra','logistics','hr','legal','supplies','marketing','professional'].map(t => (
                  <option key={t} value={t}>{t.replace('_',' ')}</option>
                ))}
              </select>
            </div>
            <TjInput label="Contact Email" placeholder="accounts@vendor.com" type="email" value={vendorForm.email} onChange={vf('email')} />
          </>
        )}

        {step === 1 && (
          <>
            <TjInput label="Bank Account Number" placeholder="Enter account number" value={vendorForm.bank_account_number} onChange={vf('bank_account_number')} />
            <TjInput label="IFSC Code" placeholder="HDFC0001234" value={vendorForm.bank_ifsc} onChange={vf('bank_ifsc')} />
            <TjInput label="Account Holder Name" placeholder="As per bank records" value={vendorForm.bank_account_name} onChange={vf('bank_account_name')} />

            <div style={{ borderTop: '1px solid #F1F0EE', paddingTop: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <input type="checkbox" id="create-portal" checked={vendorForm.create_portal_user}
                  onChange={e => setVendorForm(f => ({ ...f, create_portal_user: e.target.checked }))}
                  style={{ accentColor: '#E8783B', width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="create-portal" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>
                  Create Vendor Portal Login
                </label>
              </div>
              {vendorForm.create_portal_user && (
                <>
                  <TjInput label="Portal Username" placeholder="e.g. vendor_techserve" value={vendorForm.portal_username} onChange={vf('portal_username')} />
                  <TjInput label="Portal Password" placeholder="Temporary password (min 8 chars)" type="password" value={vendorForm.portal_password} onChange={vf('portal_password')} />
                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Vendor will be able to log in with these credentials and submit invoices via the Vendor Portal.
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {saveError && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{saveError}</div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(s => s - 1)}>← Back</Btn>}
          {step < steps.length - 1 && <Btn variant="primary" onClick={() => { setSaveError(''); setStep(s => s + 1); }}>Next →</Btn>}
          {step === steps.length - 1 && (
            <Btn variant="primary" onClick={handleSaveVendor} disabled={saveLoading}>
              {saveLoading ? 'Saving…' : 'Save Vendor'}
            </Btn>
          )}
        </div>
      </TjModal>

      <SidePanel open={!!detail} onClose={() => setDetail(null)} title={detail?.name || ''}>
        {detail && <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '18px', color: 'white' }}>{detail.name[0]}</div>
            <div><div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>{detail.name}</div><StatusBadge status={detail.status} /></div>
          </div>
          {[
            { l: 'GSTIN', v: detail.gstin || detail.gst || '—' },
            { l: 'PAN', v: detail.pan || '—' },
            { l: 'Category', v: detail.vendor_type || detail.category || '—' },
            { l: 'Email', v: detail.email || '—' },
            { l: 'Pending Invoices', v: detail.pending_invoices != null ? String(detail.pending_invoices) : '—' },
            { l: 'Total Invoices', v: detail.total_invoices != null ? String(detail.total_invoices) : '—' },
            { l: 'Total Spend', v: detail.total_spend != null ? `₹${Number(detail.total_spend).toLocaleString('en-IN')}` : '—' },
            { l: 'IFSC', v: detail.bank_ifsc || '—' },
            { l: 'Vendor ID', v: detail.id ? String(detail.id).slice(0,8) : '—' },
          ].map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F8F7F5' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.l}</span>
              <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, fontFamily: (r.l === 'GSTIN' || r.l === 'PAN' || r.l === 'Vendor ID' || r.l === 'IFSC') ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif" }}>{r.v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {detail.status === 'PENDING_APPROVAL' && (
              <Btn variant="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => {
                await VendorAPI.activate(detail.id, 'activate');
                setDetail(d => ({ ...d, status: 'ACTIVE', is_approved: true }));
                setVendors(vs => vs.map(x => x.id === detail.id ? {...x, status: 'ACTIVE', is_approved: true} : x));
              }}>Approve Vendor</Btn>
            )}
            {detail.status === 'ACTIVE' && (
              <Btn variant="destructive" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => {
                await VendorAPI.activate(detail.id, 'suspend');
                setDetail(d => ({ ...d, status: 'SUSPENDED' }));
                setVendors(vs => vs.map(x => x.id === detail.id ? {...x, status: 'SUSPENDED'} : x));
              }}>Suspend</Btn>
            )}
            {detail.status === 'SUSPENDED' && (
              <Btn variant="green" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => {
                await VendorAPI.activate(detail.id, 'activate');
                setDetail(d => ({ ...d, status: 'ACTIVE' }));
                setVendors(vs => vs.map(x => x.id === detail.id ? {...x, status: 'ACTIVE'} : x));
              }}>Activate</Btn>
            )}
          </div>
        </>}
      </SidePanel>
    </div>
  );
};

// ─── EXPENSE MANAGEMENT ───────────────────────────────────────────────────────

const EXP_CATEGORIES_LIST = ['Travel', 'Software & Licences', 'Infrastructure', 'Marketing & Events', 'HR & Recruitment', 'Legal & Compliance', 'Office Supplies', 'Professional Services', 'Utilities', 'Other'];

const EXPENSES_DATA = [
  { id: 'EXP-2024-441', employee: 'Aisha Nair', amount: '₹4,200', amtNum: 4200, date: 'Apr 19', status: 'PENDING_L1', category: 'Travel & Accommodation', aiCat: true, catConf: 91, dept: null },
  { id: 'EXP-2024-440', employee: 'Rahul Desai', amount: '₹12,500', amtNum: 12500, date: 'Apr 18', status: 'APPROVED', category: 'Software & Licences', aiCat: false, catConf: null, dept: 'Engineering' },
  { id: 'EXP-2024-439', employee: 'Priya Mehta', amount: '₹890', amtNum: 890, date: 'Apr 18', status: 'PAID', category: 'Office Supplies', aiCat: false, catConf: null, dept: 'Finance' },
  { id: 'EXP-2024-438', employee: 'Dev Kapoor', amount: '₹6,400', amtNum: 6400, date: 'Apr 17', status: 'REJECTED', category: 'Infrastructure', aiCat: true, catConf: 78, dept: null },
  { id: 'EXP-2024-437', employee: 'Sunita Rao', amount: '₹2,100', amtNum: 2100, date: 'Apr 16', status: 'PENDING_L1', category: 'Travel & Accommodation', aiCat: true, catConf: 94, dept: null },
];

const EXP_BUDGET_MAP = {
  'Travel & Accommodation': { rem: 180000, total: 300000 },
  'Software & Licences': { rem: 420000, total: 600000 },
  'Infrastructure': { rem: 0, total: 240000 },
  'Office Supplies': { rem: 85000, total: 100000 },
  'Marketing & Events': { rem: 195000, total: 1300000 },
};

const ExpensesScreen = ({ role: propRole }) => {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [uploadDone, setUploadDone] = React.useState(false);
  const [expCategory, setExpCategory] = React.useState('Travel & Accommodation');
  const [aiCatAccepted, setAiCatAccepted] = React.useState(false);
  const [expAmount, setExpAmount] = React.useState('');
  const [expandedRow, setExpandedRow] = React.useState(null);
  const [expenses, setExpenses] = React.useState([]);
  const [loadingExp, setLoadingExp] = React.useState(true);

  const currentRole = propRole || localStorage.getItem('tj_role') || 'CFO';
  const isVendor = currentRole === 'Vendor';

  React.useEffect(() => {
    const { BillsAPI } = window.TijoriAPI;
    setLoadingExp(true);
    BillsAPI.listExpenses()
      .then(data => setExpenses(data || []))
      .catch(() => {})
      .finally(() => setLoadingExp(false));
  }, []);

  const budgetInfo = EXP_BUDGET_MAP[expCategory];
  const budgetPct = budgetInfo ? Math.round((budgetInfo.rem / budgetInfo.total) * 100) : null;
  const budgetColor = budgetPct === null ? '#94A3B8' : budgetPct > 50 ? '#10B981' : budgetPct > 20 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Internal Expenses" subtitle="Manage employee reimbursements and operational expenditures."
        right={<Btn variant="primary" icon={<span>+</span>} onClick={() => { setPanelOpen(true); setUploadDone(false); setAiCatAccepted(false); setExpAmount(''); }}>File Expense</Btn>} />

      <StatsRow cards={[
        { label: 'Unapproved Spend', value: '₹12,450', delta: '↑ ₹3.2K', deltaType: 'negative', color: '#EF4444', pulse: true },
        { label: 'Approved This Month', value: '₹48,200', delta: '↑ 12%', deltaType: 'positive', color: '#10B981' },
        { label: 'Reimbursed', value: '₹31,100', delta: 'Settled', deltaType: 'positive', color: '#10B981' },
      ]} />

      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              {['Report ID', 'Employee', 'Category', !isVendor && 'Department', 'Amount', 'Date', 'Status', 'Actions'].filter(Boolean).map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingExp ? (
              <tr><td colSpan={!isVendor ? 8 : 7} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>Loading expenses…</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={!isVendor ? 8 : 7} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>No expenses found.</td></tr>
            ) : null}
            {expenses.map(e => {
              const rowId = e.ref_no || (e.id ? String(e.id).slice(0, 8).toUpperCase() : '—');
              const employee = e.vendor_name || e.submitted_by_name || '—';
              const category = e.business_purpose || e.category || '—';
              const dept = e.department || null;
              const amount = e.total_amount != null ? `₹${Number(e.total_amount).toLocaleString('en-IN')}` : '—';
              const date = e.invoice_date ? new Date(e.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
              const aiCat = !!(e.ocr_confidence && e.ocr_confidence > 0);
              const catConf = e.ocr_confidence ? Math.round(e.ocr_confidence * 100) : null;
              return (
              <React.Fragment key={e.id || rowId}>
                <tr style={{ borderTop: '1px solid #F1F0EE', height: 52, transition: 'background 150ms', cursor: 'pointer' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#FFF8F5'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'white'}
                  onClick={() => setExpandedRow(expandedRow === (e.id || rowId) ? null : (e.id || rowId))}>
                  <td style={{ padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{rowId}</td>
                  <td style={{ padding: '0 16px', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{employee}</td>
                  <td style={{ padding: '0 16px' }}>
                    {aiCat ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F5F3FF', color: '#5B21B6', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <AIBadge small />
                        {category}
                        <span style={{ fontSize: '10px', color: '#8B5CF6', fontWeight: 700, marginLeft: 2 }}>{catConf}%</span>
                      </span>
                    ) : (
                      <span style={{ background: '#F1F5F9', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{category}</span>
                    )}
                  </td>
                  {!isVendor && (
                    <td style={{ padding: '0 16px' }}>
                      {dept ? (
                        <span style={{ background: '#F1F5F9', color: '#475569', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{dept}</span>
                      ) : (
                        <span style={{ color: '#CBD5E1', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>
                      )}
                    </td>
                  )}
                  <td style={{ padding: '0 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#E8783B', letterSpacing: '-0.5px' }}>{amount}</td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{date}</td>
                  <td style={{ padding: '0 16px' }}><StatusBadge status={e.status} /></td>
                  <td style={{ padding: '0 16px' }} onClick={ev => ev.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {e.status && e.status.startsWith('PENDING') && <><Btn variant="green" small>Approve</Btn><Btn variant="destructive" small>Reject</Btn></>}
                      {(!e.status || !e.status.startsWith('PENDING')) && <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>}
                    </div>
                  </td>
                </tr>
                {expandedRow === (e.id || rowId) && (
                  <tr style={{ background: '#FAFAF8', borderTop: '1px solid #F1F0EE', animation: 'fadeUp 200ms ease' }}>
                    <td colSpan={!isVendor ? 8 : 7} style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Invoice No.</div>
                          <div style={{ border: '1.5px dashed #E2E8F0', borderRadius: '8px', padding: '10px 14px', color: '#475569', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>{e.invoice_number || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Category</div>
                          {aiCat ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AIBadge small /><span style={{ color: '#5B21B6', fontWeight: 600 }}>{category} ({catConf}% OCR conf.)</span>
                            </div>
                          ) : <span style={{ fontWeight: 600, color: '#0F172A' }}>{category}</span>}
                        </div>
                        {!isVendor && (
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Budget Impact</div>
                            {dept ? (
                              <span style={{ color: '#065F46', fontWeight: 600 }}>{dept} · Charged ✓</span>
                            ) : (
                              <span style={{ color: '#F59E0B', fontWeight: 600 }}>Pending department assignment</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* File Expense Side Panel */}
      <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="File Expense / Bill">
        {/* Upload zone */}
        <div style={{ border: `1.5px dashed ${uploadDone ? '#10B981' : '#E2E8F0'}`, borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '20px', background: uploadDone ? '#F0FDF4' : '#FAFAF8', cursor: 'pointer', transition: 'all 200ms' }}
          onMouseEnter={e => { if (!uploadDone) e.currentTarget.style.borderColor = '#E8783B'; }}
          onMouseLeave={e => { if (!uploadDone) e.currentTarget.style.borderColor = '#E2E8F0'; }}
          onClick={() => setUploadDone(true)}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>{uploadDone ? '✅' : '📄'}</div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: uploadDone ? '#065F46' : '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {uploadDone ? 'Invoice uploaded — AI extracting line items…' : 'Upload invoice for AI extraction'}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {uploadDone ? 'Category suggestion ready below' : 'Drag & drop or click to browse · PDF, JPG, PNG'}
          </div>
          {!uploadDone && (
            <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(232,120,59,0.1), rgba(139,92,246,0.1))', border: '1px solid #EDE9FE', borderRadius: '999px', padding: '4px 12px' }}>
              <AIBadge small /><span style={{ fontSize: '11px', color: '#5B21B6', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Powered — auto-extracts line items</span>
            </div>
          )}
        </div>

        {/* Smart Category — orange-bordered section */}
        <div style={{ border: '2px solid #E8783B', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', background: '#FFF7ED' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#E8783B', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>Expense Category</div>

          {uploadDone && !aiCatAccepted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '9px 12px', background: '#F5F3FF', borderRadius: '8px', border: '1px solid #EDE9FE' }}>
              <AIBadge small />
              <span style={{ fontSize: '12px', color: '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif", flex: 1 }}>
                AI suggests: <strong>Travel & Accommodation</strong> — 91% confidence
              </span>
              <Btn variant="purple" small onClick={() => { setExpCategory('Travel & Accommodation'); setAiCatAccepted(true); }}>Accept</Btn>
            </div>
          )}

          <select value={expCategory} onChange={e => setExpCategory(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0F172A', background: 'white', outline: 'none', cursor: 'pointer', marginBottom: '8px' }}>
            {EXP_CATEGORIES_LIST.map(c => <option key={c}>{c}</option>)}
          </select>

          <div style={{ fontSize: '11px', color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>
            Category helps route this to the correct budget. Your approver may update this.
          </div>
        </div>

        {/* Budget Impact Preview — internal users only */}
        {expAmount && budgetInfo && (
          <div style={{ padding: '12px 14px', borderRadius: '10px', background: budgetColor === '#EF4444' ? '#FEF2F2' : budgetColor === '#F59E0B' ? '#FFFBEB' : '#F0FDF4', border: `1px solid ${budgetColor === '#EF4444' ? '#FECACA' : budgetColor === '#F59E0B' ? '#FDE68A' : '#BBF7D0'}`, marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>Budget Impact</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: budgetColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {expCategory} · ₹{(budgetInfo.rem / 100000).toFixed(1)}L remaining of ₹{(budgetInfo.total / 100000).toFixed(1)}L total
            </div>
            <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden', marginTop: '8px' }}>
              <div style={{ height: '100%', width: `${budgetPct}%`, background: budgetColor, borderRadius: 2, transition: 'width 400ms ease' }} />
            </div>
            {budgetPct < 20 && <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>⚠ Less than 20% budget remaining — Finance will be notified</div>}
          </div>
        )}

        {!expAmount && (
          <div style={{ padding: '10px 14px', background: '#F8F7F5', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Budget impact preview will appear once you enter an amount.
          </div>
        )}

        <TjInput label="Amount (₹)" placeholder="0.00" type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
        <TjInput label="Date" type="date" />
        <TjTextarea label="Description" placeholder="Brief description of the expense…" rows={3} />
        <div style={{ border: '1.5px dashed #E2E8F0', borderRadius: '10px', padding: '14px', textAlign: 'center', marginBottom: '16px', cursor: 'pointer', background: '#FAFAF8', transition: 'border-color 150ms' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#E8783B'} onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
          <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>📎 Attach Receipt</div>
        </div>
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
  const [budgets, setBudgets] = React.useState([]);
  const [loadingBudgets, setLoadingBudgets] = React.useState(true);
  const [newBudget, setNewBudget] = React.useState({ name: '', total_amount: '', warning_threshold: '70', critical_threshold: '90', period: '' });
  const barColor = (u) => u >= 90 ? '#EF4444' : u >= 70 ? '#F59E0B' : '#10B981';

  React.useEffect(() => {
    const { BudgetAPI } = window.TijoriAPI;
    BudgetAPI.list()
      .then(data => setBudgets(data || []))
      .catch(() => {})
      .finally(() => setLoadingBudgets(false));
  }, []);

  const displayBudgets = budgets.length > 0 ? budgets.map(b => ({
    dept: b.department || b.name || '—',
    spent: b.spent_amount != null ? (b.spent_amount / 1000000).toFixed(2) : '0',
    total: b.total_amount != null ? (b.total_amount / 1000000).toFixed(2) : '0',
    currency: '₹',
    util: b.utilization_pct != null ? Math.round(b.utilization_pct) : (b.total_amount > 0 ? Math.round((b.spent_amount / b.total_amount) * 100) : 0),
    id: b.id,
  })) : [];

  const totalBudget = budgets.reduce((s, b) => s + (b.total_amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent_amount || 0), 0);
  const overBudget = displayBudgets.filter(b => b.util >= 100);

  const fmtCr = (n) => n >= 10000000 ? `₹${(n/10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${(n/1000).toFixed(0)}K`;

  const handleCreateBudget = () => {
    const { BudgetAPI } = window.TijoriAPI;
    const payload = {
      name: newBudget.name,
      department: newBudget.name,
      total_amount: parseFloat(newBudget.total_amount) || 0,
      warning_threshold: parseFloat(newBudget.warning_threshold) || 70,
      critical_threshold: parseFloat(newBudget.critical_threshold) || 90,
      period: newBudget.period,
    };
    (async () => {
      try { await BudgetAPI.create(payload); } catch (e) {}
      const data = await BudgetAPI.list().catch(() => []);
      setBudgets(data || []);
    })();
    setCreateOpen(false);
    setNewBudget({ name: '', total_amount: '', warning_threshold: '70', critical_threshold: '90', period: '' });
  };

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Budget Management" subtitle="Monitor departmental budgets, utilisation, and threshold controls."
        right={<Btn variant="primary" icon={<span>+</span>} onClick={() => setCreateOpen(true)}>Create Budget</Btn>} />

      <StatsRow cards={[
        { label: 'Total Budget', value: loadingBudgets ? '…' : fmtCr(totalBudget), delta: 'All departments', deltaType: 'positive' },
        { label: 'Total Spent', value: loadingBudgets ? '…' : fmtCr(totalSpent), delta: totalBudget > 0 ? `${Math.round((totalSpent/totalBudget)*100)}% utilized` : '—', deltaType: 'neutral', color: '#E8783B' },
        { label: 'Remaining', value: loadingBudgets ? '…' : fmtCr(totalBudget - totalSpent), delta: '↓ vs plan', deltaType: 'positive', color: '#10B981' },
        { label: 'Active Budgets', value: loadingBudgets ? '…' : String(budgets.length), delta: 'Departments', deltaType: 'positive' },
      ]} />

      {overBudget.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '16px' }}>⚠</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Budget Alert — </span>
            <span style={{ fontSize: '13px', color: '#B91C1C', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{overBudget.map(b => b.dept).join(', ')} {overBudget.length === 1 ? 'has' : 'have'} reached 100% utilisation.</span>
          </div>
          <Btn variant="destructive" small>View Details</Btn>
        </div>
      )}

      {loadingBudgets && <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>Loading budgets…</div>}
      {!loadingBudgets && displayBudgets.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>No budgets configured yet.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {displayBudgets.map(b => (
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
        <TjInput label="Department" placeholder="e.g. Engineering" value={newBudget.name} onChange={e => setNewBudget(p => ({ ...p, name: e.target.value }))} />
        <TjInput label="Total Amount (₹)" placeholder="0.00" type="number" value={newBudget.total_amount} onChange={e => setNewBudget(p => ({ ...p, total_amount: e.target.value }))} />
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}><TjInput label="Warning Threshold (%)" placeholder="70" value={newBudget.warning_threshold} onChange={e => setNewBudget(p => ({ ...p, warning_threshold: e.target.value }))} /></div>
          <div style={{ flex: 1 }}><TjInput label="Critical Threshold (%)" placeholder="90" value={newBudget.critical_threshold} onChange={e => setNewBudget(p => ({ ...p, critical_threshold: e.target.value }))} /></div>
        </div>
        <TjInput label="Period" placeholder="Q3 FY 2026" value={newBudget.period} onChange={e => setNewBudget(p => ({ ...p, period: e.target.value }))} />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Btn variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleCreateBudget}>Save Budget</Btn>
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
          {logs.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: i < logs.length - 1 ? '1px solid #F8F7F5' : 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', marginTop: 4, flexShrink: 0, animation: i === 0 ? 'dotPulse 2s ease infinite' : 'none' }} />
              <div>
                <div style={{ fontSize: '12px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>{l.text}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{l.time} · <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E8783B' }}>{l.entity}</span></div>
              </div>
            </div>
          ))}
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
  const [auditEntries, setAuditEntries] = React.useState([]);
  const [loadingAudit, setLoadingAudit] = React.useState(true);
  const typeColor = { APPROVAL: '#10B981', INVOICE: '#E8783B', VENDOR: '#8B5CF6', SYSTEM: '#94A3B8', USER: '#3B82F6' };
  const chips = ['All', 'Invoice', 'Approval', 'Vendor', 'System'];

  React.useEffect(() => {
    const { AuditAPI } = window.TijoriAPI;
    AuditAPI.list()
      .then(data => {
        const entries = Array.isArray(data) ? data : (data && data.results ? data.results : []);
        const rows = entries.map((entry, i) => {
          const actionStr = entry.action || 'action';
          const parts = actionStr.split('.');
          const typeKey = parts[0] ? parts[0].toUpperCase() : 'SYSTEM';
          const actionVerb = parts[1] ? parts[1].replace(/_/g, ' ') : actionStr;
          const typeMap = { USER: 'USER', EXPENSE: 'INVOICE', VENDOR: 'VENDOR', SYSTEM: 'SYSTEM', INVOICE: 'INVOICE' };
          return {
            id: entry.id || i,
            user: entry.actor || 'System',
            action: actionVerb,
            entity: entry.entity_type ? `${entry.entity_type}${entry.entity_id ? ':' + String(entry.entity_id).slice(0,8) : ''}` : '—',
            type: typeMap[typeKey] || 'SYSTEM',
            time: entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—',
            detail: JSON.stringify(entry.details || {}, null, 2),
          };
        });
        setAuditEntries(rows);
      })
      .catch(() => {})
      .finally(() => setLoadingAudit(false));
  }, []);

  const filtered = auditEntries.filter(e => filterChip === 'All' || e.type.startsWith(filterChip.toUpperCase()));

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Audit Registry" subtitle="A permanent, immutable record of every transaction and system event."
        right={<><input type="date" style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', outline: 'none', background: '#FAFAF8' }} /><Btn variant="secondary" small>Export CSV ↓</Btn></>} />
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[['Invoice Actions', 12, '#E8783B'], ['Approvals', 8, '#10B981'], ['Vendor Changes', 3, '#8B5CF6'], ['Login Events', 24, '#3B82F6'], ['System Actions', 7, '#94A3B8']].map(([l, v, c]) => (
          <div key={l} style={{ background: 'white', borderRadius: '10px', padding: '10px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '18px', color: c }}>{v}</span>
            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{l}</span>
          </div>
        ))}
      </div>
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

      {loadingAudit && <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>Loading audit log…</div>}
      {!loadingAudit && filtered.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>No audit entries found.</div>}
      {!loadingAudit && filtered.length > 0 && view === 'timeline' ? (
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, #E8783B, #E8783B44)' }} />
          {filtered.map(e => (
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
                  <div style={{ marginTop: '10px', background: '#F8F7F5', borderRadius: '8px', padding: '10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#475569', lineHeight: 1.6 }}>{e.detail}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (!loadingAudit && filtered.length > 0 &&
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

// ─── SETTINGS ────────────────────────────────────────────────────────────────

const SettingsScreen = ({ role: propRole }) => {
  const currentRole = propRole || localStorage.getItem('tj_role') || 'CFO';
  const [tab, setTab] = React.useState('Security');
  const [toggles, setToggles] = React.useState({ email: true, alerts: true, push: false, twofa: true });
  const [theme, setTheme] = React.useState('Light');
  const [profile, setProfile] = React.useState(null);
  const [pwForm, setPwForm] = React.useState({ current: '', new_password: '' });
  const [pwMsg, setPwMsg] = React.useState('');
  const toggleFn = (k) => setToggles(t => ({ ...t, [k]: !t[k] }));

  React.useEffect(() => {
    const { AuthAPI } = window.TijoriAPI;
    AuthAPI.me().then(u => setProfile(u)).catch(() => {});
  }, []);

  const handleChangePassword = () => {
    const { AuthAPI } = window.TijoriAPI;
    AuthAPI.changePassword({ old_password: pwForm.current, new_password: pwForm.new_password })
      .then(() => { setPwMsg('Password updated.'); setPwForm({ current: '', new_password: '' }); })
      .catch(() => setPwMsg('Failed to update password.'));
  };

  const displayName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username : (JSON.parse(localStorage.getItem('tj_user') || '{}').name || 'User');
  const displayInitials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

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

  const tabs = ['Security', 'Integrations', 'Appearance', ...(currentRole === 'Finance Admin' ? ['Permissions'] : [])];

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Account Architecture" subtitle="Manage your institutional identity, access controls, and intelligence flows." />
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '20px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: 'white', margin: '0 auto 14px' }}>{displayInitials}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '6px' }}>{displayName}</div>
            <span style={{ background: 'linear-gradient(135deg, #E8783B22, #FF6B3522)', color: '#E8783B', padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", border: '1px solid #E8783B44' }}>{currentRole}</span>
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

        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #F1F0EE', padding: '0 24px' }}>
            {tabs.map(t => (
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
                  <TjInput label="Current Password" type="password" placeholder="••••••••" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
                  <TjInput label="New Password" type="password" placeholder="••••••••" value={pwForm.new_password} onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} />
                  {pwMsg && <div style={{ fontSize: '12px', color: pwMsg.includes('Failed') ? '#EF4444' : '#10B981', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{pwMsg}</div>}
                  <Btn variant="primary" small onClick={handleChangePassword}>Update Password</Btn>
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
            {tab === 'Permissions' && (
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '8px' }}>Admin Permissions</div>
                <div style={{ fontSize: '13px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>Manage system-wide permission policies via the IAM screen.</div>
                <Btn variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'iam' }))}>Open IAM →</Btn>
              </div>
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
  const [selectedInv, setSelectedInv] = React.useState(null);

  // Real bills from API
  const [myInvoices, setMyInvoices] = React.useState([]);
  const [loadingBills, setLoadingBills] = React.useState(true);

  // Submit form state
  const [fileRef, setFileRef] = React.useState(null);
  const [ocrLoading, setOcrLoading] = React.useState(false);
  const [ocrResult, setOcrResult] = React.useState(null);
  const [formData, setFormData] = React.useState({ invoice_number: '', total_amount: '', invoice_date: '', business_purpose: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');

  const { VendorAPI, FilesAPI } = window.TijoriAPI;

  const fmtAmt = (v) => {
    if (!v) return '₹0';
    const n = parseFloat(v);
    if (n >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n/100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };

  const loadBills = () => {
    setLoadingBills(true);
    VendorAPI.myBills()
      .then(data => setMyInvoices(data || []))
      .catch(() => {})
      .finally(() => setLoadingBills(false));
  };

  React.useEffect(() => { loadBills(); }, []);

  const handleFileSelect = async (file) => {
    if (!file) return;
    setOcrLoading(true);
    setOcrResult(null);
    try {
      const uploaded = await FilesAPI.upload(file);
      setFileRef(uploaded.id);
      const ocr = await FilesAPI.ocr(uploaded.id);
      setOcrResult(ocr);
      if (ocr.extracted_fields) {
        const f = ocr.extracted_fields;
        setFormData(prev => ({
          ...prev,
          invoice_number: f.invoice_number || prev.invoice_number,
          total_amount: f.total_amount ? String(f.total_amount) : prev.total_amount,
          invoice_date: f.invoice_date || prev.invoice_date,
        }));
      }
    } catch (err) {
      setSubmitError('OCR failed: ' + err.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.total_amount) { setSubmitError('Amount is required.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        invoice_number: formData.invoice_number,
        total_amount: parseFloat(formData.total_amount),
        invoice_date: formData.invoice_date || null,
        business_purpose: formData.business_purpose || 'Invoice submission',
        ...(fileRef ? { invoice_file: fileRef } : {}),
      };
      await VendorAPI.submitBill(payload);
      setSubmitOpen(false);
      setFormData({ invoice_number: '', total_amount: '', invoice_date: '', business_purpose: '' });
      setFileRef(null);
      setOcrResult(null);
      loadBills();
    } catch (err) {
      setSubmitError(err.message || 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const stages = ['Submitted', 'L1 Review', 'HOD', 'Finance Mgr', 'CFO', 'Payment'];
  const filterMap = { 'In Progress': ['SUBMITTED','PENDING_L1','PENDING_L2','PENDING_HOD','PENDING_FIN_L1','PENDING_FIN_L2','PENDING_FIN_HEAD'], 'Query': ['QUERY_RAISED'], 'Paid': ['PAID','BOOKED_D365','POSTED_D365'], 'Rejected': ['REJECTED','AUTO_REJECT'] };

  const filteredInvoices = activeFilter === 'All' ? myInvoices : myInvoices.filter(inv => (filterMap[activeFilter] || []).includes(inv.status));

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader title="Vendor Portal" subtitle="Your submitted invoices and payment status"
        right={<Btn variant="primary" icon={<span>↑</span>} onClick={() => { setSubmitOpen(true); setSubmitError(''); setOcrResult(null); setFileRef(null); }}>Submit Invoice</Btn>} />

      <StatsRow cards={[
        { label: 'Total Submitted', value: loadingBills ? '…' : String(myInvoices.length), delta: 'All time', deltaType: 'positive' },
        { label: 'In Progress', value: loadingBills ? '…' : String(myInvoices.filter(i => !['PAID','REJECTED','AUTO_REJECT'].includes(i.status)).length), delta: 'Under review', deltaType: 'neutral', color: '#E8783B' },
        { label: 'Paid', value: loadingBills ? '…' : String(myInvoices.filter(i => ['PAID','BOOKED_D365','POSTED_D365'].includes(i.status)).length), delta: 'Completed', deltaType: 'positive', color: '#10B981' },
        { label: 'Rejected', value: loadingBills ? '…' : String(myInvoices.filter(i => ['REJECTED','AUTO_REJECT'].includes(i.status)).length), delta: 'All time', deltaType: myInvoices.filter(i => ['REJECTED','AUTO_REJECT'].includes(i.status)).length > 0 ? 'negative' : 'positive' },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px' }}>
        {/* My Invoices */}
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
              {loadingBills && (
                <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>Loading invoices…</td></tr>
              )}
              {filteredInvoices.map(inv => (
                <tr key={inv.id} style={{ borderTop: '1px solid #F1F0EE', height: 52, cursor: 'pointer', transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  onClick={() => setSelectedInv(inv)}>
                  <td style={{ padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B', fontWeight: 500 }}>{inv.ref_no || inv.invoice_number || inv.id?.slice(0,8)}</td>
                  <td style={{ padding: '0 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#0F172A', letterSpacing: '-0.5px' }}>{fmtAmt(inv.total_amount)}</td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.invoice_date || inv.created_at?.slice(0,10)}</td>
                  <td style={{ padding: '0 16px' }}><StatusBadge status={inv.status} /></td>
                  <td style={{ padding: '0 16px' }}>
                    <Btn variant="secondary" small onClick={() => setSelectedInv(inv)}>View</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>No invoices yet.</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Submit your first invoice to get started.</div>
            </div>
          )}
        </Card>

        {/* Invoice Detail / Tracker */}
        <Card style={{ padding: '22px' }}>
          {selectedInv ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>{selectedInv.id}</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#E8783B', letterSpacing: '-1px', marginTop: '4px' }}>{selectedInv.amount}</div>
                </div>
                <StatusBadge status={selectedInv.status} />
              </div>

              {/* Approval stages stepper */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '14px' }}>Approval Progress</div>
                {stages.map((s, i) => {
                  const done = i < selectedInv.stage;
                  const current = i === selectedInv.stage;
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < stages.length - 1 ? '0' : '0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#10B981' : current ? '#E8783B' : '#F1F5F9', border: `2px solid ${done ? '#10B981' : current ? '#E8783B' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: done || current ? 'white' : '#94A3B8', flexShrink: 0, animation: current ? 'dotPulse 2s ease infinite' : 'none', transition: 'all 200ms' }}>
                          {done ? '✓' : i + 1}
                        </div>
                        {i < stages.length - 1 && <div style={{ width: 2, height: 18, background: done ? '#10B981' : '#F1F5F9', margin: '2px 0' }} />}
                      </div>
                      <div style={{ paddingBottom: i < stages.length - 1 ? '18px' : '0' }}>
                        <div style={{ fontSize: '13px', fontWeight: current ? 700 : 500, color: done ? '#10B981' : current ? '#0F172A' : '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s}</div>
                        {current && <div style={{ fontSize: '11px', color: '#E8783B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>In progress</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedInv.status === 'QUERY_RAISED' && (
                <div style={{ background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Query from Finance Team</div>
                  <div style={{ fontSize: '12px', color: '#4C1D95', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Please provide original PO reference number for this invoice.</div>
                  <TjTextarea label="" placeholder="Your response…" rows={2} />
                  <Btn variant="purple" small>Send Reply</Btn>
                </div>
              )}

              <button onClick={() => setSelectedInv(null)} style={{ fontSize: '12px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '8px' }}>← Back to list</button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300, color: '#94A3B8', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
              <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#475569' }}>Select an invoice</div>
              <div style={{ fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px' }}>Click any row to view approval status and details</div>
            </div>
          )}
        </Card>
      </div>

      {/* Submit Invoice Modal */}
      <TjModal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit Invoice" width={520}>
        {/* File Upload + OCR Zone */}
        <div style={{ border: `1.5px dashed ${ocrResult ? '#10B981' : ocrLoading ? '#E8783B' : '#E2E8F0'}`, borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '16px', background: ocrResult ? '#F0FDF4' : '#FAFAF8', position: 'relative', overflow: 'hidden' }}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]); }} />
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>{ocrResult ? '✅' : ocrLoading ? '⏳' : '📎'}</div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: ocrResult ? '#065F46' : ocrLoading ? '#92400E' : '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {ocrResult ? `Invoice processed — ${Math.round((ocrResult.confidence || 0) * 100)}% confidence` : ocrLoading ? 'AI extracting invoice data…' : 'Upload Invoice PDF / Image'}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {ocrResult ? `${ocrResult.pages_processed || 1} page(s) processed` : 'Click to browse · PDF, JPG, PNG (max 10MB)'}
          </div>
          {!ocrResult && !ocrLoading && (
            <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(232,120,59,0.08), rgba(139,92,246,0.08))', border: '1px solid #EDE9FE', borderRadius: '999px', padding: '4px 12px' }}>
              <AIBadge small />
              <span style={{ fontSize: '11px', color: '#5B21B6', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Gemini Flash auto-extracts all fields</span>
            </div>
          )}
        </div>

        {/* OCR Confidence */}
        {ocrResult && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AIBadge small /> OCR Complete — Fields pre-filled
            </div>
            <div style={{ fontSize: '12px', color: '#047857', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Confidence: {Math.round((ocrResult.confidence || 0) * 100)}% · Model: {ocrResult.model_used || 'Gemini Flash'}
              {ocrResult.validation_errors?.length > 0 && <span style={{ color: '#92400E', marginLeft: 8 }}>⚠ {ocrResult.validation_errors[0]}</span>}
            </div>
          </div>
        )}

        <TjInput label="Invoice #" placeholder="INV-2026-001" value={formData.invoice_number} onChange={e => setFormData(f => ({...f, invoice_number: e.target.value}))} />
        <TjInput label="Amount (₹)" placeholder="0.00" type="number" value={formData.total_amount} onChange={e => setFormData(f => ({...f, total_amount: e.target.value}))} />
        <TjInput label="Invoice Date" type="date" value={formData.invoice_date} onChange={e => setFormData(f => ({...f, invoice_date: e.target.value}))} />
        <TjInput label="Business Purpose" placeholder="Service description" value={formData.business_purpose} onChange={e => setFormData(f => ({...f, business_purpose: e.target.value}))} />

        {submitError && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{submitError}</div>
        )}

        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Your invoice will go through the approval workflow. Anomaly detection runs automatically.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setSubmitOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit} disabled={submitting || ocrLoading}>
            {submitting ? 'Submitting…' : 'Submit for Approval'}
          </Btn>
        </div>
      </TjModal>
    </div>
  );
};

Object.assign(window, { VendorsScreen, ExpensesScreen, BudgetScreen, GuardrailsScreen, AuditScreen, SettingsScreen, VendorPortalScreen });
