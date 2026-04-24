// Tijori AI — Accounts Receivable (Dashboard + Raise Invoice + Customer Detail)

const AR_INVOICES = [{
  id: 'AR-2024-108',
  customer: 'Global Tech Solutions',
  amount: '₹3,40,000',
  issued: 'Apr 10',
  due: 'May 10',
  age: 9,
  status: 'UNPAID'
}, {
  id: 'AR-2024-107',
  customer: 'Meridian Industries',
  amount: '₹1,20,000',
  issued: 'Mar 25',
  due: 'Apr 24',
  age: 25,
  status: 'OVERDUE'
}, {
  id: 'AR-2024-106',
  customer: 'Acme Corporation',
  amount: '₹6,80,000',
  issued: 'Mar 15',
  due: 'Apr 14',
  age: 35,
  status: 'OVERDUE'
}, {
  id: 'AR-2024-105',
  customer: 'SkyBridge Ventures',
  amount: '₹92,500',
  issued: 'Mar 01',
  due: 'Mar 31',
  age: 49,
  status: 'PARTIALLY_PAID'
}, {
  id: 'AR-2024-104',
  customer: 'NovaTech Ltd.',
  amount: '₹2,15,000',
  issued: 'Feb 20',
  due: 'Mar 21',
  age: 29,
  status: 'PAID'
}, {
  id: 'AR-2024-103',
  customer: 'Global Tech Solutions',
  amount: '₹1,80,000',
  issued: 'Feb 10',
  due: 'Mar 11',
  age: 39,
  status: 'DISPUTED'
}];
const AR_CUSTOMERS = [{
  id: 'CUS-001',
  name: 'Global Tech Solutions',
  gstin: '27AABCG1234K1ZL',
  outstanding: '₹5,20,000',
  overdue: '₹1,80,000',
  avgDays: 32,
  status: 'ACTIVE',
  terms: 'Net 30'
}, {
  id: 'CUS-002',
  name: 'Meridian Industries',
  gstin: '29AABCM5678R1ZP',
  outstanding: '₹1,20,000',
  overdue: '₹1,20,000',
  avgDays: 41,
  status: 'ACTIVE',
  terms: 'Net 30'
}, {
  id: 'CUS-003',
  name: 'Acme Corporation',
  gstin: '06AABCA9012N1ZA',
  outstanding: '₹6,80,000',
  overdue: '₹6,80,000',
  avgDays: 55,
  status: 'ON_HOLD',
  terms: 'Net 45'
}, {
  id: 'CUS-004',
  name: 'SkyBridge Ventures',
  gstin: '24AABCS3456P1ZD',
  outstanding: '₹92,500',
  overdue: '₹0',
  avgDays: 22,
  status: 'ACTIVE',
  terms: 'Net 30'
}];
const AR_ACTIVITY = [{
  type: 'payment',
  text: '₹2,15,000 received from NovaTech Ltd. against AR-2024-104',
  time: '2h ago',
  color: '#10B981'
}, {
  type: 'reminder',
  text: 'Payment reminder sent to Acme Corporation — 35 days overdue',
  time: '5h ago',
  color: '#94A3B8'
}, {
  type: 'invoice',
  text: 'Invoice AR-2024-108 raised for ₹3,40,000 to Global Tech Solutions',
  time: 'Yesterday',
  color: '#E8783B'
}, {
  type: 'dispute',
  text: 'Dispute raised on AR-2024-103 by Global Tech Solutions — under review',
  time: 'Yesterday',
  color: '#8B5CF6'
}, {
  type: 'reminder',
  text: 'Payment reminder sent to Meridian Industries — 25 days overdue',
  time: '2d ago',
  color: '#94A3B8'
}, {
  type: 'payment',
  text: '₹46,250 partial payment received from SkyBridge Ventures',
  time: '3d ago',
  color: '#10B981'
}];
const ageColor = days => days > 90 ? '#EF4444' : days > 60 ? '#E8783B' : days > 30 ? '#F59E0B' : '#10B981';
const ageBg = days => days > 90 ? '#FEE2E2' : days > 60 ? '#FFF7ED' : days > 30 ? '#FEF3C7' : '#D1FAE5';
const arStatusConfig = {
  UNPAID: {
    bg: '#FEF3C7',
    color: '#92400E',
    label: 'Unpaid'
  },
  OVERDUE: {
    bg: '#FEE2E2',
    color: '#991B1B',
    label: 'Overdue',
    pulse: true
  },
  PARTIALLY_PAID: {
    bg: '#DBEAFE',
    color: '#1E40AF',
    label: 'Partially Paid'
  },
  PAID: {
    bg: '#D1FAE5',
    color: '#065F46',
    label: 'Paid'
  },
  DISPUTED: {
    bg: '#EDE9FE',
    color: '#5B21B6',
    label: 'Disputed'
  },
  ACTIVE: {
    bg: '#D1FAE5',
    color: '#065F46',
    label: 'Active'
  },
  ON_HOLD: {
    bg: '#FEF3C7',
    color: '#92400E',
    label: 'On Hold'
  }
};
const ARStatusBadge = ({
  status
}) => {
  const cfg = arStatusConfig[status] || {
    bg: '#F1F5F9',
    color: '#475569',
    label: status
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      background: cfg.bg,
      color: cfg.color,
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px'
    }
  }, cfg.pulse && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: cfg.color,
      display: 'inline-block',
      animation: 'dotPulse 1.5s ease infinite'
    }
  }), cfg.label);
};

