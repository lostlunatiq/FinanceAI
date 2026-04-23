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
                {Object.entries(RBAC_MATRIX[res]).map(([action, perms]) => (
                  <tr key={action} style={{ borderTop: '1px solid #F8F7F5' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '8px 14px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12 }}>{action}</td>
                    {grades.map(g => (
                      <td key={g} style={{ padding: '8px 14px', textAlign: 'center' }}>
                        {perms[g] ? (
                          <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: '#D1FAE5', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#059669' }}>✓</span>
                        ) : (
                          <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: '#F1F5F9', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#CBD5E1' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {/* Superuser row */}
            <tr style={{ background: '#FFF7ED', borderTop: '2px solid #FED7AA' }}>
              <td style={{ padding: '12px 14px', fontWeight: 700, color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12 }}>
                ⭐ CFO / Superuser
              </td>
              {grades.map(g => (
                <td key={g} style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: '#92400E', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Full Access</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── AUDIT LOG TAB ───────────────────────────────────────────────────────────

const AuditLogTab = () => {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [filter, setFilter] = React.useState({ action: '', entity_type: '' });

  const load = React.useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter.action) params.action = filter.action;
    if (filter.entity_type) params.entity_type = filter.entity_type;
    window.TijoriAPI.AuthAPI.getAuditLog(params)
      .then(data => {
        setLogs(data.results || []);
        setTotal(data.total || 0);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [filter]);

  React.useEffect(() => { load(); }, [load]);

  const actionColor = { LOGIN: '#10B981', LOGOUT: '#94A3B8', CREATE: '#3B82F6', UPDATE: '#F59E0B', DELETE: '#EF4444', APPROVE: '#8B5CF6', REJECT: '#EF4444' };

  return (
    <div style={{ animation: 'fadeUp 220ms ease both' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input placeholder="Filter by action…" value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))}
          style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8', flex: 1 }} />
        <input placeholder="Filter by entity…" value={filter.entity_type} onChange={e => setFilter(f => ({ ...f, entity_type: e.target.value }))}
          style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8', flex: 1 }} />
        <Btn variant="secondary" onClick={load}>Refresh</Btn>
      </div>
      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Showing {logs.length} of {total} total events
      </div>
      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(15,23,42,0.1)', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No audit logs found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Time', 'Actor', 'Action', 'Entity', 'Details'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderTop: '1px solid #F1F0EE' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#0F172A', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {log.actor}
                    {log.actor_role && <span style={{ marginLeft: 6, fontSize: 10, color: '#94A3B8' }}>G{log.actor_role}</span>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: (actionColor[log.action?.toUpperCase()] || '#94A3B8') + '22', color: actionColor[log.action?.toUpperCase()] || '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{log.entity_type || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── USER EDIT MODAL ─────────────────────────────────────────────────────────

const UserEditModal = ({ user, departments, open, onClose, onSaved }) => {
  const [form, setForm] = React.useState({
    first_name: '', last_name: '', email: '', employee_grade: 1,
    department: '', is_active: true, is_superuser: false, password: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        employee_grade: user.employee_grade || 1,
        department: user.department || '',
        is_active: user.is_active !== false,
        is_superuser: user.is_superuser || false,
        password: '',
      });
    } else {
      setForm({ first_name: '', last_name: '', email: '', employee_grade: 1, department: '', is_active: true, is_superuser: false, password: '' });
    }
    setError('');
  }, [user, open]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (user) {
        await window.TijoriAPI.AuthAPI.updateUser(user.id, payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TjModal open={open} onClose={onClose} title={user ? `Edit User: ${user.username}` : 'Create User'} width={520}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <TjInput label="First Name" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
        <TjInput label="Last Name" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
      </div>
      <TjInput label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Access Grade</div>
        <select value={form.employee_grade} onChange={e => setForm(f => ({ ...f, employee_grade: Number(e.target.value) }))}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#0F172A', background: '#FAFAF8', outline: 'none' }}>
          {Object.entries(GRADE_LABELS).map(([g, label]) => (
            <option key={g} value={Number(g)}>G{g} — {label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Department</div>
        <select value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value || null }))}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#0F172A', background: '#FAFAF8', outline: 'none' }}>
          <option value="">— No Department —</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <TjInput label="New Password (leave blank to keep current)" type="password" placeholder="Min 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />

      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A' }}>
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: '#10B981' }} />
          Active Account
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A' }}>
          <input type="checkbox" checked={form.is_superuser} onChange={e => setForm(f => ({ ...f, is_superuser: e.target.checked }))} style={{ accentColor: '#E8783B' }} />
          CFO / Superuser Access
        </label>
      </div>

      {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</Btn>
      </div>
    </TjModal>
  );
};

// ─── CREATE USER MODAL ───────────────────────────────────────────────────────

const CreateUserModal = ({ open, onClose, onCreated, departments }) => {
  const [form, setForm] = React.useState({
    username: '', first_name: '', last_name: '', email: '',
    employee_grade: 1, department: '', password: '',
    user_type: 'internal', // internal | vendor
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) { setForm({ username: '', first_name: '', last_name: '', email: '', employee_grade: 1, department: '', password: '', user_type: 'internal' }); setError(''); }
  }, [open]);

  const handleCreate = async () => {
    if (!form.username.trim()) { setError('Username is required.'); return; }
    if (!form.password || form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      const payload = { username: form.username.trim(), first_name: form.first_name, last_name: form.last_name, email: form.email, employee_grade: form.employee_grade, password: form.password };
      if (form.department) payload.department = form.department;
      await window.TijoriAPI.AuthAPI.createUser(payload);
      onCreated();
      onClose();
    } catch (e) {
      const msg = e.body ? Object.values(e.body).flat().join(' ') : (e.message || 'Creation failed.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TjModal open={open} onClose={onClose} title="Create New User" width={520}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>User Type</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ v: 'internal', l: '🏢 Internal Staff' }, { v: 'vendor', l: '🤝 Vendor Portal' }].map(({ v, l }) => (
            <button key={v} onClick={() => setForm(f => ({ ...f, user_type: v }))}
              style={{ flex: 1, padding: '10px 14px', border: `2px solid ${form.user_type === v ? '#E8783B' : '#E2E8F0'}`, borderRadius: 10, background: form.user_type === v ? '#FFF7ED' : 'white', cursor: 'pointer', fontSize: 13, fontWeight: form.user_type === v ? 700 : 500, color: form.user_type === v ? '#E8783B' : '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 150ms' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <TjInput label="Username *" placeholder="john.smith" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <TjInput label="First Name" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
        <TjInput label="Last Name" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
      </div>
      <TjInput label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

      {form.user_type === 'internal' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Access Grade</div>
            <select value={form.employee_grade} onChange={e => setForm(f => ({ ...f, employee_grade: Number(e.target.value) }))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#0F172A', background: '#FAFAF8', outline: 'none' }}>
              {Object.entries(GRADE_LABELS).map(([g, label]) => (
                <option key={g} value={Number(g)}>G{g} — {label}</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {form.employee_grade === 1 && 'Can submit expenses and view own records.'}
              {form.employee_grade === 2 && 'Can approve team expenses and view dept budget.'}
              {form.employee_grade === 3 && 'Can approve all expenses, manage budgets and reports.'}
              {form.employee_grade === 4 && 'Full system access including user management.'}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Department</div>
            <select value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value || '' }))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#0F172A', background: '#FAFAF8', outline: 'none' }}>
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </>
      )}

      <TjInput label="Temporary Password *" type="password" placeholder="Min 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />

      {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating…' : `Create ${form.user_type === 'vendor' ? 'Vendor' : 'User'}`}
        </Btn>
      </div>
    </TjModal>
  );
};

// ─── USER DETAIL DRAWER ──────────────────────────────────────────────────────

const UserDetailDrawer = ({ user, departments, open, onClose, onUpdated }) => {
  const [tab, setTab] = React.useState('Profile');
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await window.TijoriAPI.AuthAPI.updateUser(user.id, { is_active: !user.is_active });
      onUpdated();
    } catch (e) {
      alert(e.message || 'Failed to update status.');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    try {
      await window.TijoriAPI.AuthAPI.deleteUser(user.id);
      onClose();
      onUpdated();
    } catch (e) {
      alert(e.message || 'Delete failed.');
    }
    setConfirmDelete(false);
  };

  if (!user) return null;
  const gColor = user.is_superuser ? '#E8783B' : (GRADE_COLORS[user.employee_grade] || '#94A3B8');
  const gradeLabel = user.is_superuser ? 'CFO / Superuser' : (GRADE_LABELS[user.employee_grade] || `Grade ${user.employee_grade}`);
  const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || user.username?.slice(0, 2).toUpperCase();

  // Compute what this user can access from RBAC_MATRIX
  const accessList = [];
  if (!user.is_superuser) {
    Object.entries(RBAC_MATRIX).forEach(([res, actions]) => {
      const allowed = Object.entries(actions).filter(([, perms]) => perms[user.employee_grade]).map(([a]) => a);
      if (allowed.length > 0) accessList.push({ resource: res, actions: allowed });
    });
  }

  return (
    <>
      <SidePanel open={open} onClose={onClose} title={user.username} width={480}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${gColor}, ${gColor}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20, color: 'white', flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18, color: '#0F172A' }}>{user.first_name} {user.last_name}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{user.email || user.username + '@internal'}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ background: gColor + '22', color: gColor, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {user.is_superuser ? '⭐ CFO' : `G${user.employee_grade}`} · {gradeLabel}
              </span>
              <span style={{ background: user.is_active ? '#D1FAE5' : '#FEE2E2', color: user.is_active ? '#059669' : '#DC2626', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {user.is_active ? 'ACTIVE' : 'SUSPENDED'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #F1F0EE', marginBottom: 16 }}>
          {['Profile', 'Permissions', 'Activity'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? '#0F172A' : '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", borderBottom: `2px solid ${tab === t ? '#E8783B' : 'transparent'}`, marginBottom: -1 }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Profile' && (
          <div>
            {[
              { l: 'Username', v: user.username },
              { l: 'Grade', v: `G${user.employee_grade} — ${gradeLabel}` },
              { l: 'Department', v: user.department_name || '—' },
              { l: 'Email', v: user.email || '—' },
              { l: 'Superuser', v: user.is_superuser ? 'Yes (CFO access)' : 'No' },
              { l: 'Last Login', v: user.last_login ? new Date(user.last_login).toLocaleString('en-IN') : 'Never' },
              { l: 'Account Status', v: user.is_active ? 'Active' : 'Suspended' },
            ].map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F8F7F5' }}>
                <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.l}</span>
                <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'right', maxWidth: 240 }}>{r.v}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Permissions' && (
          <div>
            {user.is_superuser ? (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 4 }}>⭐ Unrestricted Access</div>
                <div style={{ fontSize: 12, color: '#B45309', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>CFO / Superuser has full access to all system resources including IAM, analytics, and approvals.</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Access derived from Grade G{user.employee_grade} ({gradeLabel}) RBAC policy.
                </div>
                {accessList.map(({ resource, actions }) => (
                  <div key={resource} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{resource}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {actions.map(a => (
                        <span key={a} style={{ background: '#D1FAE5', color: '#059669', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>✓ {a}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {accessList.length === 0 && <div style={{ color: '#94A3B8', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No permissions found for this grade.</div>}
              </div>
            )}
          </div>
        )}

        {tab === 'Activity' && (
          <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: 32, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Activity log filtered by user not yet implemented. Use the Audit Log tab in IAM for full log.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          <Btn variant="primary" style={{ flex: 1 }} onClick={() => setEditOpen(true)}>Edit User</Btn>
          <Btn variant={user.is_active ? 'destructive' : 'green'} style={{ flex: 1 }} onClick={handleToggle} disabled={toggling}>
            {toggling ? '…' : (user.is_active ? 'Suspend' : 'Activate')}
          </Btn>
          <Btn variant="secondary" style={{ flex: 1, color: '#EF4444', borderColor: '#FECACA' }} onClick={() => setConfirmDelete(true)}>Delete</Btn>
        </div>
      </SidePanel>

      <UserEditModal user={user} departments={departments} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); onUpdated(); }} />

      <TjModal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Confirm Delete" width={400}>
        <div style={{ fontSize: 14, color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 20 }}>
          Are you sure you want to permanently delete <strong>{user.username}</strong>? This action cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Btn>
          <Btn variant="destructive" onClick={handleDelete}>Delete Permanently</Btn>
        </div>
      </TjModal>
    </>
  );
};

// ─── GROUPS TAB ──────────────────────────────────────────────────────────────

const GroupsTab = ({ users }) => {
  const groups = Object.entries(GRADE_LABELS).map(([g, label]) => {
    const gNum = Number(g);
    const members = users.filter(u => u.employee_grade === gNum);
    const superusers = users.filter(u => u.is_superuser);
    return { grade: gNum, label, members, color: GRADE_COLORS[gNum], icon: GRADE_ICONS[gNum] };
  });

  const cfoGroup = { grade: 5, label: 'CFO / Superuser', members: users.filter(u => u.is_superuser), color: '#E8783B', icon: '⭐' };

  return (
    <div style={{ animation: 'fadeUp 220ms ease both' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {[...groups, cfoGroup].map(g => (
          <div key={g.grade} style={{ background: 'white', borderRadius: 16, border: '1px solid #F1F0EE', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F0EE', background: g.color + '0D', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{g.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{g.label}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{g.grade < 5 ? `Grade G${g.grade}` : 'Superuser'} · {g.members.length} member{g.members.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div style={{ padding: '12px 20px', maxHeight: 160, overflow: 'auto' }}>
              {g.members.length === 0 ? (
                <div style={{ color: '#CBD5E1', fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontStyle: 'italic' }}>No members</div>
              ) : g.members.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F8F7F5' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: g.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: g.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || u.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.first_name} {u.last_name}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{u.username}</div>
                  </div>
                  {!u.is_active && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#DC2626', fontWeight: 700, background: '#FEE2E2', padding: '1px 6px', borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>SUSPENDED</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN IAM SCREEN ─────────────────────────────────────────────────────────

const IAMScreen = ({ onNavigate }) => {
  const [tab, setTab] = React.useState('Users');
  const [users, setUsers] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      window.TijoriAPI.AuthAPI.listUsers(),
      window.TijoriAPI.AuthAPI.listDepartments(),
    ]).then(([usersRes, deptsRes]) => {
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value || []);
      if (deptsRes.status === 'fulfilled') setDepartments(deptsRes.value || []);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const mg = gradeFilter === 0 || u.employee_grade === gradeFilter;
    const ms = !search || [u.username, u.first_name, u.last_name, u.email].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const mst = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.is_active : !u.is_active);
    return mg && ms && mst;
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
                    {['User', 'Grade / Role', 'Department', 'Last Login', 'Status', 'Actions'].map(h => (
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
                        <td style={{ padding: '0 16px', fontSize: 12, color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif' }}>{u.department_name || '—'}</td>
                        <td style={{ padding: '0 16px', fontSize: 11, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN') : 'Never'}</td>
                        <td style={{ padding: '0 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.is_active ? '#10B981' : '#EF4444', display: 'block' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: u.is_active ? '#059669' : '#DC2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.is_active ? 'ACTIVE' : 'SUSPENDED'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0 16px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <Btn variant="secondary" small onClick={() => setSelectedUser(u)}>View</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {loading ? 'Loading…' : 'No users match your filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Groups' && <GroupsTab users={users} />}
      {tab === 'Roles & Permissions' && <RBACMatrixView />}
      {tab === 'Audit Log' && <AuditLogTab />}

      <UserDetailDrawer
        user={selectedUser}
        departments={departments}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onUpdated={() => { load(); setSelectedUser(null); }}
      />

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { load(); setCreateOpen(false); }}
        departments={departments}
      />
    </div>
  );
};

Object.assign(window, { IAMScreen });
