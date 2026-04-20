// Tijori AI — Design System Components

const DS_COLORS = {
  orange: '#E8783B', orangeHot: '#FF6B35',
  slate950: '#020617', slate900: '#0F172A', slate800: '#1E293B',
  slate700: '#334155', slate600: '#475569', slate500: '#64748B',
  slate400: '#94A3B8', slate300: '#CBD5E1',
  warmWhite: '#FAFAF8', cardWhite: '#FFFFFF', cardSubtle: '#F8F7F5',
  green: '#10B981', amber: '#F59E0B', red: '#EF4444', purple: '#8B5CF6',
};

const Btn = ({ variant = 'primary', children, onClick, icon, small, pill, style: extraStyle, disabled }) => {
  const [hov, setHov] = React.useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    borderRadius: pill ? '999px' : '10px',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
    fontSize: small ? '12px' : '13px',
    padding: small ? '6px 12px' : '9px 18px',
    cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
    transition: 'all 150ms ease', position: 'relative', overflow: 'hidden',
    opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', letterSpacing: '-0.1px',
  };
  const variants = {
    primary: { background: 'linear-gradient(135deg, #E8783B, #FF6B35)', color: 'white', boxShadow: hov ? '0 4px 16px rgba(232,120,59,0.4)' : 'none', transform: hov ? 'translateY(-1px)' : 'none' },
    secondary: { background: 'white', color: '#1E293B', border: '1.5px solid #E2E8F0', background: hov ? '#FFF8F5' : 'white' },
    destructive: { background: '#FEE2E2', color: '#DC2626' },
    ghost: { background: 'transparent', color: '#E8783B' },
    dark: { background: '#0F172A', color: 'white', transform: hov ? 'translateY(-1px)' : 'none', boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.3)' : 'none' },
    green: { background: '#D1FAE5', color: '#065F46' },
    purple: { background: '#EDE9FE', color: '#5B21B6' },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...extraStyle }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={disabled ? undefined : onClick}>
      {variant === 'primary' && hov && (
        <span style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer 1s ease-in-out' }} />
      )}
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
};

const StatusBadge = ({ status }) => {
  const cfgs = {
    PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
    PENDING_L1: { bg: '#FEF3C7', color: '#92400E', label: 'Pending L1' },
    PENDING_L2: { bg: '#FEF3C7', color: '#92400E', label: 'Pending L2' },
    PENDING_HOD: { bg: '#FEF3C7', color: '#92400E', label: 'Pending HOD' },
    PENDING_CFO: { bg: '#FEF3C7', color: '#92400E', label: 'Pending CFO' },
    APPROVED: { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
    PAID: { bg: '#D1FAE5', color: '#065F46', label: 'Paid' },
    REJECTED: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
    QUERY_RAISED: { bg: '#EDE9FE', color: '#5B21B6', label: 'Query Raised' },
    ANOMALY: { bg: '#FEE2E2', color: '#991B1B', label: 'Anomaly' },
    FRAUD: { bg: '#FEE2E2', color: '#991B1B', label: 'Fraud' },
    ACTIVE: { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
    SUSPENDED: { bg: '#FEE2E2', color: '#991B1B', label: 'Suspended' },
    BLACKLISTED: { bg: '#1E293B', color: '#F1F5F9', label: 'Blacklisted' },
    PROCESSING: { bg: '#FFF7ED', color: '#C2410C', label: 'Processing' },
    IN_PROGRESS: { bg: '#FFF7ED', color: '#C2410C', label: 'In Progress' },
    LIVE: { bg: '#D1FAE5', color: '#065F46', label: 'Live' },
    MOCK: { bg: '#FEF3C7', color: '#92400E', label: 'Mock' },
  };
  const cfg = cfgs[status] || { bg: '#F1F5F9', color: '#475569', label: status };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase', display: 'inline-block' }}>
      {cfg.label}
    </span>
  );
};

const KPICard = ({ label, value, delta, deltaType = 'neutral', sublabel, color, pulse }) => {
  const [hov, setHov] = React.useState(false);
  const dc = { positive: { bg: '#D1FAE5', color: '#065F46' }, negative: { bg: '#FEE2E2', color: '#991B1B' }, neutral: { bg: '#FEF3C7', color: '#92400E' } }[deltaType];
  // mini sparkline data
  const pts = [30, 45, 35, 55, 48, 62, 58, 70, 65, 80];
  const w = 80, h = 28;
  const max = Math.max(...pts), min = Math.min(...pts);
  const x = (i) => (i / (pts.length - 1)) * w;
  const y = (v) => h - ((v - min) / (max - min)) * h;
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'white', borderRadius: '16px', padding: '22px 24px 18px', boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.10)' : '0 2px 12px rgba(0,0,0,0.06)', flex: 1, minWidth: 0, transition: 'all 200ms ease', transform: hov ? 'translateY(-2px)' : 'none', cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>{label}</div>
        {pulse && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'block', animation: 'dotPulse 2s ease infinite' }} />}
      </div>
      <div style={{ fontSize: '44px', fontWeight: 800, fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-2px', color: color || '#0F172A', lineHeight: 1.05, marginBottom: '10px' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {delta && <span style={{ background: dc.bg, color: dc.color, padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{delta}</span>}
          {sublabel && <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{sublabel}</span>}
        </div>
        <svg width={w} height={h} style={{ flexShrink: 0 }}>
          <path d={path} fill="none" stroke="#E8783B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        </svg>
      </div>
    </div>
  );
};

