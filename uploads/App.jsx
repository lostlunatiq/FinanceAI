// Tijori AI — Main App with persona routing

const ROLE_CONFIG = {
  'CFO': {
    user: { name: 'Rohan Kapoor', initials: 'RK', role: 'CFO' },
    homeScreen: 'dashboard',
    nav: ['dashboard','ap-hub','ar','expenses','budget','guardrails','anomaly','audit','settings'],
  },
  'Finance Admin': {
    user: { name: 'Meera Joshi', initials: 'MJ', role: 'Finance Admin' },
    homeScreen: 'admin-home',
    nav: ['admin-home','ap-hub','ar','vendors','budget','guardrails','anomaly','iam','audit','settings'],
  },
  'Finance Manager': {
    user: { name: 'Kavitha Sharma', initials: 'KS', role: 'Finance Manager' },
    homeScreen: 'fm-home',
    nav: ['fm-home','ap-hub','ar','expenses','budget','anomaly','audit','settings'],
  },
  'AP Clerk': {
    user: { name: 'Priya Mehta', initials: 'PM', role: 'AP Clerk' },
    homeScreen: 'clerk-home',
    nav: ['clerk-home','ap-hub','expenses','audit','settings'],
  },
  'Vendor': {
    user: { name: 'TechLogistics Co.', initials: 'TL', role: 'Vendor' },
    homeScreen: 'vendor-portal',
    nav: ['vendor-portal','settings'],
  },
};

const NAV_LABELS = {
  'dashboard': { label: 'Command Center', icon: '⬡' },
  'admin-home': { label: 'Payment Control', icon: '⬡' },
  'fm-home': { label: 'Approval Pipeline', icon: '⬡' },
  'clerk-home': { label: 'My Queue', icon: '⬡' },
  'vendor-portal': { label: 'Vendor Portal', icon: '⬡' },
  'ap-hub': { label: 'Accounts Payable', icon: '◈' },
  'ar': { label: 'Accounts Receivable', icon: '◇' },
  'expenses': { label: 'Expense Management', icon: '◉' },
  'budget': { label: 'Budget Management', icon: '▣' },
  'guardrails': { label: 'Budgetary Guardrails', icon: '⬢' },
  'anomaly': { label: 'Anomaly Detection', icon: '◎' },
  'vendors': { label: 'Vendor Management', icon: '◫' },
  'iam': { label: 'Identity & Access', icon: '🔐' },
  'audit': { label: 'Audit Log', icon: '◱' },
  'settings': { label: 'Settings', icon: '◌' },
};

const NAV_BADGES = { anomaly: { count: 3, color: '#EF4444' }, 'ap-hub': { count: 7, color: '#F59E0B' } };

const SCREEN_MAP = {
  dashboard: () => React.createElement(DashboardScreen),
  'ap-hub': () => React.createElement(APHubScreen),
  expenses: () => React.createElement(ExpensesScreen),
  budget: () => React.createElement(BudgetScreen),
  guardrails: () => React.createElement(GuardrailsScreen),
  anomaly: () => React.createElement(AnomalyScreen),
  vendors: () => React.createElement(VendorsScreen),
  audit: () => React.createElement(AuditScreen),
  settings: () => React.createElement(SettingsScreen),
  'vendor-portal': () => React.createElement(VendorPortalScreen),
  'admin-home': () => React.createElement(FinanceAdminDashboard),
  'fm-home': () => React.createElement(FinanceManagerDashboard),
  'clerk-home': () => React.createElement(APClerkDashboard),
  'iam': () => React.createElement(IAMScreen),
  'ar': (nav) => React.createElement(ARScreen, { onNavigate: nav }),
  'ar-raise': (nav) => React.createElement(ARRaiseScreen, { onNavigate: nav }),
  'ar-customer': (nav) => React.createElement(ARCustomerScreen, { onNavigate: nav }),
};

const BREADCRUMBS = {
  dashboard: ['Command Center'], 'admin-home': ['Payment Control Center'],
  'fm-home': ['Approval Pipeline'], 'clerk-home': ['My Queue'],
  'ap-hub': ['Accounts Payable Hub'], expenses: ['Expense Management'],
  budget: ['Budget Management'], guardrails: ['Budgetary Controls', 'Guardrails'],
  anomaly: ['Anomaly Engine'], vendors: ['Vendor Registry'],
  audit: ['Audit Registry'], settings: ['Account Architecture'],
  'vendor-portal': ['Vendor Portal'],
  'iam': ['Identity & Access Management'],
  'ar': ['Accounts Receivable'],
  'ar-raise': ['Accounts Receivable', 'Raise Invoice'],
  'ar-customer': ['Accounts Receivable', 'Customer Detail'],
};

// ─── ROLE-AWARE SHELL ─────────────────────────────────────────────────────────

