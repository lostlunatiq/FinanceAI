// Tijori AI — IAM: Identity & Access Management (Complete RBAC)

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const GRADE_COLORS = {
  1: '#10B981',
  2: '#8B5CF6',
  3: '#3B82F6',
  4: '#E8783B',
  5: '#EF4444', // superuser/CFO
};

const GRADE_LABELS = {
  1: 'Employee',
  2: 'Dept Head',
  3: 'Finance Manager',
  4: 'Finance Admin',
};

const GRADE_ICONS = { 1: '👤', 2: '👥', 3: '💼', 4: '🔑' };

// RBAC matrix: what each grade can do per resource
const RBAC_MATRIX = {
  'Expenses': {
    'Submit':     { 1: true,  2: true,  3: true,  4: true  },
    'View Own':   { 1: true,  2: true,  3: true,  4: true  },
    'View All':   { 1: false, 2: true,  3: true,  4: true  },
    'Approve L1': { 1: false, 2: true,  3: true,  4: true  },
    'Approve L2': { 1: false, 2: false, 3: true,  4: true  },
    'Reject':     { 1: false, 2: true,  3: true,  4: true  },
    'Export':     { 1: false, 2: false, 3: true,  4: true  },
  },
  'Vendors': {
    'View':       { 1: false, 2: false, 3: true,  4: true  },
    'Create':     { 1: false, 2: false, 3: false, 4: true  },
    'Edit':       { 1: false, 2: false, 3: false, 4: true  },
    'Approve':    { 1: false, 2: false, 3: false, 4: true  },
    'Delete':     { 1: false, 2: false, 3: false, 4: false },
  },
  'Budgets': {
    'View Dept':  { 1: false, 2: true,  3: true,  4: true  },
    'View All':   { 1: false, 2: false, 3: true,  4: true  },
    'Create':     { 1: false, 2: false, 3: false, 4: true  },
    'Edit':       { 1: false, 2: false, 3: false, 4: true  },
    'Allocate':   { 1: false, 2: false, 3: true,  4: true  },
  },
  'Reports': {
    'View Basic': { 1: false, 2: true,  3: true,  4: true  },
    'View Full':  { 1: false, 2: false, 3: true,  4: true  },
    'Export':     { 1: false, 2: false, 3: true,  4: true  },
    'Analytics':  { 1: false, 2: false, 3: true,  4: true  },
  },
  'Users & IAM': {
    'View Users': { 1: false, 2: false, 3: false, 4: true  },
    'Create':     { 1: false, 2: false, 3: false, 4: true  },
    'Edit':       { 1: false, 2: false, 3: false, 4: true  },
    'Suspend':    { 1: false, 2: false, 3: false, 4: true  },
    'Delete':     { 1: false, 2: false, 3: false, 4: false },
  },
  'AI Tools': {
    'NL Query':   { 1: false, 2: false, 3: true,  4: true  },
    'Anomaly':    { 1: false, 2: false, 3: true,  4: true  },
    'Forecasts':  { 1: false, 2: false, 3: false, 4: true  },
  },
};

// ─── RBAC MATRIX COMPONENT ───────────────────────────────────────────────────

