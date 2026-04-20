// Tijori AI — IAM: Identity & Access Management

const IAM_USERS = [
  { id: 1, name: 'Rohan Kapoor', email: 'rohan.kapoor@acmecorp.in', role: 'CFO', dept: 'Finance', groups: ['Finance Leadership', 'CFO Access'], lastLogin: '2m ago', status: 'ACTIVE', initials: 'RK' },
  { id: 2, name: 'Meera Joshi', email: 'meera.joshi@acmecorp.in', role: 'Finance Admin', dept: 'Finance', groups: ['Finance Admin', 'Full Access'], lastLogin: '1h ago', status: 'ACTIVE', initials: 'MJ' },
  { id: 3, name: 'Kavitha Sharma', email: 'kavitha.sharma@acmecorp.in', role: 'Finance Manager', dept: 'Finance', groups: ['Finance Managers'], lastLogin: '3h ago', status: 'ACTIVE', initials: 'KS' },
  { id: 4, name: 'Priya Mehta', email: 'priya.mehta@acmecorp.in', role: 'AP Clerk', dept: 'Finance', groups: ['AP Team'], lastLogin: 'Yesterday', status: 'ACTIVE', initials: 'PM' },
  { id: 5, name: 'Aisha Nair', email: 'aisha.nair@acmecorp.in', role: 'Employee', dept: 'Engineering', groups: ['All Employees'], lastLogin: '2d ago', status: 'ACTIVE', initials: 'AN' },
  { id: 6, name: 'Dev Kapoor', email: 'dev.kapoor@acmecorp.in', role: 'Dept Head', dept: 'Engineering', groups: ['Dept Heads', 'Engineering'], lastLogin: '1d ago', status: 'ACTIVE', initials: 'DK' },
  { id: 7, name: 'Sanjay Patel', email: 'sanjay.patel@acmecorp.in', role: 'Employee', dept: 'Marketing', groups: ['All Employees'], lastLogin: 'Never', status: 'PENDING', initials: 'SP' },
  { id: 8, name: 'Ritu Verma', email: 'ritu.verma@acmecorp.in', role: 'Finance Manager', dept: 'Operations', groups: ['Finance Managers'], lastLogin: '5d ago', status: 'SUSPENDED', initials: 'RV' },
];

const IAM_GROUPS = [
  { id: 1, name: 'Finance Leadership', desc: 'CFO and senior finance stakeholders with full AP/AR visibility', members: 2, policies: 3, color: '#E8783B' },
  { id: 2, name: 'Finance Admin', desc: 'Full administrative access including IAM, vendors, and payments', members: 1, policies: 4, color: '#EF4444' },
  { id: 3, name: 'Finance Managers', desc: 'Mid-level approval authority and budget oversight', members: 2, policies: 3, color: '#3B82F6' },
  { id: 4, name: 'AP Team', desc: 'Accounts payable clerks — queue processing and vendor queries', members: 3, policies: 2, color: '#10B981' },
  { id: 5, name: 'Dept Heads', desc: 'HOD-level approvals and department budget visibility', members: 4, policies: 2, color: '#8B5CF6' },
  { id: 6, name: 'All Employees', desc: 'Base group for all staff — expense submission only', members: 48, policies: 1, color: '#94A3B8' },
];

