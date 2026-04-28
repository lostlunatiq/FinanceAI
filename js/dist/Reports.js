function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Tijori AI — Reports & Analytics (Screen 17)

const ReportsScreen = ({
  role,
  onNavigate
}) => {
  const [tab, setTab] = React.useState('');
  const [dateRange, setDateRange] = React.useState('Last 3M');
  const [exportOpen, setExportOpen] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState('PDF');

  // ── Role-based config ─────────────────────────────────────────────────────
  const roleConfigs = {
    'CFO': {
      tabs: ['Dashboard', 'P&L Summary', 'Revenue Dashboard', 'Expense Breakdown', 'Vendor Analysis', 'Month-over-Month'],
      defaultTab: 'Dashboard'
    },
    'Finance Admin': {
      tabs: ['Dashboard', 'P&L Summary', 'Revenue Dashboard', 'Expense Breakdown', 'Vendor Analysis', 'Month-over-Month'],
      defaultTab: 'Dashboard'
    },
    'Finance Manager': {
      tabs: ['Dashboard', 'Dept Variance', 'Expense Breakdown', 'Vendor Analysis', 'Month-over-Month'],
      defaultTab: 'Dashboard'
    },
    'AP Clerk': {
      tabs: ['Dashboard', 'Vendor Analysis', 'Expense Breakdown', 'Queue Analytics'],
      defaultTab: 'Dashboard'
    },
    'Employee': {
      tabs: ['Dashboard', 'My Expenses', 'Reimbursement Status'],
      defaultTab: 'Dashboard'
    },
    'Vendor': {
      tabs: ['Dashboard', 'My Invoices', 'Payment Status', 'Performance'],
      defaultTab: 'Dashboard'
    }
  };
  const config = roleConfigs[role] || roleConfigs['Employee'];
  const tabs = config.tabs;
  React.useEffect(() => {
    if (!tab && tabs.length > 0) setTab(config.defaultTab);
  }, [role, tabs]);
  const dateRanges = ['This Month', 'Last 3M', 'Last 6M', 'YTD', 'Custom'];

  // ── Shared SVG helpers ────────────────────────────────────────────────────
  const W = 520,
    H = 200;
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  // P&L waterfall data
  const plBars = [{
    label: 'Revenue',
    val: 580,
    color: '#10B981',
    type: 'up'
  }, {
    label: 'COGS',
    val: -180,
    color: '#EF4444',
    type: 'down'
  }, {
    label: 'Gross Profit',
    val: 400,
    color: '#10B981',
    type: 'total'
  }, {
    label: 'OpEx',
    val: -240,
    color: '#EF4444',
    type: 'down'
  }, {
    label: 'EBITDA',
    val: 160,
    color: '#E8783B',
    type: 'total'
  }];

  // Revenue trend
  const rev = [42, 48, 38, 55, 51, 62];
  const col = [35, 42, 30, 48, 44, 56];

  // Expense by dept bars
  const deptData = [{
    name: 'Engineering',
    spent: 240,
    budget: 240,
    pct: 100
  }, {
    name: 'Marketing',
    spent: 110,
    budget: 130,
    pct: 85
  }, {
    name: 'Operations',
    spent: 65,
    budget: 150,
    pct: 43
  }, {
    name: 'HR',
    spent: 54,
    budget: 80,
    pct: 68
  }, {
    name: 'Finance',
    spent: 22,
    budget: 50,
    pct: 44
  }];

  // Vendor top 10
  const topVendors = [{
    name: 'NovaBridge Infra',
    spend: 840,
    color: '#E8783B'
  }, {
    name: 'TechLogistics',
    spend: 680,
    color: '#E8783B'
  }, {
    name: 'CloudInfra',
    spend: 545,
    color: '#E8783B'
  }, {
    name: 'GlobalSync',
    spend: 390,
    color: '#E8783B'
  }, {
    name: 'Sigma Electrical',
    spend: 215,
    color: '#E8783B'
  }];

  // MoM charts
  const momRev = [38, 42, 35, 48, 51, 62];
  const momExp = [45, 48, 52, 55, 50, 58];
  const linePoints = (data, w, h, pad = 40) => {
    const max = Math.max(...data),
      min = Math.min(...data);
    return data.map((v, i) => ({
      x: pad + i / (data.length - 1) * (w - pad * 2),
      y: h - pad - (v - min) / (max - min || 1) * (h - pad * 2)
    }));
  };
  const linePath = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = (pts, h) => `${linePath(pts)} L ${pts[pts.length - 1].x} ${h - 20} L ${pts[0].x} ${h - 20} Z`;
  const KPIStrip = ({
    cards
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '16px',
      marginBottom: '20px'
    }
  }, cards.map((c, i) => /*#__PURE__*/React.createElement(KPICard, _extends({
    key: i
  }, c))));

  // ── Tab content ───────────────────────────────────────────────────────────

  const renderPL = () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KPIStrip, {
    cards: [{
      label: 'Total Revenue',
      value: '₹58.2L',
      delta: '↑ 12%',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'Total Expenses',
      value: '₹42.0L',
      delta: '↑ 8%',
      deltaType: 'negative',
      color: '#E8783B'
    }, {
      label: 'Gross Profit',
      value: '₹16.2L',
      delta: '↑ 22%',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'Net Margin',
      value: '27.8%',
      delta: '↑ 3.2pp',
      deltaType: 'positive'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '7fr 5fr',
      gap: '20px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "P&L Waterfall"), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    viewBox: "0 0 480 200",
    style: {
      overflow: 'visible'
    }
  }, plBars.reduce((acc, b, i) => {
    const barW = 60,
      gap = 36,
      x = 20 + i * (barW + gap);
    const scale = 0.28;
    const prev = i === 0 || b.type === 'total' ? 0 : acc.baseline;
    const h = Math.abs(b.val) * scale;
    const y = b.val >= 0 ? 160 - (prev + b.val) * scale : 160 - prev * scale;
    const newBase = b.type === 'total' ? b.val : acc.baseline + b.val;
    return {
      baseline: newBase,
      els: [...acc.els, /*#__PURE__*/React.createElement("g", {
        key: i
      }, i > 0 && b.type !== 'total' && /*#__PURE__*/React.createElement("line", {
        x1: x,
        y1: 160 - acc.baseline * scale,
        x2: x - gap,
        y2: 160 - acc.baseline * scale,
        stroke: "#E2E8F0",
        strokeWidth: "1",
        strokeDasharray: "3,3"
      }), /*#__PURE__*/React.createElement("rect", {
        x: x,
        y: y,
        width: barW,
        height: h,
        rx: "4",
        fill: b.color,
        opacity: b.type === 'total' ? 1 : 0.8
      }), /*#__PURE__*/React.createElement("text", {
        x: x + barW / 2,
        y: y - 5,
        textAnchor: "middle",
        fontSize: "11",
        fontWeight: "700",
        fill: b.color,
        fontFamily: "Bricolage Grotesque"
      }, b.val > 0 ? '+' : '', "\u20B9", Math.abs(b.val), "L"), /*#__PURE__*/React.createElement("text", {
        x: x + barW / 2,
        y: 175,
        textAnchor: "middle",
        fontSize: "10",
        fill: "#64748B",
        fontFamily: "Plus Jakarta Sans"
      }, b.label))]
    };
  }, {
    baseline: 0,
    els: []
  }).els)), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '14px'
    }
  }, "P&L Table"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '12px'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Category', 'Budget', 'Actual', 'Var %'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '8px 10px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, [{
    cat: 'Revenue',
    budget: '₹52L',
    actual: '₹58.2L',
    var: '+11.9%',
    positive: true
  }, {
    cat: '  AR Collected',
    budget: '₹40L',
    actual: '₹45L',
    var: '+12.5%',
    positive: true,
    sub: true
  }, {
    cat: 'Cost of Revenue',
    budget: '₹16L',
    actual: '₹18.0L',
    var: '+12.5%',
    positive: false
  }, {
    cat: 'Operating Expenses',
    budget: '₹22L',
    actual: '₹24.0L',
    var: '+9.1%',
    positive: false
  }, {
    cat: '  Engineering',
    budget: '₹10L',
    actual: '₹12.0L',
    var: '+20%',
    positive: false,
    sub: true
  }, {
    cat: 'Net Profit',
    budget: '₹14L',
    actual: '₹16.2L',
    var: '+15.7%',
    positive: true
  }].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: '1px solid #F1F0EE',
      background: r.cat === 'Net Profit' ? '#F0FDF4' : 'white'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '9px 10px',
      fontSize: '12px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: r.sub ? 400 : 600,
      paddingLeft: r.sub ? 20 : 10
    }
  }, r.cat), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '9px 10px',
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.budget), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '9px 10px',
      fontSize: '12px',
      fontWeight: 700,
      color: '#0F172A',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      letterSpacing: '-0.3px'
    }
  }, r.actual), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '9px 10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: r.positive ? '#D1FAE5' : '#FEE2E2',
      color: r.positive ? '#065F46' : '#991B1B',
      padding: '2px 7px',
      borderRadius: '999px',
      fontSize: '10px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.var)))))))));
  const renderRevenue = () => {
    const rPts = linePoints(rev, W, H);
    const cPts = linePoints(col, W, H);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KPIStrip, {
      cards: [{
        label: 'Total AR Raised',
        value: '₹12.52L',
        delta: '↑ 4.2%',
        deltaType: 'negative',
        color: '#E8783B'
      }, {
        label: 'Collected',
        value: '₹9.87L',
        delta: '↑ 18%',
        deltaType: 'positive',
        color: '#10B981'
      }, {
        label: 'Outstanding',
        value: '₹2.65L',
        delta: '2 overdue',
        deltaType: 'neutral',
        color: '#F59E0B'
      }, {
        label: 'Collection Rate',
        value: '78.8%',
        delta: '↑ 3pp',
        deltaType: 'positive'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '7fr 5fr',
        gap: '20px',
        marginBottom: '20px'
      }
    }, /*#__PURE__*/React.createElement(Card, {
      style: {
        padding: '22px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: '16px',
        color: '#0F172A',
        marginBottom: '16px'
      }
    }, "Revenue Trend"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '14px',
        marginBottom: '12px',
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
    }), "Invoiced"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 12,
        height: 3,
        background: '#10B981',
        display: 'inline-block',
        borderRadius: 2
      }
    }), "Collected")), /*#__PURE__*/React.createElement("svg", {
      width: "100%",
      viewBox: `0 0 ${W} ${H}`
    }, months.map((m, i) => /*#__PURE__*/React.createElement("text", {
      key: i,
      x: rPts[i].x,
      y: H - 4,
      textAnchor: "middle",
      fontSize: "10",
      fill: "#94A3B8",
      fontFamily: "Plus Jakarta Sans"
    }, m)), /*#__PURE__*/React.createElement("path", {
      d: areaPath(rPts, H),
      fill: "rgba(232,120,59,0.08)"
    }), /*#__PURE__*/React.createElement("path", {
      d: linePath(rPts),
      fill: "none",
      stroke: "#E8783B",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: areaPath(cPts, H),
      fill: "rgba(16,185,129,0.08)"
    }), /*#__PURE__*/React.createElement("path", {
      d: linePath(cPts),
      fill: "none",
      stroke: "#10B981",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }), rPts.map((p, i) => /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: p.x,
      cy: p.y,
      r: "4",
      fill: "white",
      stroke: "#E8783B",
      strokeWidth: "2"
    })), cPts.map((p, i) => /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: p.x,
      cy: p.y,
      r: "4",
      fill: "white",
      stroke: "#10B981",
      strokeWidth: "2"
    })))), /*#__PURE__*/React.createElement(Card, {
      style: {
        padding: '22px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: '16px',
        color: '#0F172A',
        marginBottom: '14px'
      }
    }, "Top Customers"), /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse'
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        background: '#F8F7F5'
      }
    }, ['Customer', 'Invoiced', 'Days'].map(h => /*#__PURE__*/React.createElement("th", {
      key: h,
      style: {
        padding: '8px 10px',
        fontSize: '10px',
        fontWeight: 700,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        textAlign: 'left'
      }
    }, h)))), /*#__PURE__*/React.createElement("tbody", null, [['Global Tech', '₹5.2L', 32], ['Acme Corp', '₹6.8L', 55], ['SkyBridge', '₹0.9L', 22], ['Meridian', '₹1.2L', 41]].map(([n, v, d], i) => /*#__PURE__*/React.createElement("tr", {
      key: i,
      style: {
        borderTop: '1px solid #F1F0EE',
        height: 44
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 10px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, n), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 10px',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: '13px',
        color: '#10B981'
      }
    }, v), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 10px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        background: d > 45 ? '#FEE2E2' : d > 30 ? '#FEF3C7' : '#D1FAE5',
        color: d > 45 ? '#991B1B' : d > 30 ? '#92400E' : '#065F46',
        padding: '2px 7px',
        borderRadius: '999px',
        fontSize: '10px',
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, d, "d")))))))));
  };
  const renderExpense = () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KPIStrip, {
    cards: [{
      label: 'Total Spend',
      value: '₹4.91M',
      delta: '↑ 8%',
      deltaType: 'negative',
      color: '#E8783B'
    }, {
      label: 'vs Budget',
      value: '75.5%',
      delta: '↑ utilised',
      deltaType: 'neutral'
    }, {
      label: 'Avg per Transaction',
      value: '₹1.24L',
      delta: '↑ 3.2%',
      deltaType: 'negative'
    }, {
      label: 'Transactions',
      value: '247',
      delta: 'This period',
      deltaType: 'positive'
    }]
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px',
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Spend by Department"), deptData.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      marginBottom: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '5px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, d.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '13px',
      color: '#E8783B'
    }
  }, "\u20B9", d.spent, "L"), /*#__PURE__*/React.createElement("span", {
    style: {
      background: d.pct >= 90 ? '#FEE2E2' : d.pct >= 70 ? '#FEF3C7' : '#D1FAE5',
      color: d.pct >= 90 ? '#991B1B' : d.pct >= 70 ? '#92400E' : '#065F46',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '10px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, d.pct, "%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      background: '#F1F5F9',
      borderRadius: 4,
      overflow: 'hidden',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${d.pct}%`,
      background: d.pct >= 90 ? '#EF4444' : d.pct >= 70 ? '#F59E0B' : '#E8783B',
      borderRadius: 4,
      transition: 'width 600ms ease'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: '100%',
      width: 1,
      height: '100%',
      background: '#0F172A',
      opacity: 0.3
    }
  }))))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '14px'
    }
  }, "Expense Transactions"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Date', 'Ref #', 'Vendor / Employee', 'Category', 'Amount', 'Status'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, [{
    date: 'Apr 18',
    ref: 'INV-2024-091',
    who: 'NovaBridge Infra',
    cat: 'Infrastructure',
    amt: '₹8,40,000',
    status: 'PENDING_CFO'
  }, {
    date: 'Apr 17',
    ref: 'INV-2024-089',
    who: 'Sigma Electrical',
    cat: 'Electrical',
    amt: '₹2,15,500',
    status: 'QUERY_RAISED'
  }, {
    date: 'Apr 16',
    ref: 'EXP-2024-441',
    who: 'Aisha Nair',
    cat: 'Travel',
    amt: '₹4,200',
    status: 'PENDING_L1'
  }, {
    date: 'Apr 15',
    ref: 'INV-2024-086',
    who: 'CloudInfra',
    cat: 'Software',
    amt: '₹6,80,000',
    status: 'PAID'
  }].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 48,
      transition: 'background 150ms',
      cursor: 'pointer'
    },
    onMouseEnter: e => e.currentTarget.style.background = '#FFF8F5',
    onMouseLeave: e => e.currentTarget.style.background = 'white'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.date), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: '#E8783B'
    }
  }, r.ref), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.who), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: '#F1F5F9',
      color: '#475569',
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.cat)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '13px',
      color: '#E8783B',
      letterSpacing: '-0.3px'
    }
  }, r.amt), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: r.status
  }))))))));
  const renderVendor = () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KPIStrip, {
    cards: [{
      label: 'Total Vendors',
      value: '6',
      delta: '↑ 2 this month',
      deltaType: 'positive'
    }, {
      label: 'Active',
      value: '4',
      delta: 'Verified',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'Total AP Spend',
      value: '₹2.84Cr',
      delta: '↑ 8.2%',
      deltaType: 'negative',
      color: '#E8783B'
    }, {
      label: 'Avg Payment Days',
      value: '34d',
      delta: '↑ 3d vs target',
      deltaType: 'negative',
      color: '#F59E0B'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Top Vendors by Spend"), topVendors.map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      marginBottom: '12px'
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
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, v.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '13px',
      color: '#E8783B'
    }
  }, "\u20B9", v.spend, "K")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      background: '#F1F5F9',
      borderRadius: 4,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${v.spend / 840 * 100}%`,
      background: '#E8783B',
      borderRadius: 4,
      transition: 'width 600ms ease'
    }
  }))))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '14px'
    }
  }, "Vendor Directory"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Vendor', 'Spend', 'Days', 'Status'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '8px 10px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, [{
    n: 'NovaBridge',
    s: '₹8.4L',
    d: 28,
    st: 'ACTIVE'
  }, {
    n: 'TechLogistics',
    s: '₹6.8L',
    d: 42,
    st: 'ACTIVE'
  }, {
    n: 'GlobalSync',
    s: '₹3.9L',
    d: 18,
    st: 'ACTIVE'
  }, {
    n: 'Sigma Elec.',
    s: '₹2.1L',
    d: 55,
    st: 'PENDING'
  }].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 44,
      transition: 'background 150ms'
    },
    onMouseEnter: e => e.currentTarget.style.background = '#FFF8F5',
    onMouseLeave: e => e.currentTarget.style.background = 'white'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 10px',
      fontSize: '12px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.n), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 10px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '13px',
      color: '#E8783B'
    }
  }, r.s), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: r.d > 45 ? '#FEE2E2' : r.d > 30 ? '#FEF3C7' : '#D1FAE5',
      color: r.d > 45 ? '#991B1B' : r.d > 30 ? '#92400E' : '#065F46',
      padding: '2px 7px',
      borderRadius: '999px',
      fontSize: '10px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.d, "d")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 10px'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: r.st
  })))))))));
  const renderMoM = () => {
    const revPts = linePoints(momRev, W, H);
    const expPts = linePoints(momExp, W, H);
    const anomPts = linePoints([2, 4, 1, 3, 5, 3], W, H);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px'
      }
    }, ['FY 2025-26', 'FY 2024-25'].map(y => /*#__PURE__*/React.createElement("button", {
      key: y,
      style: {
        padding: '6px 14px',
        borderRadius: '999px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: y === 'FY 2025-26' ? '#E8783B' : '#F8F7F5',
        color: y === 'FY 2025-26' ? 'white' : '#64748B'
      }
    }, y))), [{
      title: 'Revenue vs Expenses',
      lines: [{
        pts: revPts,
        color: '#10B981',
        label: 'Revenue'
      }, {
        pts: expPts,
        color: '#E8783B',
        label: 'Expenses'
      }]
    }, {
      title: 'Anomaly Count',
      lines: [{
        pts: anomPts,
        color: '#EF4444',
        label: 'Anomalies'
      }]
    }].map((chart, ci) => /*#__PURE__*/React.createElement(Card, {
      key: ci,
      style: {
        padding: '22px',
        marginBottom: '16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: '16px',
        color: '#0F172A'
      }
    }, chart.title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '12px',
        fontSize: '11px',
        color: '#64748B',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, chart.lines.map(l => /*#__PURE__*/React.createElement("span", {
      key: l.label,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 12,
        height: 3,
        background: l.color,
        display: 'inline-block',
        borderRadius: 2
      }
    }), l.label)))), /*#__PURE__*/React.createElement("svg", {
      width: "100%",
      viewBox: `0 0 ${W} ${H}`
    }, months.map((m, i) => {
      const x = 40 + i / (months.length - 1) * (W - 80);
      return /*#__PURE__*/React.createElement("text", {
        key: i,
        x: x,
        y: H - 4,
        textAnchor: "middle",
        fontSize: "10",
        fill: "#94A3B8",
        fontFamily: "Plus Jakarta Sans"
      }, m);
    }), ci === 0 && /*#__PURE__*/React.createElement("path", {
      d: `M ${expPts[0].x} ${expPts[0].y} ${expPts.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${revPts[revPts.length - 1].x} ${revPts[revPts.length - 1].y} ${[...revPts].reverse().map(p => `L ${p.x} ${p.y}`).join(' ')} Z`,
      fill: "rgba(16,185,129,0.06)"
    }), chart.lines.map(l => /*#__PURE__*/React.createElement(React.Fragment, {
      key: l.label
    }, /*#__PURE__*/React.createElement("path", {
      d: linePath(l.pts),
      fill: "none",
      stroke: l.color,
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }), l.pts.map((p, i) => /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: p.x,
      cy: p.y,
      r: "4",
      fill: "white",
      stroke: l.color,
      strokeWidth: "2"
    }))))))));
  };
  const renderDashboard = () => /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'fadeUp 250ms ease both'
    }
  }, /*#__PURE__*/React.createElement(KPIStrip, {
    cards: [{
      label: 'Total Revenue',
      value: '₹5.82Cr',
      delta: '+12.4%',
      deltaType: 'positive'
    }, {
      label: 'OpEx',
      value: '₹2.40Cr',
      delta: '+8.1%',
      deltaType: 'negative'
    }, {
      label: 'Net Profit',
      value: '₹1.62Cr',
      delta: '+15.7%',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'System Health',
      value: '98.2%',
      delta: 'Optimal',
      deltaType: 'positive'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Monthly Performance"), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: 160,
    viewBox: "0 0 520 160"
  }, linePoints(rev, 520, 160).map((p, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: p.x,
    cy: p.y,
    r: "4",
    fill: "#E8783B"
  })), /*#__PURE__*/React.createElement("path", {
    d: linePath(linePoints(rev, 520, 160)),
    fill: "none",
    stroke: "#E8783B",
    strokeWidth: "2"
  }))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Expense Distribution"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, deptData.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.name
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '11px',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("span", null, d.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, "\u20B9", d.spent, "L")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '6px',
      background: '#F1F0EE',
      borderRadius: '3px',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${d.pct}%`,
      background: '#E8783B'
    }
  }))))))));
  const renderMyExpenses = () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KPIStrip, {
    cards: [{
      label: 'Total Submitted',
      value: '₹42,000',
      delta: 'Last 30 days',
      deltaType: 'neutral'
    }, {
      label: 'Approved',
      value: '₹38,000',
      delta: 'Ready for payout',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'Pending',
      value: '₹4,000',
      delta: 'With HOD',
      deltaType: 'neutral',
      color: '#F59E0B'
    }, {
      label: 'Avg Approval',
      value: '2.4 days',
      delta: '↓ 0.5d',
      deltaType: 'positive'
    }]
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "My Recent Expenses"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Date', 'Ref #', 'Category', 'Amount', 'Status'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, [{
    date: 'Apr 16',
    ref: 'EXP-2024-441',
    cat: 'Travel',
    amt: '₹4,200',
    status: 'PENDING_L1'
  }, {
    date: 'Apr 02',
    ref: 'EXP-2024-398',
    cat: 'Meals',
    amt: '₹1,250',
    status: 'APPROVED'
  }, {
    date: 'Mar 28',
    ref: 'EXP-2024-382',
    cat: 'Office',
    amt: '₹12,400',
    status: 'PAID'
  }].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 48
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontSize: '12px',
      color: '#94A3B8'
    }
  }, r.date), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: '#E8783B'
    }
  }, r.ref), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: '#F1F5F9',
      color: '#475569',
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 600
    }
  }, r.cat)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '13px'
    }
  }, r.amt), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: r.status
  }))))))));
  const renderMyInvoices = () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KPIStrip, {
    cards: [{
      label: 'Total Billed',
      value: '₹8.42L',
      delta: 'Total lifecycle',
      deltaType: 'neutral'
    }, {
      label: 'Paid',
      value: '₹6.20L',
      delta: 'Last payment: Apr 12',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'Outstanding',
      value: '₹2.22L',
      delta: '1 overdue',
      deltaType: 'negative',
      color: '#EF4444'
    }, {
      label: 'Avg Pay Cycle',
      value: '28 days',
      delta: '↓ 2d',
      deltaType: 'positive'
    }]
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Invoice History"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Date', 'Invoice #', 'Amount', 'Status', 'Due Date'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, [{
    date: 'Apr 18',
    ref: 'INV-2024-091',
    amt: '₹8,40,000',
    status: 'PENDING_CFO',
    due: 'May 18'
  }, {
    date: 'Mar 15',
    ref: 'INV-2024-065',
    amt: '₹6,80,000',
    status: 'PAID',
    due: 'Apr 15'
  }, {
    date: 'Feb 10',
    ref: 'INV-2024-032',
    amt: '₹2,15,500',
    status: 'PAID',
    due: 'Mar 10'
  }].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 48
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontSize: '12px',
      color: '#94A3B8'
    }
  }, r.date), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontWeight: 600
    }
  }, r.ref), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700
    }
  }, r.amt), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: r.status
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontSize: '12px',
      color: '#64748B'
    }
  }, r.due)))))));
  const renderDeptVariance = () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KPIStrip, {
    cards: [{
      label: 'Dept Budget',
      value: '₹2.4M',
      delta: 'Engineering',
      deltaType: 'neutral'
    }, {
      label: 'Total Spent',
      value: '₹2.4M',
      delta: '100% utilized',
      deltaType: 'negative',
      color: '#EF4444'
    }, {
      label: 'Forecast Variance',
      value: '+₹0.2M',
      delta: 'Over budget',
      deltaType: 'negative',
      color: '#EF4444'
    }, {
      label: 'Pending Approval',
      value: '₹0.15M',
      delta: '3 invoices',
      deltaType: 'neutral'
    }]
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Variance Analysis by Category"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Category', 'Budget', 'Actual', 'Variance', 'Status'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, [{
    cat: 'Cloud Infra',
    budget: '₹10.0L',
    actual: '₹12.0L',
    var: '+20%',
    ok: false
  }, {
    cat: 'Software Licenses',
    budget: '₹5.0L',
    actual: '₹4.8L',
    var: '-4%',
    ok: true
  }, {
    cat: 'Hardware',
    budget: '₹8.0L',
    actual: '₹7.2L',
    var: '-10%',
    ok: true
  }, {
    cat: 'Training',
    budget: '₹1.0L',
    actual: '₹0.0L',
    var: '-100%',
    ok: true
  }].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 44
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontWeight: 600
    }
  }, r.cat), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px'
    }
  }, r.budget), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      fontWeight: 700
    }
  }, r.actual), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px',
      color: r.ok ? '#059669' : '#DC2626',
      fontWeight: 700
    }
  }, r.var), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: r.ok ? '#D1FAE5' : '#FEE2E2',
      color: r.ok ? '#065F46' : '#991B1B',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '10px',
      fontWeight: 700
    }
  }, r.ok ? 'ON TRACK' : 'OVER BUDGET'))))))));
  const getExportData = () => {
    if (tab === 'P&L Summary') {
      return {
        headers: ["Category", "Budget", "Actual", "Variance %"],
        rows: [["Revenue", "52,00,000", "58,20,000", "+11.9%"], ["Cost of Revenue", "16,00,000", "18,00,000", "+12.5%"], ["Gross Profit", "36,00,000", "40,20,000", "+11.7%"], ["Operating Expenses", "22,00,000", "24,00,000", "+9.1%"], ["Net Profit", "14,00,000", "16,20,000", "+15.7%"]]
      };
    } else if (tab === 'Expense Breakdown') {
      return {
        headers: ["Department", "Budget (₹)", "Spent (₹)", "Utilisation %"],
        rows: [["Engineering", "24,00,000", "24,00,000", "100%"], ["Marketing", "13,00,000", "11,00,000", "85%"], ["Operations", "15,00,000", "6,50,000", "43%"], ["HR", "8,00,000", "5,40,000", "68%"], ["Finance", "5,00,000", "2,20,000", "44%"]]
      };
    } else if (tab === 'Vendor Analysis' || tab === 'My Invoices' || tab === 'Payment Status') {
      return {
        headers: ["Date", "Invoice #", "Vendor", "Category", "Amount (₹)", "Status"],
        rows: [["Apr 18", "INV-2024-091", "NovaBridge Infra", "Infrastructure", "8,40,000", "PENDING_CFO"], ["Apr 17", "INV-2024-089", "Sigma Electrical", "Electrical", "2,15,500", "QUERY_RAISED"], ["Apr 16", "EXP-2024-441", "Aisha Nair", "Travel", "4,200", "PENDING_L1"], ["Apr 15", "INV-2024-086", "CloudInfra", "Software", "6,80,000", "PAID"]]
      };
    } else if (tab === 'My Expenses' || tab === 'Reimbursement Status') {
      return {
        headers: ["Date", "Ref #", "Category", "Amount (₹)", "Status"],
        rows: [["Apr 16", "EXP-2024-441", "Travel", "4,200", "PENDING_L1"], ["Apr 02", "EXP-2024-398", "Meals", "1,250", "APPROVED"], ["Mar 28", "EXP-2024-382", "Office Supplies", "12,400", "PAID"]]
      };
    } else {
      return {
        headers: ["Report", "Period", "Role", "Generated At"],
        rows: [[tab, dateRange, role, new Date().toLocaleString('en-IN')]]
      };
    }
  };
  const handleExport = format => {
    const {
      headers,
      rows
    } = getExportData();
    const timestamp = new Date().toLocaleString('en-IN');
    const filename = `TijoriAI_${tab.replace(/[\s&/]/g, '_')}_${dateRange.replace(/\s/g, '')}_${new Date().getFullYear()}`;
    if (format === 'PDF') {
      // Open a print-friendly version
      const printWindow = window.open('', '_blank');
      const tableRows = rows.map(r => `<tr>${r.map(c => `<td style="padding:8px 12px;border:1px solid #e2e8f0;">${c}</td>`).join('')}</tr>`).join('');
      printWindow.document.write(`
        <!DOCTYPE html><html><head><title>${tab} — Tijori AI</title>
        <style>body{font-family:sans-serif;padding:32px;color:#0F172A;}
        h1{font-size:22px;margin-bottom:4px;}
        .meta{font-size:12px;color:#64748B;margin-bottom:24px;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        th{background:#F8F7F5;padding:10px 12px;text-align:left;border:1px solid #e2e8f0;font-weight:700;}
        @media print{@page{margin:20mm;}}</style></head>
        <body>
        <h1>Tijori AI — ${tab}</h1>
        <div class="meta">Period: ${dateRange} · Role: ${role} · Generated: ${timestamp}</div>
        <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody></table>
        <div style="margin-top:32px;font-size:11px;color:#94A3B8;">Generated by Tijori AI Finance OS · Confidential</div>
        <script>window.onload=function(){window.print();}<\/script></body></html>
      `);
      printWindow.document.close();
      setExportOpen(false);
      return;
    }
    if (format === 'Excel') {
      // Generate proper Excel-compatible XML (XLSX-lite via XML)
      const xmlHeader = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
      const xmlBody = `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
        <Worksheet ss:Name="${tab.slice(0, 31)}">
          <Table>
            <Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
            ${rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type="String">${c}</Data></Cell>`).join('')}</Row>`).join('\n')}
          </Table>
        </Worksheet>
      </Workbook>`;
      const blob = new Blob([xmlHeader + xmlBody], {
        type: 'application/vnd.ms-excel'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename + '.xls';
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      return;
    }

    // CSV
    const csvContent = [[`Tijori AI — ${tab}`, `Period: ${dateRange}`, `Role: ${role}`, `Generated: ${timestamp}`].join(','), '', headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };
  const tabContent = {
    'Dashboard': renderDashboard,
    'P&L Summary': renderPL,
    'Revenue Dashboard': renderRevenue,
    'Expense Breakdown': renderExpense,
    'Vendor Analysis': renderVendor,
    'Month-over-Month': renderMoM,
    'My Expenses': renderMyExpenses,
    'My Invoices': renderMyInvoices,
    'Dept Variance': renderDeptVariance,
    'Reimbursement Status': renderMyExpenses,
    // Reuse for demo
    'Payment Status': renderMyInvoices,
    // Reuse for demo
    'Performance': renderVendor,
    // Reuse for demo
    'Queue Analytics': renderExpense // Reuse for demo
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Reports & Analytics",
    subtitle: "Generate, filter, and export financial intelligence across every dimension.",
    right: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Btn, {
      variant: "secondary",
      small: true,
      onClick: () => {
        const freq = window.prompt('Schedule this report? Enter frequency:', 'Weekly');
        if (freq) alert(`Report "${tab}" scheduled to run ${freq}. You will receive it at your registered email.`);
      }
    }, "Schedule Report"), /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      onClick: () => setExportOpen(true)
    }, "Export \u2193"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '0',
      marginBottom: '0',
      borderBottom: '2px solid #F1F0EE',
      overflowX: 'auto'
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setTab(t),
    style: {
      padding: '10px 20px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: tab === t ? 700 : 500,
      fontSize: '13px',
      color: tab === t ? '#0F172A' : '#94A3B8',
      borderBottom: `2px solid ${tab === t ? '#E8783B' : 'transparent'}`,
      marginBottom: '-2px',
      whiteSpace: 'nowrap',
      transition: 'all 150ms'
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      padding: '14px 0',
      marginBottom: '20px',
      borderBottom: '1px solid #F1F0EE',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px'
    }
  }, dateRanges.map(r => /*#__PURE__*/React.createElement("button", {
    key: r,
    onClick: () => setDateRange(r),
    style: {
      padding: '5px 12px',
      borderRadius: '999px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: dateRange === r ? '#E8783B' : '#F8F7F5',
      color: dateRange === r ? 'white' : '#64748B',
      transition: 'all 150ms'
    }
  }, r))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24,
      width: 1,
      background: '#E2E8F0'
    }
  }), ['Department ▾', 'Category ▾', 'Status ▾'].map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    style: {
      padding: '5px 12px',
      borderRadius: '8px',
      border: '1.5px solid #E2E8F0',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: 'white',
      color: '#475569'
    }
  }, f)), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    small: true,
    style: {
      marginLeft: 'auto'
    },
    onClick: () => {
      // Filters are already reflected via state; re-render happens automatically
      // This button signals intent and could fetch filtered data in a real backend
    }
  }, "Apply Filters")), /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'fadeUp 220ms ease both'
    },
    key: tab
  }, (tabContent[tab] || tabContent['P&L Summary'])()), /*#__PURE__*/React.createElement(SidePanel, {
    open: exportOpen,
    onClose: () => setExportOpen(false),
    title: "Export Report"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px',
      padding: '12px 14px',
      background: '#F8F7F5',
      borderRadius: '10px',
      fontSize: '13px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, tab, " \xB7 ", dateRange), /*#__PURE__*/React.createElement("div", {
    style: {
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
      marginBottom: '10px'
    }
  }, "Format"), [{
    id: 'PDF',
    label: 'PDF (Print-ready report)',
    icon: '📄'
  }, {
    id: 'Excel',
    label: 'Excel (XLS workbook)',
    icon: '📊'
  }, {
    id: 'CSV',
    label: 'CSV (Raw data)',
    icon: '📋'
  }].map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    onClick: () => setSelectedFormat(f.id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      border: `1.5px solid ${selectedFormat === f.id ? '#E8783B' : '#E2E8F0'}`,
      borderRadius: '10px',
      marginBottom: '8px',
      cursor: 'pointer',
      transition: 'all 150ms',
      background: selectedFormat === f.id ? '#FFF8F5' : 'white'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '18px'
    }
  }, f.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, f.id), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#94A3B8'
    }
  }, f.label)), selectedFormat === f.id && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#E8783B',
      fontSize: '14px'
    }
  }, "\u2713")))), /*#__PURE__*/React.createElement(TjInput, {
    label: "Send via Email",
    placeholder: "finance@company.com",
    type: "email"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#475569',
      marginBottom: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Frequency"), /*#__PURE__*/React.createElement("select", {
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '8px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px',
      color: '#0F172A',
      background: '#FAFAF8',
      outline: 'none'
    }
  }, /*#__PURE__*/React.createElement("option", null, "Once"), /*#__PURE__*/React.createElement("option", null, "Weekly"), /*#__PURE__*/React.createElement("option", null, "Monthly"))), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    style: {
      width: '100%',
      justifyContent: 'center'
    },
    onClick: () => handleExport(selectedFormat)
  }, "Generate & Download ", selectedFormat)));
};
Object.assign(window, {
  ReportsScreen
});
