// Tijori AI — Persona-specific Home Dashboards

// ─── AP CLERK DASHBOARD ───────────────────────────────────────────────────────

const APClerkDashboard = ({ role, onNavigate }) => {
  const [modal, setModal] = React.useState(null);
  const [notes, setNotes] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const { BillsAPI } = window.TijoriAPI;
    BillsAPI.queue()
      .then(bills => {
        setItems((bills || []).map(b => ({
          id: b.invoice_number || b.ref_no || b.id,
          refNo: b.ref_no,
          rawId: b.id,
          vendor: b.vendor_name || '—',
          amount: (() => { const n = parseFloat(b.total_amount || 0); return n >= 100000 ? '\u20b9' + (n / 100000).toFixed(2) + 'L' : '\u20b9' + n.toLocaleString('en-IN'); })(),
          date: b.invoice_date || (b.created_at || '').slice(0, 10),
          status: b.status || 'PENDING_L1',
          priority: b.anomaly_severity === 'CRITICAL' || b.anomaly_severity === 'HIGH' ? 'high' : b.anomaly_severity === 'MEDIUM' ? 'medium' : 'low',
          age: b.created_at ? Math.floor((Date.now() - new Date(b.created_at)) / 86400000) + 'd' : '—',
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const confirmAction = async () => {
    const { type, inv } = modal;
    const { BillsAPI } = window.TijoriAPI;
    try {
      const comment = notes || (type === 'approve' ? 'Approved by AP Clerk' : 'Rejected by AP Clerk');
      if (type === 'approve') await BillsAPI.approve(inv.rawId, comment, '');
      else if (type === 'reject') await BillsAPI.reject(inv.rawId, comment);
      setItems(prev => prev.map(i => i.id === inv.id ? { ...i, status: type === 'approve' ? 'APPROVED' : 'REJECTED' } : i));
    } catch(err) { alert(err.message || 'Action failed'); }
    setModal(null); setNotes('');
  };

  const pending = items.filter(i => i.status === 'PENDING_L1');
  const priorityColor = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px', animation: 'fadeUp 250ms ease both' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8783B', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AP Clerk · Priya Mehta</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>My Processing Queue</h1>
        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>April 19, 2026 — {pending.length} invoices require your action today</div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', animation: 'fadeUp 250ms 60ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {[
          { label: 'Awaiting My Review', value: String(pending.length), color: '#E8783B', delta: 'Act today', deltaType: 'neutral', pulse: true },
          { label: 'Processed This Week', value: '12', color: '#10B981', delta: '↑ 4 vs last', deltaType: 'positive' },
          { label: 'Avg. Processing Time', value: '1.4d', delta: 'Within SLA', deltaType: 'positive' },
          { label: 'Total Value in Queue', value: '₹4.75L', delta: 'Pending L1', deltaType: 'neutral' },
        ].map((c, i) => <KPICard key={i} {...c} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', animation: 'fadeUp 250ms 120ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F0EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Invoice Queue</div>
            <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>L1 Approval Level</span>
          </div>
          {items.map((inv) => {
            const done = ['APPROVED', 'REJECTED'].includes(inv.status);
            return (
              <div key={inv.id} 
                   onClick={() => onNavigate && onNavigate('ap-match', { invoice: inv })}
                   style={{ padding: '16px 22px', borderBottom: '1px solid #F8F7F5', display: 'flex', alignItems: 'center', gap: '16px', opacity: done ? 0.5 : 1, background: done ? '#F8F7F5' : 'white', cursor: 'pointer', transition: 'background 150ms' }}
                   onMouseEnter={e => !done && (e.currentTarget.style.background = '#FFF8F5')}
                   onMouseLeave={e => !done && (e.currentTarget.style.background = 'white')}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColor[inv.priority], flexShrink: 0, boxShadow: inv.priority === 'high' ? `0 0 0 3px ${priorityColor[inv.priority]}33` : 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B', fontWeight: 500 }}>{inv.id}</span>
                    <span style={{ fontSize: '10px', color: priorityColor[inv.priority], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.priority}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.vendor}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.date} · {inv.age} old</div>
                </div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '16px', color: '#0F172A', letterSpacing: '-0.5px', flexShrink: 0 }}>{inv.amount}</div>
                <div style={{ flexShrink: 0 }}>
                  {done ? <StatusBadge status={inv.status} /> : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Btn variant="green" small onClick={(e) => { e.stopPropagation(); setModal({ type: 'approve', inv }); }}>Approve</Btn>
                      <Btn variant="destructive" small onClick={(e) => { e.stopPropagation(); setModal({ type: 'reject', inv }); }}>Reject</Btn>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ padding: '20px', background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: 24, height: 24, borderRadius: '6px', background: 'rgba(232,120,59,0.2)', color: '#E8783B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✦</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px' }}>AI Copilot Insights</div>
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>
              I've analyzed the current queue. <span style={{ color: '#E8783B', fontWeight: 600 }}>2 invoices</span> show high variance from historical patterns. I recommend reviewing <span style={{ color: 'white' }}>TS-INV-056</span> first as it's nearing MSME SLA limit.
            </div>
          </Card>
          <Card style={{ padding: '20px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '4px' }}>SLA Performance</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '14px' }}>Target: process within 2 business days</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '40px', color: '#10B981', letterSpacing: '-2px', marginBottom: '4px' }}>94%</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '12px' }}>On-time this month</div>
            <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '94%', background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: 4 }} />
            </div>
          </Card>
        </div>
      </div>

      {modal && (
        <TjModal open onClose={() => setModal(null)}
          title={modal.type === 'approve' ? '✓ Approve Invoice' : '✕ Reject Invoice'}
          accentColor={modal.type === 'approve' ? '#065F46' : '#991B1B'}>
          <div style={{ background: '#F8F7F5', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{modal.inv.id}</div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{modal.inv.vendor}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '22px', color: '#0F172A', letterSpacing: '-1px', marginTop: '4px' }}>{modal.inv.amount}</div>
          </div>

          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px' }}>✦</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Verification Result</span>
            </div>
            <div style={{ fontSize: '11px', color: '#064E3B', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.4 }}>
              {modal.inv.priority === 'high' ? 
                '⚠️ Anomaly Alert: Variance detected in line-item amounts vs previous months. Manual review recommended.' : 
                '✅ No anomalies detected. GST math matches perfectly. Duplicate check passed (0 found). Safe to process.'}
            </div>
          </div>

          <TjTextarea label={modal.type === 'reject' ? 'Reason for Rejection *' : 'Notes (optional)'} placeholder={modal.type === 'reject' ? 'Minimum 10 characters required…' : 'Add approval notes…'} value={notes} onChange={e => setNotes(e.target.value)} required={modal.type === 'reject'} />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant={modal.type === 'approve' ? 'green' : 'destructive'} onClick={() => confirmAction(modal.type, modal.inv)} disabled={modal.type === 'reject' && notes.length < 10}>
              {modal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Btn>
          </div>
        </TjModal>
      )}

      <FloatingCopilot role={role} />
    </div>
  );
};

// ─── FINANCE MANAGER DASHBOARD ────────────────────────────────────────────────

const FinanceManagerDashboard = ({ role, onNavigate }) => {
  const [expandedTeam, setExpandedTeam] = React.useState(null);
  const approvalChain = [
    { stage: 'Pending L1', count: 4, amount: '₹4.75L', color: '#F59E0B', items: ['INV-2024-090 · GlobalSync · ₹1,22,500'] },
    { stage: 'Pending HOD', count: 2, amount: '₹3.58L', color: '#E8783B', items: ['INV-2024-089 · Sigma Elec · ₹2,15,500'] },
    { stage: 'Pending Finance Mgr', count: 1, amount: '₹8.40L', color: '#EF4444', items: ['INV-2024-091 · NovaBridge · ₹8,40,000'] },
    { stage: 'Pending CFO', count: 2, amount: '₹10.55L', color: '#8B5CF6', items: ['INV-2024-091 · NovaBridge · ₹8,40,000'] },
  ];
  const teamBudgets = [
    { name: 'Engineering', manager: 'Dev Kapoor', util: 100, spent: '$2.4M', total: '$2.4M', color: '#EF4444' },
    { name: 'Marketing', manager: 'Sunita Rao', util: 85, spent: '$1.1M', total: '$1.3M', color: '#F59E0B' },
    { name: 'Operations', manager: 'Rahul Desai', util: 43, spent: '$0.65M', total: '$1.5M', color: '#10B981' },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8783B', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Finance Manager · Kavitha Sharma</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>Approval Pipeline</h1>
        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>April 19, 2026 — Monitor approvals, budget health, and team spend</div>
      </div>

      <StatsRow cards={[
        { label: 'Awaiting My Approval', value: '1', delta: '↑ Urgent', deltaType: 'negative', pulse: true, color: '#EF4444' },
        { label: 'Total Pipeline Value', value: '₹20.1L', delta: 'Across all stages', deltaType: 'neutral' },
        { label: 'Avg Approval Time', value: '0.8d', delta: '↓ 20% vs target', deltaType: 'positive', color: '#10B981' },
        { label: 'Budget Alerts', value: '1', delta: 'Engineering 100%', deltaType: 'negative', pulse: true },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '18px' }}>Live Approval Pipeline</div>
          {approvalChain.map((stage, i) => (
            <div key={i} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color, display: 'block' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stage.stage}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#E8783B', letterSpacing: '-0.5px' }}>{stage.amount}</span>
                  <span style={{ background: stage.color + '22', color: stage.color, padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stage.count}</span>
                </div>
              </div>
              <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(4 - i) * 22}%`, background: stage.color, borderRadius: 4, transition: 'width 600ms ease' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: '16px', padding: '14px', background: '#FEF3C7', borderRadius: '12px', border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>⚡ Action Required</div>
            <div style={{ fontSize: '12px', color: '#78350F', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>INV-2024-091 (NovaBridge · ₹8,40,000) is pending your Finance Manager approval.</div>
            <div style={{ marginTop: '10px' }}><Btn variant="primary" small onClick={() => onNavigate && onNavigate('ap-match', { invoice: { id: 'INV-2024-091' } })}>Review Now →</Btn></div>
          </div>
        </Card>

        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '18px' }}>Team Budget Health</div>
          {teamBudgets.map((t, i) => (
            <div key={i} style={{ marginBottom: '16px', cursor: 'pointer' }} onClick={() => setExpandedTeam(expandedTeam === i ? null : i)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.name}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.manager}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.spent} / {t.total}</span>
                  <span style={{ background: t.color + '22', color: t.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.util}%</span>
                </div>
              </div>
              <div style={{ height: 10, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(t.util, 100)}%`, background: t.color, borderRadius: 5 }} />
              </div>
              {expandedTeam === i && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#F8F7F5', borderRadius: '8px', animation: 'fadeUp 200ms ease' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6 }}>
                    {t.util >= 100 ? '🔴 Booking suspended — CFO review needed' : t.util >= 80 ? '⚠ Approaching critical threshold' : '✓ Budget utilisation is healthy'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>

      <Card style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Team Expense Submissions</div>
          <Btn variant="secondary" small>View All</Btn>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { name: 'Aisha Nair', exp: 'EXP-441', amt: '₹4,200', cat: 'Travel', status: 'PENDING_L1' },
            { name: 'Rahul Desai', exp: 'EXP-440', amt: '₹12,500', cat: 'Software', status: 'APPROVED' },
            { name: 'Dev Kapoor', exp: 'EXP-438', amt: '₹6,400', cat: 'Equipment', status: 'REJECTED' },
          ].map((e, i) => (
            <div key={i} style={{ flex: 1, background: '#F8F7F5', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '12px', color: 'white' }}>{e.name[0]}</div>
                <StatusBadge status={e.status} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.name}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{e.exp}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>{e.cat}</span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '16px', color: '#E8783B', letterSpacing: '-0.5px' }}>{e.amt}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── FINANCE ADMIN DASHBOARD ──────────────────────────────────────────────────

const FinanceAdminDashboard = ({ onNavigate }) => {
  const [initiating, setInitiating] = React.useState(null);
  const paymentQueue = [
    { id: 'PAY-2024-041', vendor: 'CloudInfra Services', amount: '₹6,80,000', bank: 'HDFC •• 4521', approved: 'CFO', due: 'Today', urgent: true },
    { id: 'PAY-2024-040', vendor: 'Acme Office Supplies', amount: '₹45,200', bank: 'ICICI •• 7890', approved: 'Finance Mgr', due: 'Apr 20', urgent: false },
    { id: 'PAY-2024-039', vendor: 'Meridian Logistics', amount: '₹92,300', bank: 'HDFC •• 1234', approved: 'HOD', due: 'Apr 22', urgent: false },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8783B', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Finance Admin · Meera Joshi</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>Payment Control Center</h1>
        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>April 19, 2026 — Initiate payments, manage vendors, oversee system health</div>
      </div>

      <StatsRow cards={[
        { label: 'Payments Due Today', value: '1', delta: '↑ Urgent', deltaType: 'negative', color: '#EF4444', pulse: true },
        { label: 'Total Payable This Week', value: '₹8.17L', delta: '3 approved', deltaType: 'neutral' },
        { label: 'Vendors Pending Approval', value: '1', delta: 'Sigma Elec.', deltaType: 'neutral', color: '#F59E0B' },
        { label: 'System Anomalies', value: '3', delta: 'High priority', deltaType: 'negative', color: '#EF4444', pulse: true },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', marginBottom: '20px' }}>
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F0EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Payment Initiation Queue</div>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>All fully approved</span>
          </div>
          {paymentQueue.map((p, i) => (
            <div key={i} style={{ padding: '16px 22px', borderBottom: '1px solid #F8F7F5', display: 'flex', alignItems: 'center', gap: '16px', background: p.urgent ? 'rgba(239,68,68,0.02)' : 'white' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{p.id}</span>
                  {p.urgent && <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '1px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>URGENT</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.vendor}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.bank} · Approved by {p.approved} · Due {p.due}</div>
              </div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '18px', color: '#0F172A', letterSpacing: '-0.5px', flexShrink: 0 }}>{p.amount}</div>
              <Btn variant="primary" small onClick={() => setInitiating(p)}>Initiate Payment</Btn>
            </div>
          ))}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Card style={{ padding: '20px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>System Health</div>
            {[
              { label: 'D365 ERP Sync', status: 'Operational', color: '#10B981' },
              { label: 'AI Anomaly Engine', status: 'Running', color: '#10B981' },
              { label: 'Email Server', status: 'Operational', color: '#10B981' },
              { label: 'Webhook Service', status: 'Degraded', color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F8F7F5' }}>
                <span style={{ fontSize: '12px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block', animation: s.color === '#10B981' ? 'dotPulse 2s ease infinite' : 'none' }} />
                  {s.status}
                </span>
              </div>
            ))}
          </Card>
          <Card style={{ padding: '20px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '10px' }}>Vendor Registry</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '40px', color: '#0F172A', letterSpacing: '-2px' }}>6</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '12px' }}>Total registered vendors</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>4 Active</span>
              <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>1 Pending</span>
              <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>1 Suspended</span>
            </div>
          </Card>
        </div>
      </div>

      {initiating && (
        <TjModal open onClose={() => setInitiating(null)} title="Initiate Payment" accentColor="#065F46" width={440}>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#065F46', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>FULLY APPROVED — READY TO DISBURSE</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{initiating.id}</div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{initiating.vendor}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '24px', color: '#0F172A', letterSpacing: '-1px', marginTop: '4px' }}>{initiating.amount}</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px' }}>Bank: {initiating.bank} · Approved by {initiating.approved}</div>
          </div>
          <TjInput label="Payment Reference" placeholder="PAY-REF-2024-XXX" />
          <TjTextarea label="Internal Notes" placeholder="Optional payment notes for audit trail…" rows={2} />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setInitiating(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => setInitiating(null)}>Confirm Payment</Btn>
          </div>
        </TjModal>
      )}

      <FloatingCopilot role={role} />
    </div>
  );
};

// ─── EMPLOYEE DASHBOARD ───────────────────────────────────────────────────────

const EmployeeDashboard = ({ role, onNavigate }) => {
  const [fileOpen, setFileOpen] = React.useState(false);
  const [expCategory, setExpCategory] = React.useState('Travel');
  const [expAmount, setExpAmount] = React.useState('');
  const [uploadDone, setUploadDone] = React.useState(false);
  const [aiAccepted, setAiAccepted] = React.useState(false);

  const myExpenses = [
    { id: 'EXP-2024-441', amount: '₹4,200', date: 'Apr 19', category: 'Travel', status: 'PENDING_L1', aiCat: true, conf: 91 },
    { id: 'EXP-2024-428', amount: '₹2,800', date: 'Apr 12', category: 'Office Supplies', status: 'APPROVED', aiCat: false, conf: null },
    { id: 'EXP-2024-415', amount: '₹6,500', date: 'Apr 5', category: 'Travel', status: 'PAID', aiCat: false, conf: null },
    { id: 'EXP-2024-402', amount: '₹1,200', date: 'Mar 28', category: 'Meals', status: 'PAID', aiCat: false, conf: null },
  ];

  const EXP_CATS = ['Travel', 'Software & Licences', 'Office Supplies', 'Marketing & Events', 'Professional Services', 'Meals', 'Other'];
  const budgetMap = { 'Travel': { rem: 180000, total: 300000 }, 'Software & Licences': { rem: 420000, total: 600000 }, 'Office Supplies': { rem: 85000, total: 100000 } };
  const budgetInfo = budgetMap[expCategory];
  const budgetPct = budgetInfo ? Math.round((budgetInfo.rem / budgetInfo.total) * 100) : null;
  const budgetColor = budgetPct === null ? '#94A3B8' : budgetPct > 50 ? '#10B981' : budgetPct > 20 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px', animation: 'fadeUp 250ms ease both' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8783B', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Employee · Aisha Nair</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>My Expenses</h1>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>April 19, 2026 — Track your expense claims and reimbursements</div>
          </div>
          <Btn variant="primary" icon={<span>+</span>} onClick={() => { setFileOpen(true); setUploadDone(false); setAiAccepted(false); setExpAmount(''); }}>File Expense</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', animation: 'fadeUp 250ms 60ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {[
          { label: 'Pending Reimbursement', value: '₹4,200', delta: '1 claim', deltaType: 'neutral', color: '#F59E0B', pulse: true },
          { label: 'Approved This Month', value: '₹2,800', delta: '↑ On track', deltaType: 'positive', color: '#10B981' },
          { label: 'Total Paid Out', value: '₹7,700', delta: 'This quarter', deltaType: 'positive', color: '#10B981' },
          { label: 'Avg. Processing Time', value: '1.8d', delta: 'From submit', deltaType: 'positive' },
        ].map((c, i) => <KPICard key={i} {...c} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', animation: 'fadeUp 250ms 120ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {/* My Expenses table */}
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F0EE', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>My Claims</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Claim ID', 'Category', 'Amount', 'Date', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myExpenses.map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid #F1F0EE', height: 52, transition: 'background 150ms' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#FFF8F5'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{e.id}</td>
                  <td style={{ padding: '0 16px' }}>
                    {e.aiCat ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F5F3FF', color: '#5B21B6', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <AIBadge small />{e.category}<span style={{ fontSize: '10px', fontWeight: 700 }}>{e.conf}%</span>
                      </span>
                    ) : (
                      <span style={{ background: '#F1F5F9', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.category}</span>
                    )}
                  </td>
                  <td style={{ padding: '0 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#E8783B', letterSpacing: '-0.5px' }}>{e.amount}</td>
                  <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.date}</td>
                  <td style={{ padding: '0 16px' }}><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Quick tips + policy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Card style={{ padding: '20px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '14px' }}>Expense Policy</div>
            {[
              { rule: 'Meals', limit: '₹500 / day', icon: '🍽' },
              { rule: 'Local Travel', limit: '₹1,500 / day', icon: '🚗' },
              { rule: 'Accommodation', limit: '₹5,000 / night', icon: '🏨' },
              { rule: 'Air Travel', limit: 'Economy class only', icon: '✈' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 3 ? '1px solid #F8F7F5' : 'none' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.rule}</div>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>{r.limit}</span>
              </div>
            ))}
          </Card>
          <Card style={{ padding: '20px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A', marginBottom: '8px' }}>AI-Assisted Filing</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '14px', lineHeight: 1.6 }}>Upload your receipt and our AI will auto-extract amount, date, and suggest the right expense category.</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(232,120,59,0.1), rgba(139,92,246,0.1))', border: '1px solid #EDE9FE', borderRadius: '999px', padding: '5px 12px' }}>
              <AIBadge small /><span style={{ fontSize: '11px', color: '#5B21B6', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Powered by Tijori Intelligence</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              <Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setFileOpen(true); setUploadDone(false); setAiAccepted(false); setExpAmount(''); }}>
                + File New Expense
              </Btn>
            </div>
          </Card>
        </div>
      </div>

      {/* File Expense Panel */}
      <SidePanel open={fileOpen} onClose={() => setFileOpen(false)} title="File Expense / Bill">
        <div style={{ border: `1.5px dashed ${uploadDone ? '#10B981' : '#E2E8F0'}`, borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '20px', background: uploadDone ? '#F0FDF4' : '#FAFAF8', cursor: 'pointer', transition: 'all 200ms' }}
          onMouseEnter={e => { if (!uploadDone) e.currentTarget.style.borderColor = '#E8783B'; }}
          onMouseLeave={e => { if (!uploadDone) e.currentTarget.style.borderColor = '#E2E8F0'; }}
          onClick={() => setUploadDone(true)}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>{uploadDone ? '✅' : '📄'}</div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: uploadDone ? '#065F46' : '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {uploadDone ? 'Receipt uploaded — AI extracting details…' : 'Upload Receipt or Invoice'}
          </div>
          {!uploadDone && (
            <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(232,120,59,0.08), rgba(139,92,246,0.08))', border: '1px solid #EDE9FE', borderRadius: '999px', padding: '4px 12px' }}>
              <AIBadge small /><span style={{ fontSize: '11px', color: '#5B21B6', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Powered — auto-extracts line items</span>
            </div>
          )}
        </div>

        {/* Smart Category */}
        <div style={{ border: '2px solid #E8783B', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', background: '#FFF7ED' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#E8783B', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>Expense Category</div>
          {uploadDone && !aiAccepted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '9px 12px', background: '#F5F3FF', borderRadius: '8px', border: '1px solid #EDE9FE' }}>
              <AIBadge small />
              <span style={{ fontSize: '12px', color: '#5B21B6', fontFamily: "'Plus Jakarta Sans', sans-serif", flex: 1 }}>AI suggests: <strong>{expCategory}</strong> — 75% confidence</span>
              <Btn variant="purple" small onClick={() => { setAiAccepted(true); }}>Accept</Btn>
            </div>
          )}
          <select value={expCategory} onChange={e => setExpCategory(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0F172A', background: 'white', outline: 'none', cursor: 'pointer', marginBottom: '8px' }}>
            {EXP_CATS.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ fontSize: '11px', color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>
            Category helps route this to the correct budget. Your approver may update this.
          </div>
        </div>

        {/* Budget impact */}
        {expAmount && budgetInfo && (
          <div style={{ padding: '12px 14px', borderRadius: '10px', background: budgetColor === '#EF4444' ? '#FEF2F2' : budgetColor === '#F59E0B' ? '#FFFBEB' : '#F0FDF4', border: `1px solid ${budgetColor === '#EF4444' ? '#FECACA' : budgetColor === '#F59E0B' ? '#FDE68A' : '#BBF7D0'}`, marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>Budget Impact</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: budgetColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {expCategory} · ₹{(budgetInfo.rem / 100000).toFixed(1)}L remaining
            </div>
          </div>
        )}

        <TjInput label="Amount (₹)" placeholder="0.00" type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
        <TjInput label="Date" type="date" />
        <TjTextarea label="Description" placeholder="What was this expense for?" rows={3} />
        <Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setFileOpen(false)}>Submit for Approval</Btn>
      </SidePanel>

      <FloatingCopilot role={role} />
    </div>
  );
};

Object.assign(window, { APClerkDashboard, FinanceManagerDashboard, FinanceAdminDashboard, EmployeeDashboard });