const SYSTEM_POLICIES = [
  { id: 'p1', name: 'Vendor Self-Service', desc: 'View own invoices, submit new invoices', locked: true, groups: 1,
    perms: { Invoices: { View: true, Create: true, Approve: false, Reject: false, Export: false, Admin: false }, Expenses: { View: false, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Budgets: { View: false, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Vendors: { View: false, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Reports: { View: false, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, IAM: { View: false, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Settings: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false } }
  },
  { id: 'p2', name: 'AP Clerk', desc: 'View all invoices, process queue, query vendors', locked: true, groups: 1,
    perms: { Invoices: { View: true, Create: true, Approve: false, Reject: false, Export: true, Admin: false }, Expenses: { View: true, Create: true, Approve: false, Reject: false, Export: false, Admin: false }, Budgets: { View: false, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Vendors: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Reports: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, IAM: { View: false, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Settings: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false } }
  },
  { id: 'p3', name: 'Approver L1', desc: 'Approve/reject + assign department to invoices', locked: true, groups: 2,
    perms: { Invoices: { View: true, Create: false, Approve: true, Reject: true, Export: false, Admin: false }, Expenses: { View: true, Create: false, Approve: true, Reject: true, Export: false, Admin: false }, Budgets: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Vendors: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Reports: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, IAM: { View: false, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Settings: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false } }
  },
  { id: 'p4', name: 'Finance Manager', desc: 'Approve + view budgets + generate reports', locked: true, groups: 2,
    perms: { Invoices: { View: true, Create: false, Approve: true, Reject: true, Export: true, Admin: false }, Expenses: { View: true, Create: true, Approve: true, Reject: true, Export: true, Admin: false }, Budgets: { View: true, Create: true, Approve: false, Reject: false, Export: true, Admin: false }, Vendors: { View: true, Create: false, Approve: false, Reject: false, Export: true, Admin: false }, Reports: { View: true, Create: true, Approve: false, Reject: false, Export: true, Admin: false }, IAM: { View: false, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Settings: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false } }
  },
  { id: 'p5', name: 'CFO', desc: 'All approval actions + full CFO dashboard', locked: true, groups: 1,
    perms: { Invoices: { View: true, Create: false, Approve: true, Reject: true, Export: true, Admin: false }, Expenses: { View: true, Create: false, Approve: true, Reject: true, Export: true, Admin: false }, Budgets: { View: true, Create: true, Approve: true, Reject: false, Export: true, Admin: false }, Vendors: { View: true, Create: false, Approve: true, Reject: true, Export: true, Admin: false }, Reports: { View: true, Create: true, Approve: false, Reject: false, Export: true, Admin: true }, IAM: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false }, Settings: { View: true, Create: false, Approve: false, Reject: false, Export: false, Admin: false } }
  },
  { id: 'p6', name: 'Finance Admin', desc: 'Full access — IAM, vendors, payments, audit', locked: true, groups: 2,
    perms: { Invoices: { View: true, Create: true, Approve: true, Reject: true, Export: true, Admin: true }, Expenses: { View: true, Create: true, Approve: true, Reject: true, Export: true, Admin: true }, Budgets: { View: true, Create: true, Approve: true, Reject: true, Export: true, Admin: true }, Vendors: { View: true, Create: true, Approve: true, Reject: true, Export: true, Admin: true }, Reports: { View: true, Create: true, Approve: true, Reject: true, Export: true, Admin: true }, IAM: { View: true, Create: true, Approve: true, Reject: true, Export: true, Admin: true }, Settings: { View: true, Create: true, Approve: true, Reject: true, Export: true, Admin: true } }
  },
];

const ROLE_COLORS = { CFO: '#1E293B', 'Finance Admin': '#E8783B', 'Finance Manager': '#3B82F6', 'Dept Head': '#8B5CF6', Employee: '#10B981', Vendor: '#F59E0B', 'AP Clerk': '#06B6D4' };

const PermMatrix = ({ perms, editable = false, onChange }) => {
  const resources = Object.keys(perms);
  const actions = ['View', 'Create', 'Approve', 'Reject', 'Export', 'Admin'];
  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 120, background: '#F8F7F5', borderRadius: '8px 0 0 0' }}>Resource</th>
            {actions.map(a => (
              <th key={a} style={{ padding: '8px 10px', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8F7F5' }}>{a}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((res, ri) => (
            <tr key={res} style={{ borderTop: '1px solid #F1F0EE' }}>
              <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: '12px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{res}</td>
              {actions.map(act => {
                const val = perms[res]?.[act];
                return (
                  <td key={act} style={{ padding: '10px', textAlign: 'center' }}>
                    {editable ? (
                      <input type="checkbox" checked={!!val} onChange={() => onChange && onChange(res, act, !val)}
                        style={{ accentColor: '#E8783B', cursor: 'pointer', width: 14, height: 14 }} />
                    ) : val === true ? (
                      <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: '#D1FAE5', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>✓</span>
                    ) : val === false ? (
                      <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: '#FEE2E2', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>✕</span>
                    ) : (
                      <span style={{ color: '#E2E8F0', fontSize: '14px' }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const IAMScreen = () => {
  const [tab, setTab] = React.useState('Users');
  const [userDetail, setUserDetail] = React.useState(null);
  const [userDetailTab, setUserDetailTab] = React.useState('Profile');
  const [policyDetail, setPolicyDetail] = React.useState(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false);
  const [createPolicyOpen, setCreatePolicyOpen] = React.useState(false);
  const [roleFilter, setRoleFilter] = React.useState('All');
  const [search, setSearch] = React.useState('');
  const [editPerms, setEditPerms] = React.useState(null);

  const filteredUsers = IAM_USERS.filter(u => {
    const mr = roleFilter === 'All' || u.role === roleFilter;
    const ms = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return mr && ms;
  });

  const statusDot = { ACTIVE: '#10B981', PENDING: '#F59E0B', SUSPENDED: '#EF4444' };

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader
        title={<span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>🔐 Identity & Access Management</span>}
        subtitle="Manage who can do what inside Tijori AI. Users · Groups · Policies."
        right={<Btn variant="primary" icon={<span>+</span>} onClick={() => setInviteOpen(true)}>Invite User</Btn>}
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid #F1F0EE', marginBottom: '24px', gap: '0' }}>
        {['Users', 'Groups', 'Policies'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: tab === t ? 700 : 500, fontSize: '14px', color: tab === t ? '#0F172A' : '#94A3B8', borderBottom: `3px solid ${tab === t ? '#E8783B' : 'transparent'}`, marginBottom: '-2px', transition: 'all 150ms' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'Users' && (
        <>
          <StatsRow cards={[
            { label: 'Total Users', value: String(IAM_USERS.length), delta: '↑ 2 this month', deltaType: 'positive' },
            { label: 'Active', value: String(IAM_USERS.filter(u => u.status === 'ACTIVE').length), delta: 'Verified', deltaType: 'positive', color: '#10B981' },
            { label: 'Invited / Pending', value: String(IAM_USERS.filter(u => u.status === 'PENDING').length), delta: 'Awaiting accept', deltaType: 'neutral', color: '#F59E0B' },
            { label: 'Suspended', value: String(IAM_USERS.filter(u => u.status === 'SUSPENDED').length), delta: 'Access revoked', deltaType: 'negative', color: '#EF4444' },
          ]} />

          {/* Search + filter */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name or email…"
                style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8' }} />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>🔍</span>
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8', color: '#0F172A', cursor: 'pointer' }}>
              <option>All</option>
              {['CFO','Finance Admin','Finance Manager','AP Clerk','Dept Head','Employee','Vendor'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8F7F5' }}>
                  {['User', 'Role', 'Department', 'Groups', 'Last Login', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid #F1F0EE', height: 56, cursor: 'pointer', transition: 'background 150ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    onClick={() => { setUserDetail(u); setUserDetailTab('Profile'); }}>
                    <td style={{ padding: '0 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '8px', background: `linear-gradient(135deg, ${ROLE_COLORS[u.role] || '#94A3B8'}, ${ROLE_COLORS[u.role] || '#94A3B8'}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '11px', color: 'white', flexShrink: 0 }}>{u.initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0 16px' }}>
                      <span style={{ background: (ROLE_COLORS[u.role] || '#94A3B8') + '22', color: ROLE_COLORS[u.role] || '#475569', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '0 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.dept}</td>
                    <td style={{ padding: '0 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {u.groups.slice(0, 2).map(g => (
                          <span key={g} style={{ background: '#EDE9FE', color: '#5B21B6', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{g}</span>
                        ))}
                        {u.groups.length > 2 && <span style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+{u.groups.length - 2}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.lastLogin}</td>
                    <td style={{ padding: '0 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot[u.status], display: 'block', animation: u.status === 'ACTIVE' ? 'none' : 'dotPulse 2s ease infinite' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: statusDot[u.status], fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.status}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0 16px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Btn variant="secondary" small onClick={() => { setUserDetail(u); setUserDetailTab('Profile'); }}>Edit</Btn>
                        {u.status === 'ACTIVE' && <Btn variant="destructive" small>Suspend</Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── GROUPS TAB ── */}
      {tab === 'Groups' && (
        <>
          <StatsRow cards={[
            { label: 'Total Groups', value: String(IAM_GROUPS.length), delta: 'Configured', deltaType: 'positive' },
            { label: 'Members (all groups)', value: '60', delta: 'Cross-assigned', deltaType: 'positive' },
            { label: 'Policies Assigned', value: '15', delta: 'Total assignments', deltaType: 'positive' },
          ]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <Btn variant="primary" icon={<span>+</span>} onClick={() => setCreateGroupOpen(true)}>Create Group</Btn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {IAM_GROUPS.map(g => {
              const [hov, setHov] = React.useState(false);
              return (
                <div key={g.id} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
                  style={{ background: 'white', borderRadius: '16px', padding: '22px', boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.10)' : '0 2px 12px rgba(0,0,0,0.06)', transition: 'all 200ms ease', transform: hov ? 'translateY(-2px)' : 'none', borderLeft: `4px solid ${hov ? g.color : 'transparent'}`, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '17px', color: '#0F172A', letterSpacing: '-0.5px' }}>{g.name}</div>
                    <span style={{ background: '#EDE9FE', color: '#5B21B6', padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{g.policies} policies</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '14px', lineHeight: 1.5 }}>{g.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {[...Array(Math.min(g.members, 4))].map((_, i) => (
                        <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: `hsl(${i * 50 + 200}, 60%, 55%)`, border: '2px solid white', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{String.fromCharCode(65 + i)}</div>
                      ))}
                      <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginLeft: 6 }}>{g.members} members</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Btn variant="secondary" small>View</Btn>
                      <Btn variant="ghost" small>Edit</Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── POLICIES TAB ── */}
      {tab === 'Policies' && (
        <>
          <StatsRow cards={[
            { label: 'Total Policies', value: String(SYSTEM_POLICIES.length), delta: 'Configured', deltaType: 'positive' },
            { label: 'Active', value: String(SYSTEM_POLICIES.length), delta: 'All active', deltaType: 'positive', color: '#10B981' },
            { label: 'Assigned to Groups', value: '12', delta: 'Total assignments', deltaType: 'positive' },
          ]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <Btn variant="primary" icon={<span>+</span>} onClick={() => { setEditPerms(JSON.parse(JSON.stringify(SYSTEM_POLICIES[0].perms))); setCreatePolicyOpen(true); }}>Create Policy</Btn>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8F7F5' }}>
                  {['Policy Name', 'Description', 'Permissions', 'Groups', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SYSTEM_POLICIES.map(p => {
                  const permCount = Object.values(p.perms).reduce((s, r) => s + Object.values(r).filter(Boolean).length, 0);
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid #F1F0EE', height: 56, transition: 'background 150ms', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      onClick={() => setPolicyDetail(p)}>
                      <td style={{ padding: '0 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {p.locked && <span style={{ fontSize: '12px' }}>🔒</span>}
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0 16px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 220 }}>{p.desc}</td>
                      <td style={{ padding: '0 16px' }}>
                        <span style={{ background: '#FFF7ED', color: '#E8783B', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>{permCount} permissions</span>
                      </td>
                      <td style={{ padding: '0 16px', fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.groups} group{p.groups !== 1 ? 's' : ''}</td>
                      <td style={{ padding: '0 16px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Btn variant="secondary" small onClick={() => setPolicyDetail(p)}>View</Btn>
                          {!p.locked && <Btn variant="destructive" small>Delete</Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── USER DETAIL DRAWER ── */}
      <SidePanel open={!!userDetail} onClose={() => setUserDetail(null)} title={userDetail?.name || ''} width={480}>
        {userDetail && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '14px', background: `linear-gradient(135deg, ${ROLE_COLORS[userDetail.role] || '#94A3B8'}, ${ROLE_COLORS[userDetail.role] || '#94A3B8'}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: 'white' }}>{userDetail.initials}</div>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '18px', color: '#0F172A' }}>{userDetail.name}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{userDetail.email}</div>
                <span style={{ background: (ROLE_COLORS[userDetail.role] || '#94A3B8') + '22', color: ROLE_COLORS[userDetail.role] || '#475569', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px', display: 'inline-block' }}>{userDetail.role}</span>
              </div>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #F1F0EE', marginBottom: '16px' }}>
              {['Profile', 'Permissions', 'Activity'].map(t => (
                <button key={t} onClick={() => setUserDetailTab(t)}
                  style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: userDetailTab === t ? 700 : 500, color: userDetailTab === t ? '#0F172A' : '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", borderBottom: `2px solid ${userDetailTab === t ? '#E8783B' : 'transparent'}`, marginBottom: '-1px' }}>
                  {t}
                </button>
              ))}
            </div>
            {userDetailTab === 'Profile' && (
              <div>
                {[{ l: 'Department', v: userDetail.dept }, { l: 'Status', v: userDetail.status }, { l: 'Last Login', v: userDetail.lastLogin }, { l: 'Groups', v: userDetail.groups.join(', ') }].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F8F7F5' }}>
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.l}</span>
                    <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'right', maxWidth: '60%' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            )}
            {userDetailTab === 'Permissions' && (
              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '14px' }}>Permissions inherited via group membership:</div>
                {userDetail.groups.map(g => (
                  <div key={g} style={{ padding: '10px 14px', background: '#F8F7F5', borderRadius: '10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{g}</span>
                    <span style={{ background: '#EDE9FE', color: '#5B21B6', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>via Group</span>
                  </div>
                ))}
              </div>
            )}
            {userDetailTab === 'Activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { action: 'Approved', entity: 'INV-2024-087', time: '2h ago', color: '#10B981' },
                  { action: 'Logged in', entity: 'Chrome · Mumbai', time: '2h ago', color: '#94A3B8' },
                  { action: 'Rejected', entity: 'INV-2024-085', time: 'Yesterday', color: '#EF4444' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px', background: '#F8F7F5', borderRadius: '10px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.action} </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#E8783B' }}>{a.entity}</span>
                      <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 2 }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <Btn variant="primary" style={{ flex: 1, justifyContent: 'center' }}>Edit User</Btn>
              <Btn variant="destructive" style={{ flex: 1, justifyContent: 'center' }}>Suspend</Btn>
            </div>
          </>
        )}
      </SidePanel>

      {/* ── POLICY DETAIL DRAWER ── */}
      <SidePanel open={!!policyDetail} onClose={() => setPolicyDetail(null)} title={policyDetail?.name || ''} width={600}>
        {policyDetail && (
          <>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              {policyDetail.locked && <span style={{ fontSize: '12px' }}>🔒</span>}
              <span style={{ fontSize: '12px', color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{policyDetail.desc}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>Assigned to {policyDetail.groups} group{policyDetail.groups !== 1 ? 's' : ''}</div>
            <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Permissions Matrix</div>
            <div style={{ background: '#F8F7F5', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
              <PermMatrix perms={policyDetail.perms} editable={false} />
            </div>
            {!policyDetail.locked && <Btn variant="primary">Edit Policy</Btn>}
          </>
        )}
      </SidePanel>

      {/* ── INVITE USER MODAL ── */}
      <TjModal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite New User" width={500}>
        <TjInput label="Full Name" placeholder="Jane Smith" />
        <TjInput label="Corporate Email" placeholder="jane@acmecorp.in" type="email" />
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Role</div>
          <select style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#0F172A', background: '#FAFAF8', outline: 'none' }}>
            {['CFO','Finance Admin','Finance Manager','AP Clerk','Dept Head','Employee','Vendor'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <TjInput label="Department" placeholder="e.g. Engineering, Marketing" />
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>ACCESS PREVIEW</div>
          <div style={{ fontSize: '12px', color: '#78350F', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>This user will be able to: view expense reports, submit expenses, and access their own profile.</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={() => setInviteOpen(false)}>Send Invite Email</Btn>
        </div>
      </TjModal>

      {/* ── CREATE POLICY MODAL ── */}
      <TjModal open={createPolicyOpen} onClose={() => setCreatePolicyOpen(false)} title="Create Policy" width={640}>
        <TjInput label="Policy Name" placeholder="e.g. Regional Finance Manager" />
        <TjTextarea label="Description" placeholder="Describe what this policy allows…" rows={2} />
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px' }}>Permissions Matrix</div>
        {editPerms && <div style={{ background: '#F8F7F5', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          <PermMatrix perms={editPerms} editable onChange={(res, act, val) => setEditPerms(p => ({ ...p, [res]: { ...p[res], [act]: val } }))} />
        </div>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setCreatePolicyOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={() => setCreatePolicyOpen(false)}>Save Policy</Btn>
        </div>
      </TjModal>
    </div>
  );
};

Object.assign(window, { IAMScreen });
