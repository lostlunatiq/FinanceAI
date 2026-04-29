// Tijori AI — CFO Command Center Dashboard

const AIActionCard = ({ ac }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={ac.loading ? undefined : ac.action}
      style={{ background: hov ? 'linear-gradient(135deg, #E8783B, #FF6B35)' : 'white', borderRadius: '16px', padding: '22px 20px', boxShadow: hov ? '0 8px 32px rgba(232,120,59,0.3)' : '0 2px 12px rgba(0,0,0,0.06)', transition: 'all 250ms ease', transform: hov ? 'translateY(-3px)' : 'none', cursor: ac.loading ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140, opacity: ac.loading ? 0.7 : 1 }}>
      <div>
        <div style={{ fontSize: '22px', color: hov ? 'rgba(255,255,255,0.9)' : '#E8783B', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {ac.icon}
          <AIBadge />
        </div>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: hov ? 'white' : '#0F172A', letterSpacing: '-0.5px' }}>{ac.title}</div>
        <div style={{ fontSize: '11px', color: hov ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.4 }}>{ac.sub}</div>
      </div>
      <div style={{ fontSize: '12px', color: hov ? 'rgba(255,255,255,0.8)' : '#E8783B', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '12px' }}>{ac.loading ? 'Running…' : 'Run now →'}</div>
    </div>
  );
};