// ─── AR DASHBOARD ─────────────────────────────────────────────────────────────

const ARScreen = ({
  onNavigate
}) => {
  const [filter, setFilter] = React.useState('All');
  const [customerDetail, setCustomerDetail] = React.useState(null);
  const [recordPaymentModal, setRecordPaymentModal] = React.useState(null);
  const filtered = AR_INVOICES.filter(inv => filter === 'All' || inv.status === filter.toUpperCase().replace(' ', '_'));

  // Aging chart data
  const customers = ['Global Tech', 'Meridian Ind.', 'Acme Corp', 'SkyBridge', 'NovaTech'];
  const agingData = [{
    name: 'Global Tech',
    '0-30': 340000,
    '31-60': 0,
    '61-90': 0,
    '>90': 180000
  }, {
    name: 'Meridian',
    '0-30': 0,
    '31-60': 120000,
    '61-90': 0,
    '>90': 0
  }, {
    name: 'Acme Corp',
    '0-30': 0,
    '31-60': 0,
    '61-90': 680000,
    '>90': 0
  }, {
    name: 'SkyBridge',
    '0-30': 92500,
    '31-60': 0,
    '61-90': 0,
    '>90': 0
  }, {
    name: 'NovaTech',
    '0-30': 0,
    '31-60': 215000,
    '61-90': 0,
    '>90': 0
  }];
  const maxVal = Math.max(...agingData.map(d => d['0-30'] + d['31-60'] + d['61-90'] + d['>90']));
  const bucketColors = {
    '0-30': '#10B981',
    '31-60': '#F59E0B',
    '61-90': '#E8783B',
    '>90': '#EF4444'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '28px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '32px',
      color: '#0F172A',
      letterSpacing: '-1.5px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, "Accounts Receivable ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '24px'
    }
  }, "\u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#64748B',
      marginTop: '4px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Track outgoing invoices, customer payments, and collections.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary"
  }, "AR Aging Report \u2193"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    icon: /*#__PURE__*/React.createElement("span", null, "+"),
    onClick: () => onNavigate && onNavigate('ar-raise')
  }, "Raise Invoice"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(KPICard, {
    label: "Total Outstanding AR",
    value: "\u20B912.52L",
    delta: "\u2191 4.2% MoM",
    deltaType: "negative",
    color: "#E8783B"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Overdue > 30 Days",
    value: "\u20B98.00L",
    delta: "3 invoices",
    deltaType: "negative",
    color: "#EF4444",
    pulse: true
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Collected This Month",
    value: "\u20B92.61L",
    delta: "\u2191 18% vs target",
    deltaType: "positive",
    color: "#10B981"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Avg. Days to Pay",
    value: "34",
    sublabel: "Days",
    delta: "\u2191 3d vs Q1",
    deltaType: "negative",
    color: "#F59E0B"
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '24px',
      marginBottom: '20px'
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
  }, "Receivables Aging"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      marginTop: '4px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "By invoice age bucket \xB7 Click customer to drill in")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px'
    }
  }, Object.entries(bucketColors).map(([k, c]) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '11px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '2px',
      background: c,
      display: 'inline-block'
    }
  }), k, "d")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, agingData.map(d => {
    const total = d['0-30'] + d['31-60'] + d['61-90'] + d['>90'];
    return /*#__PURE__*/React.createElement("div", {
      key: d.name,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 100,
        fontSize: '12px',
        fontWeight: 600,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        flexShrink: 0,
        textAlign: 'right'
      }
    }, d.name), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 28,
        background: '#F8F7F5',
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex'
      }
    }, Object.entries(bucketColors).map(([bucket, color]) => {
      const w = d[bucket] / maxVal * 100;
      return w > 0 ? /*#__PURE__*/React.createElement("div", {
        key: bucket,
        style: {
          width: `${w}%`,
          background: color,
          transition: 'width 600ms ease'
        },
        title: `${bucket}d: ₹${(d[bucket] / 100000).toFixed(1)}L`
      }) : null;
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 70,
        fontSize: '12px',
        fontWeight: 700,
        color: '#E8783B',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        letterSpacing: '-0.5px',
        flexShrink: 0
      }
    }, "\u20B9", (total / 100000).toFixed(1), "L"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '7fr 5fr',
      gap: '20px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
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
  }, "Outstanding Invoices"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap'
    }
  }, ['All', 'Unpaid', 'Overdue', 'Partially Paid', 'Disputed'].map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    onClick: () => setFilter(f),
    style: {
      padding: '4px 10px',
      borderRadius: '999px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '10px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: filter === f ? '#10B981' : '#F8F7F5',
      color: filter === f ? 'white' : '#64748B',
      transition: 'all 150ms'
    }
  }, f)))), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Invoice #', 'Customer', 'Amount', 'Due Date', 'Age', 'Status', 'Actions'].map(h => /*#__PURE__*/React.createElement("th", {
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
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtered.map(inv => /*#__PURE__*/React.createElement("tr", {
    key: inv.id,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 52,
      transition: 'background 150ms'
    },
    onMouseEnter: e => e.currentTarget.style.background = '#F0FDF4',
    onMouseLeave: e => e.currentTarget.style.background = 'white'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 14px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: '#10B981',
      fontWeight: 500
    }
  }, inv.id), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 14px',
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, inv.customer), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 14px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '14px',
      color: '#10B981',
      letterSpacing: '-0.5px'
    }
  }, inv.amount), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 14px',
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, inv.due), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: ageBg(inv.age),
      color: ageColor(inv.age),
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, inv.age, "d")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 14px'
    }
  }, /*#__PURE__*/React.createElement(ARStatusBadge, {
    status: inv.status
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '5px'
    }
  }, inv.status !== 'PAID' && /*#__PURE__*/React.createElement(Btn, {
    variant: "green",
    small: true,
    onClick: () => setRecordPaymentModal(inv)
  }, "Record Payment"), inv.status === 'OVERDUE' && /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true
  }, "Remind")))))))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Recent Activity"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0'
    }
  }, AR_ACTIVITY.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: '10px',
      padding: '12px 0',
      borderBottom: i < AR_ACTIVITY.length - 1 ? '1px solid #F8F7F5' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: a.color,
      marginTop: 5,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.5
    }
  }, a.text), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      marginTop: '3px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, a.time))))), /*#__PURE__*/React.createElement("button", {
    style: {
      marginTop: '12px',
      fontSize: '12px',
      color: '#10B981',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "View All Activity \u2192"))), recordPaymentModal && /*#__PURE__*/React.createElement(TjModal, {
    open: true,
    onClose: () => setRecordPaymentModal(null),
    title: "Record Payment",
    accentColor: "#065F46",
    width: 440
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F0FDF4',
      border: '1px solid #BBF7D0',
      borderRadius: '10px',
      padding: '14px',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: '#10B981'
    }
  }, recordPaymentModal.id), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: '14px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '2px'
    }
  }, recordPaymentModal.customer), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '22px',
      color: '#10B981',
      letterSpacing: '-1px',
      marginTop: '4px'
    }
  }, recordPaymentModal.amount)), /*#__PURE__*/React.createElement(TjInput, {
    label: "Amount Received (\u20B9)",
    placeholder: "Full or partial amount"
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Payment Date",
    type: "date"
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "UTR / Reference Number",
    placeholder: "Bank transfer reference"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setRecordPaymentModal(null)
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "green",
    onClick: () => setRecordPaymentModal(null)
  }, "Confirm Payment"))));
};

