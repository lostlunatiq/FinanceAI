function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Tijori AI — Design System Components

const DS_COLORS = {
  orange: '#E8783B',
  orangeHot: '#FF6B35',
  slate950: '#020617',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  warmWhite: '#FAFAF8',
  cardWhite: '#FFFFFF',
  cardSubtle: '#F8F7F5',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6'
};
const Btn = ({
  variant = 'primary',
  children,
  onClick,
  icon,
  small,
  pill,
  style: extraStyle,
  disabled
}) => {
  const [hov, setHov] = React.useState(false);
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    borderRadius: pill ? '999px' : '10px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    fontSize: small ? '12px' : '13px',
    padding: small ? '6px 12px' : '9px 18px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'all 150ms ease',
    position: 'relative',
    overflow: 'hidden',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    letterSpacing: '-0.1px'
  };
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
      color: 'white',
      boxShadow: hov ? '0 4px 16px rgba(232,120,59,0.4)' : 'none',
      transform: hov ? 'translateY(-1px)' : 'none'
    },
    secondary: {
      background: 'white',
      color: '#1E293B',
      border: '1.5px solid #E2E8F0',
      background: hov ? '#FFF8F5' : 'white'
    },
    destructive: {
      background: '#FEE2E2',
      color: '#DC2626'
    },
    ghost: {
      background: 'transparent',
      color: '#E8783B'
    },
    dark: {
      background: '#0F172A',
      color: 'white',
      transform: hov ? 'translateY(-1px)' : 'none',
      boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.3)' : 'none'
    },
    green: {
      background: '#D1FAE5',
      color: '#065F46'
    },
    purple: {
      background: '#EDE9FE',
      color: '#5B21B6'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    style: {
      ...base,
      ...variants[variant],
      ...extraStyle
    },
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    onClick: disabled ? undefined : onClick
  }, variant === 'primary' && hov && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '50%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
      animation: 'shimmer 1s ease-in-out'
    }
  }), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex'
    }
  }, icon), children);
};
const StatusBadge = ({
  status
}) => {
  const cfgs = {
    DRAFT: {
      bg: '#F1F5F9',
      color: '#475569',
      label: 'Draft'
    },
    SUBMITTED: {
      bg: '#DBEAFE',
      color: '#1D4ED8',
      label: 'Submitted'
    },
    PENDING: {
      bg: '#FEF3C7',
      color: '#92400E',
      label: 'Pending'
    },
    PENDING_L1: {
      bg: '#FEF3C7',
      color: '#92400E',
      label: 'Pending L1'
    },
    PENDING_L2: {
      bg: '#FEF3C7',
      color: '#92400E',
      label: 'Pending L2'
    },
    PENDING_HOD: {
      bg: '#FEF3C7',
      color: '#92400E',
      label: 'Pending HOD'
    },
    PENDING_FIN_L1: {
      bg: '#FFF7ED',
      color: '#C2410C',
      label: 'Fin Review L1'
    },
    PENDING_FIN_L2: {
      bg: '#FFF7ED',
      color: '#C2410C',
      label: 'Fin Review L2'
    },
    PENDING_FIN_HEAD: {
      bg: '#FFF7ED',
      color: '#C2410C',
      label: 'Fin Head'
    },
    PENDING_CFO: {
      bg: '#EDE9FE',
      color: '#5B21B6',
      label: 'Pending CFO'
    },
    APPROVED: {
      bg: '#D1FAE5',
      color: '#065F46',
      label: 'Approved'
    },
    AUTO_REJECT: {
      bg: '#FEE2E2',
      color: '#991B1B',
      label: 'Auto Rejected'
    },
    REJECTED: {
      bg: '#FEE2E2',
      color: '#991B1B',
      label: 'Rejected'
    },
    QUERY_RAISED: {
      bg: '#EDE9FE',
      color: '#5B21B6',
      label: 'Query Raised'
    },
    PENDING_D365: {
      bg: '#DBEAFE',
      color: '#1D4ED8',
      label: 'Pending D365'
    },
    BOOKED_D365: {
      bg: '#DBEAFE',
      color: '#1D4ED8',
      label: 'Booked D365'
    },
    POSTED_D365: {
      bg: '#DBEAFE',
      color: '#1D4ED8',
      label: 'Posted D365'
    },
    PAID: {
      bg: '#D1FAE5',
      color: '#065F46',
      label: 'Paid'
    },
    WITHDRAWN: {
      bg: '#F1F5F9',
      color: '#475569',
      label: 'Withdrawn'
    },
    EXPIRED: {
      bg: '#F1F5F9',
      color: '#475569',
      label: 'Expired'
    },
    ANOMALY: {
      bg: '#FEE2E2',
      color: '#991B1B',
      label: 'Anomaly'
    },
    FRAUD: {
      bg: '#FEE2E2',
      color: '#991B1B',
      label: 'Fraud'
    },
    ACTIVE: {
      bg: '#D1FAE5',
      color: '#065F46',
      label: 'Active'
    },
    SUSPENDED: {
      bg: '#FEE2E2',
      color: '#991B1B',
      label: 'Suspended'
    },
    BLACKLISTED: {
      bg: '#1E293B',
      color: '#F1F5F9',
      label: 'Blacklisted'
    },
    PROCESSING: {
      bg: '#FFF7ED',
      color: '#C2410C',
      label: 'Processing'
    },
    IN_PROGRESS: {
      bg: '#FFF7ED',
      color: '#C2410C',
      label: 'In Progress'
    },
    LIVE: {
      bg: '#D1FAE5',
      color: '#065F46',
      label: 'Live'
    },
    MOCK: {
      bg: '#FEF3C7',
      color: '#92400E',
      label: 'Mock'
    }
  };
  const cfg = cfgs[status] || {
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
      display: 'inline-block'
    }
  }, cfg.label);
};
const KPICard = ({
  label,
  value,
  delta,
  deltaType = 'neutral',
  sublabel,
  color,
  pulse
}) => {
  const [hov, setHov] = React.useState(false);
  const dc = {
    positive: {
      bg: '#D1FAE5',
      color: '#065F46'
    },
    negative: {
      bg: '#FEE2E2',
      color: '#991B1B'
    },
    neutral: {
      bg: '#FEF3C7',
      color: '#92400E'
    }
  }[deltaType];
  // mini sparkline data
  const pts = [30, 45, 35, 55, 48, 62, 58, 70, 65, 80];
  const w = 80,
    h = 28;
  const max = Math.max(...pts),
    min = Math.min(...pts);
  const x = i => i / (pts.length - 1) * w;
  const y = v => h - (v - min) / (max - min) * h;
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    style: {
      background: 'white',
      borderRadius: '16px',
      padding: '22px 24px 18px',
      boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.10)' : '0 2px 12px rgba(0,0,0,0.06)',
      flex: 1,
      minWidth: 0,
      transition: 'all 200ms ease',
      transform: hov ? 'translateY(-2px)' : 'none',
      cursor: 'default'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '10px'
    }
  }, label), pulse && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#EF4444',
      display: 'block',
      animation: 'dotPulse 2s ease infinite'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '44px',
      fontWeight: 800,
      fontFamily: "'Bricolage Grotesque', sans-serif",
      letterSpacing: '-2px',
      color: color || '#0F172A',
      lineHeight: 1.05,
      marginBottom: '10px'
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, delta && /*#__PURE__*/React.createElement("span", {
    style: {
      background: dc.bg,
      color: dc.color,
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, delta), sublabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, sublabel)), /*#__PURE__*/React.createElement("svg", {
    width: w,
    height: h,
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: "#E8783B",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    opacity: "0.7"
  }))));
};
const TjModal = ({
  open,
  onClose,
  title,
  children,
  accentColor = '#0F172A',
  width = 480
}) => {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(2,6,23,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 200ms ease'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '16px',
      width,
      maxWidth: '90vw',
      maxHeight: '85vh',
      overflow: 'auto',
      animation: 'slideUp 300ms cubic-bezier(0.34,1.56,0.64,1)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.2)'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 24px',
      borderBottom: '1px solid #F1F0EE',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontSize: '18px',
      fontWeight: 700,
      color: accentColor,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", null, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#94A3B8',
      fontSize: '18px',
      lineHeight: 1
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px'
    }
  }, children)));
};
const SidePanel = ({
  open,
  onClose,
  title,
  children,
  width = 440
}) => {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 900,
      display: 'flex'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: 'rgba(2,6,23,0.4)',
      backdropFilter: 'blur(2px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      background: 'white',
      height: '100%',
      overflow: 'auto',
      boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
      animation: 'slideInRight 300ms cubic-bezier(0.34,1.56,0.64,1)',
      display: 'flex',
      flexDirection: 'column'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 24px',
      borderBottom: '1px solid #F1F0EE',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontSize: '18px',
      fontWeight: 700,
      color: '#0F172A'
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: '#F8F7F5',
      border: 'none',
      cursor: 'pointer',
      color: '#475569',
      width: 32,
      height: 32,
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px'
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '24px'
    }
  }, children)));
};
const AIBadge = ({
  small
}) => /*#__PURE__*/React.createElement("span", {
  style: {
    background: 'linear-gradient(135deg, #E8783B, #8B5CF6)',
    color: 'white',
    padding: small ? '1px 6px' : '2px 8px',
    borderRadius: '999px',
    fontSize: small ? '9px' : '10px',
    fontWeight: 700,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: '0.06em'
  }
}, "AI");
const LiveDot = ({
  color = '#10B981'
}) => /*#__PURE__*/React.createElement("span", {
  style: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: color,
    display: 'block',
    animation: 'dotPulse 1.5s ease infinite',
    boxShadow: `0 0 0 2px ${color}33`
  }
}), "LIVE");
const TjInput = ({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  icon,
  rightIcon,
  onRightIconClick
}) => {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px'
    }
  }, label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#475569',
      marginBottom: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: focused ? '#E8783B' : '#94A3B8',
      fontSize: '14px'
    }
  }, icon), /*#__PURE__*/React.createElement("input", {
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: '100%',
      padding: icon ? '10px 12px 10px 38px' : '10px 12px',
      border: `1.5px solid ${focused ? '#E8783B' : '#E2E8F0'}`,
      borderRadius: '10px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '14px',
      color: '#0F172A',
      background: '#FAFAF8',
      outline: 'none',
      transition: 'border-color 150ms ease',
      boxShadow: focused ? '0 0 0 3px rgba(232,120,59,0.12)' : 'none',
      paddingRight: rightIcon ? '40px' : '12px'
    }
  }), rightIcon && /*#__PURE__*/React.createElement("button", {
    onClick: onRightIconClick,
    style: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#94A3B8',
      fontSize: '14px',
      display: 'flex'
    }
  }, rightIcon)));
};
const TjTextarea = ({
  label,
  placeholder,
  value,
  onChange,
  rows = 4,
  required
}) => {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px'
    }
  }, label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#475569',
      marginBottom: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#EF4444',
      marginLeft: 3
    }
  }, "*")), /*#__PURE__*/React.createElement("textarea", {
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    rows: rows,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: '100%',
      padding: '10px 12px',
      border: `1.5px solid ${focused ? '#E8783B' : '#E2E8F0'}`,
      borderRadius: '10px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '14px',
      color: '#0F172A',
      background: '#FAFAF8',
      outline: 'none',
      resize: 'vertical',
      transition: 'border-color 150ms ease',
      boxShadow: focused ? '0 0 0 3px rgba(232,120,59,0.12)' : 'none'
    }
  }));
};
const SectionHeader = ({
  title,
  subtitle,
  right,
  icon
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
  style: {
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: '32px',
    fontWeight: 800,
    color: '#0F172A',
    letterSpacing: '-1.5px',
    lineHeight: 1.1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }
}, icon && /*#__PURE__*/React.createElement("span", null, icon), title), subtitle && /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: '13px',
    color: '#64748B',
    marginTop: '4px',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  }
}, subtitle)), right && /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexShrink: 0
  }
}, right));
const Card = ({
  children,
  style: s,
  onClick,
  hover = true
}) => {
  const [hov, setHov] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    onClick: onClick,
    style: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: hover && hov ? '0 8px 24px rgba(0,0,0,0.10)' : '0 2px 12px rgba(0,0,0,0.06)',
      transition: 'all 200ms ease',
      transform: hover && hov ? 'translateY(-2px)' : 'none',
      cursor: onClick ? 'pointer' : 'default',
      ...s
    }
  }, children);
};
const StatsRow = ({
  cards
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px'
  }
}, cards.map((c, i) => /*#__PURE__*/React.createElement(KPICard, _extends({
  key: i
}, c))));
const FloatingCopilot = ({
  role
}) => {
  const [open, setOpen] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const roleKey = role || 'CFO';
  const SUGGESTIONS = {
    'CFO': ['Cash flow this month', 'Anomaly summary', 'Top vendors by spend', 'Which department is over budget?'],
    'Finance Admin': ['Pending vendor approvals', 'Anomaly summary', 'Audit log today', 'System status'],
    'Finance Manager': ['Team budget status', 'My pending approvals', 'Top spenders', 'Variance summary'],
    'AP Clerk': ['My queue summary', 'High risk invoices', 'Average processing time', 'Near SLA limit'],
    'Employee': ['Last reimbursement status', 'Travel budget left', 'Help me file expense', 'Expense summary'],
    'Vendor': ['When is my payment?', 'Outstanding amount', 'Status of last invoice', 'How to submit bill?']
  };
  const queries = SUGGESTIONS[roleKey] || SUGGESTIONS['Employee'];
  const getTitle = () => {
    if (roleKey === 'Vendor') return 'Vendor Assistant';
    if (roleKey === 'Employee') return 'Expense Assistant';
    return `${roleKey} Copilot`;
  };
  const [chat, setChat] = React.useState([{
    role: 'ai',
    text: `Hello! I'm your ${getTitle()}. How can I help you today?`
  }]);
  const send = async text => {
    const q = text || msg.trim();
    if (!q || loading) return;
    setMsg('');
    setChat(prev => [...prev, {
      role: 'user',
      text: q
    }]);
    setLoading(true);
    try {
      const res = await window.TijoriAPI.NLQueryAPI.ask(q);
      setChat(prev => [...prev, {
        role: 'ai',
        text: res.answer || res.error || 'No response.',
        insight: res.insight
      }]);
    } catch (e) {
      setChat(prev => [...prev, {
        role: 'ai',
        text: 'Error connecting to AI service.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Listen for prefill events from other screens (e.g. Anomaly "Explain in Copilot")
  React.useEffect(() => {
    const handler = e => {
      if (e.detail?.query) {
        setOpen(true);
        setTimeout(() => send(e.detail.query), 200);
      }
    };
    window.addEventListener('copilot:prefill', handler);
    return () => window.removeEventListener('copilot:prefill', handler);
  }, []);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    title: "AI Copilot",
    style: {
      position: 'fixed',
      bottom: 32,
      right: 32,
      width: 52,
      height: 52,
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      color: 'white',
      zIndex: 100,
      boxShadow: '0 6px 24px rgba(232,120,59,0.5)',
      transition: 'all 200ms'
    },
    onMouseEnter: e => {
      e.currentTarget.style.transform = 'scale(1.1)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(232,120,59,0.7)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = '0 6px 24px rgba(232,120,59,0.5)';
    }
  }, "\u2726"), /*#__PURE__*/React.createElement(SidePanel, {
    open: open,
    onClose: () => setOpen(false),
    title: getTitle(),
    width: 400
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement(AIBadge, null), /*#__PURE__*/React.createElement(LiveDot, {
    color: "#E8783B"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Powered by Tijori Intelligence")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 'calc(100vh - 280px)',
      minHeight: 300,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '16px',
      paddingRight: 4
    }
  }, chat.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '85%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
      background: m.role === 'user' ? 'linear-gradient(135deg, #E8783B, #FF6B35)' : '#F8F7F5',
      color: m.role === 'user' ? 'white' : '#0F172A',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.55
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
  }, "Insight: "), m.insight)))), loading && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '4px',
      padding: '10px 14px',
      background: '#F8F7F5',
      borderRadius: '14px 14px 14px 4px',
      width: 'fit-content'
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
    style: {
      display: 'flex',
      gap: '8px',
      position: 'sticky',
      bottom: 0,
      background: 'white',
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: msg,
    onChange: e => setMsg(e.target.value),
    onKeyDown: e => e.key === 'Enter' && send(),
    placeholder: "Ask about finances\u2026",
    style: {
      flex: 1,
      padding: '10px 14px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '10px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px',
      outline: 'none',
      background: '#FAFAF8'
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: () => send(),
    small: true,
    disabled: loading
  }, "Send")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '12px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px'
    }
  }, queries.map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => send(s),
    disabled: loading,
    style: {
      padding: '5px 10px',
      background: '#F8F7F5',
      border: '1px solid #E2E8F0',
      borderRadius: '999px',
      fontSize: '11px',
      color: '#475569',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 500
    }
  }, s)))));
};
Object.assign(window, {
  DS_COLORS,
  Btn,
  StatusBadge,
  KPICard,
  TjModal,
  SidePanel,
  AIBadge,
  LiveDot,
  TjInput,
  TjTextarea,
  SectionHeader,
  Card,
  StatsRow,
  FloatingCopilot
});
