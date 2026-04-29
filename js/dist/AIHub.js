// Tijori AI — AI Intelligence Hub (Screen 18)

const SUGGESTED_QUERIES = {
  'CFO': ['Top 5 vendors by spend this quarter', 'Which department is over budget?', 'Show anomaly summary', 'Cash flow projection for next month'],
  'Finance Admin': ['Audit log for last 24h', 'System health status', 'Pending vendor approvals', 'Anomaly summary'],
  'Finance Manager': ['My department budget status', 'Pending team approvals', 'Variance analysis for this month', 'Top spenders in my team'],
  'AP Clerk': ['My pending queue summary', 'Which invoices have anomalies?', 'Average processing time this week', 'Invoices near SLA limit'],
  'Employee': ['Status of my last reimbursement', 'How much travel budget do I have left?', 'My expense summary for this year', 'Help me file a new expense'],
  'Vendor': ['When will my last invoice be paid?', 'Total outstanding payments to me', 'Status of INV-2026-001', 'How to submit a new invoice?']
};
const CopilotWidget = ({
  role
}) => {
  const roleKey = role || 'CFO';
  const queries = SUGGESTED_QUERIES[roleKey] || SUGGESTED_QUERIES['Employee'];
  const getGreeting = () => {
    if (roleKey === 'Vendor') return "Hello! I'm your Vendor Assistant. Ask me about your invoices, payment status, or how to use the portal.";
    if (roleKey === 'Employee') return "Hi! I'm your Personal Expense Assistant. I can help you track your reimbursements and check your budget.";
    return `Hello! I'm your ${roleKey} Copilot. Ask me anything about financial data, vendors, invoices, or anomalies.`;
  };
  const [messages, setMessages] = React.useState([{
    role: 'ai',
    text: getGreeting(),
    time: new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const endRef = React.useRef(null);
  React.useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);
  React.useEffect(() => {
    const handler = e => {
      if (e.detail?.query) sendMessage(e.detail.query);
    };
    window.addEventListener('copilot:prefill', handler);
    return () => window.removeEventListener('copilot:prefill', handler);
  }, []);
  const sendMessage = async text => {
    const q = text || input.trim();
    if (!q) return;
    setInput('');
    const time = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    setMessages(prev => [...prev, {
      role: 'user',
      text: q,
      time
    }]);
    setLoading(true);
    try {
      const {
        NLQueryAPI
      } = window.TijoriAPI;
      const res = await NLQueryAPI.ask(q);
      const answer = res.answer || res.error || 'No response.';
      const insight = res.insight || '';
      setMessages(prev => [...prev, {
        role: 'ai',
        text: answer,
        insight,
        model: res.model,
        time: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Sorry, I encountered an error. Please try again.',
        time,
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '0',
      overflow: 'hidden',
      marginTop: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px',
      borderBottom: '1px solid #F1F0EE',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(AIBadge, null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A'
    }
  }, roleKey === 'Vendor' ? 'Vendor Assistant' : roleKey === 'Employee' ? 'Expense Assistant' : `${roleKey} Copilot`), /*#__PURE__*/React.createElement(LiveDot, null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginLeft: 'auto'
    }
  }, "Powered by Claude 3 Haiku \xB7 Real-time data")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      borderBottom: '1px solid #F8F7F5',
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    }
  }, queries.map(q => /*#__PURE__*/React.createElement("button", {
    key: q,
    onClick: () => sendMessage(q),
    disabled: loading,
    style: {
      background: '#F5F3FF',
      border: '1px solid #EDE9FE',
      borderRadius: '999px',
      padding: '5px 12px',
      fontSize: '11px',
      color: '#5B21B6',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: 'all 150ms'
    }
  }, q))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 320,
      overflowY: 'auto',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      background: '#FAFAF8'
    }
  }, messages.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
      gap: '8px'
    }
  }, m.role === 'ai' && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #E8783B, #8B5CF6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'white',
      fontWeight: 700
    }
  }, "\u2726")), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '75%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
      background: m.role === 'user' ? 'linear-gradient(135deg, #E8783B, #FF6B35)' : m.error ? '#FEE2E2' : 'white',
      color: m.role === 'user' ? 'white' : m.error ? '#991B1B' : '#0F172A',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.6,
      boxShadow: m.role === 'ai' ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
      border: m.role === 'ai' && !m.error ? '1px solid #F1F0EE' : 'none'
    }
  }, m.text), m.insight && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F5F3FF',
      border: '1px solid #EDE9FE',
      borderRadius: '8px',
      padding: '8px 12px',
      marginTop: '6px',
      fontSize: '12px',
      color: '#5B21B6',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, "Insight: "), m.insight), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#CBD5E1',
      marginTop: '4px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textAlign: m.role === 'user' ? 'right' : 'left'
    }
  }, m.time, m.model ? ` · ${m.model.split('/').pop()}` : '')))), loading && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #E8783B, #8B5CF6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'white'
    }
  }, "\u2726")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      border: '1px solid #F1F0EE',
      borderRadius: '12px 12px 12px 2px',
      padding: '10px 16px',
      display: 'flex',
      gap: '4px'
    }
  }, [0, 1, 2].map(n => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#E8783B',
      animation: 'dotPulse 1.2s ease infinite',
      animationDelay: `${n * 0.2}s`
    }
  })))), /*#__PURE__*/React.createElement("div", {
    ref: endRef
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      borderTop: '1px solid #F1F0EE',
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      background: 'white'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => e.key === 'Enter' && !e.shiftKey && sendMessage(),
    placeholder: "Ask about vendors, invoices, cashflow, anomalies\u2026",
    disabled: loading,
    style: {
      flex: 1,
      padding: '10px 14px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '10px',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none',
      background: '#FAFAF8'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => sendMessage(),
    disabled: !input.trim() || loading,
    style: {
      background: !input.trim() || loading ? '#F1F5F9' : 'linear-gradient(135deg, #E8783B, #FF6B35)',
      color: !input.trim() || loading ? '#94A3B8' : 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '10px 16px',
      cursor: !input.trim() || loading ? 'default' : 'pointer',
      fontSize: '13px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: 'all 150ms'
    }
  }, "Send \u2191")));
};
const AIHubScreen = ({
  role,
  onNavigate
}) => {
  const [scenario, setScenario] = React.useState('Base');
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState(null);
  const [runningAll, setRunningAll] = React.useState(false);
  const [cfData, setCfData] = React.useState(null);
  const [rerunLoading, setRerunLoading] = React.useState(false);
  const [rerunMsg, setRerunMsg] = React.useState(null);
  const [monthlySummaries, setMonthlySummaries] = React.useState(null);
  const [payNowLoading, setPayNowLoading] = React.useState(null);
  const [payNowMsg, setPayNowMsg] = React.useState(null);
  const [payModal, setPayModal] = React.useState(null); // { rec } — Pay Now modal
  const [schedModal, setSchedModal] = React.useState(null); // { rec } — Schedule modal
  const [payForm, setPayForm] = React.useState({
    method: 'NEFT',
    utr: '',
    notes: ''
  });
  const [schedForm, setSchedForm] = React.useState({
    date: '',
    note: ''
  });
  const [payProcessing, setPayProcessing] = React.useState(false);
  const [schedProcessing, setSchedProcessing] = React.useState(false);
  const [autoGenEnabled, setAutoGenEnabled] = React.useState(true);
  React.useEffect(() => {
    window.TijoriAPI.BudgetAPI.cashflow().then(d => setCfData(d)).catch(() => {});
    // Load real monthly summaries from backend analytics
    window.TijoriAPI.AnalyticsAPI.spendIntelligence().then(d => {
      if (d && d.monthly_trends && d.monthly_trends.length > 0) {
        const trend = d.monthly_trends;
        const built = trend.slice(-3).reverse().map((m, i) => ({
          month: m.month_label || m.month || `Month ${i + 1}`,
          status: i === 0 ? 'REVIEWED' : 'AUTO_GEN',
          revenue: '₹' + Number(m.revenue || 0).toLocaleString('en-IN'),
          expenses: '₹' + Number(m.total || m.expenses || 0).toLocaleString('en-IN'),
          profit: (() => {
            const p = (m.revenue || 0) - (m.total || m.expenses || 0);
            return (p < 0 ? '-₹' : '₹') + Math.abs(p).toLocaleString('en-IN');
          })(),
          cash: m.cash_position ? '₹' + Number(m.cash_position).toLocaleString('en-IN') : '—',
          insight: m.insight || (i === 0 ? 'Latest month — live data from system.' : 'Auto-generated from expense buckets.')
        }));
        if (built.length > 0) setMonthlySummaries(built);
      }
    }).catch(() => {});
  }, []);
  const handleRerun = async () => {
    setRerunLoading(true);
    setRerunMsg(null);
    try {
      await runAll();
      setRerunMsg({
        type: 'success',
        text: 'Forecast and models refreshed with latest data.'
      });
    } catch (e) {
      setRerunMsg({
        type: 'error',
        text: 'Rerun failed: ' + (e.message || 'Server error')
      });
    } finally {
      setRerunLoading(false);
      setTimeout(() => setRerunMsg(null), 4000);
    }
  };
  const runAll = async () => {
    setRunningAll(true);
    try {
      const {
        AnalyticsAPI,
        BudgetAPI
      } = window.TijoriAPI;
      // Run all analytics models in parallel
      await Promise.allSettled([AnalyticsAPI.spendIntelligence().then(d => {
        if (d && d.monthly_trends && d.monthly_trends.length > 0) {
          const trend = d.monthly_trends;
          const built = trend.slice(-3).reverse().map((m, i) => ({
            month: m.month_label || m.month || `Month ${i + 1}`,
            status: i === 0 ? 'REVIEWED' : 'AUTO_GEN',
            revenue: '₹' + Number(m.revenue || 0).toLocaleString('en-IN'),
            expenses: '₹' + Number(m.total || m.expenses || 0).toLocaleString('en-IN'),
            profit: (() => {
              const p = (m.revenue || 0) - (m.total || m.expenses || 0);
              return (p < 0 ? '-₹' : '₹') + Math.abs(p).toLocaleString('en-IN');
            })(),
            cash: m.cash_position ? '₹' + Number(m.cash_position).toLocaleString('en-IN') : '—',
            insight: m.insight || (i === 0 ? 'Latest month — live data from system.' : 'Auto-generated from expense buckets.')
          }));
          if (built.length > 0) setMonthlySummaries(built);
        }
      }), AnalyticsAPI.workingCapital(), AnalyticsAPI.vendorRisk(), BudgetAPI.cashflow().then(d => setCfData(d))]);
    } catch (e) {}
    setRunningAll(false);
  };

  // ── Cash Flow Chart ───────────────────────────────────────────────────────
  const W = 760,
    H = 240;
  const chartPad = {
    l: 60,
    r: 30,
    t: 20,
    b: 30
  };
  const pastData = [{
    label: 'Oct',
    val: 82
  }, {
    label: 'Nov',
    val: 74
  }, {
    label: 'Dec',
    val: 91
  }, {
    label: 'Jan',
    val: 68
  }, {
    label: 'Feb',
    val: 85
  }, {
    label: 'Mar',
    val: 96
  }];
  const forecastBase = [{
    label: 'Apr',
    val: 88
  }, {
    label: 'May',
    val: 72
  }, {
    label: 'Jun',
    val: 95
  }, {
    label: 'Jul',
    val: 58
  }, {
    label: 'Aug',
    val: 103
  }, {
    label: 'Sep',
    val: 118
  }];
  const forecastOpt = forecastBase.map(p => ({
    ...p,
    val: p.val * 1.15
  }));
  const forecastPess = forecastBase.map(p => ({
    ...p,
    val: p.val * 0.8
  }));
  const forecast = scenario === 'Base' ? forecastBase : scenario === 'Optimistic' ? forecastOpt : forecastPess;
  const allData = [...pastData, ...forecast];
  const allVals = allData.map(d => d.val);
  const minV = Math.min(...allVals) - 10,
    maxV = Math.max(...allVals) + 10;
  const totalPoints = allData.length;
  const toX = i => chartPad.l + i / (totalPoints - 1) * (W - chartPad.l - chartPad.r);
  const toY = v => H - chartPad.b - (v - minV) / (maxV - minV) * (H - chartPad.t - chartPad.b);
  const pastPts = pastData.map((d, i) => ({
    x: toX(i),
    y: toY(d.val)
  }));
  const forecastPts = forecast.map((d, i) => ({
    x: toX(pastData.length - 1 + i),
    y: toY(d.val)
  }));
  const bandHigh = forecast.map((d, i) => ({
    x: toX(pastData.length - 1 + i),
    y: toY(d.val + 12)
  }));
  const bandLow = forecast.map((d, i) => ({
    x: toX(pastData.length - 1 + i),
    y: toY(d.val - 12)
  }));
  const lp = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const bandPath = [lp(bandHigh), ...[...bandLow].reverse().map(p => `L ${p.x} ${p.y}`), 'Z'].join(' ');
  const pinEvents = [{
    x: toX(pastData.length + 1),
    y: toY(forecast[1]?.val || 72) - 20,
    label: 'AP due: ₹14L (Vendor XYZ)',
    color: '#E8783B',
    icon: '↓'
  }, {
    x: toX(pastData.length + 2),
    y: toY(forecast[2]?.val || 95) - 20,
    label: 'AR receipt: ₹22L (Acme)',
    color: '#10B981',
    icon: '↑'
  }, {
    x: toX(pastData.length + 3),
    y: toY(forecast[3]?.val || 58) - 24,
    label: 'Payroll: ₹45L',
    color: '#EF4444',
    icon: '⚠'
  }];

  // ── Summary months (real data preferred, static fallback) ────────────────
  const staticSummaryMonths = [{
    month: 'March 2026',
    status: 'REVIEWED',
    revenue: '₹62L',
    expenses: '₹50L',
    profit: '₹12L',
    cash: '₹18L',
    insight: 'Travel expenses up 34% vs February. AR collection rate improved to 82%.'
  }, {
    month: 'February 2026',
    status: 'AUTO_GEN',
    revenue: '₹51L',
    expenses: '₹44L',
    profit: '₹7L',
    cash: '₹15L',
    insight: 'Engineering budget at 95% — recommend variance review before Q4.'
  }, {
    month: 'January 2026',
    status: 'AUTO_GEN',
    revenue: '₹48L',
    expenses: '₹52L',
    profit: '-₹4L',
    cash: '₹11L',
    insight: 'Net loss driven by one-time infrastructure spend. Normalised margin 14%.'
  }];
  const summaryMonths = monthlySummaries || staticSummaryMonths;

  // ── Optimisation recommendations ─────────────────────────────────────────
  const [payRecs, setPayRecs] = React.useState([]);
  React.useEffect(() => {
    // Load approved vendor bills for payment optimization
    window.TijoriAPI.BillsAPI.listVendorBills({
      status: 'APPROVED,BOOKED_D365',
      limit: 15
    }).then(d => {
      const bills = Array.isArray(d) ? d : d?.results || [];
      if (bills.length === 0) {
        // Fallback: try all non-paid vendor bills
        return window.TijoriAPI.BillsAPI.listVendorBills({
          limit: 15
        });
      }
      return bills;
    }).then(d => {
      const bills = Array.isArray(d) ? d : d?.results || [];
      if (bills.length > 0) {
        const now = Date.now();
        const mapped = bills.filter(b => !['PAID', 'REJECTED', 'WITHDRAWN', 'AUTO_REJECT'].includes(b._status || b.status || '')).slice(0, 10).map((b, i) => {
          const amt = Number(b.total_amount || 0);
          const dueRaw = b.due_date;
          const due = dueRaw ? new Date(dueRaw) : new Date(now + 86400000 * (15 + i * 3));
          const daysUntilDue = Math.floor((due.getTime() - now) / 86400000);
          const isEarly = daysUntilDue > 5;
          const suggested = new Date(due.getTime() - 86400000 * (isEarly ? 5 : 1));
          const type = isEarly ? 'discount' : daysUntilDue < 0 ? 'lateFee' : 'batch';
          const tip = type === 'discount' ? `Pay ${Math.abs(daysUntilDue) > 0 ? daysUntilDue + 'd early' : 'now'} — save ₹${Math.round(amt * 0.015).toLocaleString('en-IN')} (1.5% discount)` : type === 'lateFee' ? `OVERDUE by ${Math.abs(daysUntilDue)}d — avoid ₹${Math.round(amt * 0.02).toLocaleString('en-IN')} penalty` : `Pay by ${due.toLocaleDateString('en-GB', {
            month: 'short',
            day: 'numeric'
          })} to stay on time`;
          return {
            vendor: b.vendor_name || b.vendor?.name || 'Unknown Vendor',
            invoices: b.ref_no || `INV-${String(b.id).slice(0, 6).toUpperCase()}`,
            amount: '₹' + amt.toLocaleString('en-IN'),
            due: due.toLocaleDateString('en-GB', {
              month: 'short',
              day: 'numeric'
            }),
            suggested: suggested.toLocaleDateString('en-GB', {
              month: 'short',
              day: 'numeric'
            }),
            suggestedDate: suggested.toISOString().slice(0, 10),
            type,
            tip,
            rawId: b.id,
            rawAmount: amt,
            daysUntilDue
          };
        });
        setPayRecs(mapped);
      }
    }).catch(() => {});
  }, []);
  const tipColor = {
    discount: {
      bg: '#D1FAE5',
      color: '#065F46'
    },
    lateFee: {
      bg: '#FEF3C7',
      color: '#92400E'
    },
    batch: {
      bg: '#FFF7ED',
      color: '#C2410C'
    },
    shortfall: {
      bg: '#FEE2E2',
      color: '#991B1B'
    }
  };
  const summaryStatusStyle = {
    REVIEWED: {
      bg: '#D1FAE5',
      color: '#065F46',
      label: 'Reviewed'
    },
    AUTO_GEN: {
      bg: '#EDE9FE',
      color: '#5B21B6',
      label: 'Auto-Generated'
    },
    DRAFT: {
      bg: '#FEF3C7',
      color: '#92400E',
      label: 'Draft'
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px 32px 60px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '32px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '32px',
      color: '#0F172A',
      letterSpacing: '-1.5px'
    }
  }, "AI Intelligence"), /*#__PURE__*/React.createElement(AIBadge, null), /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'linear-gradient(135deg, #E8783B22, #8B5CF622)',
      border: '1px solid #EDE9FE',
      color: '#5B21B6',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Powered by FinanceAI")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Predictive forecasting, automated summaries, and vendor payment optimisation.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement(LiveDot, null), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    icon: runningAll ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: 12,
        height: 12,
        border: '2px solid rgba(255,255,255,0.4)',
        borderTopColor: 'white',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 0.8s linear infinite'
      }
    }) : /*#__PURE__*/React.createElement("span", null, "\u2726"),
    onClick: runAll
  }, runningAll ? 'Running Models…' : 'Run All Models'))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '28px',
      marginBottom: '24px'
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
      fontSize: '20px',
      color: '#0F172A',
      letterSpacing: '-0.5px',
      marginBottom: '2px'
    }
  }, "Cash Flow Forecasting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "90-day rolling \xB7 Last run: 2h ago")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }
  }, ['Base', 'Optimistic', 'Pessimistic'].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => setScenario(s),
    style: {
      padding: '5px 12px',
      borderRadius: '999px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: scenario === s ? '#E8783B' : '#F8F7F5',
      color: scenario === s ? 'white' : '#64748B',
      transition: 'all 150ms'
    }
  }, s)), /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    onClick: handleRerun,
    disabled: rerunLoading
  }, rerunLoading ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      border: '2px solid #CBD5E1',
      borderTopColor: '#E8783B',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.8s linear infinite'
    }
  }), "Running\u2026") : 'Rerun'))), rerunMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      padding: '8px 14px',
      borderRadius: 8,
      background: rerunMsg.type === 'success' ? '#D1FAE5' : '#FEE2E2',
      border: `1px solid ${rerunMsg.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
      fontSize: 12,
      fontWeight: 600,
      color: rerunMsg.type === 'success' ? '#065F46' : '#991B1B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, rerunMsg.type === 'success' ? '✓ ' : '✕ ', rerunMsg.text), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    viewBox: `0 0 ${W} ${H}`,
    style: {
      overflow: 'visible'
    }
  }, [0, 0.25, 0.5, 0.75, 1].map((t, i) => {
    const y = chartPad.t + t * (H - chartPad.t - chartPad.b);
    const val = Math.round(maxV - t * (maxV - minV));
    return /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("line", {
      x1: chartPad.l,
      y1: y,
      x2: W - chartPad.r,
      y2: y,
      stroke: "#F1F0EE",
      strokeWidth: "1"
    }), /*#__PURE__*/React.createElement("text", {
      x: chartPad.l - 6,
      y: y + 4,
      fontSize: "10",
      fill: "#94A3B8",
      textAnchor: "end",
      fontFamily: "Plus Jakarta Sans"
    }, "\u20B9", val, "L"));
  }), /*#__PURE__*/React.createElement("line", {
    x1: chartPad.l,
    y1: toY(0),
    x2: W - chartPad.r,
    y2: toY(0),
    stroke: "#EF4444",
    strokeWidth: "1",
    strokeDasharray: "4,4",
    opacity: "0.5"
  }), /*#__PURE__*/React.createElement("text", {
    x: chartPad.l + 4,
    y: toY(0) - 4,
    fontSize: "9",
    fill: "#EF4444",
    fontFamily: "Plus Jakarta Sans",
    opacity: "0.7"
  }, "Shortfall Zone"), allData.map((d, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: toX(i),
    y: H - 4,
    fontSize: "10",
    fill: i >= pastData.length ? '#94A3B8' : '#64748B',
    textAnchor: "middle",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: i === pastData.length - 1 ? '700' : '400'
  }, d.label)), /*#__PURE__*/React.createElement("line", {
    x1: toX(pastData.length - 1),
    y1: chartPad.t,
    x2: toX(pastData.length - 1),
    y2: H - chartPad.b,
    stroke: "#E2E8F0",
    strokeWidth: "1.5",
    strokeDasharray: "4,4"
  }), /*#__PURE__*/React.createElement("text", {
    x: toX(pastData.length - 1) + 4,
    y: chartPad.t + 12,
    fontSize: "9",
    fill: "#94A3B8",
    fontFamily: "Plus Jakarta Sans"
  }, "Forecast \u2192"), /*#__PURE__*/React.createElement("path", {
    d: bandPath,
    fill: "rgba(232,120,59,0.1)"
  }), /*#__PURE__*/React.createElement("path", {
    d: lp(pastPts),
    fill: "none",
    stroke: "#E8783B",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), pastPts.map((p, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: p.x,
    cy: p.y,
    r: "4",
    fill: "white",
    stroke: "#E8783B",
    strokeWidth: "2"
  })), /*#__PURE__*/React.createElement("path", {
    d: `M ${pastPts[pastPts.length - 1].x} ${pastPts[pastPts.length - 1].y} ${forecastPts.map(p => `L ${p.x} ${p.y}`).join(' ')}`,
    fill: "none",
    stroke: "#E8783B",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeDasharray: "6,4"
  }), forecastPts.map((p, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: p.x,
    cy: p.y,
    r: "4",
    fill: "white",
    stroke: "#E8783B",
    strokeWidth: "2",
    opacity: "0.6"
  })), pinEvents.map((pin, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("circle", {
    cx: pin.x,
    cy: pin.y + 20,
    r: "6",
    fill: pin.color
  }), /*#__PURE__*/React.createElement("text", {
    x: pin.x,
    y: pin.y + 24,
    textAnchor: "middle",
    fontSize: "8",
    fill: "white",
    fontWeight: "700"
  }, pin.icon)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '16px',
      marginTop: '8px',
      fontSize: '11px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 3,
      background: '#E8783B',
      display: 'inline-block',
      borderRadius: 2
    }
  }), "Actual"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 2,
      background: '#E8783B',
      display: 'inline-block',
      borderRadius: 2,
      opacity: 0.5
    }
  }), "Forecast (", scenario, ")"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 10,
      background: 'rgba(232,120,59,0.15)',
      display: 'inline-block',
      borderRadius: 2
    }
  }), "80% Confidence Band"), [['#E8783B', 'AP Due'], ['#10B981', 'AR Receipt'], ['#EF4444', 'Payroll']].map(([c, l]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: c,
      display: 'inline-block'
    }
  }), l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '14px',
      marginTop: '20px'
    }
  }, (cfData ? [{
    label: 'Surplus Peak',
    value: '₹' + Number(cfData.summary?.max_balance_amount || 0).toLocaleString('en-IN'),
    date: cfData.summary?.max_balance_date || '',
    color: '#10B981',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    icon: '↑'
  }, {
    label: 'Shortfall Risk',
    value: '₹' + Number(cfData.summary?.min_balance_amount || 0).toLocaleString('en-IN'),
    date: cfData.summary?.min_balance_date || '',
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: '⚠'
  }, {
    label: 'Action Needed',
    value: cfData.risk_highlights?.[0]?.message?.slice(0, 20) || 'Monitor Cash',
    date: cfData.risk_highlights?.[0]?.date || 'Ongoing',
    color: '#E8783B',
    bg: '#FFF7ED',
    border: '#FED7AA',
    icon: '✦'
  }] : [{
    label: 'Surplus Peak',
    value: '₹1.18M',
    date: 'Sep 2026',
    color: '#10B981',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    icon: '↑'
  }, {
    label: 'Shortfall Risk',
    value: '₹34L deficit',
    date: 'Jul 2026 if delayed',
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: '⚠'
  }, {
    label: 'Recommended Action',
    value: 'Accelerate ₹8L AR',
    date: '3 customers flagged',
    color: '#E8783B',
    bg: '#FFF7ED',
    border: '#FED7AA',
    icon: '✦'
  }]).map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '16px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: c.color + '22',
      color: c.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 700
    }
  }, c.icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, c.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '20px',
      color: c.color,
      letterSpacing: '-0.5px',
      marginBottom: '3px'
    }
  }, c.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, c.date))))), cfData && cfData.narrative && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg, #FFF8F5, #FFF3E6)',
      border: '1px solid #FED7AA',
      borderRadius: '14px',
      padding: '18px 22px',
      marginBottom: '24px',
      display: 'flex',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '10px',
      background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'white',
      fontSize: '16px',
      fontWeight: 700
    }
  }, "\u2726")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#E8783B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '6px'
    }
  }, "AI Forecast Narrative \u2014 Live Data"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.7
    }
  }, cfData.narrative), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap'
    }
  }, [{
    label: 'Opening Balance',
    val: '₹' + Number(cfData.opening_balance || 0).toLocaleString('en-IN')
  }, {
    label: 'Projected Closing',
    val: '₹' + Number(cfData.projected_closing_balance || 0).toLocaleString('en-IN')
  }, {
    label: 'Known Payments',
    val: cfData.known_upcoming_payments || 0
  }].map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: '12px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94A3B8',
      marginRight: '4px'
    }
  }, item.label, ":"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: '#0F172A'
    }
  }, item.val)))))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '28px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '20px',
      color: '#0F172A',
      letterSpacing: '-0.5px'
    }
  }, "Monthly Financial Summaries"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '2px'
    }
  }, "Auto-generated on 1st of each month")), /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    icon: /*#__PURE__*/React.createElement(AIBadge, {
      small: true
    }),
    onClick: () => {
      window.TijoriAPI.NLQueryAPI.ask('Generate executive financial summary for ' + new Date().toLocaleString('en-IN', {
        month: 'long',
        year: 'numeric'
      })).then(res => alert('Summary: ' + (res.answer || 'Generated successfully.'))).catch(e => alert('Generation failed: ' + (e.message || 'Error')));
    }
  }, "Generate Now")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px'
    }
  }, summaryMonths.map((s, i) => {
    const [hov, setHov] = React.useState(false);
    const ss = summaryStatusStyle[s.status];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onMouseEnter: () => setHov(true),
      onMouseLeave: () => setHov(false),
      style: {
        background: 'white',
        border: `2px solid ${hov ? '#E8783B' : '#F1F0EE'}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 200ms',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.04)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 800,
        fontSize: '18px',
        color: '#0F172A',
        letterSpacing: '-0.5px'
      }
    }, s.month), /*#__PURE__*/React.createElement("span", {
      style: {
        background: ss.bg,
        color: ss.color,
        padding: '3px 8px',
        borderRadius: '999px',
        fontSize: '10px',
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        whiteSpace: 'nowrap'
      }
    }, s.status === 'AUTO_GEN' && /*#__PURE__*/React.createElement(AIBadge, {
      small: true
    }), " ", ss.label)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '14px'
      }
    }, [['Revenue', s.revenue, '#10B981'], ['Expenses', s.expenses, '#E8783B'], ['Net Profit', s.profit, s.profit.startsWith('-') ? '#EF4444' : '#10B981'], ['Cash', s.cash, '#E8783B']].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
      key: l
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '10px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em'
      }
    }, l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 800,
        fontSize: '18px',
        color: c,
        letterSpacing: '-0.5px'
      }
    }, v)))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        color: '#64748B',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        lineHeight: 1.5,
        marginBottom: '14px',
        borderTop: '1px solid #F8F7F5',
        paddingTop: '12px'
      }
    }, /*#__PURE__*/React.createElement(AIBadge, {
      small: true
    }), " ", s.insight), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '6px'
      }
    }, /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      small: true,
      onClick: () => {
        setSelectedMonth(s);
        setSummaryOpen(true);
      }
    }, "View Full \u2192"), /*#__PURE__*/React.createElement(Btn, {
      variant: "secondary",
      small: true,
      onClick: () => {
        const w = window.open('', '_blank');
        w.document.write(`<!DOCTYPE html><html><head><title>${s.month} Summary</title><style>body{font-family:sans-serif;padding:32px;}</style></head><body><h1>Tijori AI — ${s.month}</h1><p>Revenue: ${s.revenue} | Expenses: ${s.expenses} | Profit: ${s.profit}</p><p>${s.insight}</p><script>window.print()<\/script></body></html>`);
        w.document.close();
      }
    }, "PDF")));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '20px',
      padding: '16px',
      background: '#F8F7F5',
      borderRadius: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Auto-generate on 1st of each month"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '2px'
    }
  }, "Sends to: finance@acmecorp.in, cfo@acmecorp.in")), /*#__PURE__*/React.createElement("div", {
    onClick: () => setAutoGenEnabled(!autoGenEnabled),
    style: {
      width: 44,
      height: 24,
      borderRadius: 12,
      background: autoGenEnabled ? '#E8783B' : '#E2E8F0',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 200ms'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: 'white',
      position: 'absolute',
      top: 3,
      left: autoGenEnabled ? 23 : 3,
      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      transition: 'left 200ms'
    }
  })))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '20px',
      color: '#0F172A',
      letterSpacing: '-0.5px'
    }
  }, "Vendor Payment Optimisation"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: '#E8783B',
      display: 'block',
      animation: 'dotPulse 1.5s ease infinite'
    }
  })), /*#__PURE__*/React.createElement(AIBadge, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '20px'
    }
  }, "AI analyses payment terms and cash flow to suggest optimal payment timing."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginBottom: '20px'
    }
  }, [{
    icon: '📊',
    title: 'Analyses cash flow',
    desc: 'Reads 90-day forecast data'
  }, {
    icon: '📋',
    title: 'Checks payment terms',
    desc: 'Discounts, fees, vendor relationships'
  }, {
    icon: '✦',
    title: 'Recommends timing',
    desc: 'Batch payments to optimise cash'
  }].map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: '10px',
      padding: '14px',
      background: '#F8F7F5',
      borderRadius: '10px',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '18px'
    }
  }, h.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h.desc))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg, rgba(232,120,59,0.06), rgba(16,185,129,0.06))',
      border: '1px solid #FED7AA',
      borderRadius: '14px',
      padding: '20px',
      marginBottom: '20px',
      display: 'flex',
      gap: '32px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '4px'
    }
  }, "Total Savings"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '28px',
      color: '#10B981',
      letterSpacing: '-1px'
    }
  }, "\u20B9", Math.round(payRecs.filter(r => r.type === 'discount').reduce((a, b) => a + b.rawAmount * 0.015, 0)).toLocaleString('en-IN') || '0')), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '4px'
    }
  }, "Avoided Late Fees"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '28px',
      color: '#E8783B',
      letterSpacing: '-1px'
    }
  }, "\u20B9", Math.round(payRecs.filter(r => r.type === 'lateFee').reduce((a, b) => a + b.rawAmount * 0.02, 0)).toLocaleString('en-IN') || '0')), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '4px'
    }
  }, "Optimised DPO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '28px',
      color: '#F59E0B',
      letterSpacing: '-1px'
    }
  }, "+4.2d")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    disabled: payRecs.length === 0,
    onClick: async () => {
      if (!window.confirm(`Apply ${payRecs.length} payment recommendations?`)) return;
      setPayNowMsg({
        type: 'info',
        text: 'Applying recommendations and scheduling payments...'
      });
      try {
        await Promise.all(payRecs.map(r => window.TijoriAPI.BillsAPI.settle(r.rawId, `OPT-${Date.now()}`)));
        setPayNowMsg({
          type: 'success',
          text: `✓ ${payRecs.length} payments successfully scheduled.`
        });
        setPayRecs([]);
      } catch (e) {
        setPayNowMsg({
          type: 'error',
          text: 'Failed to apply some recommendations.'
        });
      }
      setTimeout(() => setPayNowMsg(null), 6000);
    }
  }, "Apply All Recommendations"))), payNowMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20,
      padding: '12px 16px',
      borderRadius: 8,
      background: payNowMsg.type === 'success' ? '#D1FAE5' : payNowMsg.type === 'error' ? '#FEE2E2' : '#DBEAFE',
      border: `1px solid ${payNowMsg.type === 'success' ? '#6EE7B7' : payNowMsg.type === 'error' ? '#FCA5A5' : '#93C5FD'}`,
      fontSize: 13,
      fontWeight: 600,
      color: payNowMsg.type === 'success' ? '#065F46' : payNowMsg.type === 'error' ? '#991B1B' : '#1E40AF',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, payNowMsg.text), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #F1F0EE'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Vendor', 'Amount Due', 'Due Date', 'Suggested Pay', 'AI Insight', 'Action'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 14px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, payRecs.map((r, i) => {
    const tc = tipColor[r.type];
    return /*#__PURE__*/React.createElement("tr", {
      key: i,
      style: {
        borderTop: '1px solid #F1F0EE',
        height: 60,
        transition: 'background 150ms'
      },
      onMouseEnter: e => e.currentTarget.style.background = '#FFF8F5',
      onMouseLeave: e => e.currentTarget.style.background = 'white'
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 14px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, r.vendor), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 14px',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: '14px',
        color: '#E8783B',
        letterSpacing: '-0.5px'
      }
    }, r.amount), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 14px',
        fontSize: '12px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, r.due), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 14px',
        fontSize: '12px',
        fontWeight: 700,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, r.suggested), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 14px',
        maxWidth: 200
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        background: tc.bg,
        color: tc.color,
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        display: 'inline-block'
      }
    }, r.tip)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '6px'
      }
    }, /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      small: true,
      onClick: () => {
        setPayForm({
          method: 'NEFT',
          utr: '',
          notes: ''
        });
        setPayModal({
          rec: r
        });
      }
    }, "Pay Now"), /*#__PURE__*/React.createElement(Btn, {
      variant: "secondary",
      small: true,
      onClick: () => {
        setSchedForm({
          date: r.suggestedDate || '',
          note: ''
        });
        setSchedModal({
          rec: r
        });
      }
    }, "Schedule"))));
  })))), payNowMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '10px 16px',
      borderRadius: 10,
      background: payNowMsg.type === 'success' ? '#D1FAE5' : payNowMsg.type === 'error' ? '#FEE2E2' : '#EDE9FE',
      border: `1px solid ${payNowMsg.type === 'success' ? '#6EE7B7' : payNowMsg.type === 'error' ? '#FCA5A5' : '#C4B5FD'}`,
      fontSize: 13,
      fontWeight: 600,
      color: payNowMsg.type === 'success' ? '#065F46' : payNowMsg.type === 'error' ? '#991B1B' : '#5B21B6',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", null, payNowMsg.type === 'success' ? '✓' : payNowMsg.type === 'error' ? '✕' : '…'), payNowMsg.text)), /*#__PURE__*/React.createElement(CopilotWidget, {
    role: role
  }), /*#__PURE__*/React.createElement(SidePanel, {
    open: summaryOpen,
    onClose: () => setSummaryOpen(false),
    title: selectedMonth?.month || '',
    width: 500
  }, selectedMonth && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement(AIBadge, null), /*#__PURE__*/React.createElement(LiveDot, {
    color: "#8B5CF6"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "AI-generated summary")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '8px'
    }
  }, "Executive Summary"), ['Revenue grew 12% MoM driven by 2 large AR collections from Acme Corp and Global Tech.', 'Engineering budget hit 100% — booking suspension triggered.', `Travel expenses up 34% vs prior month — ${selectedMonth.month === 'March 2026' ? 'conference season impact.' : 'investigate root cause.'}`, 'Net profit margin improved to 19% — ahead of Q4 target.'].map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#E8783B',
      fontWeight: 700,
      flexShrink: 0,
      fontSize: '13px'
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.5
    }
  }, b)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F5F3FF',
      border: '1px solid #EDE9FE',
      borderRadius: '10px',
      padding: '14px',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement(AIBadge, {
    small: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#5B21B6',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Next Month Outlook")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#4C1D95',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.5
    }
  }, "Based on current pipeline, next month revenue is forecast at \u20B968L (\xB112%). Watch Engineering budget \u2014 3 large invoices pending CFO approval.")), /*#__PURE__*/React.createElement(TjTextarea, {
    label: "Finance Manager Notes",
    placeholder: "Add notes to this summary\u2026",
    rows: 3
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: () => setSummaryOpen(false)
  }, "Save Notes"), /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    onClick: () => {
      if (!selectedMonth) return;
      const w = window.open('', '_blank');
      w.document.write(`<!DOCTYPE html><html><head><title>${selectedMonth.month} Summary</title><style>body{font-family:sans-serif;padding:32px;color:#0F172A;} h1{font-size:22px;margin-bottom:4px;} .meta{font-size:12px;color:#64748B;margin-bottom:24px;}</style></head><body><h1>Tijori AI — ${selectedMonth.month}</h1><div class="meta">Generated: ${new Date().toLocaleString('en-IN')}</div><table border=1 cellpadding=8 style="width:100%;border-collapse:collapse;"><tr><th>Revenue</th><td>${selectedMonth.revenue}</td></tr><tr><th>Expenses</th><td>${selectedMonth.expenses}</td></tr><tr><th>Net Profit</th><td>${selectedMonth.profit}</td></tr><tr><th>Cash Position</th><td>${selectedMonth.cash}</td></tr></table><p style="margin-top:24px;"><b>AI Insight:</b> ${selectedMonth.insight}</p><script>window.print()<\/script></body></html>`);
      w.document.close();
    }
  }, "Export PDF")))), payModal && /*#__PURE__*/React.createElement(TjModal, {
    open: true,
    onClose: () => {
      setPayModal(null);
      setPayProcessing(false);
    },
    title: "Initiate Payment",
    accentColor: "#E8783B",
    width: 480
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 16px',
      background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)',
      border: '1px solid #FED7AA',
      borderRadius: '12px',
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#92400E',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Invoice"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '13px',
      color: '#E8783B',
      fontWeight: 600,
      marginTop: '2px'
    }
  }, payModal.rec.invoices), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '2px'
    }
  }, payModal.rec.vendor)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '26px',
      color: '#E8783B',
      letterSpacing: '-1px'
    }
  }, payModal.rec.amount), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#92400E',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Due: ", payModal.rec.due))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#374151',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '6px'
    }
  }, "Payment Method"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px'
    }
  }, ['NEFT', 'RTGS', 'IMPS', 'UPI'].map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    onClick: () => setPayForm(f => ({
      ...f,
      method: m
    })),
    style: {
      flex: 1,
      padding: '8px 4px',
      borderRadius: '8px',
      border: `2px solid ${payForm.method === m ? '#E8783B' : '#E2E8F0'}`,
      background: payForm.method === m ? '#FFF7ED' : 'white',
      fontSize: '12px',
      fontWeight: 700,
      color: payForm.method === m ? '#E8783B' : '#64748B',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: 'all 150ms'
    }
  }, m)))), /*#__PURE__*/React.createElement(TjInput, {
    label: "UTR / Transaction Reference (optional \u2014 auto-generated if blank)",
    placeholder: `UTR-${payModal.rec.invoices}-${Date.now().toString().slice(-6)}`,
    value: payForm.utr,
    onChange: e => setPayForm(f => ({
      ...f,
      utr: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Payment Notes / Remarks",
    placeholder: "e.g. Early payment for 1.5% discount",
    value: payForm.notes,
    onChange: e => setPayForm(f => ({
      ...f,
      notes: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px',
      background: '#F0FDF4',
      border: '1px solid #BBF7D0',
      borderRadius: '10px',
      marginBottom: '16px',
      fontSize: '12px',
      color: '#065F46',
      fontFamily: "'Plus Jakarta Sans', sans-serif' ",
      fontWeight: 500
    }
  }, "\u2713 Payment confirmation will be sent to vendor via email. Transaction will be recorded in AuditLog with UTR."), payNowMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '12px',
      padding: '10px 14px',
      borderRadius: '8px',
      background: payNowMsg.type === 'success' ? '#D1FAE5' : '#FEE2E2',
      border: `1px solid ${payNowMsg.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
      fontSize: '13px',
      fontWeight: 600,
      color: payNowMsg.type === 'success' ? '#065F46' : '#991B1B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, payNowMsg.text), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setPayModal(null)
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    disabled: payProcessing,
    onClick: async () => {
      const r = payModal.rec;
      setPayProcessing(true);
      setPayNowMsg(null);
      try {
        const utr = payForm.utr.trim() || `UTR-${r.invoices}-${Date.now().toString().slice(-6)}`;
        const res = await window.TijoriAPI.BillsAPI.settle(r.rawId, utr, payForm.method, payForm.notes);
        setPayNowMsg({
          type: 'success',
          text: res?.message || `✓ Payment of ${r.amount} to ${r.vendor} processed via ${payForm.method}. UTR: ${utr}`
        });
        setPayRecs(prev => prev.filter(p => p.rawId !== r.rawId));
        setTimeout(() => {
          setPayModal(null);
          setPayNowMsg(null);
        }, 3000);
      } catch (e) {
        setPayNowMsg({
          type: 'error',
          text: `Payment failed: ${e.message || 'Check approval status or authority limits'}`
        });
      } finally {
        setPayProcessing(false);
      }
    }
  }, payProcessing ? 'Processing…' : `Confirm Payment — ${payModal.rec.amount}`))), schedModal && /*#__PURE__*/React.createElement(TjModal, {
    open: true,
    onClose: () => {
      setSchedModal(null);
      setSchedProcessing(false);
    },
    title: "Schedule Payment",
    accentColor: "#5B21B6",
    width: 440
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 16px',
      background: '#F5F3FF',
      border: '1px solid #EDE9FE',
      borderRadius: '12px',
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: '#7C3AED',
      fontWeight: 600
    }
  }, schedModal.rec.invoices), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600,
      marginTop: '2px'
    }
  }, schedModal.rec.vendor)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '22px',
      color: '#7C3AED',
      letterSpacing: '-0.5px'
    }
  }, schedModal.rec.amount), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#7C3AED',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, schedModal.rec.tip))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '6px',
      fontSize: '12px',
      fontWeight: 600,
      color: '#374151',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Payment Date ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#EF4444'
    }
  }, "*")), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: schedForm.date,
    onChange: e => setSchedForm(f => ({
      ...f,
      date: e.target.value
    })),
    min: new Date().toISOString().slice(0, 10),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '10px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '10px',
      fontSize: '14px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: '#0F172A',
      outline: 'none',
      marginBottom: '14px'
    }
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Note / Reason (optional)",
    placeholder: "e.g. Early payment for discount \u2014 AI recommendation",
    value: schedForm.note,
    onChange: e => setSchedForm(f => ({
      ...f,
      note: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: '#F5F3FF',
      border: '1px solid #EDE9FE',
      borderRadius: '10px',
      marginBottom: '16px',
      fontSize: '12px',
      color: '#5B21B6',
      fontFamily: "'Plus Jakarta Sans', sans-serif'",
      fontWeight: 500
    }
  }, "\u2713 Vendor will be notified via email. Payment will auto-initiate on the scheduled date."), payNowMsg && schedModal && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '12px',
      padding: '10px 14px',
      borderRadius: '8px',
      background: payNowMsg.type === 'success' ? '#D1FAE5' : '#FEE2E2',
      border: `1px solid ${payNowMsg.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
      fontSize: '13px',
      fontWeight: 600,
      color: payNowMsg.type === 'success' ? '#065F46' : '#991B1B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, payNowMsg.text), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setSchedModal(null)
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "purple",
    disabled: schedProcessing || !schedForm.date,
    onClick: async () => {
      const r = schedModal.rec;
      if (!schedForm.date) {
        setPayNowMsg({
          type: 'error',
          text: 'Please select a payment date.'
        });
        return;
      }
      setSchedProcessing(true);
      try {
        const res = await window.TijoriAPI.BillsAPI.schedulePayment(r.rawId, schedForm.date, schedForm.note || `Scheduled via AI Optimization for ${r.vendor}`);
        setPayNowMsg({
          type: 'success',
          text: res?.message || `✓ Payment of ${r.amount} to ${r.vendor} scheduled for ${schedForm.date}. Vendor notified.`
        });
        setTimeout(() => {
          setSchedModal(null);
          setPayNowMsg(null);
        }, 3000);
      } catch (e) {
        setPayNowMsg({
          type: 'error',
          text: `Schedule failed: ${e.message || 'Server error'}`
        });
      } finally {
        setSchedProcessing(false);
      }
    }
  }, schedProcessing ? 'Scheduling…' : `Confirm Schedule — ${schedModal.rec.amount}`))));
};
Object.assign(window, {
  AIHubScreen
});