const TjModal = ({ open, onClose, title, children, accentColor = '#0F172A', width = 480 }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 200ms ease' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', width, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', animation: 'slideUp 300ms cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F0EE', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '18px', fontWeight: 700, color: accentColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
};

const SidePanel = ({ open, onClose, title, children, width = 440 }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1, background: 'rgba(2,6,23,0.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{ width, background: 'white', height: '100%', overflow: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', animation: 'slideInRight 300ms cubic-bezier(0.34,1.56,0.64,1)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F0EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', position: 'sticky', top: 0, zIndex: 1 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{title}</div>
          <button onClick={onClose} style={{ background: '#F8F7F5', border: 'none', cursor: 'pointer', color: '#475569', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
};

const AIBadge = ({ small }) => (
  <span style={{ background: 'linear-gradient(135deg, #E8783B, #8B5CF6)', color: 'white', padding: small ? '1px 6px' : '2px 8px', borderRadius: '999px', fontSize: small ? '9px' : '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.06em' }}>AI</span>
);

const LiveDot = ({ color = '#10B981' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", color }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'block', animation: 'dotPulse 1.5s ease infinite', boxShadow: `0 0 0 2px ${color}33` }} />
    LIVE
  </span>
);

const TjInput = ({ label, placeholder, type = 'text', value, onChange, icon, rightIcon, onRightIconClick }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</div>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: focused ? '#E8783B' : '#94A3B8', fontSize: '14px' }}>{icon}</span>}
        <input type={type} placeholder={placeholder} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: '100%', padding: icon ? '10px 12px 10px 38px' : '10px 12px', border: `1.5px solid ${focused ? '#E8783B' : '#E2E8F0'}`, borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#0F172A', background: '#FAFAF8', outline: 'none', transition: 'border-color 150ms ease', boxShadow: focused ? '0 0 0 3px rgba(232,120,59,0.12)' : 'none', paddingRight: rightIcon ? '40px' : '12px' }} />
        {rightIcon && <button onClick={onRightIconClick} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '14px', display: 'flex' }}>{rightIcon}</button>}
      </div>
    </div>
  );
};

const TjTextarea = ({ label, placeholder, value, onChange, rows = 4, required }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}</div>}
      <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${focused ? '#E8783B' : '#E2E8F0'}`, borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#0F172A', background: '#FAFAF8', outline: 'none', resize: 'vertical', transition: 'border-color 150ms ease', boxShadow: focused ? '0 0 0 3px rgba(232,120,59,0.12)' : 'none' }} />
    </div>
  );
};

const SectionHeader = ({ title, subtitle, right, icon }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
    <div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '32px', fontWeight: 800, color: '#0F172A', letterSpacing: '-1.5px', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon && <span>{icon}</span>}{title}
      </h1>
      {subtitle && <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{subtitle}</div>}
    </div>
    {right && <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>{right}</div>}
  </div>
);

const Card = ({ children, style: s, onClick, hover = true }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onClick}
      style={{ background: 'white', borderRadius: '16px', boxShadow: hover && hov ? '0 8px 24px rgba(0,0,0,0.10)' : '0 2px 12px rgba(0,0,0,0.06)', transition: 'all 200ms ease', transform: hover && hov ? 'translateY(-2px)' : 'none', cursor: onClick ? 'pointer' : 'default', ...s }}>
      {children}
    </div>
  );
};

const StatsRow = ({ cards }) => (
  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
    {cards.map((c, i) => <KPICard key={i} {...c} />)}
  </div>
);

Object.assign(window, { DS_COLORS, Btn, StatusBadge, KPICard, TjModal, SidePanel, AIBadge, LiveDot, TjInput, TjTextarea, SectionHeader, Card, StatsRow });
