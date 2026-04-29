// Tijori AI — Main App
// Fully dynamic — all user/role data comes from Django backend via /api/v1/auth/me/

// ─── GRADE → ROLE KEY ────────────────────────────────────────────────────────
// Maps employee_grade integer + flags → ROLE_CONFIG key
// Single source of truth — used in both token verify and login flows

const gradeToRoleKey = (grade, isSuperuser, isVendor, username, dept) => {
  if (isVendor) return 'Vendor';
  if (isSuperuser) return 'CFO';
  if (grade >= 4) return 'Finance Admin';
  if (grade >= 3) return 'Finance Manager';
  if (grade >= 2) return 'Finance Manager';

  // Grade 1 logic: Finance dept or specific l1_approver get Clerk view, others get Employee view
  if (dept === 'Finance' || username === 'l1_approver') return 'AP Clerk';
  return 'Employee';
};

// ─── NAV CONFIG ──────────────────────────────────────────────────────────────
// Drives what each grade sees in the sidebar
// ROLE_CONFIG.user is now just a fallback — real user comes from backend

const ROLE_CONFIG = {
  'CFO': {
    homeScreen: 'dashboard',
    nav: ['dashboard', 'ai-hub', 'ap-hub', 'ar', 'expenses', 'budget', 'guardrails', 'anomaly', 'spend-analytics', 'working-capital', 'vendor-risk', 'reports', 'vendors', 'iam', 'audit', 'settings']
  },
  'Finance Admin': {
    homeScreen: 'dashboard',
    nav: ['dashboard', 'ai-hub', 'ap-hub', 'ar', 'expenses', 'vendors', 'budget', 'guardrails', 'anomaly', 'gst-recon', 'tds-compliance', 'policy-compliance', 'reports', 'iam', 'audit', 'settings']
  },
  'Finance Manager': {
    homeScreen: 'fm-home',
    nav: ['fm-home', 'ai-hub', 'ap-hub', 'expenses', 'budget', 'guardrails', 'anomaly', 'spend-analytics', 'dept-variance', 'po-match', 'reports', 'audit', 'settings']
  },
  'AP Clerk': {
    homeScreen: 'clerk-home',
    nav: ['clerk-home', 'ap-hub', 'expenses', 'vendor-risk', 'audit', 'settings']
  },
  'Employee': {
    homeScreen: 'emp-home',
    nav: ['emp-home', 'expenses', 'settings']
  },
  'Vendor': {
    homeScreen: 'vendor-portal',
    nav: ['vendor-portal', 'settings']
  }
};
const NAV_LABELS = {
  'dashboard': {
    label: 'Command Center',
    icon: '⬡'
  },
  'fm-home': {
    label: 'Approval Pipeline',
    icon: '⬡'
  },
  'clerk-home': {
    label: 'My Queue',
    icon: '⬡'
  },
  'emp-home': {
    label: 'My Expenses',
    icon: '⬡'
  },
  'vendor-portal': {
    label: 'Vendor Portal',
    icon: '⬡'
  },
  'ai-hub': {
    label: 'CFO Copilot',
    icon: '✦'
  },
  'ap-hub': {
    label: 'Accounts Payable',
    icon: '◈'
  },
  'ar': {
    label: 'Accounts Receivable',
    icon: '◇'
  },
  'expenses': {
    label: 'Expense Management',
    icon: '◉'
  },
  'budget': {
    label: 'Budget Management',
    icon: '▣'
  },
  'guardrails': {
    label: 'Budgetary Guardrails',
    icon: '⬢'
  },
  'anomaly': {
    label: 'Anomaly Detection',
    icon: '◎'
  },
  'spend-analytics': {
    label: 'Spend Intelligence',
    icon: '◆'
  },
  'working-capital': {
    label: 'Working Capital',
    icon: '◐'
  },
  'vendor-risk': {
    label: 'Vendor Risk',
    icon: '◬'
  },
  'gst-recon': {
    label: 'GST Reconciliation',
    icon: '◧'
  },
  'tds-compliance': {
    label: 'TDS Compliance',
    icon: '◩'
  },
  'policy-compliance': {
    label: 'Policy Compliance',
    icon: '◭'
  },
  'dept-variance': {
    label: 'Dept Variance',
    icon: '◱'
  },
  'po-match': {
    label: 'PO Matching',
    icon: '◳'
  },
  'reports': {
    label: 'Reports',
    icon: '◫'
  },
  'vendors': {
    label: 'Vendor Management',
    icon: '◫'
  },
  'iam': {
    label: 'Identity & Access',
    icon: '🔐'
  },
  'audit': {
    label: 'Audit Log',
    icon: '◱'
  },
  'settings': {
    label: 'Settings',
    icon: '◌'
  }
};
const BREADCRUMBS = {
  'dashboard': ['Command Center'],
  'fm-home': ['Approval Pipeline'],
  'clerk-home': ['My Queue'],
  'emp-home': ['My Expenses'],
  'ap-hub': ['Accounts Payable Hub'],
  'ap-match': ['Accounts Payable Hub', 'Invoice Detail'],
  'expenses': ['Expense Management'],
  'budget': ['Budget Management'],
  'guardrails': ['Budgetary Controls', 'Guardrails'],
  'anomaly': ['Anomaly Engine'],
  'vendors': ['Vendor Registry'],
  'audit': ['Audit Registry'],
  'settings': ['Account Architecture'],
  'vendor-portal': ['Vendor Portal'],
  'iam': ['Identity & Access Management'],
  'ar': ['Accounts Receivable'],
  'ar-raise': ['Accounts Receivable', 'Raise Invoice'],
  'ar-customer': ['Accounts Receivable', 'Customer Detail'],
  'ai-hub': ['CFO Copilot'],
  'reports': ['Reports & Analytics'],
  'spend-analytics': ['AI Intelligence', 'Spend Analysis'],
  'working-capital': ['AI Intelligence', 'Working Capital'],
  'vendor-risk': ['AI Intelligence', 'Vendor Risk Score'],
  'gst-recon': ['Compliance', 'GST Reconciliation'],
  'tds-compliance': ['Compliance', 'TDS Tracker'],
  'policy-compliance': ['Compliance', 'Policy Check'],
  'dept-variance': ['Analytics', 'Dept Variance'],
  'po-match': ['Operations', 'PO Matching']
};