const AppShell = ({ role, screen, onNavigate, user, children }) => {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const config = ROLE_CONFIG[role] || ROLE_CONFIG['CFO'];
  const navItems = config.nav;

  const notifs = [
    { text: '3 high-confidence anomaly flags detected', time: '2m ago', dot: '#EF4444' },
    { text: 'INV-2024-091 awaiting CFO approval', time: '14m ago', dot: '#F59E0B' },
    { text: 'Engineering budget at 100% — suspension active', time: '1h ago', dot: '#EF4444' },
    { text: 'TechLogistics vendor activation approved', time: '3h ago', dot: '#10B981' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>
      {/* Sidebar */}
      <div data-sidebar style={{ width: 240, background: '#0F172A', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10, transition: 'background 300ms ease' }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, var(--orange,#E8783B), var(--orange-hot,#FF6B35))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(232,120,59,0.4)', flexShrink: 0 }}>
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

        {/* Role badge */}
        <div style={{ padding: '10px 14px', background: 'rgba(232,120,59,0.08)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange,#E8783B)', display: 'block', animation: 'dotPulse 2s ease infinite' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--orange,#E8783B)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {role} View
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 10px', overflow: 'auto' }}>
          {navItems.map(id => {
            const item = NAV_LABELS[id];
            if (!item) return null;
            const active = screen === id;
            const badge = NAV_BADGES[id];
            return (
              <button key={id} onClick={() => onNavigate(id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: active ? '#1E293B' : 'transparent', color: active ? 'white' : '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: active ? 600 : 500, fontSize: '13px', textAlign: 'left', transition: 'all 150ms ease', marginBottom: '2px', borderLeft: `3px solid ${active ? 'var(--orange,#E8783B)' : 'transparent'}` }}>
                <span style={{ fontSize: '14px', opacity: active ? 1 : 0.6, color: active ? 'var(--orange,#E8783B)' : 'inherit', fontFamily: 'monospace', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge && <span style={{ background: badge.color, color: 'white', borderRadius: '999px', fontSize: '9px', fontWeight: 700, padding: '1px 6px', flexShrink: 0 }}>{badge.count}</span>}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg, var(--orange,#E8783B), var(--orange-hot,#FF6B35))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '13px', color: 'white', flexShrink: 0 }}>{user.initials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '12px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '10px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user.role}</div>
            </div>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top header */}
        <div style={{ height: 64, background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', flexShrink: 0, zIndex: 5 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px' }}>
            <span style={{ color: '#94A3B8' }}>Tijori AI</span>
            {(BREADCRUMBS[screen] || []).map((crumb, i, arr) => (
              <React.Fragment key={i}>
                <span style={{ color: '#CBD5E1' }}>›</span>
                <span style={{ color: i === arr.length - 1 ? '#0F172A' : '#94A3B8', fontWeight: i === arr.length - 1 ? 600 : 400 }}>{crumb}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Role switcher pills in header */}
          <div style={{ display: 'flex', gap: '4px', background: '#F8F7F5', borderRadius: '10px', padding: '3px' }}>
            {Object.keys(ROLE_CONFIG).map(r => (
              <button key={r} onClick={() => {
                window.dispatchEvent(new CustomEvent('rolechange', { detail: r }));
              }}
                style={{ padding: '4px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.02em', background: role === r ? 'white' : 'transparent', color: role === r ? '#0F172A' : '#94A3B8', boxShadow: role === r ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 150ms', whiteSpace: 'nowrap' }}>
                {r}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(!notifOpen)}
                style={{ width: 36, height: 36, borderRadius: '10px', background: notifOpen ? '#FFF8F5' : '#F8F7F5', border: '1.5px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', position: 'relative' }}>
                🔔
                <span style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, background: '#EF4444', borderRadius: '50%', border: '2px solid white', fontSize: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>4</span>
              </button>
              {notifOpen && (
                <div style={{ position: 'absolute', top: 44, right: 0, width: 300, background: 'white', borderRadius: '14px', boxShadow: '0 16px 48px rgba(0,0,0,0.14)', border: '1px solid #F1F0EE', zIndex: 100 }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F0EE', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>Notifications</div>
                  {notifs.map((n, i) => (
                    <div key={i} style={{ padding: '11px 16px', borderBottom: '1px solid #F8F7F5', display: 'flex', gap: '10px', cursor: 'pointer' }}>
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
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, var(--orange,#E8783B), var(--orange-hot,#FF6B35))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '13px', color: 'white', cursor: 'pointer' }}>
              {user.initials}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--canvas,#F8FAFC)' }} onClick={() => setNotifOpen(false)}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

const App = () => {
  const [authed, setAuthed] = React.useState(() => localStorage.getItem('tj_authed') === '1');
  const [role, setRole] = React.useState(() => localStorage.getItem('tj_role') || 'CFO');
  const [screen, setScreen] = React.useState(() => {
    const saved = localStorage.getItem('tj_screen');
    return saved || ROLE_CONFIG[localStorage.getItem('tj_role') || 'CFO']?.homeScreen || 'dashboard';
  });

  // Listen for role changes from tweaks panel or header pills
  React.useEffect(() => {
    const handler = (e) => {
      const newRole = e.detail;
      setRole(newRole);
      localStorage.setItem('tj_role', newRole);
      const home = ROLE_CONFIG[newRole]?.homeScreen || 'dashboard';
      setScreen(home);
      localStorage.setItem('tj_screen', home);
      // sync tweaks panel select
      const sel = document.getElementById('role-select');
      if (sel) sel.value = newRole;
    };
    window.addEventListener('rolechange', handler);
    return () => window.removeEventListener('rolechange', handler);
  }, []);

  const navigate = (s) => {
    setScreen(s);
    localStorage.setItem('tj_screen', s);
  };

  if (!authed) return React.createElement(LoginScreen, { onLogin: () => { localStorage.setItem('tj_authed','1'); setAuthed(true); } });

  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG['CFO'];
  const user = cfg.user;
  const ScreenFn = SCREEN_MAP[screen] || SCREEN_MAP['dashboard'];

  return React.createElement(AppShell, { role, screen, onNavigate: navigate, user },
    React.createElement('div', { key: `${role}-${screen}`, style: { animation: 'fadeUp 220ms ease both' } },
      ScreenFn(navigate)
    )
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