const RBACMatrixView = () => {
  const grades = [1, 2, 3, 4];
  const resources = Object.keys(RBAC_MATRIX);

  return (
    <div style={{ animation: 'fadeUp 220ms ease both' }}>
      <div style={{ marginBottom: 20, padding: '14px 18px', background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)', borderRadius: 12, border: '1px solid #BFDBFE', fontSize: 13, color: '#1E40AF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <strong>Grade-Based RBAC:</strong> Permissions are inherited by grade level. Superuser (CFO) has unrestricted access to everything.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 120 }}>Resource / Action</th>
              {grades.map(g => (
                <th key={g} style={{ padding: '10px 14px', textAlign: 'center', minWidth: 110 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 16 }}>{GRADE_ICONS[g]}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: GRADE_COLORS[g], fontFamily: "'Plus Jakarta Sans', sans-serif" }}>G{g} {GRADE_LABELS[g]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((res, ri) => (
              <React.Fragment key={res}>
                <tr>
                  <td colSpan={5} style={{ padding: '12px 14px 4px', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#FAFAF8', borderTop: ri > 0 ? '2px solid #F1F0EE' : 'none' }}>
                    {res}
                  </td>
                </tr>
                {Object.keys(RBAC_MATRIX[res]).map(action => (
                  <tr key={action} style={{ borderBottom: '1px solid #F8F7F5' }}>
                    <td style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{action}</td>
                    {grades.map(g => (
                      <td key={g} style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {RBAC_MATRIX[res][action][g] ? (
                          <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: '#D1FAE5', color: '#059669', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>✓</span>
                        ) : (
                          <span style={{ color: '#E2E8F0', fontSize: '14px' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── AUDIT LOG VIEW ──────────────────────────────────────────────────────────

const AuditLogView = () => {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState({ action: '', entity_type: '' });

  const load = React.useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter.action) params.action = filter.action;
    if (filter.entity_type) params.entity_type = filter.entity_type;
    window.TijoriAPI.AuthAPI.getAuditLog(params)
      .then(data => setLogs(data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div style={{ animation: 'fadeUp 220ms ease both' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={filter.entity_type} onChange={e => setFilter(f => ({ ...f, entity_type: e.target.value }))}
          style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8', flex: 1 }}>
          <option value="">All Entities</option>
          <option value="EXPENSE">Expense</option>
          <option value="VENDOR">Vendor</option>
          <option value="USER">User</option>
          <option value="BUDGET">Budget</option>
        </select>
        <TjInput placeholder="Filter by action (e.g. LOGIN)" value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))} />
        <Btn variant="secondary" onClick={load}>Filter</Btn>
      </div>

      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #F1F0EE', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              {['Timestamp', 'User', 'Action', 'Entity', 'Details'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderTop: '1px solid #F1F0EE' }}>
                <td style={{ padding: '12px 14px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>{log.user_full_name || 'System'}</td>
                <td style={{ padding: '12px 14px' }}><span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{log.action}</span></td>
                <td style={{ padding: '12px 14px', color: '#475569' }}>{log.entity_type}</td>
                <td style={{ padding: '12px 14px', color: '#94A3B8', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(log.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── USER DETAIL DRAWER ─────────────────────────────────────────────────────

const UserDetailDrawer = ({ user, departments, groups, open, onClose, onUpdated }) => {
  const [editing, setEditing] = React.useState(false);
  const [form, setEditForm] = React.useState({});
  
  React.useEffect(() => {
    if (user) setEditForm({ ...user });
  }, [user]);

  const handleSave = async () => {
    try {
      await window.TijoriAPI.AuthAPI.updateUser(user.id, form);
      onUpdated();
      setEditing(false);
    } catch (e) { alert(e.message || 'Update failed'); }
  };

  if (!user) return null;

  return (
    <SidePanel open={open} onClose={onClose} title="User Profile" width={480}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #E8783B, #FF6B35)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'white', fontWeight: 800 }}>
          {((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || user.username[0].toUpperCase()}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{user.full_name}</div>
        <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>{user.email || 'No email provided'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Employee Grade</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: GRADE_COLORS[user.employee_grade] }}>G{user.employee_grade} — {GRADE_LABELS[user.employee_grade]}</div>
        </div>
        <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Department</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{user.department_name || 'Unassigned'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Settings & Access</div>
        <Btn variant="ghost" small onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</Btn>
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TjInput label="First Name" value={form.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
          <TjInput label="Last Name" value={form.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
          <TjInput label="Email" value={form.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Grade</div>
            <select value={form.employee_grade} onChange={e => setEditForm(f => ({ ...f, employee_grade: Number(e.target.value) }))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: '#FAFAF8' }}>
              {Object.entries(GRADE_LABELS).map(([v, l]) => <option key={v} value={v}>G{v} - {l}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Groups</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {groups.map(g => {
                const has = (form.groups || []).includes(g.id);
                return (
                  <button key={g.id} onClick={() => {
                    const next = has ? form.groups.filter(id => id !== g.id) : [...(form.groups || []), g.id];
                    setEditForm(f => ({ ...f, groups: next }));
                  }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid', borderColor: has ? '#E8783B' : '#E2E8F0', background: has ? '#FFF8F5' : 'white', color: has ? '#E8783B' : '#64748B', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
          <Btn variant="primary" style={{ justifyContent: 'center' }} onClick={handleSave}>Save Changes</Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F0EE' }}>
             <span style={{ fontSize: 13, color: '#64748B' }}>Account Status</span>
             <StatusBadge status={user.is_active ? 'ACTIVE' : 'SUSPENDED'} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F0EE' }}>
             <span style={{ fontSize: 13, color: '#64748B' }}>Groups</span>
             <div style={{ display: 'flex', gap: 4 }}>
                {(user.group_names || []).map(g => <span key={g} style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{g}</span>)}
                {(user.group_names || []).length === 0 && <span style={{ color: '#CBD5E1', fontSize: 12 }}>None</span>}
             </div>
          </div>
        </div>
      )}
    </SidePanel>
  );
};

// ─── MAIN IAM SCREEN ─────────────────────────────────────────────────────────

const IAMScreen = ({ onNavigate }) => {
  const [tab, setTab] = React.useState('Users');
  const [users, setUsers] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      window.TijoriAPI.AuthAPI.listUsers(),
      window.TijoriAPI.AuthAPI.listDepartments(),
      window.TijoriAPI.AuthAPI.listGroups(),
    ]).then(([uRes, dRes, gRes]) => {
      if (uRes.status === 'fulfilled') setUsers(uRes.value || []);
      if (dRes.status === 'fulfilled') setDepartments(dRes.value || []);
      if (gRes.status === 'fulfilled') setGroups(gRes.value || []);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const mg = gradeFilter === 0 || u.employee_grade === gradeFilter;
    const ms = !search || [u.username, u.first_name, u.last_name, u.email].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const mast = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.is_active : !u.is_active);
    return mg && ms && mast;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    suspended: users.filter(u => !u.is_active).length,
    admins: users.filter(u => u.employee_grade >= 4 || u.is_superuser).length,
  };

  const tabs = ['Users', 'Groups', 'Roles & Permissions', 'Audit Log'];

  return (
    <div style={{ padding: 32, height: '100%', overflowY: 'auto' }}>
      <SectionHeader
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>🔐 Identity &amp; Access Management</span>}
        subtitle="Manage users, roles, and permissions. Grade-based RBAC with full audit trail."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={load}>↻ Refresh</Btn>
            <Btn variant="primary" icon={<span>+</span>} onClick={() => setCreateOpen(true)}>Create User</Btn>
          </div>
        }
      />

      <StatsRow cards={[
        { label: 'Total Users', value: String(stats.total), delta: 'All roles', deltaType: 'neutral' },
        { label: 'Active', value: String(stats.active), delta: 'Verified access', deltaType: 'positive', color: '#10B981' },
        { label: 'Suspended', value: String(stats.suspended), delta: 'Access revoked', deltaType: 'negative', color: '#EF4444' },
        { label: 'Admins (G4+)', value: String(stats.admins), delta: 'Finance Admin & CFO', deltaType: 'neutral', color: '#E8783B' },
      ]} />

      <div style={{ display: 'flex', borderBottom: '2px solid #F1F0EE', marginBottom: 24, gap: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 22px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: tab === t ? 700 : 500, fontSize: 13, color: tab === t ? '#0F172A' : '#94A3B8', borderBottom: `3px solid ${tab === t ? '#E8783B' : 'transparent'}`, marginBottom: -2, transition: 'all 150ms', whiteSpace: 'nowrap' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Users' && (
        <div style={{ animation: 'fadeUp 220ms ease both' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or username…"
                style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8' }} />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>🔍</span>
            </div>
            <select value={gradeFilter} onChange={e => setGradeFilter(Number(e.target.value))}
              style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8', color: '#0F172A', cursor: 'pointer' }}>
              <option value={0}>All Grades</option>
              {Object.entries(GRADE_LABELS).map(([g, label]) => <option key={g} value={Number(g)}>G{g} — {label}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8', color: '#0F172A', cursor: 'pointer' }}>
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, border: '2.5px solid rgba(15,23,42,0.1)', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading users…</div>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8F7F5' }}>
                    {['User', 'Grade / Role', 'Department', 'Groups', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const gColor = u.is_superuser ? '#E8783B' : (GRADE_COLORS[u.employee_grade] || '#94A3B8');
                    const gLabel = u.is_superuser ? 'CFO' : (GRADE_LABELS[u.employee_grade] || `G${u.employee_grade}`);
                    const initials = ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || u.username?.slice(0, 2).toUpperCase();
                    return (
                      <tr key={u.id} style={{ borderTop: '1px solid #F1F0EE', cursor: 'pointer', transition: 'background 150ms' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        onClick={() => setSelectedUser(u)}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${gColor}, ${gColor}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 12, color: 'white', flexShrink: 0 }}>{initials}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.first_name || u.username} {u.last_name}</div>
                              <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{u.email || u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ background: gColor + '22', color: gColor, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'inline-block' }}>
                              {u.is_superuser ? '⭐ CFO' : `G${u.employee_grade}`} · {gLabel}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0 16px', fontSize: 12, color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.department_name || '—'}</td>
                        <td style={{ padding: '0 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(u.group_names || []).map(g => (
                              <span key={g} style={{ background: '#F1F5F9', color: '#475569', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{g}</span>
                            ))}
                            {(u.group_names || []).length === 0 && <span style={{ color: '#CBD5E1', fontSize: 11 }}>No groups</span>}
                          </div>
                        </td>
                        <td style={{ padding: '0 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.is_active ? '#10B981' : '#DC2626', display: 'block' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: u.is_active ? '#059669' : '#DC2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.is_active ? 'ACTIVE' : 'SUSPENDED'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0 16px' }}>
                          <Btn variant="secondary" small onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}>Edit</Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, animation: 'fadeUp 220ms ease both' }}>
          {groups.map(g => (
            <Card key={g.id} style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👥</div>
                <Btn variant="ghost" small>Edit</Btn>
              </div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 17, color: '#0F172A' }}>{g.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {users.filter(u => u.group_names?.includes(g.name)).length} members
              </div>
              <div style={{ marginTop: 16, borderTop: '1px solid #F1F0EE', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                   <span style={{ fontSize: 11, color: '#94A3B8', cursor: 'pointer' }}>View Members →</span>
                </div>
              </div>
            </Card>
          ))}
          <button onClick={() => setCreateGroupOpen(true)}
            style={{ background: 'none', border: '2px dashed #E2E8F0', borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 200ms', minHeight: 140 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8783B'; e.currentTarget.style.background = '#FFF8F5'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'none'; }}>
            <div style={{ fontSize: 24, color: '#94A3B8', marginBottom: 8 }}>+</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create New Group</div>
          </button>
        </div>
      )}

      {tab === 'Roles & Permissions' && <RBACMatrixView />}

      {tab === 'Audit Log' && <AuditLogView />}

      <TjModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} title="Create Security Group">
        <TjInput label="Group Name" placeholder="e.g. Finance Approvers" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
          <Btn variant="secondary" onClick={() => setCreateGroupOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={async () => {
            if(!newGroupName) return;
            await window.TijoriAPI.AuthAPI.createGroup(newGroupName);
            setCreateGroupOpen(false);
            setNewGroupName('');
            load();
          }}>Create Group</Btn>
        </div>
      </TjModal>

      <UserDetailDrawer
        user={selectedUser}
        departments={departments}
        groups={groups}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onUpdated={() => { load(); setSelectedUser(null); }}
      />
    </div>
  );
};

Object.assign(window, { IAMScreen });