// ─── LIVE BADGE COUNTS ────────────────────────────────────────────────────────
// Fetched from backend — not hardcoded

const useLiveBadges = () => {
  const [badges, setBadges] = React.useState({});
  React.useEffect(() => {
    const {
      DashboardAPI,
      AnomalyAPI
    } = window.TijoriAPI;
    Promise.allSettled([DashboardAPI.stats(), AnomalyAPI.list()]).then(([statsRes, anomalyRes]) => {
      const next = {};
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const count = statsRes.value.my_queue_count || 0;
        if (count > 0) next['ap-hub'] = {
          count,
          color: '#F59E0B'
        };
      }
      if (anomalyRes.status === 'fulfilled' && anomalyRes.value) {
        const high = (anomalyRes.value || []).filter(e => ['HIGH', 'CRITICAL'].includes(e.anomaly_severity)).length;
        if (high > 0) next['anomaly'] = {
          count: high,
          color: '#EF4444'
        };
      }
      setBadges(next);
    });
  }, []);
  return badges;
};

// ─── APP SHELL ────────────────────────────────────────────────────────────────

const AppShell = ({
  roleKey,
  screen,
  onNavigate,
  onBack,
  canGoBack,
  onLogout,
  user,
  children
}) => {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifs, setNotifs] = React.useState([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [popup, setPopup] = React.useState(null); // HIGH priority popup
  const [popupDismissed, setPopupDismissed] = React.useState(false);
  const navBadges = useLiveBadges();
  const config = ROLE_CONFIG[roleKey] || ROLE_CONFIG['AP Clerk'];
  const navItems = config.nav;
  const prevUnreadRef = React.useRef(null);
  const fireBrowserPush = items => {
    try {
      const prefs = JSON.parse(localStorage.getItem('notif_prefs') || '{}');
      if (!prefs.push) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      items.slice(0, 3).forEach(item => {
        new Notification(item.sub || 'Tijori Alert', {
          body: item.text,
          icon: '/static/favicon.ico'
        });
      });
    } catch (_) {}
  };
  const loadNotifs = (showPopup = false) => {
    window.TijoriAPI.NotificationsAPI.list().then(data => {
      const items = (data?.notifications || []).map(n => ({
        id: n.id,
        text: n.message,
        sub: n.title,
        time: n.timestamp ? new Date(n.timestamp).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '',
        dot: n.dot_color || '#F59E0B',
        navTarget: n.nav_target || 'audit',
        priority: n.priority || 'LOW',
        type: n.type,
        ref_no: n.ref_no,
        amount: n.amount,
        isRead: n.is_read
      }));
      setNotifs(items);
      const newUnread = data?.unread_count || 0;
      setUnreadCount(newUnread);

      // Fire browser push for NEW unread notifications on subsequent polls
      if (!showPopup && prevUnreadRef.current !== null && newUnread > prevUnreadRef.current) {
        const freshItems = items.filter(i => !i.isRead && (i.priority === 'HIGH' || i.priority === 'CRITICAL'));
        if (freshItems.length > 0) fireBrowserPush(freshItems);
      }
      prevUnreadRef.current = newUnread;

      // Show popup for HIGH priority on first load or on dashboard
      if (showPopup && !popupDismissed) {
        const highItems = items.filter(i => (i.priority === 'HIGH' || i.priority === 'CRITICAL') && !i.isRead).slice(0, 3);
        if (highItems.length > 0) setPopup(highItems);
      }
    }).catch(() => {
      // Fallback removed — we have a real API now
    });
  };
  const markAllRead = async () => {
    try {
      await window.TijoriAPI.NotificationsAPI.markRead();
      setUnreadCount(0);
      setNotifs(prev => prev.map(n => ({
        ...n,
        isRead: true
      })));
    } catch (e) {}
  };
  const markSingleRead = async id => {
    try {
      await window.TijoriAPI.NotificationsAPI.markRead(id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifs(prev => prev.map(n => n.id === id ? {
        ...n,
        isRead: true
      } : n));
    } catch (e) {}
  };
  React.useEffect(() => {
    loadNotifs(true);
  }, []);

  // Auto-refresh every 60 seconds
  React.useEffect(() => {
    const interval = setInterval(() => loadNotifs(false), 60000);
    return () => clearInterval(interval);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#F8FAFC'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 240,
      background: '#0F172A',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 20px 18px',
      borderBottom: '1px solid rgba(255,255,255,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 0 16px rgba(232,120,59,0.4)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z",
    stroke: "white",
    strokeWidth: "1.5",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z",
    fill: "white",
    opacity: "0.8"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '16px',
      color: 'white',
      letterSpacing: '-0.5px',
      lineHeight: 1
    }
  }, "Tijori AI"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '9px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      marginTop: '2px'
    }
  }, "Enterprise Finance OS")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: 'rgba(232,120,59,0.08)',
      borderBottom: '1px solid rgba(255,255,255,0.04)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#E8783B',
      display: 'block',
      animation: 'dotPulse 2s ease infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      color: '#E8783B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, roleKey, " View"), user.employee_grade && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: '9px',
      fontWeight: 700,
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: 'rgba(255,255,255,0.06)',
      padding: '1px 6px',
      borderRadius: '999px'
    }
  }, "G", user.employee_grade))), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      padding: '10px',
      overflow: 'auto'
    }
  }, navItems.map(id => {
    const item = NAV_LABELS[id];
    if (!item) return null;
    const active = screen === id || id === 'ap-hub' && screen === 'ap-match';
    const badge = navBadges[id]; // ✅ live from backend
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => onNavigate(id),
      style: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        background: active ? '#1E293B' : 'transparent',
        color: active ? 'white' : '#475569',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: active ? 600 : 500,
        fontSize: '13px',
        textAlign: 'left',
        transition: 'all 150ms ease',
        marginBottom: '2px',
        borderLeft: `3px solid ${active ? '#E8783B' : 'transparent'}`
      },
      onMouseEnter: e => {
        if (!active) {
          e.currentTarget.style.background = '#1E293B44';
          e.currentTarget.style.color = '#CBD5E1';
        }
      },
      onMouseLeave: e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#475569';
        }
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '14px',
        opacity: active ? 1 : 0.6,
        color: active ? '#E8783B' : 'inherit',
        fontFamily: 'monospace',
        flexShrink: 0
      }
    }, item.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, item.label), badge && /*#__PURE__*/React.createElement("span", {
      style: {
        background: badge.color,
        color: 'white',
        borderRadius: '999px',
        fontSize: '9px',
        fontWeight: 700,
        padding: '1px 6px',
        flexShrink: 0
      }
    }, badge.count));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px',
      borderTop: '1px solid rgba(255,255,255,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: '10px',
      background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '13px',
      color: 'white',
      flexShrink: 0
    }
  }, user.initials), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600,
      fontSize: '12px',
      color: 'white',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, user.department || roleKey, "   ")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#10B981',
      boxShadow: '0 0 6px #10B981',
      flexShrink: 0
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    style: {
      width: '100%',
      padding: '8px 0',
      borderRadius: '8px',
      background: 'rgba(239,68,68,0.15)',
      border: '1px solid rgba(239,68,68,0.3)',
      cursor: 'pointer',
      color: '#FCA5A5',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600,
      fontSize: '12px',
      transition: 'all 150ms'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = 'rgba(239,68,68,0.3)';
      e.currentTarget.style.color = '#fff';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
      e.currentTarget.style.color = '#FCA5A5';
    }
  }, "Sign Out"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 64,
      background: 'white',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: '12px',
      flexShrink: 0,
      zIndex: 5
    }
  }, canGoBack && /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      width: 32,
      height: 32,
      borderRadius: '8px',
      background: '#F8F7F5',
      border: '1.5px solid #E2E8F0',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      color: '#475569',
      transition: 'all 150ms',
      flexShrink: 0
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = '#E8783B';
      e.currentTarget.style.color = 'white';
      e.currentTarget.style.borderColor = '#E8783B';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = '#F8F7F5';
      e.currentTarget.style.color = '#475569';
      e.currentTarget.style.borderColor = '#E2E8F0';
    },
    title: "Go back"
  }, "\u2190"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94A3B8'
    }
  }, "Tijori AI"), (BREADCRUMBS[screen] || []).map((crumb, i, arr) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#CBD5E1'
    }
  }, "\u203A"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: i === arr.length - 1 ? '#0F172A' : '#94A3B8',
      fontWeight: i === arr.length - 1 ? 600 : 400
    }
  }, crumb)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setNotifOpen(!notifOpen);
      if (!notifOpen) loadNotifs();
    },
    style: {
      width: 36,
      height: 36,
      borderRadius: '10px',
      background: notifOpen ? '#FFF8F5' : '#F8F7F5',
      border: `1.5px solid ${unreadCount > 0 ? '#EF4444' : '#E2E8F0'}`,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '15px',
      position: 'relative'
    }
  }, "\uD83D\uDD14", unreadCount > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      background: '#EF4444',
      borderRadius: '999px',
      border: '2px solid white',
      fontSize: '8px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      padding: '0 3px',
      animation: 'dotPulse 2s ease infinite'
    }
  }, unreadCount)), notifOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 44,
      right: 0,
      width: 340,
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
      border: '1px solid #F1F0EE',
      zIndex: 100,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px',
      borderBottom: '1px solid #F1F0EE',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#F8FAFC'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '15px',
      color: '#0F172A'
    }
  }, "Notifications"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: markAllRead,
    style: {
      fontSize: '11px',
      color: '#E8783B',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700
    }
  }, "Mark all read"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      color: '#94A3B8',
      cursor: 'pointer'
    },
    onClick: () => setNotifOpen(false)
  }, "\u2715"))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: '400px',
      overflowY: 'auto'
    }
  }, notifs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px 20px',
      textAlign: 'center',
      color: '#94A3B8',
      fontSize: '13px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "\uD83D\uDD14 All caught up!") : notifs.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '14px 16px',
      borderBottom: '1px solid #F8F7F5',
      display: 'flex',
      gap: '12px',
      cursor: 'pointer',
      transition: 'background 150ms',
      background: n.isRead ? 'transparent' : '#FFF8F5'
    },
    onClick: () => {
      markSingleRead(n.id);
      setNotifOpen(false);
      onNavigate(n.navTarget);
    },
    onMouseEnter: e => e.currentTarget.style.background = n.isRead ? '#F8F7F5' : '#FFF5F0',
    onMouseLeave: e => e.currentTarget.style.background = n.isRead ? 'transparent' : '#FFF8F5'
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: n.dot,
      marginTop: 6,
      flexShrink: 0,
      boxShadow: `0 0 8px ${n.dot}55`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '3px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10px',
      fontWeight: 800,
      color: n.dot,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, n.sub), !n.isRead && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#E8783B'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: n.isRead ? 500 : 700,
      lineHeight: 1.4
    }
  }, n.text), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, n.time), n.amount && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#0F172A',
      fontFamily: "'JetBrains Mono', monospace"
    }
  }, "\u20B9", Number(n.amount).toLocaleString('en-IN'))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px',
      textAlign: 'center',
      borderTop: '1px solid #F1F0EE',
      background: '#F8FAFC'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setNotifOpen(false);
      onNavigate('audit');
    },
    style: {
      background: 'none',
      border: 'none',
      fontSize: '12px',
      color: '#64748B',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, "View Full Audit Trail \u2192")))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '10px',
      background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '13px',
      color: 'white',
      cursor: 'pointer'
    },
    title: `${user.name} · G${user.employee_grade}`
  }, user.initials)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      background: '#F8FAFC'
    },
    onClick: () => setNotifOpen(false)
  }, children)), popup && !popupDismissed && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 360,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      border: '1px solid #FEE2E2',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
      padding: '12px 16px',
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
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px'
    }
  }, "\uD83D\uDEA8"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '13px',
      color: 'white'
    }
  }, "Urgent Attention Required"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: 'rgba(255,255,255,0.7)',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, popup.length, " high-priority notification", popup.length !== 1 ? 's' : ''))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setPopupDismissed(true);
      setPopup(null);
    },
    style: {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      borderRadius: '6px',
      color: 'white',
      cursor: 'pointer',
      fontSize: '13px',
      width: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700
    }
  }, "\u2715")), popup.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '12px 16px',
      borderBottom: i < popup.length - 1 ? '1px solid #FEF2F2' : 'none',
      display: 'flex',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: n.dot || '#EF4444',
      flexShrink: 0,
      marginTop: 3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700,
      color: '#0F172A',
      marginBottom: '2px'
    }
  }, n.text), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, n.sub), n.amount && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#EF4444',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600,
      marginTop: '2px'
    }
  }, "\u20B9", parseFloat(n.amount).toLocaleString('en-IN'))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setPopupDismissed(true);
      setPopup(null);
      onNavigate(n.navTarget || 'anomaly');
    },
    style: {
      background: '#EF4444',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      cursor: 'pointer',
      fontSize: '10px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700,
      padding: '5px 10px',
      flexShrink: 0,
      alignSelf: 'center'
    }
  }, "View \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 16px',
      background: '#FFF5F5',
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setPopupDismissed(true);
      setPopup(null);
      setNotifOpen(true);
    },
    style: {
      flex: 1,
      padding: '8px',
      background: 'white',
      border: '1.5px solid #EF4444',
      borderRadius: '8px',
      fontSize: '11px',
      color: '#EF4444',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700
    }
  }, "View All Notifications"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setPopupDismissed(true);
      setPopup(null);
    },
    style: {
      padding: '8px 14px',
      background: '#F1F5F9',
      border: 'none',
      borderRadius: '8px',
      fontSize: '11px',
      color: '#64748B',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, "Dismiss")))));
};

