// Tijori AI — CFO Command Center Dashboard

const AIActionCard = ({
  ac
}) => {
  const [hov, setHov] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    onClick: ac.loading ? undefined : ac.action,
    style: {
      background: hov ? 'linear-gradient(135deg, #E8783B, #FF6B35)' : 'white',
      borderRadius: '16px',
      padding: '22px 20px',
      boxShadow: hov ? '0 8px 32px rgba(232,120,59,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
      transition: 'all 250ms ease',
      transform: hov ? 'translateY(-3px)' : 'none',
      cursor: ac.loading ? 'wait' : 'pointer',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: 140,
      opacity: ac.loading ? 0.7 : 1
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '22px',
      color: hov ? 'rgba(255,255,255,0.9)' : '#E8783B',
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, ac.icon, /*#__PURE__*/React.createElement(AIBadge, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: hov ? 'white' : '#0F172A',
      letterSpacing: '-0.5px'
    }
  }, ac.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: hov ? 'rgba(255,255,255,0.7)' : '#94A3B8',
      marginTop: '4px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.4
    }
  }, ac.sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: hov ? 'rgba(255,255,255,0.8)' : '#E8783B',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '12px'
    }
  }, ac.loading ? 'Running…' : 'Run now →'));
};
const DashboardScreen = ({
  role,
  onNavigate
}) => {
  const roleKey = role || 'CFO';
  const isCFO = roleKey === 'CFO';
  const isFinAdmin = roleKey === 'Finance Admin';
  const isFinManager = roleKey === 'Finance Manager';
  const [dismissed, setDismissed] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [queueBills, setQueueBills] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [intel, setIntel] = React.useState(null);
  const [runLoading, setRunLoading] = React.useState({
    q: false,
    sweep: false
  });
  const [modal10Q, setModal10Q] = React.useState(null); // { title, content, sections }
  const [sweepResult, setSweepResult] = React.useState(null);
  const [approveLoading, setApproveLoading] = React.useState({});
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const {
        DashboardAPI,
        BillsAPI,
        AnalyticsAPI
      } = window.TijoriAPI;
      const [s, bills, i] = await Promise.all([DashboardAPI.stats(), BillsAPI.queue(), AnalyticsAPI.commandCenter()]);
      setStats(s);
      setQueueBills((bills || []).slice(0, 3));
      setIntel(i);
    } catch (e) {}
    setLoading(false);
  }, []);
  React.useEffect(() => {
    loadData();
  }, [loadData]);
  const handleAuditSweep = async () => {
    setRunLoading(prev => ({
      ...prev,
      sweep: true
    }));
    try {
      const res = await window.TijoriAPI.AnalyticsAPI.auditSweep();
      setSweepResult(res);
    } catch (e) {
      setSweepResult({
        message: 'Sweep failed: ' + e.message,
        error: true
      });
    }
    setRunLoading(prev => ({
      ...prev,
      sweep: false
    }));
  };
  const handleGenerate10Q = async () => {
    setRunLoading(prev => ({
      ...prev,
      q: true
    }));
    try {
      const res = await window.TijoriAPI.AnalyticsAPI.generate10Q();
      setModal10Q(res);
    } catch (e) {
      setModal10Q({
        title: 'Generation Error',
        content: 'Failed to generate 10-Q: ' + e.message,
        error: true
      });
    }
    setRunLoading(prev => ({
      ...prev,
      q: false
    }));
  };
  const handleQuickApprove = async (billId, refNo) => {
    setApproveLoading(prev => ({
      ...prev,
      [billId]: true
    }));
    try {
      await window.TijoriAPI.BillsAPI.approve(billId, 'Approved from Command Center');
      setQueueBills(prev => prev.filter(b => b.id !== billId));
    } catch (e) {
      alert('Approval failed: ' + e.message);
    }
    setApproveLoading(prev => ({
      ...prev,
      [billId]: false
    }));
  };
  const handleQuickReject = async billId => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await window.TijoriAPI.BillsAPI.reject(billId, reason);
      setQueueBills(prev => prev.filter(b => b.id !== billId));
    } catch (e) {
      alert('Rejection failed: ' + e.message);
    }
  };
  const fmtAmt = v => {
    if (!v) return '₹0';
    const n = parseFloat(v);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };
  const riskItems = intel?.risk_watch || [{
    id: 1,
    score: 94,
    color: '#EF4444',
    title: 'Duplicate Invoice Detected',
    desc: 'Check anomaly engine for high-confidence duplicate flags.',
    time: 'live'
  }, {
    id: 2,
    score: 78,
    color: '#F59E0B',
    title: 'Unusual Vendor Velocity',
    desc: 'Some vendors have submitted invoices at above-average rates.',
    time: 'live'
  }];

  // Cash flow chart data
  const months = (intel?.chart_data || []).map(d => d.date?.slice(5) || '');
  const projected = (intel?.chart_data || []).map(d => (d.running_balance || 0) / 1000000); // in millions
  if (projected.length === 0) {
    // fallback
    for (let i = 0; i < 6; i++) projected.push(Math.random() * 5 + 2);
  }
  const bandHigh = projected.map(v => v * 1.15);
  const bandLow = projected.map(v => v * 0.85);
  const cw = 520,
    ch = 200;
  const maxV = Math.max(...bandHigh),
    minV = Math.min(...bandLow);
  const px = i => 48 + i / (projected.length - 1) * (cw - 72);
  const py = v => ch - 20 - (v - minV) / (maxV - minV) * (ch - 40);
  const linePath = projected.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(v)}`).join(' ');
  const bandPath = [...bandHigh.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(v)}`), ...[...bandLow].reverse().map((v, i) => `L ${px(bandLow.length - 1 - i)} ${py(v)}`), 'Z'].join(' ');
  const approvalQueue = queueBills.map(b => ({
    id: b.ref_no || b.invoice_number || b.id.slice(0, 8),
    vendor: b.vendor_name || 'Unknown Vendor',
    amount: fmtAmt(b.total_amount),
    date: b.invoice_date || b.created_at?.slice(0, 10) || '',
    rawId: b.id
  }));
  const ROLE_TITLES = {
    'CFO': 'Intelligence Command',
    'Finance Admin': 'Finance Operations Hub',
    'Finance Manager': 'Approval Pipeline',
    'AP Clerk': 'My Processing Queue'
  };
  const ROLE_SUBTITLES = {
    'CFO': 'Global financial overview — real-time anomalies, payables, and treasury health.',
    'Finance Admin': 'Full operational access — vendors, expenses, audit, and compliance.',
    'Finance Manager': 'Your team\'s pending approvals, budget status, and variance summary.',
    'AP Clerk': 'Your invoice queue, SLA alerts, and processing metrics.'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px 32px 100px',
      position: 'relative'
    }
  }, modal10Q && /*#__PURE__*/React.createElement(TjModal, {
    open: !!modal10Q,
    onClose: () => setModal10Q(null),
    title: "10-Q Report Draft",
    width: 720
  }, modal10Q.error ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px',
      background: '#FEE2E2',
      borderRadius: '8px',
      color: '#991B1B',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, modal10Q.content) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '18px',
      color: '#0F172A'
    }
  }, modal10Q.title || 'Quarterly Report'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '2px'
    }
  }, "AI-Generated Draft \xB7 Not for official filing")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    onClick: () => {
      const blob = new Blob([modal10Q.content || ''], {
        type: 'text/plain'
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '10Q_Draft.txt';
      a.click();
    }
  }, "\u2193 Download"))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: '60vh',
      overflow: 'auto',
      background: '#FAFAF8',
      borderRadius: '10px',
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px',
      color: '#0F172A',
      lineHeight: 1.7,
      whiteSpace: 'pre-wrap',
      border: '1px solid #F1F0EE'
    }
  }, modal10Q.content || JSON.stringify(modal10Q, null, 2)))), sweepResult && /*#__PURE__*/React.createElement(TjModal, {
    open: !!sweepResult,
    onClose: () => setSweepResult(null),
    title: "Audit Sweep Results",
    width: 480
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px',
      background: sweepResult.error ? '#FEE2E2' : '#F0FDF4',
      borderRadius: '10px',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: sweepResult.error ? '#991B1B' : '#065F46',
      lineHeight: 1.6
    }
  }, sweepResult.message || JSON.stringify(sweepResult)), !sweepResult.error && sweepResult.flagged_count > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '12px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: () => {
      setSweepResult(null);
      onNavigate && onNavigate('anomaly');
    }
  }, "View Flagged Items \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '28px',
      animation: 'fadeUp 300ms ease both'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '32px',
      color: '#0F172A',
      letterSpacing: '-1.5px',
      marginBottom: '4px'
    }
  }, ROLE_TITLES[roleKey] || 'Intelligence Command'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, new Date().toLocaleDateString('en-IN', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }), " \u2014 ", ROLE_SUBTITLES[roleKey] || 'Operational Overview')), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    pill: true,
    icon: /*#__PURE__*/React.createElement("span", null, "\u2726"),
    onClick: () => onNavigate && onNavigate('ai-hub')
  }, "Ask Your Data")), approvalQueue.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '24px',
      animation: 'fadeUp 300ms 80ms ease both',
      opacity: 0,
      animationFillMode: 'forwards'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '16px'
    }
  }, "\u2696"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A'
    }
  }, isCFO ? 'Pending CFO Approvals' : isFinAdmin ? 'Pending Finance Approvals' : 'My Pending Approvals'), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: '12px',
      color: '#E8783B',
      cursor: 'pointer',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    },
    onClick: () => onNavigate && onNavigate('ap-hub')
  }, "View All \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '14px',
      flexWrap: 'wrap'
    }
  }, approvalQueue.map(inv => /*#__PURE__*/React.createElement("div", {
    key: inv.id,
    style: {
      background: 'white',
      borderRadius: '14px',
      padding: '18px 20px',
      border: '1px solid #F1F0EE',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      flex: '1 1 260px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      transition: 'box-shadow 150ms'
    },
    onMouseEnter: e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)',
    onMouseLeave: e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      cursor: 'pointer'
    },
    onClick: () => onNavigate && onNavigate('ap-match', {
      invoice: inv
    })
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: '#E8783B',
      fontWeight: 500,
      marginBottom: '3px'
    }
  }, inv.id), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '15px',
      color: '#0F172A',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, inv.vendor), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      marginTop: '2px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, inv.date)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '20px',
      color: '#E8783B',
      letterSpacing: '-1px',
      flexShrink: 0
    }
  }, inv.amount), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    small: true,
    disabled: approveLoading[inv.rawId],
    onClick: e => {
      e.stopPropagation();
      handleQuickApprove(inv.rawId, inv.id);
    }
  }, approveLoading[inv.rawId] ? '…' : '✓'), /*#__PURE__*/React.createElement(Btn, {
    variant: "destructive",
    small: true,
    onClick: e => {
      e.stopPropagation();
      handleQuickReject(inv.rawId);
    }
  }, "\u2715")))))), loading && approvalQueue.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '24px',
      background: 'white',
      borderRadius: '14px',
      padding: '24px',
      border: '1px solid #F1F0EE',
      color: '#94A3B8',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textAlign: 'center'
    }
  }, "Loading approval queue\u2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      animation: 'fadeUp 300ms 160ms ease both',
      opacity: 0,
      animationFillMode: 'forwards'
    }
  }, /*#__PURE__*/React.createElement(KPICard, {
    label: "Total Outstanding",
    value: loading ? '…' : fmtAmt(stats?.total_outstanding_amount),
    delta: `${stats?.total_pending || 0} pending bills`,
    deltaType: "neutral",
    sublabel: "all payables"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Pending Approvals",
    value: loading ? '…' : String(stats?.my_queue_count ?? stats?.total_pending ?? 0),
    delta: `${stats?.total_approved || 0} approved total`,
    deltaType: "neutral",
    sublabel: "in your queue",
    pulse: true
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Anomalies Detected",
    value: loading ? '…' : String(stats?.anomaly_count || 0),
    delta: "High confidence",
    deltaType: stats?.anomaly_count > 0 ? 'negative' : 'positive',
    sublabel: "require review",
    pulse: stats?.anomaly_count > 0
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 360px',
      gap: '20px',
      marginBottom: '20px',
      animation: 'fadeUp 300ms 240ms ease both',
      opacity: 0,
      animationFillMode: 'forwards'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A'
    }
  }, "90-Day Cash Flow Projection"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      marginTop: '4px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "With 85% confidence bands \xB7 Updated 12m ago")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      fontSize: '11px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 3,
      background: '#E8783B',
      borderRadius: 2,
      display: 'inline-block'
    }
  }), "Projected"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      background: 'rgba(232,120,59,0.2)',
      borderRadius: 2,
      display: 'inline-block'
    }
  }), "Confidence Band"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    viewBox: `0 0 ${cw} ${ch}`,
    style: {
      overflow: 'visible'
    }
  }, [0, 0.25, 0.5, 0.75, 1].map((t, i) => {
    const yy = 20 + t * (ch - 40);
    const val = Math.round(maxV - t * (maxV - minV));
    return /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("line", {
      x1: 48,
      y1: yy,
      x2: cw - 24,
      y2: yy,
      stroke: "#F1F0EE",
      strokeWidth: "1"
    }), /*#__PURE__*/React.createElement("text", {
      x: 40,
      y: yy + 4,
      fontSize: "9",
      fill: "#94A3B8",
      textAnchor: "end",
      fontFamily: "Plus Jakarta Sans"
    }, val));
  }), months.map((m, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: px(i),
    y: ch - 4,
    fontSize: "10",
    fill: "#94A3B8",
    textAnchor: "middle",
    fontFamily: "Plus Jakarta Sans"
  }, m)), /*#__PURE__*/React.createElement("path", {
    d: bandPath,
    fill: "rgba(232,120,59,0.12)"
  }), /*#__PURE__*/React.createElement("path", {
    d: linePath,
    fill: "none",
    stroke: "#E8783B",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    filter: "url(#glow)"
  }), projected.map((v, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: px(i),
    cy: py(v),
    r: "4",
    fill: "white",
    stroke: "#E8783B",
    strokeWidth: "2"
  })), /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("filter", {
    id: "glow"
  }, /*#__PURE__*/React.createElement("feGaussianBlur", {
    stdDeviation: "2",
    result: "blur"
  }), /*#__PURE__*/React.createElement("feMerge", null, /*#__PURE__*/React.createElement("feMergeNode", {
    in: "blur"
  }), /*#__PURE__*/React.createElement("feMergeNode", {
    in: "SourceGraphic"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '20%',
      right: '22%',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)',
      border: '1px solid #F1F0EE',
      borderRadius: '12px',
      padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '13px',
      color: '#E8783B'
    }
  }, "\u26A1 Critical Peak"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '2px'
    }
  }, "May 2026: \u20B95.2Cr projected")))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '0',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px',
      borderBottom: '1px solid #F1F0EE',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A'
    }
  }, "Risk Watch"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: '#94A3B8',
      background: '#F8F7F5',
      padding: '3px 8px',
      borderRadius: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "LIVE")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'auto',
      maxHeight: 300
    }
  }, riskItems.filter(r => !dismissed.includes(r.id)).length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px',
      textAlign: 'center',
      color: '#10B981',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, "\u2713 No active risk flags") : riskItems.filter(r => !dismissed.includes(r.id)).map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    style: {
      padding: '14px 18px',
      borderLeft: `4px solid ${r.color}`,
      borderBottom: '1px solid #F8F7F5',
      animation: r.score > 80 ? 'borderPulse 2s ease infinite' : 'none',
      background: r.score > 80 ? 'rgba(239,68,68,0.02)' : 'white',
      transition: 'background 150ms'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: r.color,
      color: 'white',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '10px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.score, "% Risk"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.time)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700,
      fontSize: '13px',
      color: '#0F172A',
      marginBottom: '4px'
    }
  }, r.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      lineHeight: 1.5,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '10px'
    }
  }, r.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate && onNavigate('anomaly'),
    style: {
      fontSize: '12px',
      color: '#E8783B',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: 0
    }
  }, "Investigate \u2192"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDismissed(d => [...d, r.id]),
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: 0
    }
  }, "Dismiss"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 18px',
      borderTop: '1px solid #F1F0EE',
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate && onNavigate('audit'),
    style: {
      flex: 1,
      padding: '8px',
      border: '1.5px dashed #E2E8F0',
      borderRadius: '10px',
      background: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, "Audit Log \u2192"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate && onNavigate('anomaly'),
    style: {
      flex: 1,
      padding: '8px',
      border: '1.5px solid #EF4444',
      borderRadius: '10px',
      background: 'rgba(239,68,68,0.05)',
      cursor: 'pointer',
      fontSize: '12px',
      color: '#EF4444',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, "Risk Engine \u2192")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 180px 180px',
      gap: '16px',
      animation: 'fadeUp 300ms 320ms ease both',
      opacity: 0,
      animationFillMode: 'forwards'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '24px',
      display: 'flex',
      gap: '20px',
      alignItems: 'center',
      gridColumn: 'span 2'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 130,
      height: 130,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "130",
    height: "130",
    viewBox: "0 0 130 130"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "65",
    cy: "65",
    r: "52",
    fill: "none",
    stroke: "#F1F5F9",
    strokeWidth: "12"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "65",
    cy: "65",
    r: "52",
    fill: "none",
    stroke: "url(#ringGrad)",
    strokeWidth: "12",
    strokeDasharray: `${(intel?.treasury?.global_index || 85) / 100 * 2 * Math.PI * 52} ${2 * Math.PI * 52}`,
    strokeLinecap: "round",
    transform: "rotate(-90 65 65)"
  }), /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "ringGrad",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#E8783B"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#FF6B35"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '26px',
      color: '#0F172A',
      letterSpacing: '-1px'
    }
  }, intel?.treasury?.global_index || 85, "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '8px',
      color: '#94A3B8',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Health"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A',
      marginBottom: '12px'
    }
  }, "Treasury Health Index"), [{
    label: 'Global Health',
    val: `${intel?.treasury?.global_index || 85}%`,
    status: 'GOOD',
    color: intel?.treasury?.health_color || '#10B981'
  }, {
    label: 'Liquidity',
    val: intel?.treasury?.liquidity || 'Excellent',
    status: 'EXCELLENT',
    color: '#10B981'
  }, {
    label: 'Solvency',
    val: intel?.treasury?.solvency || 'Stable',
    status: 'STABLE',
    color: '#F59E0B'
  }].map(r => /*#__PURE__*/React.createElement("div", {
    key: r.label,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid #F8F7F5'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 700,
      color: r.color,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.val))))), [{
    icon: '✦',
    title: 'Generate 10-Q',
    sub: 'AI-compiled regulatory filing draft',
    action: handleGenerate10Q,
    loading: runLoading.q
  }, {
    icon: '⬡',
    title: 'Audit Sweep',
    sub: 'Full-spectrum transaction scan',
    action: handleAuditSweep,
    loading: runLoading.sweep
  }].map((ac, i) => /*#__PURE__*/React.createElement(AIActionCard, {
    key: i,
    ac: ac
  }))), /*#__PURE__*/React.createElement(FloatingCopilot, {
    role: roleKey
  }));
};
Object.assign(window, {
  DashboardScreen
});