const DashboardScreen = ({ role, onNavigate }) => {
  const roleKey = role || 'CFO';
  const isCFO        = roleKey === 'CFO';
  const isFinAdmin   = roleKey === 'Finance Admin';
  const isFinManager = roleKey === 'Finance Manager';

  const [dismissed,   setDismissed]   = React.useState([]);
  const [stats,       setStats]       = React.useState(null);
  const [queueBills,  setQueueBills]  = React.useState([]);
  const [loading,     setLoading]     = React.useState(true);
  const [intel,       setIntel]       = React.useState(null);
  const [runLoading,  setRunLoading]  = React.useState({ q: false, sweep: false });
  const [modal10Q,    setModal10Q]    = React.useState(null);   // { title, content, sections }
  const [sweepResult, setSweepResult] = React.useState(null);
  const [approveLoading, setApproveLoading] = React.useState({});
  const [complianceData, setComplianceData] = React.useState({ tds: 0, gst: 0, count: 0 });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const { DashboardAPI, BillsAPI, AnalyticsAPI } = window.TijoriAPI;
      const [s, bills, i, exp] = await Promise.all([
        DashboardAPI.stats(),
        BillsAPI.queue(),
        AnalyticsAPI.commandCenter(),
        BillsAPI.listExpenses({ limit: 200 }),
      ]);
      setStats(s);
      setQueueBills((bills || []).slice(0, 3));
      setIntel(i);

      const expenses = Array.isArray(exp) ? exp : (exp?.results || []);
      const tdsLiab = expenses.filter(e => e.status !== 'PAID').reduce((sum, e) => sum + parseFloat(e.tds_amount || 0), 0);
      const gstLiab = expenses.filter(e => e.status !== 'PAID' && e.gstin).reduce((sum, e) => sum + parseFloat(e.total_amount || 0) * 0.18, 0);
      setComplianceData({ 
        tds: tdsLiab, 
        gst: gstLiab, 
        count: expenses.filter(e => e.status !== 'PAID' && (parseFloat(e.tds_amount) > 0 || e.gstin)).length 
      });
    } catch (e) {}
    setLoading(false);
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleAuditSweep = async () => {
    setRunLoading(prev => ({ ...prev, sweep: true }));
    try {
      const res = await window.TijoriAPI.AnalyticsAPI.auditSweep();
      setSweepResult(res);
    } catch (e) { setSweepResult({ message: 'Sweep failed: ' + e.message, error: true }); }
    setRunLoading(prev => ({ ...prev, sweep: false }));
  };

  const handleGenerate10Q = async () => {
    setRunLoading(prev => ({ ...prev, q: true }));
    try {
      const res = await window.TijoriAPI.AnalyticsAPI.generate10Q();
      setModal10Q(res);
    } catch (e) {
      setModal10Q({ title: 'Generation Error', content: 'Failed to generate 10-Q: ' + e.message, error: true });
    }
    setRunLoading(prev => ({ ...prev, q: false }));
  };

  const handleQuickApprove = async (billId, refNo) => {
    setApproveLoading(prev => ({ ...prev, [billId]: true }));
    try {
      await window.TijoriAPI.BillsAPI.approve(billId, 'Approved from Command Center');
      setQueueBills(prev => prev.filter(b => b.id !== billId));
    } catch (e) { alert('Approval failed: ' + e.message); }
    setApproveLoading(prev => ({ ...prev, [billId]: false }));
  };

  const handleQuickReject = async (billId) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await window.TijoriAPI.BillsAPI.reject(billId, reason);
      setQueueBills(prev => prev.filter(b => b.id !== billId));
    } catch (e) { alert('Rejection failed: ' + e.message); }
  };

  const fmtAmt = (v) => {
    if (!v) return '₹0';
    const n = parseFloat(v);
    if (n >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n/100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };

  const riskItems = intel?.risk_watch || [];

  // Cash flow chart data
  const months = (intel?.chart_data || []).map(d => d.date?.slice(5) || '');
  const projected = (intel?.chart_data || []).map(d => (d.running_balance || 0) / 1000000); // in millions
  const bandHigh = projected.map(v => v * 1.15);
  const bandLow = projected.map(v => v * 0.85);
  const cw = 520, ch = 200;
  const maxV = projected.length ? Math.max(...bandHigh) : 10;
  const minV = projected.length ? Math.min(...bandLow) : 0;
  const px = (i) => 48 + (i / (Math.max(projected.length - 1, 1))) * (cw - 72);
  const py = (v) => ch - 20 - ((v - minV) / (Math.max(maxV - minV, 1))) * (ch - 40);
  const linePath = projected.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(v)}`).join(' ');
  const bandPath = [
    ...bandHigh.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(v)}`),
    ...[...bandLow].reverse().map((v, i) => `L ${px(bandLow.length - 1 - i)} ${py(v)}`),
    'Z'
  ].join(' ');

  const approvalQueue = queueBills.map(b => ({
    id: b.ref_no || b.invoice_number || b.id.slice(0, 8),
    vendor: b.vendor_name || 'Unknown Vendor',
    amount: fmtAmt(b.total_amount),
    date: b.invoice_date || b.created_at?.slice(0, 10) || '',
    rawId: b.id,
  }));

  const ROLE_TITLES = {
    'CFO':            'Intelligence Command',
    'Finance Admin':  'Finance Operations Hub',
    'Finance Manager':'Approval Pipeline',
    'AP Clerk':       'My Processing Queue',
  };
  const ROLE_SUBTITLES = {
    'CFO':            'Global financial overview — real-time anomalies, payables, and treasury health.',
    'Finance Admin':  'Full operational access — vendors, expenses, audit, and compliance.',
    'Finance Manager':'Your team\'s pending approvals, budget status, and variance summary.',
    'AP Clerk':       'Your invoice queue, SLA alerts, and processing metrics.',
  };

  return (
    <div style={{ padding: '32px 32px 100px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', animation: 'fadeUp 300ms ease both' }}>

        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '32px', color: '#0F172A', letterSpacing: '-1.5px', marginBottom: '4px' }}>{ROLE_TITLES[roleKey] || 'Intelligence Command'}</h1>
          <div style={{ fontSize: '13px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })} — {ROLE_SUBTITLES[roleKey] || 'Operational Overview'}</div>
        </div>
        <Btn variant="primary" pill icon={<span>✦</span>} onClick={() => onNavigate && onNavigate('ai-hub')}>Ask Your Data</Btn>
      </div>

      {/* Approval Queue — title differs by role */}
      {approvalQueue.length > 0 && (
        <div style={{ marginBottom: '24px', animation: 'fadeUp 300ms 80ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px' }}>⚖</span>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>
              {isCFO ? 'Pending CFO Approvals' : isFinAdmin ? 'Pending Finance Approvals' : 'My Pending Approvals'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#E8783B', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onClick={() => onNavigate && onNavigate('ap-hub')}>View All →</span>
          </div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {approvalQueue.map(inv => (
              <div key={inv.id}
                   style={{ background: 'white', borderRadius: '14px', padding: '18px 20px', border: '1px solid #F1F0EE', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'box-shadow 150ms' }}
                   onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'}
                   onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('ap-match', { invoice: inv })}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#E8783B', fontWeight: 500, marginBottom: '3px' }}>{inv.id}</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.vendor}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{inv.date}</div>
                </div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: '#E8783B', letterSpacing: '-1px', flexShrink: 0 }}>{inv.amount}</div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Btn variant="primary" small disabled={approveLoading[inv.rawId]}
                    onClick={(e) => { e.stopPropagation(); handleQuickApprove(inv.rawId, inv.id); }}>
                    {approveLoading[inv.rawId] ? '…' : '✓'}
                  </Btn>
                  <Btn variant="destructive" small onClick={(e) => { e.stopPropagation(); handleQuickReject(inv.rawId); }}>✕</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading && approvalQueue.length === 0 && (
        <div style={{ marginBottom: '24px', background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #F1F0EE', color: '#94A3B8', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'center' }}>
          Loading approval queue…
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', animation: 'fadeUp 300ms 160ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        <KPICard label="Total Outstanding" value={loading ? '…' : fmtAmt(stats?.total_outstanding_amount)} delta={`${stats?.total_pending || 0} pending bills`} deltaType="neutral" sublabel="all payables" />
        <KPICard label="Pending Approvals" value={loading ? '…' : String(stats?.my_queue_count ?? stats?.total_pending ?? 0)} delta={`${stats?.total_approved || 0} approved total`} deltaType="neutral" sublabel="in your queue" pulse />
        <KPICard label="Anomalies Detected" value={loading ? '…' : String(stats?.anomaly_count || 0)} delta="High confidence" deltaType={stats?.anomaly_count > 0 ? 'negative' : 'positive'} sublabel="require review" pulse={stats?.anomaly_count > 0} />
      </div>

      {/* Main bento */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', marginBottom: '20px', animation: 'fadeUp 300ms 240ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {/* Cash flow chart */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>90-Day Cash Flow Projection</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>With 85% confidence bands · Updated 12m ago</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 3, background: '#E8783B', borderRadius: 2, display: 'inline-block' }} />Projected</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 10, background: 'rgba(232,120,59,0.2)', borderRadius: 2, display: 'inline-block' }} />Confidence Band</span>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <svg width="100%" viewBox={`0 0 ${cw} ${ch}`} style={{ overflow: 'visible' }}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const yy = 20 + t * (ch - 40);
                const val = Math.round(maxV - t * (maxV - minV));
                return (
                  <g key={i}>
                    <line x1={48} y1={yy} x2={cw - 24} y2={yy} stroke="#F1F0EE" strokeWidth="1" />
                    <text x={40} y={yy + 4} fontSize="9" fill="#94A3B8" textAnchor="end" fontFamily="Plus Jakarta Sans">{val}</text>
                  </g>
                );
              })}
              {/* X labels */}
              {months.map((m, i) => (
                <text key={i} x={px(i)} y={ch - 4} fontSize="10" fill="#94A3B8" textAnchor="middle" fontFamily="Plus Jakarta Sans">{m}</text>
              ))}
              {/* Confidence band */}
              <path d={bandPath} fill="rgba(232,120,59,0.12)" />
              {/* Projected line */}
              <path d={linePath} fill="none" stroke="#E8783B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
              {/* Data points */}
              {projected.map((v, i) => (
                <circle key={i} cx={px(i)} cy={py(v)} r="4" fill="white" stroke="#E8783B" strokeWidth="2" />
              ))}
              <defs>
                <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
            </svg>
            {/* Floating insight */}
            <div style={{ position: 'absolute', top: '20%', right: '22%', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid #F1F0EE', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '13px', color: '#E8783B' }}>⚡ Critical Peak</div>
              <div style={{ fontSize: '11px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>May 2026: ₹5.2Cr projected</div>
            </div>
          </div>
        </Card>

        {/* Risk Watch */}
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F0EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A' }}>Risk Watch</div>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', background: '#F8F7F5', padding: '3px 8px', borderRadius: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>LIVE</span>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 300 }}>
            {riskItems.filter(r => !dismissed.includes(r.id)).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#10B981', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
                ✓ No active risk flags
              </div>
            ) : riskItems.filter(r => !dismissed.includes(r.id)).map(r => (
              <div key={r.id} style={{ padding: '14px 18px', borderLeft: `4px solid ${r.color}`, borderBottom: '1px solid #F8F7F5', animation: r.score > 80 ? 'borderPulse 2s ease infinite' : 'none', background: r.score > 80 ? 'rgba(239,68,68,0.02)' : 'white', transition: 'background 150ms' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ background: r.color, color: 'white', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.score}% Risk</span>
                  <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.time}</span>
                </div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>{r.title}</div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>{r.desc}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => onNavigate && onNavigate('anomaly')} style={{ fontSize: '12px', color: '#E8783B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}>Investigate →</button>
                  <button onClick={() => setDismissed(d => [...d, r.id])} style={{ fontSize: '12px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F0EE', display: 'flex', gap: '8px' }}>
            <button onClick={() => onNavigate && onNavigate('audit')}
              style={{ flex: 1, padding: '8px', border: '1.5px dashed #E2E8F0', borderRadius: '10px', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>Audit Log →</button>
            <button onClick={() => onNavigate && onNavigate('anomaly')}
              style={{ flex: 1, padding: '8px', border: '1.5px solid #EF4444', borderRadius: '10px', background: 'rgba(239,68,68,0.05)', cursor: 'pointer', fontSize: '12px', color: '#EF4444', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>Risk Engine →</button>
          </div>
        </Card>
      </div>

      {/* Bottom bento */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px 180px', gap: '16px', animation: 'fadeUp 300ms 320ms ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {/* Treasury ring */}
        <Card style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center', gridColumn: 'span 1' }}>
          <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="52" fill="none" stroke="#F1F5F9" strokeWidth="12"/>
              <circle cx="65" cy="65" r="52" fill="none" stroke="url(#ringGrad)" strokeWidth="12" strokeDasharray={`${(intel?.treasury?.global_index || 85) / 100 * 2 * Math.PI * 52} ${2 * Math.PI * 52}`} strokeLinecap="round" transform="rotate(-90 65 65)"/>
              <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#E8783B"/><stop offset="100%" stopColor="#FF6B35"/></linearGradient></defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '26px', color: '#0F172A', letterSpacing: '-1px' }}>{intel?.treasury?.global_index || 85}%</div>
              <div style={{ fontSize: '8px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Health</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '12px' }}>Treasury Health Index</div>
            {[
              { label: 'Global Health', val: `${intel?.treasury?.global_index || 85}%`, status: 'GOOD', color: intel?.treasury?.health_color || '#10B981' }, 
              { label: 'Liquidity', val: intel?.treasury?.liquidity || 'Excellent', status: 'EXCELLENT', color: '#10B981' }, 
              { label: 'Solvency', val: intel?.treasury?.solvency || 'Stable', status: 'STABLE', color: '#F59E0B' }
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F8F7F5' }}>
                <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: r.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Treasury & Compliance */}
        <Card style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gridColumn: 'span 1' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', marginBottom: '12px' }}>Treasury & Compliance</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>Estimated Tax Liabilities (TDS/GST)</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F8F7F5' }}>
            <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>TDS Payable</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#E8783B', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{fmtAmt(complianceData.tds)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F8F7F5' }}>
            <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Estimated GST Input</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#10B981', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{fmtAmt(complianceData.gst)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Compliance Invoices</span>
            <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{complianceData.count} Pending</span>
          </div>
        </Card>

        {/* AI Action Cards with inline output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div onClick={runLoading.q ? undefined : handleGenerate10Q}
            style={{ background: runLoading.q ? '#F8F7F5' : 'white', borderRadius: '16px', padding: '22px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: runLoading.q ? 'wait' : 'pointer', opacity: runLoading.q ? 0.7 : 1, transition: 'all 200ms' }}
            onMouseEnter={e => { if (!runLoading.q) e.currentTarget.style.boxShadow = '0 8px 32px rgba(232,120,59,0.25)'; }}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>✦ Generate 10-Q</div>
              <AIBadge />
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI-compiled regulatory filing draft</div>
            <div style={{ fontSize: '12px', color: '#E8783B', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '8px' }}>{runLoading.q ? 'Generating…' : 'Run now →'}</div>
          </div>
          {modal10Q && (
            <div style={{ background: modal10Q.error ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${modal10Q.error ? '#FECACA' : '#A7F3D0'}`, borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: modal10Q.error ? '#991B1B' : '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{modal10Q.title || '10-Q Draft'}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!modal10Q.error && <button onClick={e => { e.stopPropagation(); const blob = new Blob([modal10Q.content || ''], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '10Q_Draft.txt'; a.click(); }} style={{ fontSize: '11px', color: '#065F46', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Download ↓</button>}
                  <button onClick={e => { e.stopPropagation(); setModal10Q(null); }} style={{ fontSize: '16px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: modal10Q.error ? '#991B1B' : '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6, maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{modal10Q.content || JSON.stringify(modal10Q, null, 2)}</div>
            </div>
          )}

          <div onClick={runLoading.sweep ? undefined : handleAuditSweep}
            style={{ background: runLoading.sweep ? '#F8F7F5' : 'white', borderRadius: '16px', padding: '22px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: runLoading.sweep ? 'wait' : 'pointer', opacity: runLoading.sweep ? 0.7 : 1, transition: 'all 200ms' }}
            onMouseEnter={e => { if (!runLoading.sweep) e.currentTarget.style.boxShadow = '0 8px 32px rgba(232,120,59,0.25)'; }}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>⬡ Audit Sweep</div>
              <AIBadge />
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Full-spectrum transaction scan</div>
            <div style={{ fontSize: '12px', color: '#E8783B', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '8px' }}>{runLoading.sweep ? 'Scanning…' : 'Run now →'}</div>
          </div>
          {sweepResult && (
            <div style={{ background: sweepResult.error ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${sweepResult.error ? '#FECACA' : '#A7F3D0'}`, borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: sweepResult.error ? '#991B1B' : '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sweep Results</span>
                <button onClick={e => { e.stopPropagation(); setSweepResult(null); }} style={{ fontSize: '16px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ fontSize: '12px', color: sweepResult.error ? '#991B1B' : '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6 }}>{sweepResult.message || JSON.stringify(sweepResult)}</div>
              {!sweepResult.error && (sweepResult.flagged || sweepResult.flagged_count) > 0 && (
                <button onClick={e => { e.stopPropagation(); setSweepResult(null); onNavigate && onNavigate('anomaly'); }} style={{ marginTop: '8px', fontSize: '11px', color: '#065F46', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>View Flagged Items →</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Copilot FAB */}
      <FloatingCopilot role={roleKey} />
    </div>
  );
};

Object.assign(window, { DashboardScreen });