// ─── RAISE INVOICE ────────────────────────────────────────────────────────────

const ARRaiseScreen = ({
  onNavigate
}) => {
  const [customer, setCustomer] = React.useState('');
  const [invoiceNo] = React.useState('AR-2024-109');
  const [lines, setLines] = React.useState([{
    desc: '',
    qty: 1,
    price: '',
    tax: 18
  }]);
  const addLine = () => setLines(l => [...l, {
    desc: '',
    qty: 1,
    price: '',
    tax: 18
  }]);
  const updateLine = (i, k, v) => setLines(l => l.map((r, idx) => idx === i ? {
    ...r,
    [k]: v
  } : r));
  const subtotal = lines.reduce((s, l) => s + (Number(l.qty) * Number(l.price) || 0), 0);
  const tax = lines.reduce((s, l) => s + (Number(l.qty) * Number(l.price) || 0) * l.tax / 100, 0);
  const total = subtotal + tax;
  const fmt = n => n ? '₹' + n.toLocaleString('en-IN') : '—';
  const selectedCustomer = AR_CUSTOMERS.find(c => c.name === customer);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '28px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: 'pointer',
      color: '#E8783B'
    },
    onClick: () => onNavigate && onNavigate('ar')
  }, "Accounts Receivable"), " \u203A New Invoice"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '32px',
      color: '#0F172A',
      letterSpacing: '-1.5px'
    }
  }, "New Customer Invoice")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary"
  }, "Save Draft"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary"
  }, "Issue Invoice \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '7fr 5fr',
      gap: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
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
      marginBottom: '14px'
    }
  }, "Customer"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#475569',
      marginBottom: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Select Customer"), /*#__PURE__*/React.createElement("select", {
    value: customer,
    onChange: e => setCustomer(e.target.value),
    style: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '10px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '14px',
      color: '#0F172A',
      background: '#FAFAF8',
      outline: 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 Search or select customer \u2014"), AR_CUSTOMERS.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id
  }, c.name)))), selectedCustomer && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F0FDF4',
      border: '1px solid #BBF7D0',
      borderRadius: '10px',
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: '14px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, selectedCustomer.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: '#64748B',
      marginTop: '2px'
    }
  }, selectedCustomer.gstin), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '4px'
    }
  }, "Terms: ", selectedCustomer.terms, " \xB7 Outstanding: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#E8783B',
      fontWeight: 700
    }
  }, selectedCustomer.outstanding)))), /*#__PURE__*/React.createElement(Card, {
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
  }, "Invoice Details"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#475569',
      marginBottom: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Invoice #"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '10px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '13px',
      color: '#E8783B',
      background: '#FAFAF8'
    }
  }, invoiceNo)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#475569',
      marginBottom: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Payment Terms"), /*#__PURE__*/React.createElement("select", {
    style: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '10px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px',
      color: '#0F172A',
      background: '#FAFAF8',
      outline: 'none'
    }
  }, ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'On Receipt'].map(t => /*#__PURE__*/React.createElement("option", {
    key: t
  }, t)))), /*#__PURE__*/React.createElement(TjInput, {
    label: "Issue Date",
    type: "date"
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Due Date",
    type: "date"
  })), /*#__PURE__*/React.createElement(TjInput, {
    label: "PO Reference (optional)",
    placeholder: "PO-2024-XXX"
  })), /*#__PURE__*/React.createElement(Card, {
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
  }, "Line Items"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '12px'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['#', 'Description', 'Qty', 'Unit Price', 'Tax %', 'Amount'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '8px 10px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, lines.map((l, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: '1px solid #F1F0EE'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '8px 10px',
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      width: 24
    }
  }, i + 1), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '6px 8px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: l.desc,
    onChange: e => updateLine(i, 'desc', e.target.value),
    placeholder: "Service description\u2026",
    style: {
      width: '100%',
      padding: '6px 8px',
      border: '1px solid #E2E8F0',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none',
      background: '#FAFAF8'
    }
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '6px 8px',
      width: 50
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: l.qty,
    onChange: e => updateLine(i, 'qty', e.target.value),
    style: {
      width: '100%',
      padding: '6px 8px',
      border: '1px solid #E2E8F0',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none',
      background: '#FAFAF8',
      textAlign: 'center'
    }
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '6px 8px',
      width: 100
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: l.price,
    onChange: e => updateLine(i, 'price', e.target.value),
    placeholder: "0",
    style: {
      width: '100%',
      padding: '6px 8px',
      border: '1px solid #E2E8F0',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: "'JetBrains Mono', monospace",
      outline: 'none',
      background: '#FAFAF8'
    }
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '6px 8px',
      width: 60
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: l.tax,
    onChange: e => updateLine(i, 'tax', Number(e.target.value)),
    style: {
      width: '100%',
      padding: '6px',
      border: '1px solid #E2E8F0',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none',
      background: '#FAFAF8'
    }
  }, [0, 5, 12, 18, 28].map(t => /*#__PURE__*/React.createElement("option", {
    key: t
  }, t, "%")))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '8px 10px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '13px',
      color: '#10B981'
    }
  }, fmt(Number(l.qty) * Number(l.price))))))), /*#__PURE__*/React.createElement("button", {
    onClick: addLine,
    style: {
      fontSize: '12px',
      color: '#E8783B',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "+ Add Line Item"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '2px solid #F1F0EE',
      marginTop: '14px',
      paddingTop: '14px'
    }
  }, [['Subtotal', fmt(subtotal)], ['Tax', fmt(tax)], ['Total', fmt(total)]].map(([l, v], i) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '24px',
      marginBottom: i < 2 ? '6px' : '0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: i === 2 ? '14px' : '12px',
      fontWeight: i === 2 ? 700 : 500,
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: i === 2 ? 800 : 600,
      fontSize: i === 2 ? '20px' : '14px',
      color: i === 2 ? '#10B981' : '#0F172A',
      letterSpacing: '-0.5px',
      minWidth: 100,
      textAlign: 'right'
    }
  }, v)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 16,
      alignSelf: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '28px',
      border: '1px solid #E2E8F0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '2px solid #F1F0EE'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '20px',
      color: '#0F172A',
      letterSpacing: '-1px'
    }
  }, "Tijori AI"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Acme Corp HQ, Mumbai \u2014 400001")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Invoice"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '13px',
      color: '#10B981',
      fontWeight: 500,
      marginTop: '2px'
    }
  }, invoiceNo))), customer && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '20px'
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
  }, "Bill To"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: '14px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, customer)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '20px'
    }
  }, lines.filter(l => l.desc || l.price).map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      borderBottom: '1px solid #F8F7F5',
      fontSize: '12px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#0F172A'
    }
  }, l.desc || `Item ${i + 1}`, " \xD7 ", l.qty), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#10B981'
    }
  }, fmt(Number(l.qty) * Number(l.price)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F0FDF4',
      borderRadius: '10px',
      padding: '14px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      color: '#065F46',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Total Due"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '28px',
      color: '#10B981',
      letterSpacing: '-1px',
      marginTop: '4px'
    }
  }, fmt(total))), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      marginTop: '14px',
      padding: '9px',
      background: 'none',
      border: '1px solid #E2E8F0',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, "\u2193 Download PDF Preview")))));
};

