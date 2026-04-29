// Tijori AI — New Finance Automation Screens
// All screens fetch real data from backend analytics APIs

// ─── Shared helpers ────────────────────────────────────────────────────────────

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', {
  maximumFractionDigits: 0
});
const fmtPct = n => `${n >= 0 ? '+' : ''}${Number(n || 0).toFixed(1)}%`;
const fmtNum = n => Number(n || 0).toLocaleString('en-IN');
const SEVERITY_COLOR = {
  CRITICAL: {
    bg: '#FEE2E2',
    text: '#991B1B',
    dot: '#EF4444'
  },
  HIGH: {
    bg: '#FEF3C7',
    text: '#92400E',
    dot: '#F59E0B'
  },
  MEDIUM: {
    bg: '#FFF7ED',
    text: '#9A3412',
    dot: '#F97316'
  },
  LOW: {
    bg: '#ECFDF5',
    text: '#065F46',
    dot: '#10B981'
  },
  OK: {
    bg: '#ECFDF5',
    text: '#065F46',
    dot: '#10B981'
  },
  WARNING: {
    bg: '#FEF3C7',
    text: '#92400E',
    dot: '#F59E0B'
  }
};
const StatusChip = ({
  level,
  label
}) => {
  const c = SEVERITY_COLOR[level] || SEVERITY_COLOR.LOW;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.dot}33`,
      borderRadius: '999px',
      fontSize: '10px',
      fontWeight: 700,
      padding: '2px 10px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      letterSpacing: '0.04em',
      textTransform: 'uppercase'
    }
  }, label || level);
};
const AnalyticCard = ({
  title,
  value,
  sub,
  trend,
  color = '#E8783B',
  icon
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'white',
    borderRadius: '14px',
    border: '1px solid #F1F0EE',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#94A3B8',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }
}, icon && /*#__PURE__*/React.createElement("span", null, icon), title), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontWeight: 800,
    fontSize: '26px',
    color: '#0F172A',
    letterSpacing: '-1px'
  }
}, value), sub && /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: '12px',
    color: '#64748B',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  }
}, sub), trend !== undefined && /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: '12px',
    fontWeight: 700,
    color: trend >= 0 ? '#10B981' : '#EF4444',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  }
}, trend >= 0 ? '↑' : '↓', " ", Math.abs(trend).toFixed(1), "% vs prior period"));
const SectionTitle = ({
  title,
  sub
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    marginBottom: '12px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontWeight: 800,
    fontSize: '18px',
    color: '#0F172A',
    letterSpacing: '-0.5px'
  }
}, title), sub && /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: '12px',
    color: '#94A3B8',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    marginTop: '2px'
  }
}, sub));
const Table = ({
  headers,
  rows,
  emptyMsg = 'No data'
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'white',
    borderRadius: '14px',
    border: '1px solid #F1F0EE',
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("table", {
  style: {
    width: '100%',
    borderCollapse: 'collapse'
  }
}, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
  style: {
    background: '#F8FAFC'
  }
}, headers.map((h, i) => /*#__PURE__*/React.createElement("th", {
  key: i,
  style: {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 700,
    color: '#94A3B8',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid #F1F0EE'
  }
}, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
  colSpan: headers.length,
  style: {
    padding: '24px',
    textAlign: 'center',
    color: '#CBD5E1',
    fontSize: '13px',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  }
}, emptyMsg)) : rows.map((row, ri) => /*#__PURE__*/React.createElement("tr", {
  key: ri,
  style: {
    borderBottom: ri < rows.length - 1 ? '1px solid #F8FAFC' : 'none'
  },
  onMouseEnter: e => e.currentTarget.style.background = '#FAFAF8',
  onMouseLeave: e => e.currentTarget.style.background = 'transparent'
}, row.map((cell, ci) => /*#__PURE__*/React.createElement("td", {
  key: ci,
  style: {
    padding: '11px 16px',
    fontSize: '13px',
    color: '#0F172A',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  }
}, cell)))))));
const ScreenLoader = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    flexDirection: 'column',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 28,
    height: 28,
    border: '2.5px solid #E2E8F0',
    borderTopColor: '#E8783B',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: '13px',
    color: '#94A3B8',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  }
}, "Loading data\u2026"));
const ErrorBanner = ({
  msg
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#FEE2E2',
    border: '1px solid #FECACA',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#991B1B',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  }
}, msg || 'Failed to load data. Please refresh.');
const useAnalytics = fetcher => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    setLoading(true);
    fetcher().then(d => {
      setData(d);
      setError(null);
    }).catch(e => setError(e.message || 'Error loading data')).finally(() => setLoading(false));
  }, []);
  return {
    data,
    loading,
    error
  };
};
const PageWrap = ({
  children
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '28px 32px',
    maxWidth: 1200,
    margin: '0 auto'
  }
}, children);

// ─── 1. Spend Analytics Screen ────────────────────────────────────────────────

const SpendAnalyticsScreen = ({
  onNavigate
}) => {
  const {
    data,
    loading,
    error
  } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.spendIntelligence());
  if (loading) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ScreenLoader, null));
  if (error) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ErrorBanner, {
    msg: error
  }));
  const d = data || {};
  const cats = d.categories || [];
  const monthly = d.monthly_trend || [];
  const maxMonth = Math.max(...monthly.map(m => m.amount), 1);
  return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Spend Intelligence",
    sub: "AI-powered spend analysis and categorization"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "YTD Total Spend",
    value: fmt(d.ytd_total),
    trend: d.yoy_change_pct
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Avg Invoice Size",
    value: fmt(d.avg_invoice_size),
    sub: "Per transaction"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Spend Categories",
    value: cats.length,
    sub: "Active vendor types"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "YoY Change",
    value: fmtPct(d.yoy_change_pct),
    sub: d.yoy_change_pct >= 0 ? 'Spend increased' : 'Spend reduced',
    color: d.yoy_change_pct >= 0 ? '#EF4444' : '#10B981'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '14px',
      border: '1px solid #F1F0EE',
      padding: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '15px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Spend by Category"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, cats.slice(0, 6).map((cat, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, cat.category), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, fmt(cat.amount), " (", cat.pct, "%)")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F1F5F9',
      borderRadius: '999px',
      height: 6,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: `hsl(${20 + i * 40}, 80%, 55%)`,
      width: `${cat.pct}%`,
      height: '100%',
      borderRadius: '999px',
      transition: 'width 600ms ease'
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '14px',
      border: '1px solid #F1F0EE',
      padding: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '15px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Monthly Trend (6 months)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '8px',
      height: 140,
      paddingBottom: '20px'
    }
  }, monthly.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      height: '100%',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      background: i === monthly.length - 1 ? '#E8783B' : '#CBD5E1',
      borderRadius: '4px 4px 0 0',
      height: `${m.amount / maxMonth * 110}px`,
      transition: 'height 400ms ease'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, m.month?.slice(5)))), monthly.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      color: '#CBD5E1',
      fontSize: '12px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      paddingTop: '40px'
    }
  }, "No trend data yet")))), d.ai_insight && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg, #FFF8F5, #FFF3E6)',
      border: '1px solid #FED7AA',
      borderRadius: '14px',
      padding: '16px 20px',
      marginBottom: '24px',
      display: 'flex',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
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
      fontSize: '14px',
      fontWeight: 700
    }
  }, "\u2726")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#E8783B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: '4px'
    }
  }, "AI Insight"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.6
    }
  }, d.ai_insight))), /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Top Vendors by YTD Spend"
  }), /*#__PURE__*/React.createElement(Table, {
    headers: ['Vendor', 'Type', 'Total Spend', 'Invoices'],
    rows: (d.top_vendors || []).map(v => [/*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, v.name), /*#__PURE__*/React.createElement("span", {
      style: {
        background: '#F1F5F9',
        borderRadius: '6px',
        padding: '2px 8px',
        fontSize: '11px',
        color: '#475569'
      }
    }, v.type), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: '#0F172A'
      }
    }, fmt(v.amount)), v.invoices]),
    emptyMsg: "No spend data available yet"
  }));
};

// ─── 2. Working Capital Screen ────────────────────────────────────────────────

const WorkingCapitalScreen = ({
  onNavigate
}) => {
  const {
    data,
    loading,
    error
  } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.workingCapital());
  if (loading) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ScreenLoader, null));
  if (error) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ErrorBanner, {
    msg: error
  }));
  const d = data || {};
  const aging = d.aging || {};
  const overdue = d.overdue_vendors || [];
  const agingBuckets = [{
    label: '0–30 days',
    ...aging['0_30_days'],
    color: '#10B981'
  }, {
    label: '31–60 days',
    ...aging['31_60_days'],
    color: '#F59E0B'
  }, {
    label: '61–90 days',
    ...aging['61_90_days'],
    color: '#F97316'
  }, {
    label: '>90 days',
    ...aging['over_90_days'],
    color: '#EF4444'
  }];
  return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Working Capital Dashboard",
    sub: "Payables aging, DPO analysis, and cash health"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Days Payable Outstanding",
    value: `${d.dpo_days || 0} days`,
    sub: "Avg time invoice \u2192 payment"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Total Outstanding",
    value: fmt(d.total_outstanding),
    sub: "Pending payables"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "MSME Breach Risk",
    value: d.msme_breach_risk_count || 0,
    sub: "45-day rule violations",
    color: d.msme_breach_risk_count > 0 ? '#EF4444' : '#10B981'
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Working Capital Score",
    value: `${d.health_score || 0}/100`,
    sub: d.health_score >= 75 ? 'Healthy' : d.health_score >= 50 ? 'Moderate risk' : 'Action needed'
  })), (d.msme_breach_risk_count || 0) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEE2E2',
      border: '1px solid #FECACA',
      borderRadius: '12px',
      padding: '14px 18px',
      marginBottom: '20px',
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '18px'
    }
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#991B1B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, d.msme_breach_risk_count, " MSME vendor invoice(s) exceed 45-day payment deadline \u2014 regulatory breach risk!")), /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Payables Aging Analysis"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }
  }, agingBuckets.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: 'white',
      borderRadius: '14px',
      border: `2px solid ${b.color}22`,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: b.color
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '22px',
      color: '#0F172A'
    }
  }, fmt(b.amount)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, b.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, fmtNum(b.count), " invoices")))), overdue.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Overdue Payables (>90 days)",
    sub: "Vendors awaiting payment beyond normal terms"
  }), /*#__PURE__*/React.createElement(Table, {
    headers: ['Vendor', 'Reference', 'Days Outstanding', 'Amount'],
    rows: overdue.map(v => [/*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: '#991B1B'
      }
    }, v.vendor), v.ref_no, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#EF4444',
        fontWeight: 700
      }
    }, v.days, " days"), fmt(v.amount)])
  })));
};

// ─── 3. Vendor Risk Screen ────────────────────────────────────────────────────

const VendorRiskScreen = ({
  onNavigate
}) => {
  const {
    data,
    loading,
    error
  } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.vendorRisk());
  if (loading) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ScreenLoader, null));
  if (error) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ErrorBanner, {
    msg: error
  }));
  const d = data || {};
  const vendors = d.vendors || [];
  const GRADE_COLOR = {
    CRITICAL: '#EF4444',
    HIGH: '#F59E0B',
    MEDIUM: '#F97316',
    LOW: '#10B981'
  };
  return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Vendor Risk Score",
    sub: "AI-based risk assessment across your supplier base"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Active Vendors Assessed",
    value: d.total_active_vendors || 0
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "High Risk Vendors",
    value: d.high_risk_count || 0,
    sub: "Need immediate review",
    color: "#EF4444"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Low Risk Vendors",
    value: (d.total_active_vendors || 0) - (d.high_risk_count || 0),
    sub: "Within acceptable range",
    color: "#10B981"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '14px',
      border: '1px solid #F1F0EE',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px',
      borderBottom: '1px solid #F8FAFC',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '15px',
      color: '#0F172A'
    }
  }, "Vendor Risk Rankings"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8FAFC'
    }
  }, ['Vendor', 'GSTIN', 'Risk Level', 'Risk Score', 'Anomalies', 'Rejections', 'Factors'].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      padding: '10px 16px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      borderBottom: '1px solid #F1F0EE'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, vendors.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 7,
    style: {
      padding: '24px',
      textAlign: 'center',
      color: '#CBD5E1',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "No vendor data available")) : vendors.map((v, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    onMouseEnter: e => e.currentTarget.style.background = '#FAFAF8',
    onMouseLeave: e => e.currentTarget.style.background = ''
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, v.vendor_name, v.is_msme && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: '6px',
      fontSize: '9px',
      background: '#EDE9FE',
      color: '#5B21B6',
      borderRadius: '999px',
      padding: '1px 6px',
      fontWeight: 700
    }
  }, "MSME")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'JetBrains Mono', monospace"
    }
  }, v.gstin || '—'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement(StatusChip, {
    level: v.risk_level
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F1F5F9',
      borderRadius: '999px',
      height: 6,
      width: 60,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: GRADE_COLOR[v.risk_level] || '#10B981',
      width: `${v.risk_score}%`,
      height: '100%',
      borderRadius: '999px'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: GRADE_COLOR[v.risk_level],
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, v.risk_score))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      fontSize: '13px',
      color: v.anomaly_count > 0 ? '#EF4444' : '#64748B',
      fontWeight: v.anomaly_count > 0 ? 700 : 400,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, v.anomaly_count), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      fontSize: '13px',
      color: v.rejection_count > 0 ? '#F59E0B' : '#64748B',
      fontWeight: v.rejection_count > 0 ? 700 : 400,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, v.rejection_count), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      maxWidth: 200
    }
  }, (v.risk_factors || []).join(' · ') || '—')))))));
};

// ─── 4. GST Reconciliation Screen ─────────────────────────────────────────────

const GSTReconScreen = ({
  onNavigate
}) => {
  const {
    data,
    loading,
    error
  } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.gstRecon());
  if (loading) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ScreenLoader, null));
  if (error) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ErrorBanner, {
    msg: error
  }));
  const d = data || {};
  const s = d.summary || {};
  const flags = d.flags || [];
  return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "GST Reconciliation",
    sub: `Period: ${d.period?.from || ''} to ${d.period?.to || ''}`
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Total Pre-GST",
    value: fmt(s.total_pre_gst)
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Total CGST",
    value: fmt(s.total_cgst),
    sub: "Intra-state component"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Total IGST",
    value: fmt(s.total_igst),
    sub: "Inter-state component"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Effective GST Rate",
    value: `${s.effective_gst_rate_pct || 0}%`,
    sub: "Blended rate"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '14px',
      border: '1px solid #F1F0EE',
      padding: '20px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px'
    }
  }, [{
    label: 'Total Invoice Value',
    val: fmt(s.total_invoice_value)
  }, {
    label: 'Total GST Paid',
    val: fmt((s.total_cgst || 0) + (s.total_sgst || 0) + (s.total_igst || 0))
  }, {
    label: 'Mismatches Found',
    val: s.mismatch_count || 0,
    color: s.mismatch_count > 0 ? '#EF4444' : '#10B981'
  }].map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '28px',
      color: item.color || '#0F172A'
    }
  }, item.val), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '4px'
    }
  }, item.label))))), flags.length > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "GST Flags & Mismatches",
    sub: "Invoices requiring review"
  }), /*#__PURE__*/React.createElement(Table, {
    headers: ['Reference', 'Vendor', 'Date', 'Declared Total', 'Calculated Total', 'Variance', 'Issue'],
    rows: flags.map(f => [/*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px'
      }
    }, f.ref_no), f.vendor, f.invoice_date, fmt(f.declared_total), fmt(f.calculated_total), /*#__PURE__*/React.createElement("span", {
      style: {
        color: Math.abs(f.variance) > 0 ? '#EF4444' : '#10B981',
        fontWeight: 700
      }
    }, fmt(f.variance)), /*#__PURE__*/React.createElement(StatusChip, {
      level: "HIGH",
      label: f.issue
    })])
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#ECFDF5',
      border: '1px solid #A7F3D0',
      borderRadius: '12px',
      padding: '16px 20px',
      fontSize: '13px',
      color: '#065F46',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '18px'
    }
  }, "\u2705"), /*#__PURE__*/React.createElement("span", null, "All invoices in this period pass GST validation checks. No mismatches found.")));
};

// ─── 5. TDS Compliance Screen ─────────────────────────────────────────────────

const TDSComplianceScreen = ({
  onNavigate
}) => {
  const {
    data,
    loading,
    error
  } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.tdsCompliance());
  if (loading) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ScreenLoader, null));
  if (error) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ErrorBanner, {
    msg: error
  }));
  const d = data || {};
  const sections = d.by_section || [];
  const isCompliant = d.compliance_status === 'COMPLIANT';
  return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "TDS Compliance Tracker",
    sub: "Tax Deducted at Source deduction analysis"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Total TDS Deducted",
    value: fmt(d.total_tds_deducted),
    sub: "Across all invoices"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Missed Deductions",
    value: d.potentially_missed_deductions || 0,
    sub: "Invoices with section but \u20B90 TDS",
    color: d.potentially_missed_deductions > 0 ? '#EF4444' : '#10B981'
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Compliance Status",
    value: isCompliant ? 'COMPLIANT' : 'ACTION NEEDED',
    color: isCompliant ? '#10B981' : '#EF4444'
  })), (d.action_items || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEF3C7',
      border: '1px solid #FDE68A',
      borderRadius: '12px',
      padding: '14px 18px',
      marginBottom: '20px'
    }
  }, d.action_items.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: '13px',
      color: '#92400E',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u26A0\uFE0F"), " ", item))), /*#__PURE__*/React.createElement(SectionTitle, {
    title: "TDS by Section",
    sub: "Breakdown by Income Tax section"
  }), /*#__PURE__*/React.createElement(Table, {
    headers: ['Section', 'Invoice Count', 'Total TDS Deducted', 'Total Base Amount', 'Effective Rate'],
    rows: sections.map(s => [/*#__PURE__*/React.createElement("span", {
      style: {
        background: '#F5F3FF',
        color: '#5B21B6',
        fontWeight: 700,
        fontSize: '12px',
        padding: '2px 8px',
        borderRadius: '6px',
        fontFamily: "'JetBrains Mono', monospace"
      }
    }, s.section), s.count, fmt(s.total_tds), fmt(s.total_base), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, s.effective_rate, "%")]),
    emptyMsg: "No TDS data found. Invoices may not have TDS sections set."
  }));
};

// ─── 6. Policy Compliance Screen ──────────────────────────────────────────────

const DEFAULT_POLICIES = [{
  id: 'p1',
  name: 'Business Purpose Required',
  rule: 'BUSINESS_PURPOSE_REQUIRED',
  description: 'All invoices must include a business justification note.',
  active: true,
  vendor_scope: 'All Vendors'
}, {
  id: 'p2',
  name: 'No Off-Hours Submission',
  rule: 'WEEKEND_SUBMISSION',
  description: 'Flag invoices submitted outside business hours (6pm–9am, weekends).',
  active: true,
  vendor_scope: 'All Vendors'
}, {
  id: 'p3',
  name: 'Duplicate Invoice Check',
  rule: 'POSSIBLE_DUPLICATE',
  description: 'Detect duplicate invoice numbers across vendors within 90 days.',
  active: true,
  vendor_scope: 'All Vendors'
}, {
  id: 'p4',
  name: 'Single Vendor Spend Cap',
  rule: 'VENDOR_SPEND_CAP',
  description: 'Alert when a single vendor exceeds ₹50L spend in a quarter.',
  active: false,
  vendor_scope: 'All Vendors'
}, {
  id: 'p5',
  name: 'Split Invoice Detection',
  rule: 'SPLIT_INVOICE',
  description: 'Flag invoices from same vendor on same day that appear to circumvent approval limits.',
  active: true,
  vendor_scope: 'All Vendors'
}];
const PolicyComplianceScreen = ({
  onNavigate
}) => {
  const {
    data,
    loading,
    error
  } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.policyCompliance());
  const [policyTab, setPolicyTab] = React.useState('violations');
  const [policies, setPolicies] = React.useState(DEFAULT_POLICIES);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const [newPolicy, setNewPolicy] = React.useState({
    name: '',
    description: '',
    rule: '',
    vendor_scope: 'All Vendors',
    active: true
  });
  const [saving, setSaving] = React.useState(false);
  const handleCreatePolicy = () => {
    if (!newPolicy.name.trim() || !newPolicy.rule.trim()) return;
    setSaving(true);
    setTimeout(() => {
      setPolicies(prev => [...prev, {
        ...newPolicy,
        id: 'p' + Date.now(),
        rule: newPolicy.rule.toUpperCase().replace(/\s+/g, '_')
      }]);
      setNewPolicy({
        name: '',
        description: '',
        rule: '',
        vendor_scope: 'All Vendors',
        active: true
      });
      setCreateOpen(false);
      setSaving(false);
    }, 600);
  };
  const handleDeletePolicy = id => {
    setPolicies(prev => prev.filter(p => p.id !== id));
    setDeleteConfirm(null);
  };
  const handleTogglePolicy = id => {
    setPolicies(prev => prev.map(p => p.id === id ? {
      ...p,
      active: !p.active
    } : p));
  };
  if (loading) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ScreenLoader, null));
  if (error) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ErrorBanner, {
    msg: error
  }));
  const d = data || {};
  const violations = d.violations || [];
  const RULE_LABEL = {
    BUSINESS_PURPOSE_REQUIRED: 'Missing Justification',
    WEEKEND_SUBMISSION: 'Off-Hours Submission',
    POSSIBLE_DUPLICATE: 'Possible Duplicate',
    VENDOR_SPEND_CAP: 'Vendor Spend Cap',
    SPLIT_INVOICE: 'Split Invoice'
  };
  return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Policy Compliance Check",
    sub: "AI-driven policy rule validation \u2014 last 30 days"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Invoices Checked",
    value: d.total_checked || 0
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Compliant",
    value: d.compliant_count || 0,
    color: "#10B981"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Violations Found",
    value: d.violation_count || 0,
    color: d.violation_count > 0 ? '#EF4444' : '#10B981'
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Compliance Rate",
    value: `${d.compliance_rate_pct || 100}%`,
    color: d.compliance_rate_pct >= 90 ? '#10B981' : '#F59E0B'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '4px',
      marginBottom: '20px',
      borderBottom: '2px solid #E2E8F0'
    }
  }, ['violations', 'manage'].map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab,
    onClick: () => setPolicyTab(tab),
    style: {
      padding: '8px 20px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      color: policyTab === tab ? '#5B21B6' : '#64748B',
      borderBottom: policyTab === tab ? '2px solid #5B21B6' : '2px solid transparent',
      marginBottom: '-2px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, tab === 'violations' ? 'Violations' : 'Manage Policies'))), policyTab === 'violations' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Policy Violations",
    sub: "Invoices with policy breaches requiring review"
  }), /*#__PURE__*/React.createElement(Table, {
    headers: ['Reference', 'Vendor', 'Rule', 'Severity', 'Detail'],
    rows: violations.map(v => [/*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px'
      }
    }, v.ref_no), v.vendor, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '11px',
        fontWeight: 700,
        color: '#5B21B6'
      }
    }, RULE_LABEL[v.rule] || v.rule), /*#__PURE__*/React.createElement(StatusChip, {
      level: v.severity
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        color: '#64748B',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, v.message)]),
    emptyMsg: "\u2705 No policy violations found in the last 30 days"
  })), policyTab === 'manage' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, policies.length, " policies configured"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    small: true,
    onClick: () => setCreateOpen(true)
  }, "+ Create Policy")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, policies.map(pol => /*#__PURE__*/React.createElement("div", {
    key: pol.id,
    style: {
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: '10px',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: '14px',
      color: '#1E293B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, pol.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '9999px',
      background: pol.active ? '#DCFCE7' : '#F1F5F9',
      color: pol.active ? '#15803D' : '#94A3B8'
    }
  }, pol.active ? 'ACTIVE' : 'INACTIVE')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      marginBottom: '4px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, pol.description), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'JetBrains Mono', monospace"
    }
  }, "Rule: ", pol.rule, " \xB7 Scope: ", pol.vendor_scope)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleTogglePolicy(pol.id),
    style: {
      padding: '5px 12px',
      borderRadius: '6px',
      border: '1px solid #E2E8F0',
      background: pol.active ? '#FEF3C7' : '#DCFCE7',
      color: pol.active ? '#92400E' : '#15803D',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, pol.active ? 'Disable' : 'Enable'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDeleteConfirm(pol),
    style: {
      padding: '5px 12px',
      borderRadius: '6px',
      border: '1px solid #FEE2E2',
      background: '#FEF2F2',
      color: '#DC2626',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Delete")))))), /*#__PURE__*/React.createElement(TjModal, {
    open: createOpen,
    onClose: () => {
      setCreateOpen(false);
      setNewPolicy({
        name: '',
        description: '',
        rule: '',
        vendor_scope: 'All Vendors',
        active: true
      });
    },
    title: "Create Policy Rule",
    width: 500
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, [{
    label: 'Policy Name *',
    field: 'name',
    placeholder: 'e.g. No Weekend Submission'
  }, {
    label: 'Rule Code *',
    field: 'rule',
    placeholder: 'e.g. WEEKEND_SUBMISSION'
  }, {
    label: 'Description',
    field: 'description',
    placeholder: 'Describe what this policy enforces'
  }, {
    label: 'Vendor Scope',
    field: 'vendor_scope',
    placeholder: 'All Vendors or specific vendor name'
  }].map(({
    label,
    field,
    placeholder
  }) => /*#__PURE__*/React.createElement("div", {
    key: field
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#374151',
      display: 'block',
      marginBottom: '4px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    value: newPolicy[field],
    onChange: e => setNewPolicy(prev => ({
      ...prev,
      [field]: e.target.value
    })),
    placeholder: placeholder,
    style: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid #D1D5DB',
      borderRadius: '6px',
      fontSize: '13px',
      boxSizing: 'border-box',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: "pol-active",
    checked: newPolicy.active,
    onChange: e => setNewPolicy(prev => ({
      ...prev,
      active: e.target.checked
    }))
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "pol-active",
    style: {
      fontSize: '13px',
      color: '#374151',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Enable policy immediately"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '16px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => {
      setCreateOpen(false);
      setNewPolicy({
        name: '',
        description: '',
        rule: '',
        vendor_scope: 'All Vendors',
        active: true
      });
    }
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: handleCreatePolicy,
    disabled: !newPolicy.name.trim() || !newPolicy.rule.trim() || saving
  }, saving ? 'Creating…' : 'Create Policy'))), deleteConfirm && /*#__PURE__*/React.createElement(TjModal, {
    open: true,
    onClose: () => setDeleteConfirm(null),
    title: "Delete Policy",
    accentColor: "#DC2626"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 20px',
      fontSize: '14px',
      color: '#374151',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Are you sure you want to delete ", /*#__PURE__*/React.createElement("strong", null, "\"", deleteConfirm.name, "\""), "? This cannot be undone."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setDeleteConfirm(null)
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "destructive",
    onClick: () => handleDeletePolicy(deleteConfirm.id)
  }, "Delete"))));
};

// ─── 7. Department Variance Screen ────────────────────────────────────────────

const DeptVarianceScreen = ({
  onNavigate
}) => {
  const {
    data,
    loading,
    error
  } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.deptVariance());
  if (loading) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ScreenLoader, null));
  if (error) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ErrorBanner, {
    msg: error
  }));
  const d = data || {};
  const depts = d.departments || [];
  return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Department Variance Analysis",
    sub: `FY ${d.fiscal_year || new Date().getFullYear()} — Budget vs Actuals`
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Departments Tracked",
    value: depts.length
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Over Budget",
    value: d.over_budget_depts || 0,
    color: d.over_budget_depts > 0 ? '#EF4444' : '#10B981'
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Under Budget",
    value: depts.length - (d.over_budget_depts || 0),
    color: "#10B981"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, depts.map((dept, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: 'white',
      borderRadius: '14px',
      border: '1px solid #F1F0EE',
      padding: '16px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: '14px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, dept.department), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, dept.txn_count, " transactions")), /*#__PURE__*/React.createElement(StatusChip, {
    level: dept.status === 'OVER_BUDGET' ? 'HIGH' : dept.status === 'UNDER_BUDGET' ? 'OK' : 'LOW',
    label: dept.status === 'OVER_BUDGET' ? 'Over Budget' : dept.status === 'UNDER_BUDGET' ? 'Under Budget' : 'On Track'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '12px',
      marginBottom: '10px'
    }
  }, [{
    label: 'Budget',
    val: fmt(dept.budget)
  }, {
    label: 'Actual',
    val: fmt(dept.actual)
  }, {
    label: 'Variance',
    val: `${dept.variance >= 0 ? '+' : ''}${fmt(Math.abs(dept.variance))}`,
    color: dept.variance > 0 ? '#EF4444' : '#10B981'
  }].map((item, j) => /*#__PURE__*/React.createElement("div", {
    key: j
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }
  }, item.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: item.color || '#0F172A'
    }
  }, item.val)))), dept.budget > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F1F5F9',
      borderRadius: '999px',
      height: 6,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: dept.status === 'OVER_BUDGET' ? '#EF4444' : dept.variance < 0 ? '#10B981' : '#F59E0B',
      width: `${Math.min(100, dept.actual / dept.budget * 100)}%`,
      height: '100%',
      borderRadius: '999px',
      transition: 'width 500ms ease'
    }
  })))), depts.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '40px',
      color: '#94A3B8',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "No department budget data available. Create budgets and assign departments to see variance analysis.")));
};

// ─── 8. PO Match Screen ───────────────────────────────────────────────────────

const POMatchScreen = ({
  onNavigate
}) => {
  const {
    data,
    loading,
    error
  } = useAnalytics(() => window.TijoriAPI.AnalyticsAPI.poMatch());
  if (loading) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ScreenLoader, null));
  if (error) return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(ErrorBanner, {
    msg: error
  }));
  const d = data || {};
  const items = d.items || [];
  const STATUS_STYLE = {
    MATCHED: {
      bg: '#ECFDF5',
      text: '#065F46'
    },
    VARIANCE: {
      bg: '#FEF3C7',
      text: '#92400E'
    },
    MISSING_PO: {
      bg: '#FEE2E2',
      text: '#991B1B'
    },
    MISSING_GRN: {
      bg: '#FFF7ED',
      text: '#9A3412'
    }
  };
  return /*#__PURE__*/React.createElement(PageWrap, null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Three-Way PO Match",
    sub: "Invoice vs Purchase Order vs Goods Receipt Note"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Pending PO Match",
    value: d.total_pending_po_match || 0
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Matched",
    value: d.matched || 0,
    color: "#10B981"
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Exceptions",
    value: d.exceptions || 0,
    color: d.exceptions > 0 ? '#EF4444' : '#10B981'
  }), /*#__PURE__*/React.createElement(AnalyticCard, {
    title: "Match Rate",
    value: `${d.match_rate_pct || 0}%`,
    color: d.match_rate_pct >= 80 ? '#10B981' : '#F59E0B'
  })), /*#__PURE__*/React.createElement(Table, {
    headers: ['Reference', 'Vendor', 'Invoice Amt', 'PO Number', 'PO Amount', 'GRN', 'Variance', 'Status'],
    rows: items.map(item => {
      const sc = STATUS_STYLE[item.match_status] || STATUS_STYLE.MISSING_PO;
      return [/*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px'
        }
      }, item.ref_no), item.vendor, fmt(item.amount), item.po_number ? /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          color: '#5B21B6'
        }
      }, item.po_number) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#EF4444',
          fontSize: '11px'
        }
      }, "No PO"), item.po_amount ? fmt(item.po_amount) : '—', item.grn_received ? '✅' : '❌', /*#__PURE__*/React.createElement("span", {
        style: {
          color: item.variance > 0 ? '#F59E0B' : '#10B981',
          fontWeight: 700
        }
      }, item.variance > 0 ? fmt(item.variance) : '—'), /*#__PURE__*/React.createElement("span", {
        style: {
          background: sc.bg,
          color: sc.text,
          borderRadius: '6px',
          padding: '2px 8px',
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }
      }, item.match_status.replace('_', ' '))];
    }),
    emptyMsg: "No invoices pending PO match"
  }));
};
Object.assign(window, {
  SpendAnalyticsScreen,
  WorkingCapitalScreen,
  VendorRiskScreen,
  GSTReconScreen,
  TDSComplianceScreen,
  PolicyComplianceScreen,
  DeptVarianceScreen,
  POMatchScreen
});