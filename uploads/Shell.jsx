// Tijori AI — Navigation Shell

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Center', icon: '⬡' },
  { id: 'ap-hub', label: 'Accounts Payable', icon: '◈' },
  { id: 'expenses', label: 'Expense Management', icon: '◉' },
  { id: 'budget', label: 'Budget Management', icon: '▣' },
  { id: 'guardrails', label: 'Budgetary Guardrails', icon: '⬢' },
  { id: 'anomaly', label: 'Anomaly Detection', icon: '◎' },
  { id: 'vendors', label: 'Vendor Management', icon: '◫' },
  { id: 'audit', label: 'Audit Log', icon: '◱' },
  { id: 'settings', label: 'Settings', icon: '◌' },
];

const BREADCRUMBS = {
  dashboard: ['Command Center'],
  'ap-hub': ['Accounts Payable Hub'],
  expenses: ['Expense Management'],
  budget: ['Budget Management'],
  guardrails: ['Budgetary Controls', 'Guardrails'],
  anomaly: ['Anomaly Engine'],
  vendors: ['Vendor Registry'],
  audit: ['Audit Registry'],
  settings: ['Account Architecture'],
};

const Shell = ({ current, onChange, children, user }) => {
  const [notifOpen, setNotifOpen] = React.useState(false);

  const notifs = [
    { id: 1, type: 'anomaly', text: '3 high-confidence anomaly flags detected', time: '2m ago', dot: '#EF4444' },
    { id: 2, type: 'approval', text: 'INV-2024-091 awaiting CFO approval', time: '14m ago', dot: '#F59E0B' },
    { id: 3, type: 'budget', text: 'Engineering budget at 100% — suspension active', time: '1h ago', dot: '#EF4444' },
    { id: 4, type: 'vendor', text: 'TechLogistics vendor activation approved', time: '3h ago', dot: '#10B981' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#FAFAF8' }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: '#020617', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10 }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', boxShadow: '0 0 16px rgba(232,120,59,0.4)' }}>
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

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflow: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = current === item.id;
            return (
              <button key={item.id} onClick={() => onChange(item.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: active ? '#1E293B' : 'transparent', color: active ? 'white' : '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: active ? 600 : 500, fontSize: '13px', textAlign: 'left', transition: 'all 150ms ease', marginBottom: '2px', borderLeft: `3px solid ${active ? '#E8783B' : 'transparent'}` }}>
                <span style={{ fontSize: '14px', opacity: active ? 1 : 0.6, color: active ? '#E8783B' : 'inherit', fontFamily: 'monospace' }}>{item.icon}</span>
                {item.label}
                {item.id === 'anomaly' && <span style={{ marginLeft: 'auto', background: '#EF4444', color: 'white', borderRadius: '999px', fontSize: '9px', fontWeight: 700, padding: '1px 6px' }}>3</span>}
                {item.id === 'ap-hub' && <span style={{ marginLeft: 'auto', background: '#F59E0B', color: 'white', borderRadius: '999px', fontSize: '9px', fontWeight: 700, padding: '1px 6px' }}>7</span>}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '13px', color: 'white', flexShrink: 0 }}>
              {user?.initials || 'RK'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '12px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Rohan Kapoor'}</div>
              <div style={{ fontSize: '10px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user?.role || 'CFO'}</div>
            </div>
            <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top header */}
        <div style={{ height: 64, background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', flexShrink: 0, zIndex: 5 }}>
          {/* Breadcrumb */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px' }}>
            <span style={{ color: '#94A3B8' }}>Tijori AI</span>
            {(BREADCRUMBS[current] || []).map((crumb, i, arr) => (
              <React.Fragment key={i}>
                <span style={{ color: '#CBD5E1' }}>›</span>
                <span style={{ color: i === arr.length - 1 ? '#0F172A' : '#94A3B8', fontWeight: i === arr.length - 1 ? 600 : 400 }}>{crumb}</span>
              </React.Fragment>
            ))}
          </div>
          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(!notifOpen)}
                style={{ width: 36, height: 36, borderRadius: '10px', background: notifOpen ? '#FFF8F5' : '#F8F7F5', border: '1.5px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', position: 'relative' }}>
                🔔
                <span style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, background: '#EF4444', borderRadius: '50%', border: '2px solid white', fontSize: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>4</span>
              </button>
              {notifOpen && (
                <div style={{ position: 'absolute', top: '44px', right: 0, width: 320, background: 'white', borderRadius: '14px', boxShadow: '0 16px 48px rgba(0,0,0,0.16)', border: '1px solid #F1F0EE', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F0EE', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '14px', color: '#0F172A', display: 'flex', justifyContent: 'space-between' }}>
                    Notifications
                    <span style={{ fontSize: '11px', color: '#E8783B', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>Mark all read</span>
                  </div>
                  {notifs.map(n => (
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F8F7F5', display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', transition: 'background 150ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.dot, marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, lineHeight: 1.4 }}>{n.text}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #E8783B, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '13px', color: 'white', cursor: 'pointer' }}>
              RK
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto' }} onClick={() => setNotifOpen(false)}>
          {children}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Shell });