// ─── SCREEN MAP ───────────────────────────────────────────────────────────────

const SCREEN_MAP = {
  'dashboard': (nav, back, roleKey, ctx) => React.createElement(DashboardScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'ap-hub': (nav, back, roleKey, ctx) => React.createElement(APHubScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'ap-match': (nav, back, roleKey, ctx) => React.createElement(APMatchScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back,
    invoice: ctx?.invoice || ctx
  }),
  'expenses': (nav, back, roleKey, ctx) => React.createElement(ExpensesScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'budget': (nav, back, roleKey, ctx) => React.createElement(BudgetScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'guardrails': (nav, back, roleKey, ctx) => React.createElement(GuardrailsScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'anomaly': (nav, back, roleKey, ctx) => React.createElement(AnomalyScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'ai-hub': (nav, back, roleKey, ctx) => React.createElement(AIHubScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'vendors': (nav, back, roleKey, ctx) => React.createElement(VendorsScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'audit': (nav, back, roleKey, ctx) => React.createElement(AuditScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back,
    initialFilter: ctx?.filter
  }),
  'settings': (nav, back, roleKey, ctx) => React.createElement(SettingsScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'vendor-portal': (nav, back, roleKey, ctx) => React.createElement(VendorPortalScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'fm-home': (nav, back, roleKey, ctx, usr) => React.createElement(FinanceManagerDashboard, {
    role: roleKey,
    onNavigate: nav,
    onBack: back,
    user: usr
  }),
  'clerk-home': (nav, back, roleKey, ctx, usr) => React.createElement(APClerkDashboard, {
    role: roleKey,
    onNavigate: nav,
    onBack: back,
    user: usr
  }),
  'emp-home': (nav, back, roleKey, ctx, usr) => React.createElement(EmployeeDashboard, {
    role: roleKey,
    onNavigate: nav,
    onBack: back,
    user: usr
  }),
  'iam': (nav, back, roleKey, ctx) => React.createElement(IAMScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'ar': (nav, back, roleKey, ctx) => React.createElement(ARScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'ar-raise': (nav, back, roleKey, ctx) => React.createElement(ARLiveRaiseScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'ar-customer': (nav, back, roleKey, ctx) => React.createElement(ARLiveCustomerScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'reports': (nav, back, roleKey, ctx) => React.createElement(LiveReportsScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  // ── New AI Finance Automation Screens ──
  'spend-analytics': (nav, back, roleKey, ctx) => React.createElement(SpendAnalyticsScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'working-capital': (nav, back, roleKey, ctx) => React.createElement(WorkingCapitalScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'vendor-risk': (nav, back, roleKey, ctx) => React.createElement(VendorRiskScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'gst-recon': (nav, back, roleKey, ctx) => React.createElement(GSTReconScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'tds-compliance': (nav, back, roleKey, ctx) => React.createElement(TDSComplianceScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'policy-compliance': (nav, back, roleKey, ctx) => React.createElement(PolicyComplianceScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'dept-variance': (nav, back, roleKey, ctx) => React.createElement(DeptVarianceScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  }),
  'po-match': (nav, back, roleKey, ctx) => React.createElement(POMatchScreen, {
    role: roleKey,
    onNavigate: nav,
    onBack: back
  })
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

const App = () => {
  const [authed, setAuthed] = React.useState(null);
  const [roleKey, setRoleKey] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [screen, setScreen] = React.useState('dashboard');
  const [screenCtx, setScreenCtx] = React.useState(null);
  const [navHistory, setNavHistory] = React.useState([]); // back-button stack

  // ── helpers ────────────────────────────────────────────────────
  const buildUser = userData => ({
    name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
    initials: ((userData.first_name?.[0] || '') + (userData.last_name?.[0] || '')).toUpperCase() || userData.username.slice(0, 2).toUpperCase(),
    employee_grade: userData.employee_grade || 1,
    is_superuser: userData.is_superuser || false,
    department: userData.department_name || '',
    id: userData.id,
    username: userData.username
  });
  const applySession = userData => {
    const isVendor = !!userData.is_vendor;
    const key = gradeToRoleKey(userData.employee_grade, userData.is_superuser, isVendor, userData.username, userData.department_name);
    const built = buildUser(userData);
    setRoleKey(key);
    setUser(built);

    // Persist for fast restore on next load
    localStorage.setItem('tj_authed', '1');
    localStorage.setItem('tj_user', JSON.stringify(built));
    return key;
  };

  // ── Token verify on page load ───────────────────────────────────
  React.useEffect(() => {
    const {
      Auth,
      AuthAPI
    } = window.TijoriAPI;
    const token = Auth.getAccess();
    if (!token) {
      Auth.clear();
      setAuthed(false);
      return;
    }
    AuthAPI.me().then(userData => {
      const key = applySession(userData);
      const validScreens = [...(ROLE_CONFIG[key]?.nav || []), 'ap-match', 'ar-raise', 'ar-customer'];
      const saved = localStorage.getItem('tj_screen');
      const home = ROLE_CONFIG[key]?.homeScreen || 'dashboard';
      setScreen(saved && validScreens.includes(saved) ? saved : home);
      setAuthed(true);
    }).catch(() => {
      Auth.clear();
      setAuthed(false);
    });
  }, []);

  // ── External navigate events (fired by child screens) ──────────
  React.useEffect(() => {
    const handler = e => navigate(e.detail?.screen || e.detail, e.detail?.ctx);
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  // ── Profile update events (fired by Settings screen) ─────────────
  React.useEffect(() => {
    const handler = e => {
      if (!e.detail) return;
      const built = buildUser(e.detail);
      setUser(built);
      localStorage.setItem('tj_user', JSON.stringify(built));
    };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, []);
  const navigate = (s, ctx) => {
    setNavHistory(prev => [...prev.slice(-19), screen]); // keep last 20
    setScreen(s);
    setScreenCtx(ctx || null);
    localStorage.setItem('tj_screen', s);
  };
  const back = () => {
    if (navHistory.length === 0) return;
    const prev = navHistory[navHistory.length - 1];
    setNavHistory(h => h.slice(0, -1));
    setScreen(prev);
    setScreenCtx(null);
    localStorage.setItem('tj_screen', prev);
  };
  const handleLogout = () => {
    window.TijoriAPI.Auth.clear();
    setAuthed(false);
    setRoleKey(null);
    setUser(null);
    setScreen('dashboard');
    setScreenCtx(null);
  };

  // ── Login success ───────────────────────────────────────────────
  const handleLogin = userData => {
    // ✅ Login.jsx now calls onLogin(rawUserObject) — not a role string
    const key = applySession(userData);
    const home = ROLE_CONFIG[key]?.homeScreen || 'dashboard';
    setScreen(home);
    localStorage.setItem('tj_screen', home);
    setAuthed(true);
  };

  // ── Loading state ───────────────────────────────────────────────
  if (authed === null) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A',
        flexDirection: 'column',
        gap: '16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 24px rgba(232,120,59,0.5)'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "20",
      viewBox: "0 0 16 16",
      fill: "none"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z",
      stroke: "white",
      strokeWidth: "1.5",
      fill: "none"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z",
      fill: "white",
      opacity: "0.8"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 20,
        height: 20,
        border: '2px solid rgba(255,255,255,0.2)',
        borderTopColor: '#E8783B',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }
    }));
  }

  // ── Not authed — show login ─────────────────────────────────────
  if (!authed) {
    return /*#__PURE__*/React.createElement(LoginScreen, {
      onLogin: handleLogin
    });
  }

  // ── Authed — render app ─────────────────────────────────────────
  const screenFn = SCREEN_MAP[screen] || SCREEN_MAP['dashboard'];
  return /*#__PURE__*/React.createElement(AppShell, {
    roleKey: roleKey,
    screen: screen,
    onNavigate: navigate,
    onBack: back,
    canGoBack: navHistory.length > 0,
    onLogout: handleLogout,
    user: user
  }, /*#__PURE__*/React.createElement("div", {
    key: `${roleKey}-${screen}`,
    style: {
      animation: 'fadeIn 220ms ease'
    }
  }, screenFn(navigate, navHistory.length > 0 ? back : null, roleKey, screenCtx, user)));
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));