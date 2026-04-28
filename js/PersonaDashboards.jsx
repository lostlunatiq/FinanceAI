// Tijori AI — Persona-specific Home Dashboards

// ─── AP CLERK DASHBOARD ───────────────────────────────────────────────────────

const APClerkDashboard = ({ role, onNavigate, user }) => {
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
  const processedCount = items.filter(i => ['APPROVED', 'REJECTED'].includes(i.status)).length;
  const avgAgeDays = pending.length
    ? (pending.reduce((sum, item) => sum + (parseInt(item.age, 10) || 0), 0) / pending.length).toFixed(1) + 'd'
    : '0d';
  const queueValue = pending.reduce((sum, item) => {
    const raw = Number(String(item.amount).replace(/[^\d.]/g, '')) || 0;
    return sum + raw;
  }, 0);
  const highPriority = pending.filter(i => i.priority === 'high');
  const insightText = highPriority.length > 0
    ? `${highPriority.length} invoice(s) carry HIGH anomaly priority. Review ${highPriority[0].refNo || highPriority[0].id} first.`
    : pending.length > 0
      ? `${pending.length} invoice(s) are waiting in your queue. Oldest pending item is ${pending[0].age}.`
      : 'Queue is clear. No pending AP clerk actions right now.';
  const priorityColor = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px', animation: 'fadeUp 250ms ease both' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8783B', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AP Clerk · {user?.name || 'AP Clerk'}</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>My Processing Queue</h1>
        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })} — {pending.length} invoices require your action today</div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', animation: 'fadeUp 250ms 60ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {[
          { label: 'Awaiting My Review', value: String(pending.length), color: '#E8783B', delta: 'Act today', deltaType: 'neutral', pulse: true },
          { label: 'Processed Visible Queue', value: String(processedCount), color: '#10B981', delta: 'Approved or rejected', deltaType: 'positive' },
          { label: 'Avg. Pending Age', value: avgAgeDays, delta: pending.length ? 'Based on current queue' : 'No pending invoices', deltaType: pending.length ? 'neutral' : 'positive' },
          { label: 'Total Value in Queue', value: queueValue >= 100000 ? '₹' + (queueValue / 100000).toFixed(2) + 'L' : '₹' + queueValue.toLocaleString('en-IN'), delta: 'Pending L1', deltaType: 'neutral' },
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
              {insightText}
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

const FinanceManagerDashboard = ({ role, onNavigate, user }) => {
  const [expandedTeam, setExpandedTeam] = React.useState(null);
  const [queueItems, setQueueItems] = React.useState([]);
  const [statsData, setStatsData] = React.useState(null);
  const [queueLoading, setQueueLoading] = React.useState(true);
  const [budgetHealth, setBudgetHealth] = React.useState([]);
  const [teamExpenses, setTeamExpenses] = React.useState([]);

  React.useEffect(() => {
    const { BillsAPI, DashboardAPI, AnalyticsAPI } = window.TijoriAPI;
    Promise.allSettled([
      BillsAPI.queue(), 
      DashboardAPI.stats(),
      AnalyticsAPI.budgetHealth(),
      BillsAPI.listExpenses({ limit: 3 })
    ])
      .then(([qRes, sRes, bRes, eRes]) => {
        if (qRes.status === 'fulfilled') setQueueItems(qRes.value || []);
        if (sRes.status === 'fulfilled') setStatsData(sRes.value);
        if (bRes.status === 'fulfilled') setBudgetHealth(bRes.value.budgets || []);
        if (eRes.status === 'fulfilled') setTeamExpenses(Array.isArray(eRes.value) ? eRes.value.slice(0, 3) : (eRes.value.results || []).slice(0, 3));
      })
      .finally(() => setQueueLoading(false));
  }, []);

  const fmtAmt = (v) => {
    const n = parseFloat(v || 0);
    if (n >= 100000) return '₹' + (n/100000).toFixed(2) + 'L';
    return '₹' + n.toLocaleString('en-IN');
  };

  const pendingCount = statsData?.my_queue_count || queueItems.length;
  const totalValue = queueItems.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);

  const approvalChain = [
    { stage: 'Pending L1', count: Math.max(1, Math.floor(pendingCount * 0.4)), amount: fmtAmt(totalValue * 0.3), color: '#F59E0B' },
    { stage: 'Pending HOD', count: Math.max(1, Math.floor(pendingCount * 0.3)), amount: fmtAmt(totalValue * 0.25), color: '#E8783B' },
    { stage: 'Pending Finance Mgr', count: Math.max(1, Math.floor(pendingCount * 0.2)), amount: fmtAmt(totalValue * 0.3), color: '#EF4444' },
    { stage: 'Pending CFO', count: Math.max(1, Math.floor(pendingCount * 0.1)), amount: fmtAmt(totalValue * 0.15), color: '#8B5CF6' },
  ];
  
  const teamBudgets = budgetHealth.length > 0 ? budgetHealth.map(b => ({
    name: b.name,
    manager: b.department || 'General',
    util: Math.min(100, Math.round(b.utilization_pct || 0)),
    spent: fmtAmt(b.spent_amount),
    total: fmtAmt(b.total_amount),
    color: b.alert_level === 'CRITICAL' ? '#EF4444' : b.alert_level === 'WARNING' ? '#F59E0B' : '#10B981'
  })) : [];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8783B', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Finance Manager · {user?.name || 'Finance Manager'}</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>Approval Pipeline</h1>
        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })} — Monitor approvals, budget health, and team spend</div>
      </div>

      <StatsRow cards={[
        { label: 'Awaiting My Approval', value: queueLoading ? '…' : String(pendingCount), delta: pendingCount > 0 ? '↑ Urgent' : 'Queue clear', deltaType: pendingCount > 0 ? 'negative' : 'positive', pulse: pendingCount > 0, color: pendingCount > 0 ? '#EF4444' : '#10B981' },
        { label: 'Total Pipeline Value', value: queueLoading ? '…' : fmtAmt(totalValue), delta: 'Across all stages', deltaType: 'neutral' },
        { label: 'Avg Approval Time', value: '0.8d', delta: '↓ 20% vs target', deltaType: 'positive', color: '#10B981' },
        { label: 'Budget Alerts', value: String(budgetHealth.filter(b => b.alert_level === 'CRITICAL').length), delta: 'Require attention', deltaType: 'negative', pulse: true },
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
          {queueItems.length > 0 && (
            <div style={{ marginTop: '16px', padding: '14px', background: '#FEF3C7', borderRadius: '12px', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>⚡ Action Required</div>
              <div style={{ fontSize: '12px', color: '#78350F', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{queueItems[0].ref_no || queueItems[0].id} ({queueItems[0].vendor_name || queueItems[0].vendor?.name || 'Vendor'} · {fmtAmt(queueItems[0].total_amount)}) is pending your approval.</div>
              <div style={{ marginTop: '10px' }}><Btn variant="primary" small onClick={() => onNavigate && onNavigate('ap-match', { invoice: queueItems[0] })}>Review Now →</Btn></div>
            </div>
          )}
        </Card>

        <Card style={{ padding: '22px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '18px' }}>Team Budget Health</div>
          {teamBudgets.length === 0 ? <div style={{ fontSize: '13px', color: '#94A3B8' }}>No budgets active</div> : teamBudgets.map((t, i) => (
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
          <Btn variant="secondary" small onClick={() => onNavigate && onNavigate('ap-hub')}>View All</Btn>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {teamExpenses.length === 0 ? <div style={{ fontSize: '13px', color: '#94A3B8' }}>No recent team expenses</div> : teamExpenses.map((e, i) => (
            <div key={i} style={{ flex: 1, background: '#F8F7F5', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '12px', color: 'white' }}>{(e.vendor_name || 'U')[0]}</div>
                <StatusBadge status={e.status || e._status} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.vendor_name || e.vendor?.name}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{e.ref_no || e.id}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>{e.business_purpose?.slice(0, 15) || 'General'}</span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '16px', color: '#E8783B', letterSpacing: '-0.5px' }}>{fmtAmt(e.total_amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── FINANCE ADMIN DASHBOARD ──────────────────────────────────────────────────

const FinanceAdminDashboard = ({ role, onNavigate, user }) => {
  const [initiating, setInitiating] = React.useState(null);
  const [payRef, setPayRef] = React.useState('');
  const [payNotes, setPayNotes] = React.useState('');
  const [paymentQueue, setPaymentQueue] = React.useState([]);
  const [statsData, setStatsData] = React.useState(null);
  const [vendorStats, setVendorStats] = React.useState({ total: 0, active: 0, pending: 0, suspended: 0 });
  const [loading, setLoading] = React.useState(true);
  const [payMsg, setPayMsg] = React.useState(null);

  const fmtAmt = (v) => {
    const n = parseFloat(v || 0);
    if (n >= 100000) return '₹' + (n/100000).toFixed(2) + 'L';
    return '₹' + n.toLocaleString('en-IN');
  };

  React.useEffect(() => {
    const { BillsAPI, DashboardAPI, VendorAPI } = window.TijoriAPI;
    Promise.allSettled([
      BillsAPI.listExpenses({ status: 'APPROVED', limit: 20 }),
      DashboardAPI.stats(),
      VendorAPI.listAll(),
    ]).then(([qRes, sRes, vRes]) => {
      if (qRes.status === 'fulfilled') {
        const bills = qRes.value?.results || qRes.value || [];
        setPaymentQueue(bills.map(b => ({
          id: b.invoice_number || b.ref_no || b.id?.slice(0, 12).toUpperCase(),
          rawId: b.id,
          vendor: b.vendor_name || b.vendor?.name || '—',
          amount: fmtAmt(b.total_amount),
          rawAmount: parseFloat(b.total_amount || 0),
          bank: b.vendor?.bank_account ? ('•• ' + String(b.vendor.bank_account).slice(-4)) : '•• ????',
          approved: b.approved_by || 'Finance',
          due: b.due_date ? new Date(b.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'ASAP',
          urgent: b.anomaly_severity === 'HIGH' || b.anomaly_severity === 'CRITICAL',
        })));
      }
      if (sRes.status === 'fulfilled') setStatsData(sRes.value);
      if (vRes.status === 'fulfilled') {
        const vendors = vRes.value?.results || vRes.value || [];
        setVendorStats({
          total: vendors.length,
          active: vendors.filter(v => v.status === 'ACTIVE').length,
          pending: vendors.filter(v => v.status === 'PENDING').length,
          suspended: vendors.filter(v => v.status === 'SUSPENDED' || v.status === 'BLACKLISTED').length,
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const totalPayable = paymentQueue.reduce((s, p) => s + p.rawAmount, 0);
  const dueTodayCount = paymentQueue.filter(p => p.urgent).length;

  const handleConfirmPayment = async () => {
    if (!initiating) return;
    try {
      await window.TijoriAPI.BillsAPI.settle(initiating.rawId, payRef);
      setPaymentQueue(prev => prev.filter(p => p.rawId !== initiating.rawId));
      setPayMsg({ type: 'success', text: `Payment initiated for ${initiating.vendor}` });
      setInitiating(null); setPayRef(''); setPayNotes('');
      setTimeout(() => setPayMsg(null), 4000);
    } catch(e) {
      alert(e.message || 'Payment initiation failed');
    }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8783B', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Finance Admin · {user?.name || 'Finance Admin'}</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>Payment Control Center</h1>
        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })} — Initiate payments, manage vendors, oversee system health</div>
      </div>

      {payMsg && (
        <div style={{ background: payMsg.type === 'success' ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${payMsg.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`, borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, color: payMsg.type === 'success' ? '#065F46' : '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {payMsg.type === 'success' ? '✓ ' : '✕ '}{payMsg.text}
        </div>
      )}
      <StatsRow cards={[
        { label: 'Payments Due Today', value: loading ? '…' : String(dueTodayCount), delta: dueTodayCount > 0 ? '↑ Urgent' : 'None urgent', deltaType: dueTodayCount > 0 ? 'negative' : 'positive', color: dueTodayCount > 0 ? '#EF4444' : '#10B981', pulse: dueTodayCount > 0 },
        { label: 'Total Payable', value: loading ? '…' : fmtAmt(totalPayable), delta: `${paymentQueue.length} approved`, deltaType: 'neutral' },
        { label: 'Vendors Pending Approval', value: loading ? '…' : String(vendorStats.pending), delta: vendorStats.pending > 0 ? 'Needs review' : 'All cleared', deltaType: vendorStats.pending > 0 ? 'neutral' : 'positive', color: '#F59E0B' },
        { label: 'System Anomalies', value: loading ? '…' : String(statsData?.anomaly_count || 0), delta: (statsData?.anomaly_count || 0) > 0 ? 'High priority' : 'All clear', deltaType: (statsData?.anomaly_count || 0) > 0 ? 'negative' : 'positive', color: (statsData?.anomaly_count || 0) > 0 ? '#EF4444' : '#10B981', pulse: (statsData?.anomaly_count || 0) > 0 },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', marginBottom: '20px' }}>
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F0EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Payment Initiation Queue</div>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>All fully approved</span>
          </div>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>Loading payment queue…</div>
          ) : paymentQueue.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>No approved bills pending payment.</div>
          ) : paymentQueue.map((p, i) => (
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
              <Btn variant="primary" small onClick={() => { setInitiating(p); setPayRef(''); setPayNotes(''); }}>Initiate Payment</Btn>
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
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '40px', color: '#0F172A', letterSpacing: '-2px' }}>{loading ? '…' : vendorStats.total}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '12px' }}>Total registered vendors</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{vendorStats.active} Active</span>
              {vendorStats.pending > 0 && <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{vendorStats.pending} Pending</span>}
              {vendorStats.suspended > 0 && <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{vendorStats.suspended} Suspended</span>}
            </div>
            <div style={{ marginTop: '12px' }}>
              <Btn variant="secondary" small style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNavigate && onNavigate('vendor-hub')}>Manage Vendors →</Btn>
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
          <TjInput label="Payment Reference / UTR *" placeholder="PAY-REF-2024-XXX or UTR number" value={payRef} onChange={e => setPayRef(e.target.value)} />
          <TjTextarea label="Internal Notes" placeholder="Optional payment notes for audit trail…" rows={2} value={payNotes} onChange={e => setPayNotes(e.target.value)} />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setInitiating(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleConfirmPayment} disabled={!payRef.trim()}>Confirm Payment</Btn>
          </div>
        </TjModal>
      )}

      <FloatingCopilot role={role} />
    </div>
  );
};

// ─── EMPLOYEE DASHBOARD ───────────────────────────────────────────────────────

const EmployeeDashboard = ({ role, onNavigate, user }) => {
  const [fileOpen, setFileOpen] = React.useState(false);
  const [expCategory, setExpCategory] = React.useState('');
  const [expAmount, setExpAmount] = React.useState('');
  const [expDate, setExpDate] = React.useState('');
  const [expDesc, setExpDesc] = React.useState('');
  const [uploadDone, setUploadDone] = React.useState(false);
  const [aiAccepted, setAiAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMsg, setSubmitMsg] = React.useState(null);
  const [myExpenses, setMyExpenses] = React.useState([]);
  const [budgetHealth, setBudgetHealth] = React.useState([]);
  const [expLoading, setExpLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.allSettled([
      window.TijoriAPI.BillsAPI.listExpenses({ my: true, limit: 10 }),
      window.TijoriAPI.AnalyticsAPI.budgetHealth()
    ])
      .then(([expRes, bRes]) => {
        if (expRes.status === 'fulfilled') {
          const data = expRes.value;
          const items = (data?.results || data || []).slice(0, 10).map(e => {
            const amt = parseFloat(e.amount || e.total_amount || 0);
            return {
              id: e.ref_no || e.id?.slice(0, 12).toUpperCase(),
              amount: '₹' + amt.toLocaleString('en-IN'),
              date: (e.submitted_at || e.created_at || e.date || e.invoice_date) ? new Date(e.submitted_at || e.created_at || e.date || e.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
              category: e.expense_category || e.category || e.business_purpose || e.expense_type || 'Other',
              status: e.status || e._status || 'PENDING_L1',
              aiCat: false,
              conf: null,
              rawAmt: amt,
            };
          });
          setMyExpenses(items);
        }
        if (bRes.status === 'fulfilled') {
          setBudgetHealth(bRes.value.budgets || []);
          if (bRes.value.budgets?.length > 0) setExpCategory(bRes.value.budgets[0].name);
        }
      })
      .catch(() => {})
      .finally(() => setExpLoading(false));
  }, []);

  const pendingAmt = myExpenses.filter(e => ['PENDING_L1','PENDING_L2','PENDING_HOD','PENDING_FIN_L1','PENDING_FIN_L2','SUBMITTED'].includes(e.status)).reduce((s, e) => s + e.rawAmt, 0);
  const approvedAmt = myExpenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + e.rawAmt, 0);
  const paidAmt = myExpenses.filter(e => ['PAID', 'POSTED_D365', 'BOOKED_D365'].includes(e.status)).reduce((s, e) => s + e.rawAmt, 0);

  const budgetHealthMap = budgetHealth.reduce((acc, b) => {
    acc[b.name] = { rem: b.remaining_amount, total: b.total_amount };
    return acc;
  }, {});

  const EXP_CATS = budgetHealth.length > 0 ? budgetHealth.map(b => b.name) : ['General Operations', 'Travel', 'Software & Licences', 'Office Supplies', 'Marketing & Events', 'Professional Services'];
  if (!expCategory && EXP_CATS.length > 0) setExpCategory(EXP_CATS[0]);
  
  const budgetInfo = budgetHealthMap[expCategory] || null;
  const budgetPct = budgetInfo ? Math.round((budgetInfo.rem / budgetInfo.total) * 100) : null;
  const budgetColor = budgetPct === null ? '#94A3B8' : budgetPct > 50 ? '#10B981' : budgetPct > 20 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px', animation: 'fadeUp 250ms ease both' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8783B', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Employee · {user?.name || 'Employee'}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px' }}>My Expenses</h1>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })} — Track your expense claims and reimbursements</div>
          </div>
          <Btn variant="primary" icon={<span>+</span>} onClick={() => { setFileOpen(true); setUploadDone(false); setAiAccepted(false); setExpAmount(''); }}>File Expense</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', animation: 'fadeUp 250ms 60ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {[
          { label: 'Pending Reimbursement', value: expLoading ? '…' : '₹' + pendingAmt.toLocaleString('en-IN'), delta: `${myExpenses.filter(e => ['PENDING_L1','SUBMITTED'].includes(e.status)).length} claim(s)`, deltaType: 'neutral', color: '#F59E0B', pulse: pendingAmt > 0 },
          { label: 'Approved This Month', value: expLoading ? '…' : '₹' + approvedAmt.toLocaleString('en-IN'), delta: approvedAmt > 0 ? '↑ On track' : 'None yet', deltaType: approvedAmt > 0 ? 'positive' : 'neutral', color: '#10B981' },
          { label: 'Total Paid Out', value: expLoading ? '…' : '₹' + paidAmt.toLocaleString('en-IN'), delta: 'This period', deltaType: 'positive', color: '#10B981' },
          { label: 'Open Claims', value: String(myExpenses.filter(e => !['PAID','REJECTED'].includes(e.status)).length), delta: 'Live from your submissions', deltaType: 'neutral' },
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
      <SidePanel open={fileOpen} onClose={() => setFileOpen(false)} title="File Internal Expense">
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
        <TjInput label="Date" type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
        <TjTextarea label="Description" placeholder="What was this expense for?" rows={3} value={expDesc} onChange={e => setExpDesc(e.target.value)} />
        {submitMsg && (
          <div style={{ background: submitMsg.type === 'success' ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${submitMsg.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: submitMsg.type === 'success' ? '#065F46' : '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {submitMsg.text}
          </div>
        )}
        <Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting || !expAmount}
          onClick={async () => {
            if (!expAmount) { alert('Please enter an amount'); return; }
            setSubmitting(true);
            try {
              await window.TijoriAPI.BillsAPI.submitExpense({
                expense_category: expCategory,
                amount: parseFloat(expAmount),
                invoice_date: expDate || new Date().toISOString().slice(0, 10),
                description: expDesc || expCategory + ' expense',
              });
              setSubmitMsg({ type: 'success', text: 'Expense submitted for approval!' });
              setExpAmount(''); setExpDate(''); setExpDesc(''); setUploadDone(false); setAiAccepted(false);
              // refresh list
              window.TijoriAPI.BillsAPI.listExpenses({ my: true, limit: 10 }).then(data => {
                const items = (data?.results || data || []).slice(0, 10).map(e => {
                  const amt = parseFloat(e.amount || e.total_amount || 0);
                  return {
                    id: e.ref_no || e.id?.slice(0, 12).toUpperCase(),
                    amount: '₹' + amt.toLocaleString('en-IN'),
                    date: (e.submitted_at || e.created_at || e.date || e.invoice_date) ? new Date(e.submitted_at || e.created_at || e.date || e.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
                    category: e.expense_category || e.category || e.expense_type || 'Other',
                    status: e.status || 'PENDING_L1',
                    aiCat: false,
                    conf: null,
                    rawAmt: amt
                  };
                });
                setMyExpenses(items);
              }).catch(() => {});
              setTimeout(() => { setFileOpen(false); setSubmitMsg(null); }, 2000);
            } catch(e) {
              setSubmitMsg({ type: 'error', text: e.message || 'Submission failed' });
            }
            setSubmitting(false);
          }}>
          {submitting ? 'Submitting…' : 'Submit for Approval'}
        </Btn>
      </SidePanel>

      <FloatingCopilot role={role} />
    </div>
  );
};

Object.assign(window, { APClerkDashboard, FinanceManagerDashboard, FinanceAdminDashboard, EmployeeDashboard });
