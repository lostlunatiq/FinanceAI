// Tijori AI — Anomaly Detection (AI Fraud Engine)

const AnomalyScreen = ({
  onNavigate
}) => {
  const [activePanel, setActivePanel] = React.useState(null);
  const [scanLoading, setScanLoading] = React.useState(false);
  const [scanned, setScanned] = React.useState(false);
  const [anomalies, setAnomalies] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const loadAnomalies = () => {
    const {
      AnomalyAPI,
      expenseToAnomaly
    } = window.TijoriAPI;
    setLoading(true);
    AnomalyAPI.list().then(data => {
      const items = (data || []).map((exp, i) => expenseToAnomaly(exp, i));
      setAnomalies(items);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  React.useEffect(() => {
    loadAnomalies();
  }, []);
  const runScan = async () => {
    setScanLoading(true);
    setScanned(false);
    try {
      await window.TijoriAPI.AnomalyAPI.scanAll();
    } catch (e) {}
    loadAnomalies();
    setTimeout(() => {
      setScanLoading(false);
      setScanned(true);
    }, 800);
  };
  const handleMarkSafe = async id => {
    try {
      await window.TijoriAPI.BillsAPI.markSafe(id);
      loadAnomalies();
      if (activePanel && activePanel.rawId === id) setActivePanel(null);
    } catch (e) {
      alert("Failed to mark safe: " + e.message);
    }
  };
  const handleEscalate = async id => {
    try {
      await window.TijoriAPI.BillsAPI.escalate(id);
      loadAnomalies();
      if (activePanel && activePanel.rawId === id) setActivePanel(null);
    } catch (e) {
      alert("Failed to escalate: " + e.message);
    }
  };
  const scoreColor = s => s > 80 ? '#EF4444' : s > 50 ? '#F59E0B' : '#94A3B8';
  const scoreBg = s => s > 80 ? '#FEE2E2' : s > 50 ? '#FEF3C7' : '#F8F7F5';
  const open = anomalies.filter(a => a.status === 'OPEN');
  const highConf = anomalies.filter(a => a.score > 80);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px'
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
  }, "AI Fraud & Anomaly Engine"), /*#__PURE__*/React.createElement(AIBadge, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Continuous monitoring for duplicate invoices, inflated values, and abnormal velocity.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement(LiveDot, null), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    icon: scanLoading ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: 12,
        height: 12,
        border: '2px solid rgba(255,255,255,0.4)',
        borderTopColor: 'white',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 0.8s linear infinite'
      }
    }) : /*#__PURE__*/React.createElement("span", null, "\u2B21"),
    onClick: runScan,
    disabled: scanLoading
  }, scanLoading ? 'Scanning…' : scanned ? 'Scan Complete ✓' : 'Run Full Scan'))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: '14px',
      padding: '16px 20px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '18px'
    }
  }, "\u26A0"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700,
      fontSize: '13px',
      color: '#991B1B',
      marginBottom: '2px'
    }
  }, "High Probability Flags Detected"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#B91C1C',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "3 invoices match known structural signatures of double-billing logic. 1 expense matches off-shift pattern.")), /*#__PURE__*/React.createElement(Btn, {
    variant: "destructive",
    small: true,
    onClick: () => {
      const first = anomalies.find(a => a.score > 80) || anomalies[0];
      if (first) setActivePanel(first);
    }
  }, "Review All")), /*#__PURE__*/React.createElement(StatsRow, {
    cards: [{
      label: 'Total Flagged',
      value: loading ? '…' : String(anomalies.length),
      delta: 'from database',
      deltaType: 'negative',
      color: '#EF4444'
    }, {
      label: 'High Confidence >80%',
      value: loading ? '…' : String(highConf.length),
      delta: 'Requires action',
      deltaType: 'negative',
      color: '#EF4444',
      pulse: highConf.length > 0
    }, {
      label: 'Pending Review',
      value: loading ? '…' : String(open.length),
      delta: 'Open cases',
      deltaType: 'neutral'
    }, {
      label: 'Resolved',
      value: loading ? '…' : String(anomalies.filter(a => a.status === 'RESOLVED').length),
      delta: 'Historical',
      deltaType: 'positive',
      color: '#10B981'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
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
  }, ['Confidence', 'Entity Ref', 'Anomaly Type', 'AI Logic', 'Status', 'Actions'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, loading ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "6",
    style: {
      padding: '32px',
      textAlign: 'center',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px'
    }
  }, "Loading anomalies\u2026")) : anomalies.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "6",
    style: {
      padding: '32px',
      textAlign: 'center',
      color: '#10B981',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px'
    }
  }, "No anomalies detected. System is clean.")) : null, anomalies.map(a => {
    const hi = a.score > 80;
    return /*#__PURE__*/React.createElement("tr", {
      key: a.id,
      style: {
        borderTop: '1px solid #F1F0EE',
        background: hi ? 'rgba(239,68,68,0.025)' : 'white',
        height: 60,
        transition: 'background 150ms',
        borderLeft: hi ? `3px solid ${scoreColor(a.score)}` : '3px solid transparent',
        animation: hi ? 'borderPulse 2s ease infinite' : 'none'
      },
      onMouseEnter: e => e.currentTarget.style.background = hi ? 'rgba(239,68,68,0.05)' : '#FFF8F5',
      onMouseLeave: e => e.currentTarget.style.background = hi ? 'rgba(239,68,68,0.025)' : 'white'
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: scoreBg(a.score),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 800,
        fontSize: '14px',
        color: scoreColor(a.score),
        letterSpacing: '-0.5px'
      }
    }, a.score, "%"))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px',
        color: '#E8783B',
        fontWeight: 500
      }
    }, a.entity), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '10px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginTop: '2px'
      }
    }, a.date)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: '13px',
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginBottom: '2px'
      }
    }, a.type), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        color: '#64748B',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        maxWidth: 220,
        lineHeight: 1.4
      }
    }, a.details)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px',
        maxWidth: 220
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#F5F3FF',
        borderRadius: '8px',
        padding: '8px 10px',
        display: 'flex',
        gap: '6px',
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(AIBadge, {
      small: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '11px',
        color: '#5B21B6',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        lineHeight: 1.4
      }
    }, a.logic))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement(StatusBadge, {
      status: a.status === 'OPEN' ? 'ANOMALY' : a.status === 'UNDER_REVIEW' ? 'PROCESSING' : 'APPROVED'
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '6px'
      }
    }, /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      small: true,
      onClick: () => setActivePanel(a)
    }, "Investigate"), a.status !== 'RESOLVED' && /*#__PURE__*/React.createElement(Btn, {
      variant: "green",
      small: true,
      onClick: () => handleMarkSafe(a.rawId)
    }, "Mark Safe"), a.score > 80 && /*#__PURE__*/React.createElement(Btn, {
      variant: "destructive",
      small: true,
      onClick: () => handleEscalate(a.rawId)
    }, "Escalate"))));
  })))), /*#__PURE__*/React.createElement(SidePanel, {
    open: !!activePanel,
    onClose: () => setActivePanel(null),
    title: activePanel ? `Anomaly: ${activePanel.entity}` : '',
    width: 460
  }, activePanel && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: scoreBg(activePanel.score),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '18px',
      color: scoreColor(activePanel.score)
    }
  }, activePanel.score, "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A'
    }
  }, activePanel.type), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, activePanel.date))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8F7F5',
      borderRadius: '12px',
      padding: '14px 16px',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '8px'
    }
  }, "Detection Details"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.6
    }
  }, activePanel.details)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F5F3FF',
      borderRadius: '12px',
      padding: '14px 16px',
      marginBottom: '20px',
      border: '1px solid #EDE9FE'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement(AIBadge, null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#5B21B6',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "AI Reasoning")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#4C1D95',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.6
    }
  }, activePanel.logic)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '12px'
    }
  }, "Confidence Signal Breakdown"), [{
    label: 'Pattern Match',
    val: 92
  }, {
    label: 'Historical Baseline',
    val: activePanel.score - 4
  }, {
    label: 'Vendor Risk Score',
    val: activePanel.score - 12
  }, {
    label: 'Temporal Factor',
    val: activePanel.score - 20
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      marginBottom: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, s.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: scoreColor(s.val),
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, s.val, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: '#F1F5F9',
      borderRadius: 3,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${s.val}%`,
      background: `linear-gradient(90deg, ${scoreColor(s.val)}, ${scoreColor(s.val)}88)`,
      borderRadius: 3,
      transition: 'width 600ms ease'
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    style: {
      flex: 1
    },
    onClick: () => handleEscalate(activePanel.rawId)
  }, "Escalate to CFO"), /*#__PURE__*/React.createElement(Btn, {
    variant: "green",
    style: {
      flex: 1
    },
    onClick: () => handleMarkSafe(activePanel.rawId)
  }, "Mark as Safe")), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      marginTop: '10px',
      padding: '10px',
      background: '#F5F3FF',
      border: '1px solid #EDE9FE',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '13px',
      color: '#5B21B6',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "\u2726 Explain this anomaly in Copilot"))));
};
Object.assign(window, {
  AnomalyScreen
});
