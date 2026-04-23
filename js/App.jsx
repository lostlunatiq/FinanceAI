// Tijori AI — Main App
// Fully dynamic — all user/role data comes from Django backend via /api/v1/auth/me/

// ─── GRADE → ROLE KEY ────────────────────────────────────────────────────────
// Maps employee_grade integer + flags → ROLE_CONFIG key
// Single source of truth — used in both token verify and login flows

const gradeToRoleKey = (grade, isSuperuser, isVendor) => {
  if (isVendor)      return 'Vendor';
  if (isSuperuser)   return 'CFO';
  if (grade >= 4)    return 'Finance Admin';
  if (grade >= 3)    return 'Finance Manager';
  if (grade >= 2)    return 'Finance Manager';  // dept head gets FM view
  return 'AP Clerk';
};

// ─── NAV CONFIG ──────────────────────────────────────────────────────────────
// Drives what each grade sees in the sidebar
// ROLE_CONFIG.user is now just a fallback — real user comes from backend

const ROLE_CONFIG = {
  'CFO': {
    homeScreen: 'dashboard',
    nav: ['dashboard','ap-hub','ar','expenses','budget','guardrails','anomaly','vendors','iam','audit','settings'],
  },
  'Finance Admin': {
    homeScreen: 'dashboard',
    nav: ['dashboard','ap-hub','ar','expenses','vendors','budget','guardrails','anomaly','iam','audit','settings'],
  },
  'Finance Manager': {
    homeScreen: 'fm-home',
    nav: ['fm-home','ap-hub','expenses','budget','guardrails','anomaly','audit','settings'],
  },
  'AP Clerk': {
    homeScreen: 'clerk-home',
    nav: ['clerk-home','ap-hub','expenses','audit','settings'],
  },
  'Employee': {
    homeScreen: 'emp-home',
    nav: ['emp-home','expenses','settings'],
  },
  'Vendor': {
    homeScreen: 'vendor-portal',
    nav: ['vendor-portal','settings'],
  },
};

const NAV_LABELS = {
  'dashboard':     { label: 'Command Center',      icon: '⬡' },
  'fm-home':       { label: 'Approval Pipeline',   icon: '⬡' },
  'clerk-home':    { label: 'My Queue',             icon: '⬡' },
  'emp-home':      { label: 'My Expenses',          icon: '⬡' },
  'vendor-portal': { label: 'Vendor Portal',        icon: '⬡' },
  'ap-hub':        { label: 'Accounts Payable',     icon: '◈' },
  'ar':            { label: 'Accounts Receivable',  icon: '◇' },
  'expenses':      { label: 'Expense Management',   icon: '◉' },
  'budget':        { label: 'Budget Management',    icon: '▣' },
  'guardrails':    { label: 'Budgetary Guardrails', icon: '⬢' },
  'anomaly':       { label: 'Anomaly Detection',    icon: '◎' },
  'vendors':       { label: 'Vendor Management',    icon: '◫' },
  'iam':           { label: 'Identity & Access',    icon: '🔐' },
  'audit':         { label: 'Audit Log',            icon: '◱' },
  'settings':      { label: 'Settings',             icon: '◌' },
};

const BREADCRUMBS = {
  'dashboard':     ['Command Center'],
  'fm-home':       ['Approval Pipeline'],
  'clerk-home':    ['My Queue'],
  'emp-home':      ['My Expenses'],
  'ap-hub':        ['Accounts Payable Hub'],
  'ap-match':      ['Accounts Payable Hub', 'Invoice Detail'],
  'expenses':      ['Expense Management'],
  'budget':        ['Budget Management'],
  'guardrails':    ['Budgetary Controls', 'Guardrails'],
  'anomaly':       ['Anomaly Engine'],
  'vendors':       ['Vendor Registry'],
  'audit':         ['Audit Registry'],
  'settings':      ['Account Architecture'],
  'vendor-portal': ['Vendor Portal'],
  'iam':           ['Identity & Access Management'],
  'ar':            ['Accounts Receivable'],
  'ar-raise':      ['Accounts Receivable', 'Raise Invoice'],
  'ar-customer':   ['Accounts Receivable', 'Customer Detail'],
};

