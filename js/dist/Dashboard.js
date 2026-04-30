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
  const [complianceData, setComplianceData] = React.useState({
    tds: 0,
    gst: 0,
    count: 0
  });
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const {
        DashboardAPI,
        BillsAPI,
        AnalyticsAPI
      } = window.TijoriAPI;
      const [s, bills, i, exp] = await Promise.all([DashboardAPI.stats(), BillsAPI.queue(), AnalyticsAPI.commandCenter(), BillsAPI.listExpenses({
        limit: 200
      })]);
      setStats(s);
      setQueueBills((bills || []).slice(0, 3));
      setIntel(i);
      const expenses = Array.isArray(exp) ? exp : exp?.results || [];
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
  const riskItems = intel?.risk_watch || [];

  // Cash flow chart data
  const months = (intel?.chart_data || []).map(d => d.date?.slice(5) || '');
  const projected = (intel?.chart_data || []).map(d => (d.running_balance || 0) / 1000000); // in millions
  const bandHigh = projected.map(v => v * 1.15);
  const bandLow = projected.map(v => v * 0.85);
  const cw = 520,
    ch = 200;
  const maxV = projected.length ? Math.max(...bandHigh) : 10;
  const minV = projected.length ? Math.min(...bandLow) : 0;
  const px = i => 48 + i / Math.max(projected.length - 1, 1) * (cw - 72);
  const py = v => ch - 20 - (v - minV) / Math.max(maxV - minV, 1) * (ch - 40);
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
  }, /*#__PURE__*/React.createElement("div", {
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
      gridColumn: 'span 1'
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
  }, r.val))))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gridColumn: 'span 1'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A',
      marginBottom: '12px'
    }
  }, "Treasury & Compliance"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '16px'
    }
  }, "Estimated Tax Liabilities (TDS/GST)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid #F8F7F5'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "TDS Payable"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      fontWeight: 700,
      color: '#E8783B',
      fontFamily: "'Bricolage Grotesque', sans-serif"
    }
  }, fmtAmt(complianceData.tds))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid #F8F7F5'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Estimated GST Input"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      fontWeight: 700,
      color: '#10B981',
      fontFamily: "'Bricolage Grotesque', sans-serif"
    }
  }, fmtAmt(complianceData.gst))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Compliance Invoices"), /*#__PURE__*/React.createElement("span", {
    style: {
      background: '#F1F5F9',
      color: '#475569',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, complianceData.count, " Pending"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: runLoading.q ? undefined : handleGenerate10Q,
    style: {
      background: runLoading.q ? '#F8F7F5' : 'white',
      borderRadius: '16px',
      padding: '22px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      cursor: runLoading.q ? 'wait' : 'pointer',
      opacity: runLoading.q ? 0.7 : 1,
      transition: 'all 200ms'
    },
    onMouseEnter: e => {
      if (!runLoading.q) e.currentTarget.style.boxShadow = '0 8px 32px rgba(232,120,59,0.25)';
    },
    onMouseLeave: e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '15px',
      color: '#0F172A'
    }
  }, "\u2726 Generate 10-Q"), /*#__PURE__*/React.createElement(AIBadge, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "AI-compiled regulatory filing draft"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#E8783B',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '8px'
    }
  }, runLoading.q ? 'Generating…' : 'Run now →')), modal10Q && /*#__PURE__*/React.createElement("div", {
    style: {
      background: modal10Q.error ? '#FEF2F2' : '#FFFFFF',
      border: `1px solid ${modal10Q.error ? '#FECACA' : '#D1FAE5'}`,
      borderRadius: '16px',
      padding: '20px',
      marginTop: '4px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)'
    }
  },
  /*#__PURE__*/React.createElement("div", {
    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }
  },
    /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("div", {
        style: { fontSize: '15px', fontWeight: 800, color: modal10Q.error ? '#991B1B' : '#065F46', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '2px' }
      }, modal10Q.title || '10-Q Draft'),
      modal10Q.period && /*#__PURE__*/React.createElement("div", {
        style: { fontSize: '11px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }
      }, modal10Q.period)
    ),
    /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      !modal10Q.error && /*#__PURE__*/React.createElement("button", {
        onClick: e => {
          e.stopPropagation();
          const d = modal10Q;
          const stats = d.stats || {};
          const vendors = (d.top_vendors || []).map((v, i) => `<tr><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0">${i+1}. ${v.name}</td><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0;text-align:right">₹${parseFloat(v.amount).toLocaleString('en-IN', {minimumFractionDigits:2})}</td><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0;text-align:right">${v.invoices}</td></tr>`).join('');
          const budgets = (d.dept_budgets || []).map(b => `<tr><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0">${b.dept}</td><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0;text-align:right">₹${b.budget.toLocaleString('en-IN', {minimumFractionDigits:2})}</td><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0;text-align:right">₹${b.spent.toLocaleString('en-IN', {minimumFractionDigits:2})}</td><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0;text-align:right">${b.utilization}%</td></tr>`).join('');
          const trend = (d.monthly_trend || []).map(m => `<tr><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0">${m.month}</td><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0;text-align:right">₹${parseFloat(m.paid).toLocaleString('en-IN', {minimumFractionDigits:2})}</td><td style="padding:5px 10px;border-bottom:1px solid #E2E8F0;text-align:right">${m.invoices}</td></tr>`).join('');
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${d.title || '10-Q Draft'}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;margin:40px;color:#1E293B;font-size:13px}h1{color:#065F46;font-size:20px;border-bottom:3px solid #10B981;padding-bottom:10px}h2{color:#065F46;font-size:14px;margin-top:24px;margin-bottom:8px;border-left:4px solid #10B981;padding-left:10px}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.stat-card{background:#F0FDF4;border:1px solid #A7F3D0;border-radius:8px;padding:12px;text-align:center}.stat-label{font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase}.stat-value{font-size:16px;font-weight:800;color:#065F46;margin-top:4px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#F1F5F9;text-align:left;padding:7px 10px;font-size:11px;color:#475569;font-weight:700}.content{background:#F8FAFC;border-left:4px solid #10B981;padding:16px;border-radius:4px;line-height:1.8;white-space:pre-wrap;font-size:12px}@media print{body{margin:20px}.stat-grid{grid-template-columns:repeat(4,1fr)}}</style></head><body>
<h1>${d.title || '10-Q Filing Draft'}</h1>
<p style="color:#64748B;font-size:11px">Period: ${d.period || ''} &nbsp;|&nbsp; Generated: ${d.generated_at || ''}</p>
<div class="stat-grid">
<div class="stat-card"><div class="stat-label">YTD Paid</div><div class="stat-value">₹${((stats.ytd_expenses||0)/100000).toFixed(1)}L</div></div>
<div class="stat-card"><div class="stat-label">Q Paid</div><div class="stat-value">₹${((stats.q_paid||0)/100000).toFixed(1)}L</div></div>
<div class="stat-card"><div class="stat-label">Pending Bills</div><div class="stat-value">${stats.q_pending_count||0}</div></div>
<div class="stat-card"><div class="stat-label">QoQ Change</div><div class="stat-value" style="color:${(stats.qoq_change_pct||0)>=0?'#DC2626':'#16A34A'}">${stats.qoq_change_pct>=0?'+':''}${stats.qoq_change_pct||0}%</div></div>
<div class="stat-card"><div class="stat-label">Anomalies</div><div class="stat-value">${stats.anomaly_total||0}</div></div>
<div class="stat-card"><div class="stat-label">Critical</div><div class="stat-value" style="color:#DC2626">${stats.anomaly_critical||0}</div></div>
<div class="stat-card"><div class="stat-label">Est. GST</div><div class="stat-value">₹${((stats.gst_estimate||0)/100000).toFixed(1)}L</div></div>
<div class="stat-card"><div class="stat-label">Est. TDS</div><div class="stat-value">₹${((stats.tds_estimate||0)/100000).toFixed(1)}L</div></div>
</div>
<h2>AI-Generated Executive Summary</h2><div class="content">${d.content||''}</div>
${vendors?`<h2>Top Vendors by Spend</h2><table><thead><tr><th>Vendor</th><th style="text-align:right">Amount</th><th style="text-align:right">Invoices</th></tr></thead><tbody>${vendors}</tbody></table>`:''}
${budgets?`<h2>Department Budget Utilization</h2><table><thead><tr><th>Department</th><th style="text-align:right">Budget</th><th style="text-align:right">Spent</th><th style="text-align:right">Utilization</th></tr></thead><tbody>${budgets}</tbody></table>`:''}
${trend?`<h2>Monthly Expense Trend (YTD)</h2><table><thead><tr><th>Month</th><th style="text-align:right">Paid</th><th style="text-align:right">Invoices</th></tr></thead><tbody>${trend}</tbody></table>`:''}
<p style="margin-top:30px;font-size:10px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:10px">This document is auto-generated by FinanceAI. For regulatory use, verify with the Finance department.</p>
</body></html>`;
          const w = window.open('', '_blank', 'width=900,height=700');
          w.document.write(html);
          w.document.close();
          setTimeout(() => w.print(), 800);
        },
        style: { fontSize: '11px', color: '#065F46', fontWeight: 700, background: '#D1FAE5', border: '1px solid #A7F3D0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }
      }, "Export PDF"),
      /*#__PURE__*/React.createElement("button", {
        onClick: e => { e.stopPropagation(); setModal10Q(null); },
        style: { fontSize: '18px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }
      }, "\xD7")
    )
  ),
  !modal10Q.error && /*#__PURE__*/React.createElement("div", null,
    /*#__PURE__*/React.createElement("div", {
      style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }
    },
      [
        { label: 'YTD Paid', value: modal10Q.stats ? '₹' + ((modal10Q.stats.ytd_expenses||0)/100000).toFixed(1) + 'L' : '—' },
        { label: 'Q Paid', value: modal10Q.stats ? '₹' + ((modal10Q.stats.q_paid||0)/100000).toFixed(1) + 'L' : '—' },
        { label: 'Pending Bills', value: modal10Q.stats ? (modal10Q.stats.q_pending_count||0).toString() : '—' },
        { label: 'QoQ Change', value: modal10Q.stats ? ((modal10Q.stats.qoq_change_pct||0) >= 0 ? '+' : '') + (modal10Q.stats.qoq_change_pct||0) + '%' : '—' },
        { label: 'Anomalies', value: modal10Q.stats ? (modal10Q.stats.anomaly_total||0).toString() : '—' },
        { label: 'Critical', value: modal10Q.stats ? (modal10Q.stats.anomaly_critical||0).toString() : '—', danger: true },
        { label: 'Est. GST', value: modal10Q.stats ? '₹' + ((modal10Q.stats.gst_estimate||0)/100000).toFixed(1) + 'L' : '—' },
        { label: 'Est. TDS', value: modal10Q.stats ? '₹' + ((modal10Q.stats.tds_estimate||0)/100000).toFixed(1) + 'L' : '—' },
      ].map((s, i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: { background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }
      },
        /*#__PURE__*/React.createElement("div", { style: { fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" } }, s.label),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: '15px', fontWeight: 800, color: s.danger ? '#DC2626' : '#065F46', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" } }, s.value)
      ))
    ),
    /*#__PURE__*/React.createElement("div", {
      style: { fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }
    }, "AI Executive Summary"),
    /*#__PURE__*/React.createElement("div", {
      style: { fontSize: '12px', color: '#1E293B', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.7, maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginBottom: '10px' }
    }, modal10Q.content || ''),
    modal10Q.top_vendors && modal10Q.top_vendors.length > 0 && /*#__PURE__*/React.createElement("div", { style: { marginBottom: '10px' } },
      /*#__PURE__*/React.createElement("div", { style: { fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" } }, "Top Vendors by Spend"),
      /*#__PURE__*/React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif" } },
        /*#__PURE__*/React.createElement("thead", null,
          /*#__PURE__*/React.createElement("tr", { style: { background: '#F1F5F9' } },
            /*#__PURE__*/React.createElement("th", { style: { padding: '5px 8px', textAlign: 'left', color: '#475569' } }, "Vendor"),
            /*#__PURE__*/React.createElement("th", { style: { padding: '5px 8px', textAlign: 'right', color: '#475569' } }, "Amount"),
            /*#__PURE__*/React.createElement("th", { style: { padding: '5px 8px', textAlign: 'right', color: '#475569' } }, "Invoices")
          )
        ),
        /*#__PURE__*/React.createElement("tbody", null,
          modal10Q.top_vendors.map((v, i) => /*#__PURE__*/React.createElement("tr", { key: i, style: { borderBottom: '1px solid #F1F5F9' } },
            /*#__PURE__*/React.createElement("td", { style: { padding: '5px 8px', color: '#1E293B', fontWeight: 600 } }, v.name),
            /*#__PURE__*/React.createElement("td", { style: { padding: '5px 8px', textAlign: 'right', color: '#065F46', fontWeight: 700 } }, '₹' + parseFloat(v.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})),
            /*#__PURE__*/React.createElement("td", { style: { padding: '5px 8px', textAlign: 'right', color: '#64748B' } }, v.invoices)
          ))
        )
      )
    ),
    modal10Q.dept_budgets && modal10Q.dept_budgets.length > 0 && /*#__PURE__*/React.createElement("div", { style: { marginBottom: '4px' } },
      /*#__PURE__*/React.createElement("div", { style: { fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" } }, "Dept. Budget Utilization"),
      modal10Q.dept_budgets.map((b, i) => /*#__PURE__*/React.createElement("div", { key: i, style: { marginBottom: '6px' } },
        /*#__PURE__*/React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '3px' } },
          /*#__PURE__*/React.createElement("span", { style: { fontWeight: 600, color: '#1E293B' } }, b.dept),
          /*#__PURE__*/React.createElement("span", { style: { color: b.utilization > 90 ? '#DC2626' : b.utilization > 70 ? '#D97706' : '#065F46', fontWeight: 700 } }, b.utilization + '%')
        ),
        /*#__PURE__*/React.createElement("div", { style: { background: '#E2E8F0', borderRadius: '4px', height: '6px', overflow: 'hidden' } },
          /*#__PURE__*/React.createElement("div", { style: { background: b.utilization > 90 ? '#DC2626' : b.utilization > 70 ? '#F59E0B' : '#10B981', width: Math.min(b.utilization, 100) + '%', height: '100%', borderRadius: '4px' } })
        )
      ))
    ),
    modal10Q.monthly_trend && modal10Q.monthly_trend.length > 0 && /*#__PURE__*/React.createElement("div", { style: { marginTop: '10px' } },
      /*#__PURE__*/React.createElement("div", { style: { fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" } }, "Monthly Expense Trend (YTD)"),
      /*#__PURE__*/React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif" } },
        /*#__PURE__*/React.createElement("thead", null,
          /*#__PURE__*/React.createElement("tr", { style: { background: '#F1F5F9' } },
            /*#__PURE__*/React.createElement("th", { style: { padding: '5px 8px', textAlign: 'left', color: '#475569' } }, "Month"),
            /*#__PURE__*/React.createElement("th", { style: { padding: '5px 8px', textAlign: 'right', color: '#475569' } }, "Paid"),
            /*#__PURE__*/React.createElement("th", { style: { padding: '5px 8px', textAlign: 'right', color: '#475569' } }, "Invoices")
          )
        ),
        /*#__PURE__*/React.createElement("tbody", null,
          modal10Q.monthly_trend.map((m, i) => /*#__PURE__*/React.createElement("tr", { key: i, style: { borderBottom: '1px solid #F1F5F9' } },
            /*#__PURE__*/React.createElement("td", { style: { padding: '5px 8px', color: '#1E293B', fontWeight: 600 } }, m.month),
            /*#__PURE__*/React.createElement("td", { style: { padding: '5px 8px', textAlign: 'right', color: '#065F46', fontWeight: 700 } }, '₹' + parseFloat(m.paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })),
            /*#__PURE__*/React.createElement("td", { style: { padding: '5px 8px', textAlign: 'right', color: '#64748B' } }, m.invoices)
          ))
        )
      )
    )
  ),
  modal10Q.error && /*#__PURE__*/React.createElement("div", {
    style: { fontSize: '12px', color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6, whiteSpace: 'pre-wrap' }
  }, modal10Q.content || JSON.stringify(modal10Q, null, 2)), /*#__PURE__*/React.createElement("div", {
    onClick: runLoading.sweep ? undefined : handleAuditSweep,
    style: {
      background: runLoading.sweep ? '#F8F7F5' : 'white',
      borderRadius: '16px',
      padding: '22px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      cursor: runLoading.sweep ? 'wait' : 'pointer',
      opacity: runLoading.sweep ? 0.7 : 1,
      transition: 'all 200ms'
    },
    onMouseEnter: e => {
      if (!runLoading.sweep) e.currentTarget.style.boxShadow = '0 8px 32px rgba(232,120,59,0.25)';
    },
    onMouseLeave: e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '15px',
      color: '#0F172A'
    }
  }, "\u2B21 Audit Sweep"), /*#__PURE__*/React.createElement(AIBadge, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Full-spectrum transaction scan"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#E8783B',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '8px'
    }
  }, runLoading.sweep ? 'Scanning…' : 'Run now →')), sweepResult && /*#__PURE__*/React.createElement("div", {
    style: {
      background: sweepResult.error ? '#FEF2F2' : '#F0FDF4',
      border: `1px solid ${sweepResult.error ? '#FECACA' : '#A7F3D0'}`,
      borderRadius: '12px',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: sweepResult.error ? '#991B1B' : '#065F46',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Sweep Results"), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setSweepResult(null);
    },
    style: {
      fontSize: '16px',
      color: '#94A3B8',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      lineHeight: 1
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: sweepResult.error ? '#991B1B' : '#065F46',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.6
    }
  }, sweepResult.message || JSON.stringify(sweepResult)), !sweepResult.error && (sweepResult.flagged || sweepResult.flagged_count) > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setSweepResult(null);
      onNavigate && onNavigate('anomaly');
    },
    style: {
      marginTop: '8px',
      fontSize: '11px',
      color: '#065F46',
      fontWeight: 600,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "View Flagged Items \u2192")))), /*#__PURE__*/React.createElement(FloatingCopilot, {
    role: roleKey
  }));
};
Object.assign(window, {
  DashboardScreen
});