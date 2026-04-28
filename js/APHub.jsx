// Tijori AI — Accounts Payable Hub

// Converts a backend Expense record to the AP table row format
function expenseToRow(exp) {
  const fmtAmt = (v) => {
    if (!v) return '₹0';
    const n = parseFloat(v);
    if (n >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n/100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };
  return {
    id: exp.invoice_number || exp.ref_no || exp.id.slice(0, 8),
    refNo: exp.ref_no,
    rawId: exp.id,
    vendor: exp.vendor_name || 'Unknown Vendor',
    amount: fmtAmt(exp.total_amount),
    date: exp.invoice_date || (exp.created_at ? exp.created_at.slice(0, 10) : ''),
    status: exp.status || 'SUBMITTED',
    assigned: exp.current_step ? `Step ${exp.current_step}` : '—',
    anomaly: !!(exp.anomaly_severity && exp.anomaly_severity !== 'NONE'),
    anomalySeverity: exp.anomaly_severity,
    _raw: exp,
  };
}

const DEPARTMENTS = ['Engineering — CC-001', 'Marketing — CC-002', 'Operations — CC-003', 'Human Resources — CC-004', 'Finance — CC-005', 'Legal — CC-006'];
const CATEGORIES = ['Travel', 'Software & Licences', 'Infrastructure', 'Marketing & Events', 'HR & Recruitment', 'Legal & Compliance', 'Office Supplies', 'Professional Services', 'Utilities', 'Other'];

const APHubScreen = ({ role: propRole, onNavigate }) => {
  const [selected, setSelected] = React.useState([]);
  const [modal, setModal] = React.useState(null);
  const [filter, setFilter] = React.useState('ALL');
  const [search, setSearch] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [invoices, setInvoices] = React.useState([]);
  const [loadingBills, setLoadingBills] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState('');
  const [authorityOpen, setAuthorityOpen] = React.useState(false);
  const [authorityLimits, setAuthorityLimits] = React.useState([]);
  const [authoritySaving, setAuthoritySaving] = React.useState(false);
  const [dept, setDept] = React.useState('');
  const [category, setCategory] = React.useState('Infrastructure');
  const [aiAccepted, setAiAccepted] = React.useState(false);
  const [stats, setStats] = React.useState(null);

  const loadBills = () => {
    const { BillsAPI, DashboardAPI } = window.TijoriAPI;
    setLoadingBills(true);
    Promise.all([BillsAPI.queue(), DashboardAPI.stats({ type: 'vendor' })])
      .then(([bills, s]) => {
        setInvoices((bills || []).map(expenseToRow));
        setStats(s);
      })
      .catch(() => {})
      .finally(() => setLoadingBills(false));
  };

  const loadAuthority = () => {
    const { BillsAPI } = window.TijoriAPI;
    BillsAPI.approvalAuthority().then(data => setAuthorityLimits(data || [])).catch(() => {});
  };

  React.useEffect(() => { loadBills(); loadAuthority(); }, []);

  // Dynamic role — use prop (from AppShell) or fall back to localStorage
  const currentRole = propRole || localStorage.getItem('tj_role') || 'CFO';
  const isL1 = currentRole === 'AP Clerk';
  const canManageAuthority = currentRole === 'Finance Admin' || currentRole === 'CFO';

  const filters = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'QUERY_RAISED', 'ANOMALY'];
  const filtered = invoices.filter(inv => {
    const matchF = filter === 'ALL'
      || (filter === 'ANOMALY' ? inv.anomaly : (inv.status.startsWith(filter) || inv.status === filter));
    const matchS = !search || inv.id.toLowerCase().includes(search.toLowerCase()) || inv.vendor.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === filtered.length ? [] : filtered.map(i => i.id));
  const handleAction = (type, invoice) => { setModal({ type, invoice }); setNotes(''); setDept(''); setAiAccepted(false); };

  const budgetData = {
    'Engineering — CC-001': { rem: 0, total: 240000, color: '#EF4444' },
    'Marketing — CC-002': { rem: 195000, total: 1300000, color: '#F59E0B' },
    'Operations — CC-003': { rem: 850000, total: 1500000, color: '#10B981' },
    'Human Resources — CC-004': { rem: 256000, total: 800000, color: '#10B981' },
    'Finance — CC-005': { rem: 280000, total: 500000, color: '#10B981' },
    'Legal — CC-006': { rem: 120000, total: 300000, color: '#F59E0B' },
  };
  const budgetInfo = budgetData[dept];

  const confirmAction = async () => {
    const { type, invoice } = modal;
    const { BillsAPI } = window.TijoriAPI;
    setActionLoading(true);
    setActionError('');
    try {
      if (type === 'approve') {
        await BillsAPI.approve(invoice.rawId, notes || 'Approved', '');
      } else if (type === 'reject') {
        await BillsAPI.reject(invoice.rawId, notes);
      } else if (type === 'query') {
        await BillsAPI.query(invoice.rawId, notes);
      }
      setModal(null); setNotes(''); setDept(''); setAiAccepted(false);
      loadBills();
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const modalConfigs = {
    approve: { title: '✓ Approve Invoice', color: '#065F46', btn: 'Confirm Approval', btnV: 'green' },
    reject: { title: '✕ Reject Invoice', color: '#991B1B', btn: 'Confirm Rejection', btnV: 'destructive' },
    query: { title: '? Raise Query to Vendor', color: '#5B21B6', btn: 'Send Query to Vendor', btnV: 'purple' },
  };

  const updateAuthority = async (grade, field, value) => {
    const { BillsAPI } = window.TijoriAPI;
    setAuthoritySaving(true);
    try {
      await BillsAPI.updateApprovalAuthority({ grade, [field]: value });
      loadAuthority();
    } catch (err) {
      setActionError(err.message || 'Authority update failed.');
    } finally {
      setAuthoritySaving(false);
    }
  };

  return (
    <div style={{ padding: '32px', position: 'relative' }}>
      <SectionHeader title="Accounts Payable Hub"
        subtitle="Manage invoice approvals, queries, and payment authorisations."
        right={<>
          <div style={{ position: 'relative' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices…"
              style={{ padding: '8px 12px 8px 34px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', width: 220, background: '#FAFAF8' }} />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#94A3B8' }}>🔍</span>
          </div>
          <Btn variant="secondary" small onClick={() => {
            const rows = [['Invoice #', 'Ref No', 'Vendor', 'Amount', 'Date', 'Status', 'Anomaly']];
            invoices.forEach(inv => rows.push([inv.id, inv.refNo || '', inv.vendor, inv.amount, inv.date, inv.status, inv.anomaly ? inv.anomalySeverity || 'YES' : 'NO']));
            const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `ap_hub_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
          }}>Export ↓</Btn>
        </>}
      />

      <StatsRow cards={[
        { label: 'Total Outstanding', value: stats ? (() => { const n = parseFloat(stats.total_outstanding_amount || 0); return n >= 10000000 ? `₹${(n/10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(2)}L` : `₹${n.toFixed(0)}`; })() : '…', delta: `${stats?.total_pending || 0} pending`, deltaType: 'neutral' },
        { label: 'In Your Queue', value: loadingBills ? '…' : String(invoices.length), delta: 'awaiting action', deltaType: 'neutral', pulse: invoices.length > 0 },
        { label: 'Approved Total', value: stats ? String(stats.total_approved) : '…', delta: 'all time', deltaType: 'positive' },
      ]} />

      {/* Authority limits */}
      <div style={{ marginBottom: '20px', background: 'white', borderRadius: '14px', border: '1px solid #F1F0EE', overflow: 'hidden' }}>
        <button onClick={() => setAuthorityOpen(!authorityOpen)}
          style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>⚖</span>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>Finance Payment Authority Limits</span>
          </div>
          <span style={{ color: '#94A3B8', fontSize: '13px', display: 'inline-block', transform: authorityOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>▼</span>
        </button>
        {authorityOpen && (
          <div style={{ borderTop: '1px solid #F1F0EE' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8F7F5' }}>
                  {['Role', 'Approval Limit', 'Settlement Limit', 'Monthly Approval Budget'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {authorityLimits.map(r => (
                  <tr key={r.grade} style={{ borderTop: '1px solid #F1F0EE' }}>
                    <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.label}</td>
                    {['approval_limit', 'settlement_limit', 'monthly_approval_budget'].map(field => (
                      <td key={field} style={{ padding: '12px 20px', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", color: '#E8783B', fontWeight: 500 }}>
                        {canManageAuthority && r.grade < 5 ? (
                          <input
                            type="number"
                            defaultValue={r[field] == null || !isFinite(r[field]) ? '' : r[field]}
                            placeholder={r[field] == null || !isFinite(r[field]) ? 'Unlimited' : ''}
                            onBlur={e => updateAuthority(r.grade, field, e.target.value)}
                            disabled={authoritySaving}
                            style={{ width: 140, padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px' }}
                          />
                        ) : (
                          <span>{r[field] == null || !isFinite(r[field]) ? 'Unlimited' : `₹${Number(r[field]).toLocaleString('en-IN')}`}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {canManageAuthority && (
              <div style={{ padding: '10px 20px', borderTop: '1px solid #F1F0EE', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Only Finance Admin and CFO can edit approval and settlement limits.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #E8783B, #FF6B35)', borderRadius: '12px', padding: '12px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px', color: 'white', animation: 'slideUp 200ms ease' }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px' }}>{selected.length} invoice{selected.length > 1 ? 's' : ''} selected</span>
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={async () => {
              const { BillsAPI } = window.TijoriAPI;
              setActionLoading(true); setActionError('');
              const selectedRawIds = filtered.filter(inv => selected.includes(inv.id)).map(inv => inv.rawId);
              let errors = [];
              for (const rawId of selectedRawIds) {
                try { await BillsAPI.approve(rawId, 'Bulk approved', ''); }
                catch(e) { errors.push(rawId); }
              }
              setActionLoading(false);
              setSelected([]);
              loadBills();
              if (errors.length) setActionError(`${errors.length} invoice(s) could not be approved.`);
            }} disabled={actionLoading}>Bulk Approve</button>
            <button style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={async () => {
              const { BillsAPI } = window.TijoriAPI;
              setActionLoading(true); setActionError('');
              const selectedRawIds = filtered.filter(inv => selected.includes(inv.id)).map(inv => inv.rawId);
              let errors = [];
              for (const rawId of selectedRawIds) {
                try { await BillsAPI.reject(rawId, 'Bulk rejected'); }
                catch(e) { errors.push(rawId); }
              }
              setActionLoading(false);
              setSelected([]);
              loadBills();
              if (errors.length) setActionError(`${errors.length} invoice(s) could not be rejected.`);
            }} disabled={actionLoading}>Bulk Reject</button>
            <button onClick={() => setSelected([])} style={{ padding: '6px 14px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Clear</button>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.04em', transition: 'all 150ms', background: filter === f ? '#E8783B' : '#F8F7F5', color: filter === f ? 'white' : '#64748B' }}>
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              <th style={{ padding: '12px 16px', width: 40 }}>
                <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ accentColor: '#E8783B', cursor: 'pointer' }} />
              </th>
              {['Invoice #', 'Vendor', 'Amount', 'Date', 'Status', 'Assigned To', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const sel = selected.includes(inv.id);
              return (
                <tr key={inv.id}
                  style={{ borderTop: '1px solid #F1F0EE', background: sel ? '#FFF8F5' : inv.anomaly ? 'rgba(239,68,68,0.02)' : 'white', transition: 'background 150ms', height: 52, cursor: 'pointer' }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = inv.anomaly ? 'rgba(239,68,68,0.04)' : '#FFF8F5'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = sel ? '#FFF8F5' : inv.anomaly ? 'rgba(239,68,68,0.02)' : 'white'; }}
                  onClick={() => onNavigate && onNavigate('ap-match', { invoice: inv })}>
                  <td style={{ padding: '0 16px' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={sel} onChange={() => toggleSelect(inv.id)} style={{ accentColor: '#E8783B', cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#0F172A', fontWeight: 600 }}>{inv.id}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#E8783B', marginTop: '1px' }}>{inv.refNo}</div>
                  </td>
                  <td style={{ padding: '0 16px', fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.vendor}</td>
                  <td style={{ padding: '0 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#E8783B', letterSpacing: '-0.5px' }}>{inv.amount}</td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.date}</td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <StatusBadge status={inv.status} />
                      {inv.anomaly && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', display: 'block', animation: 'dotPulse 1.5s ease infinite' }} />}
                    </div>
                  </td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.assigned}</td>
                  <td style={{ padding: '0 16px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {inv._raw?.action_permissions?.can_approve && <Btn variant="green" small onClick={() => handleAction('approve', inv)}>Approve</Btn>}
                      {inv._raw?.action_permissions?.can_reject && <Btn variant="destructive" small onClick={() => handleAction('reject', inv)}>Reject</Btn>}
                      {inv._raw?.action_permissions?.can_query && <Btn variant="purple" small onClick={() => handleAction('query', inv)}>Query</Btn>}
                      {(!inv._raw?.action_permissions?.can_approve && !inv._raw?.action_permissions?.can_reject && !inv._raw?.action_permissions?.can_query) && <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loadingBills && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px' }}>Loading bills…</div>
        )}
        {!loadingBills && filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px' }}>
            {invoices.length === 0 ? 'No bills in your queue.' : 'No invoices match this filter.'}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {modal && (() => {
        const cfg = modalConfigs[modal.type];
        return (
          <TjModal open={!!modal} onClose={() => setModal(null)} title={cfg.title} accentColor={cfg.color} width={520}>
            {/* Invoice summary */}
            <div style={{ marginBottom: '16px', padding: '14px', background: '#F8F7F5', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Invoice</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#E8783B' }}>{modal.invoice.id}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{modal.invoice.vendor}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-1px', marginTop: '4px' }}>{modal.invoice.amount}</div>
            </div>

            {/* Department + Category — only on approve */}
            {modal.type === 'approve' && (
              <>
                {/* Department assignment */}
                <div style={{ border: `2px solid ${isL1 ? '#E8783B' : '#E2E8F0'}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '14px', background: isL1 ? '#FFF7ED' : '#F8F7F5' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: isL1 ? '#E8783B' : '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Charge to Department</span>
                    {isL1 && <span style={{ color: '#94A3B8', fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>Links spend to budget · Not visible to vendor</span>}
                  </div>
                  {isL1 ? (
                    <>
                      {!aiAccepted && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px 10px', background: '#F5F3FF', borderRadius: '8px', border: '1px solid #EDE9FE' }}>
                          <AIBadge small />
                          <span style={{ fontSize: '12px', color: '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif", flex: 1 }}>AI suggests: <strong>Engineering — CC-001</strong> (87% confidence)</span>
                          <Btn variant="purple" small onClick={() => { setDept('Engineering — CC-001'); setAiAccepted(true); }}>Accept</Btn>
                        </div>
                      )}
                      <select value={dept} onChange={e => setDept(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0F172A', background: 'white', outline: 'none', cursor: 'pointer' }}>
                        <option value="">— Select department —</option>
                        {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </>
                  ) : (
                    <span style={{ background: '#F1F5F9', color: '#0F172A', padding: '5px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'inline-block' }}>Engineering — CC-001</span>
                  )}
                </div>

                {/* Expense category */}
                <div style={{ border: `2px solid ${isL1 ? '#E8783B' : '#E2E8F0'}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '14px', background: isL1 ? '#FFF7ED' : '#F8F7F5' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: isL1 ? '#E8783B' : '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>Expense Category</div>
                  {isL1 ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <AIBadge small />
                        <span style={{ fontSize: '12px', color: '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI pre-filled: <strong>{category}</strong> — 91% confidence</span>
                      </div>
                      <select value={category} onChange={e => setCategory(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0F172A', background: 'white', outline: 'none', cursor: 'pointer' }}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </>
                  ) : (
                    <span style={{ background: '#EDE9FE', color: '#5B21B6', padding: '5px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'inline-block' }}>{category}</span>
                  )}

                  {/* Budget impact preview */}
                  {dept && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: budgetInfo ? (budgetInfo.rem === 0 ? '#FEE2E2' : budgetInfo.rem < 200000 ? '#FEF3C7' : '#F0FDF4') : '#F8F7F5', border: `1px solid ${budgetInfo ? (budgetInfo.rem === 0 ? '#FECACA' : budgetInfo.rem < 200000 ? '#FDE68A' : '#BBF7D0') : '#E2E8F0'}` }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>Budget Impact</div>
                      {budgetInfo ? (
                        <div style={{ fontSize: '12px', color: budgetInfo.rem === 0 ? '#991B1B' : budgetInfo.rem < 200000 ? '#92400E' : '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
                          {budgetInfo.rem === 0
                            ? '🔴 Engineering budget is fully exhausted — this will exceed cap'
                            : `${category} · ₹${(budgetInfo.rem / 100000).toFixed(1)}L remaining of ₹${(budgetInfo.total / 100000).toFixed(1)}L`}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No budget configured for this category</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {modal.type === 'query' && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>NOTE — Department & category details are NOT included in this query to the vendor.</div>
              </div>
            )}

            <TjTextarea
              label={modal.type === 'reject' ? 'Reason for Rejection' : modal.type === 'query' ? 'Query for Vendor' : 'Notes (optional)'}
              placeholder={modal.type === 'reject' ? 'Minimum 10 characters required…' : modal.type === 'query' ? 'What clarification do you need from the vendor?' : 'Add any approval notes…'}
              value={notes} onChange={e => setNotes(e.target.value)} required={modal.type === 'reject'} />

            {actionError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {actionError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Btn variant="secondary" onClick={() => { setModal(null); setActionError(''); }}>Cancel</Btn>
              <Btn variant={cfg.btnV} onClick={confirmAction} disabled={(modal.type === 'reject' && notes.length < 10) || actionLoading}>
                {actionLoading ? 'Processing…' : cfg.btn}
              </Btn>
            </div>
          </TjModal>
        );
      })()}
    </div>
  );
};

Object.assign(window, { APHubScreen });