// ─── LIVE BADGE COUNTS ────────────────────────────────────────────────────────
// Fetched from backend — not hardcoded

const useLiveBadges = () => {
  const [badges, setBadges] = React.useState({});

  React.useEffect(() => {
    const { DashboardAPI, AnomalyAPI } = window.TijoriAPI;
    Promise.allSettled([
      DashboardAPI.stats(),
      AnomalyAPI.list(),
    ]).then(([statsRes, anomalyRes]) => {
      const next = {};
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const count = statsRes.value.my_queue_count || 0;
        if (count > 0) next['ap-hub'] = { count, color: '#F59E0B' };
      }
      if (anomalyRes.status === 'fulfilled' && anomalyRes.value) {
        const high = (anomalyRes.value || []).filter(
          e => ['HIGH','CRITICAL'].includes(e.anomaly_severity)
        ).length;
        if (high > 0) next['anomaly'] = { count: high, color: '#EF4444' };
      }
      setBadges(next);
    });
  }, []);

  return badges;
};

// ─── APP SHELL ────────────────────────────────────────────────────────────────

const AppShell = ({ roleKey, screen, onNavigate, onLogout, user, children }) => {
  const [notifOpen, setNotifOpen]     = React.useState(false);
  const [notifs, setNotifs]           = React.useState([]);
  const navBadges                     = useLiveBadges();
  const config                        = ROLE_CONFIG[roleKey] || ROLE_CONFIG['AP Clerk'];
  const navItems                      = config.nav;

  // Live notifications from audit log
  React.useEffect(() => {
    window.TijoriAPI.AuditAPI.list({ limit: 4 })
      .then(data => {
        const items = (data?.results || []).map(e => ({
          text: `${e.action.replace(/\./g, ' ')} — ${e.entity_type} ${e.entity_id?.slice(0,8) || ''}`,
          time: new Date(e.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          dot:  e.action.includes('reject') ? '#EF4444'
              : e.action.includes('approv') ? '#10B981'
              : '#F59E0B',
        }));
        setNotifs(items);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 240, background: '#0F172A', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10 }}>

        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(232,120,59,0.4)', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
                <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" opacity="0.8"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '16px', color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>Tijori AI</div>
              <div style={{ fontSize: '9px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>Enterprise Finance OS</div>
            </div>
          </div>
        </div>

        {/* Grade badge — live from backend */}
        <div style={{ padding: '10px 14px', background: 'rgba(232,120,59,0.08)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8783B', display: 'block', animation: 'dotPulse 2s ease infinite' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#E8783B', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {roleKey} View
            </span>
            {user.employee_grade && (
              <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 700, color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '999px' }}>
                G{user.employee_grade}
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px', overflow: 'auto' }}>
          {navItems.map(id => {
            const item   = NAV_LABELS[id];
            if (!item) return null;
            const active = screen === id || (id === 'ap-hub' && screen === 'ap-match');
            const badge  = navBadges[id];   // ✅ live from backend
            return (
              <button key={id} onClick={() => onNavigate(id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: active ? '#1E293B' : 'transparent', color: active ? 'white' : '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: active ? 600 : 500, fontSize: '13px', textAlign: 'left', transition: 'all 150ms ease', marginBottom: '2px', borderLeft: `3px solid ${active ? '#E8783B' : 'transparent'}` }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#1E293B44'; e.currentTarget.style.color = '#CBD5E1'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}}>
                <span style={{ fontSize: '14px', opacity: active ? 1 : 0.6, color: active ? '#E8783B' : 'inherit', fontFamily: 'monospace', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge && (
                  <span style={{ background: badge.color, color: 'white', borderRadius: '999px', fontSize: '9px', fontWeight: 700, padding: '1px 6px', flexShrink: 0 }}>
                    {badge.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User card + logout */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '13px', color: 'white', flexShrink: 0 }}>
              {user.initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '12px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '10px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {user.department || roleKey}   {/* ✅ real department from backend */}
              </div>
            </div>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }} />
          </div>
          <button onClick={onLogout}
            style={{ width: '100%', padding: '8px 0', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '12px', transition: 'all 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#FCA5A5'; }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ height: 64, background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', flexShrink: 0, zIndex: 5 }}>
          {/* Breadcrumb */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px' }}>
            <span style={{ color: '#94A3B8' }}>Tijori AI</span>
            {(BREADCRUMBS[screen] || []).map((crumb, i, arr) => (
              <React.Fragment key={i}>
                <span style={{ color: '#CBD5E1' }}>›</span>
                <span style={{ color: i === arr.length - 1 ? '#0F172A' : '#94A3B8', fontWeight: i === arr.length - 1 ? 600 : 400 }}>{crumb}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setNotifOpen(!notifOpen)}
              style={{ width: 36, height: 36, borderRadius: '10px', background: notifOpen ? '#FFF8F5' : '#F8F7F5', border: '1.5px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', position: 'relative' }}>
              🔔
              {notifs.length > 0 && (
                <span style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, background: '#EF4444', borderRadius: '50%', border: '2px solid white', fontSize: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {notifs.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div style={{ position: 'absolute', top: 44, right: 0, width: 300, background: 'white', borderRadius: '14px', boxShadow: '0 16px 48px rgba(0,0,0,0.14)', border: '1px solid #F1F0EE', zIndex: 100 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F0EE', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#0F172A', display: 'flex', justifyContent: 'space-between' }}>
                  Recent Activity
                  <span style={{ fontSize: '11px', color: '#E8783B', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }} onClick={() => setNotifOpen(false)}>Dismiss</span>
                </div>
                {notifs.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No recent activity</div>
                ) : notifs.map((n, i) => (
                  <div key={i} style={{ padding: '11px 16px', borderBottom: '1px solid #F8F7F5', display: 'flex', gap: '10px', cursor: 'pointer', transition: 'background 150ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.dot, marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '12px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, lineHeight: 1.4 }}>{n.text}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: 2, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avatar — real initials from backend */}
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '13px', color: 'white', cursor: 'pointer' }}
            title={`${user.name} · G${user.employee_grade}`}>
            {user.initials}
          </div>
        </div>

        {/* Page */}
        <div style={{ flex: 1, overflow: 'auto', background: '#F8FAFC' }} onClick={() => setNotifOpen(false)}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── SCREEN MAP ───────────────────────────────────────────────────────────────

const SCREEN_MAP = {
  'dashboard':     (nav, roleKey, ctx) => React.createElement(DashboardScreen,         { role: roleKey, onNavigate: nav }),
  'ap-hub':        (nav, roleKey, ctx) => React.createElement(APHubScreen,             { role: roleKey, onNavigate: nav }),
  'ap-match':      (nav, roleKey, ctx) => React.createElement(APMatchScreen,           { role: roleKey, onNavigate: nav, invoice: ctx }),
  'expenses':      (nav, roleKey, ctx) => React.createElement(ExpensesScreen,          { role: roleKey }),
  'budget':        (nav, roleKey, ctx) => React.createElement(BudgetScreen,            {}),
  'guardrails':    (nav, roleKey, ctx) => React.createElement(GuardrailsScreen,        {}),
  'anomaly':       (nav, roleKey, ctx) => React.createElement(AnomalyScreen,           {}),
  'ai-hub':        (nav, roleKey, ctx) => React.createElement(AIHubScreen,             {}),
  'vendors':       (nav, roleKey, ctx) => React.createElement(VendorsScreen,           {}),
  'audit':         (nav, roleKey, ctx) => React.createElement(AuditScreen,             {}),
  'settings':      (nav, roleKey, ctx) => React.createElement(SettingsScreen,          { role: roleKey }),
  'vendor-portal': (nav, roleKey, ctx) => React.createElement(VendorPortalScreen,      {}),
  'fm-home':       (nav, roleKey, ctx) => React.createElement(FinanceManagerDashboard, {}),
  'clerk-home':    (nav, roleKey, ctx) => React.createElement(APClerkDashboard,        {}),
  'emp-home':      (nav, roleKey, ctx) => React.createElement(EmployeeDashboard,       { onNavigate: nav }),
  'iam':           (nav, roleKey, ctx) => React.createElement(IAMScreen,               {}),
  'ar':            (nav, roleKey, ctx) => React.createElement(ARScreen,                { onNavigate: nav }),
  'ar-raise':      (nav, roleKey, ctx) => React.createElement(ARRaiseScreen,           { onNavigate: nav }),
  'ar-customer':   (nav, roleKey, ctx) => React.createElement(ARCustomerScreen,        { onNavigate: nav }),
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

const App = () => {
  const [authed,    setAuthed]    = React.useState(null);   // null=loading, false=logged out, true=in
  const [roleKey,   setRoleKey]   = React.useState(null);   // ✅ derived from backend grade
  const [user,      setUser]      = React.useState(null);   // ✅ real user object from /me/
  const [screen,    setScreen]    = React.useState('dashboard');
  const [screenCtx, setScreenCtx] = React.useState(null);

  // ── helpers ────────────────────────────────────────────────────
  const buildUser = (userData) => ({
    name:           `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
    initials:       ((userData.first_name?.[0] || '') + (userData.last_name?.[0] || '')).toUpperCase()
                      || userData.username.slice(0, 2).toUpperCase(),
    employee_grade: userData.employee_grade || 1,
    is_superuser:   userData.is_superuser || false,
    department:     userData.department_name || '',
    id:             userData.id,
    username:       userData.username,
  });

  const applySession = (userData) => {
    const isVendor = !!userData.vendor_profile;
    const key      = gradeToRoleKey(userData.employee_grade, userData.is_superuser, isVendor);
    const built    = buildUser(userData);

    setRoleKey(key);
    setUser(built);

    // Persist for fast restore on next load
    localStorage.setItem('tj_authed', '1');
    localStorage.setItem('tj_user', JSON.stringify(built));

    return key;
  };

  // ── Token verify on page load ───────────────────────────────────
  React.useEffect(() => {
    const { Auth, AuthAPI } = window.TijoriAPI;
    const token = Auth.getAccess();

    if (!token) {
      Auth.clear();
      setAuthed(false);
      return;
    }

    AuthAPI.me()
      .then(userData => {
        const key          = applySession(userData);
        const validScreens = [...(ROLE_CONFIG[key]?.nav || []), 'ap-match', 'ar-raise', 'ar-customer'];
        const saved        = localStorage.getItem('tj_screen');
        const home         = ROLE_CONFIG[key]?.homeScreen || 'dashboard';

        setScreen((saved && validScreens.includes(saved)) ? saved : home);
        setAuthed(true);
      })
      .catch(() => {
        Auth.clear();
        setAuthed(false);
      });
  }, []);

  // ── External navigate events (fired by child screens) ──────────
  React.useEffect(() => {
    const handler = (e) => navigate(e.detail?.screen || e.detail, e.detail?.ctx);
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  const navigate = (s, ctx) => {
    setScreen(s);
    setScreenCtx(ctx || null);
    localStorage.setItem('tj_screen', s);
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
  const handleLogin = (userData) => {
    // ✅ Login.jsx now calls onLogin(rawUserObject) — not a role string
    const key  = applySession(userData);
    const home = ROLE_CONFIG[key]?.homeScreen || 'dashboard';
    setScreen(home);
    localStorage.setItem('tj_screen', home);
    setAuthed(true);
  };

  // ── Loading state ───────────────────────────────────────────────
  if (authed === null) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(232,120,59,0.5)' }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" opacity="0.8"/>
          </svg>
        </div>
        <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // ── Not authed — show login ─────────────────────────────────────
  if (!authed) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ── Authed — render app ─────────────────────────────────────────
  const screenFn = SCREEN_MAP[screen] || SCREEN_MAP['dashboard'];

  return (
    <AppShell roleKey={roleKey} screen={screen} onNavigate={navigate} onLogout={handleLogout} user={user}>
      <div key={`${roleKey}-${screen}`} style={{ animation: 'fadeUp 220ms ease both' }}>
        {screenFn(navigate, roleKey, screenCtx)}
      </div>
    </AppShell>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