// ─── CUSTOMER DETAIL ──────────────────────────────────────────────────────────

const ARCustomerScreen = ({
  onNavigate
}) => {
  const cust = AR_CUSTOMERS[0];
  const custInvoices = AR_INVOICES.filter(i => i.customer === cust.name);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: 'pointer',
      color: '#10B981'
    },
    onClick: () => onNavigate && onNavigate('ar')
  }, "Accounts Receivable"), " \u203A Customers \u203A ", cust.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '30px',
      color: '#0F172A',
      letterSpacing: '-1.5px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  }, cust.name, " ", /*#__PURE__*/React.createElement(ARStatusBadge, {
    status: cust.status
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary"
  }, "Edit Customer"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    icon: /*#__PURE__*/React.createElement("span", null, "+")
  }, "Raise Invoice"))), /*#__PURE__*/React.createElement(StatsRow, {
    cards: [{
      label: 'Total Invoiced',
      value: '₹17.52L',
      delta: 'Lifetime',
      deltaType: 'positive'
    }, {
      label: 'Outstanding',
      value: cust.outstanding,
      delta: '2 invoices',
      deltaType: 'negative',
      color: '#E8783B'
    }, {
      label: 'Overdue',
      value: cust.overdue,
      delta: 'Immediate action',
      deltaType: 'negative',
      color: '#EF4444',
      pulse: true
    }, {
      label: 'Avg Days to Pay',
      value: String(cust.avgDays),
      sublabel: 'days',
      delta: '↑ slow payer',
      deltaType: 'negative',
      color: '#F59E0B'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '7fr 5fr',
      gap: '20px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '0',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 22px',
      borderBottom: '1px solid #F1F0EE',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A'
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
  }, ['Invoice #', 'Amount', 'Due Date', 'Age', 'Status'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 16px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, custInvoices.map(inv => /*#__PURE__*/React.createElement("tr", {
    key: inv.id,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 52,
      transition: 'background 150ms',
      cursor: 'pointer'
    },
    onMouseEnter: e => e.currentTarget.style.background = '#F0FDF4',
    onMouseLeave: e => e.currentTarget.style.background = 'white'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: '#10B981'
    }
  }, inv.id), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '14px',
      color: '#10B981'
    }
  }, inv.amount), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, inv.due), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: ageBg(inv.age),
      color: ageColor(inv.age),
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, inv.age, "d")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement(ARStatusBadge, {
    status: inv.status
  }))))))), /*#__PURE__*/React.createElement(Card, {
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
  }, "Customer Profile"), [{
    l: 'GSTIN',
    v: cust.gstin,
    mono: true
  }, {
    l: 'Payment Terms',
    v: cust.terms
  }, {
    l: 'Average Days to Pay',
    v: `${cust.avgDays} days`
  }, {
    l: 'Status',
    v: cust.status
  }].map(r => /*#__PURE__*/React.createElement("div", {
    key: r.l,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid #F8F7F5'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#0F172A',
      fontWeight: 600,
      fontFamily: r.mono ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif"
    }
  }, r.v))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '8px'
    }
  }, "Credit Utilisation"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "\u20B95,20,000 of \u20B910,00,000"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#F59E0B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "52%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      background: '#F1F5F9',
      borderRadius: 4,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: '52%',
      background: '#F59E0B',
      borderRadius: 4
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '8px'
    }
  }, "Internal Notes"), /*#__PURE__*/React.createElement("textarea", {
    placeholder: "Add internal memo (not visible to customer)\u2026",
    style: {
      width: '100%',
      padding: '10px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      resize: 'vertical',
      outline: 'none',
      background: '#FAFAF8',
      rows: 3
    }
  })))));
};
Object.assign(window, {
  ARScreen,
  ARRaiseScreen,
  ARCustomerScreen
});
