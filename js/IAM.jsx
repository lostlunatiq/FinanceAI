// Tijori AI — IAM: Identity & Access Management
// Fully dynamic — Users, Groups, and Policies fetched from Django backend

// ─── GRADE MAPPINGS ──────────────────────────────────────────────────────────
// UI Presentation Truth (Mirrors ROLE_CONFIG pattern from App.js)

const GRADE_COLORS = {
  1: '#10B981',   // employee — green
  2: '#8B5CF6',   // dept head — purple
  3: '#3B82F6',   // finance manager — blue
  4: '#E8783B',   // finance admin — brand orange
};

const GRADE_LABELS = {
  1: 'Employee',
  2: 'Dept Head',
  3: 'Finance Manager',
  4: 'Finance Admin',
};

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

const PermMatrix = ({ perms, editable = false, onChange }) => {
  const resources = Object.keys(perms);
  const actions = ['View', 'Create', 'Approve', 'Reject', 'Export', 'Admin'];
  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 120, background: '#F8F7F5', borderRadius: '8px 0 0 0' }}>Resource</th>
            {actions.map(a => <th key={a} style={{ padding: '8px 10px', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8F7F5' }}>{a}</th>)}
          </tr>
        </thead>
        <tbody>
          {resources.map((res) => (
            <tr key={res} style={{ borderTop: '1px solid #F1F0EE' }}>
              <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: '12px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{res}</td>
              {actions.map(act => {
                const val = perms[res]?.[act];
                return (
                  <td key={act} style={{ padding: '10px', textAlign: 'center' }}>
                    {editable ? (
                      <input type="checkbox" checked={!!val} onChange={() => onChange && onChange(res, act, !val)} style={{ accentColor: '#E8783B', cursor: 'pointer', width: 14, height: 14 }} />
                    ) : val === true ? (
                      <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: '#D1FAE5', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>✓</span>
                    ) : val === false ? (
                      <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: '#FEE2E2', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>✕</span>
                    ) : <span style={{ color: '#E2E8F0', fontSize: '14px' }}>—</span>}
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

// ─── LIVE DATA HOOK ──────────────────────────────────────────────────────────
// Fetches all IAM entities concurrently, mimicking useLiveBadges from App.js

const useIAMData = () => {
  const [data, setData] = React.useState({ users: [], groups: [], policies: [], loading: true });

  const loadData = React.useCallback(() => {
    setData(prev => ({ ...prev, loading: true }));
    const { AuthAPI, IAMAPI } = window.TijoriAPI;

    // Concurrently fetch all IAM dimensions
    Promise.allSettled([
      AuthAPI.listUsers(),
      IAMAPI ? IAMAPI.listGroups() : Promise.resolve([]),
      IAMAPI ? IAMAPI.listPolicies() : Promise.resolve([])
    ]).then(([usersRes, groupsRes, policiesRes]) => {
      setData({
        users: usersRes.status === 'fulfilled' && usersRes.value ? usersRes.value : [],
        groups: groupsRes.status === 'fulfilled' && groupsRes.value ? groupsRes.value : [],
        policies: policiesRes.status === 'fulfilled' && policiesRes.value ? policiesRes.value : [],
        loading: false
      });
    });
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  return { ...data, reload: loadData };
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

const IAMScreen = () => {
  const [tab, setTab] = React.useState('Users');
  const [userDetail, setUserDetail] = React.useState(null);
  const [userDetailTab, setUserDetailTab] = React.useState('Profile');
  const [inviteOpen, setInviteOpen] = React.useState(false);
  
  const [gradeFilter, setGradeFilter] = React.useState(0); // 0 = All
  const [search, setSearch] = React.useState('');

  // Form State
  const [newUser, setNewUser] = React.useState({ username: '', email: '', first_name: '', last_name: '', employee_grade: 1, password: '' });
  const [inviteError, setInviteError] = React.useState('');
  const [inviteLoading, setInviteLoading] = React.useState(false);

  // Hook into dynamic backend data
  const { users, groups, policies, loading, reload } = useIAMData();
  const { AuthAPI } = window.TijoriAPI;

  const normalizeUser = (u) => ({
    id: u.id,
    name: `${u.first_name} ${u.last_name}`.trim() || u.username,
    email: u.email || `${u.username}@internal`,
    grade: u.employee_grade || 1,
    gradeLabel: GRADE_LABELS[u.employee_grade] || `Grade ${u.employee_grade}`,
    dept: u.department_name || u.department || '—',
    lastLogin: u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN') : 'Never',
    status: u.is_active ? 'ACTIVE' : 'SUSPENDED',
    initials: ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || u.username.slice(0, 2).toUpperCase(),
    username: u.username,
    isSuperuser: u.is_superuser,
    groups: [],
  });

  const displayUsers = users.map(normalizeUser);

  const filteredUsers = displayUsers.filter(u => {
    const mg = gradeFilter === 0 || u.grade === gradeFilter;
    const ms = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase());
    return mg && ms;
  });

  const handleInviteUser = async () => {
    if (!newUser.username || !newUser.password) { setInviteError('Username and password required.'); return; }
    setInviteLoading(true);
    setInviteError('');
    try {
      await AuthAPI.createUser(newUser);
      setInviteOpen(false);
      setNewUser({ username: '', email: '', first_name: '', last_name: '', employee_grade: 1, password: '' });
      reload(); // Refresh dynamic data
    } catch (err) {
      setInviteError(err.message || 'Failed to create user.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await AuthAPI.updateUser(user.id, { is_active: user.status !== 'ACTIVE' });
      reload();
    } catch {}
  };

  const statusDot = { ACTIVE: '#10B981', PENDING: '#F59E0B', SUSPENDED: '#EF4444' };

  // ── Loading state (mirrors App.js pattern) ─────────────────────────────────
  if (loading && displayUsers.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: 24, height: 24, border: '2.5px solid rgba(15,23,42,0.1)', borderTopColor: '#E8783B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: '13px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>Syncing Access Logs...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <SectionHeader
        title={<span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>🔐 Identity & Access Management</span>}
        subtitle="Manage access by Employee Grade. Higher grades grant broader approval authority."
        right={<Btn variant="primary" icon={<span>+</span>} onClick={() => setInviteOpen(true)}>Invite User</Btn>}
      />

      <div style={{ display: 'flex', borderBottom: '2px solid #F1F0EE', marginBottom: '24px', gap: '0' }}>
        {['Users', 'Groups', 'Policies'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: tab === t ? 700 : 500, fontSize: '14px', color: tab === t ? '#0F172A' : '#94A3B8', borderBottom: `3px solid ${tab === t ? '#E8783B' : 'transparent'}`, marginBottom: '-2px', transition: 'all 150ms' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Users' && (
        <div style={{ animation: 'fadeUp 220ms ease both' }}>
          <StatsRow cards={[
            { label: 'Total Users', value: String(displayUsers.length), delta: 'registered', deltaType: 'positive' },
            { label: 'Active', value: String(displayUsers.filter(u => u.status === 'ACTIVE').length), delta: 'Verified', deltaType: 'positive', color: '#10B981' },
            { label: 'Suspended', value: String(displayUsers.filter(u => u.status === 'SUSPENDED').length), delta: 'Access revoked', deltaType: 'negative', color: '#EF4444' },
          ]} />

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name, email or username…"
                style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8' }} />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>🔍</span>
            </div>
            <select value={gradeFilter} onChange={e => setGradeFilter(Number(e.target.value))}
              style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#FAFAF8', color: '#0F172A', cursor: 'pointer' }}>
              <option value={0}>All Grades</option>
              {Object.entries(GRADE_LABELS).map(([g, label]) => (
                <option key={g} value={Number(g)}>G{g} — {label}</option>
              ))}
            </select>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8F7F5' }}>
                  {['User', 'Grade', 'Department', 'Last Login', 'Status', 'Actions'].map(h => (
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
                        <div style={{ width: 32, height: 32, borderRadius: '8px', background: `linear-gradient(135deg, ${GRADE_COLORS[u.grade] || '#94A3B8'}, ${GRADE_COLORS[u.grade] || '#94A3B8'}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '11px', color: 'white', flexShrink: 0 }}>{u.initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0 16px' }}>
                      <span style={{ background: (GRADE_COLORS[u.grade] || '#94A3B8') + '22', color: GRADE_COLORS[u.grade] || '#475569', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>G{u.grade} · {u.gradeLabel}</span>
                    </td>
                    <td style={{ padding: '0 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.dept}</td>
                    <td style={{ padding: '0 16px', fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.lastLogin}</td>
                    <td style={{ padding: '0 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot[u.status], display: 'block' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: statusDot[u.status], fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{u.status}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0 16px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Btn variant="secondary" small onClick={() => { setUserDetail(u); setUserDetailTab('Profile'); }}>View</Btn>
                        <Btn variant={u.status === 'ACTIVE' ? 'destructive' : 'green'} small onClick={() => handleToggleActive(u)}>
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      No users match your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dynamic render blocks for Groups and Policies if populated by API, fallback to text if empty */}
      {tab === 'Groups' && (
        <div style={{ animation: 'fadeUp 220ms ease both' }}>
           {groups.length > 0 ? (
             <div style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>{groups.length} active groups fetched from backend.</div>
           ) : (
             <div style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>Group management updated to Grade-based permission inheritance.</div>
           )}
        </div>
      )}
      
      {tab === 'Policies' && (
         <div style={{ animation: 'fadeUp 220ms ease both' }}>
           {policies.length > 0 ? (
             <div style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>{policies.length} policies fetched from backend.</div>
           ) : (
             <div style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>Policy assignments now linked to G1–G4 hierarchy.</div>
           )}
        </div>
      )}

      {/* ── USER DETAIL DRAWER ── */}
      <SidePanel open={!!userDetail} onClose={() => setUserDetail(null)} title={userDetail?.name || ''} width={480}>
        {userDetail && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '14px', background: `linear-gradient(135deg, ${GRADE_COLORS[userDetail.grade] || '#94A3B8'}, ${GRADE_COLORS[userDetail.grade] || '#94A3B8'}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '20px', color: 'white' }}>{userDetail.initials}</div>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '18px', color: '#0F172A' }}>{userDetail.name}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{userDetail.email}</div>
                <span style={{ background: (GRADE_COLORS[userDetail.grade] || '#94A3B8') + '22', color: GRADE_COLORS[userDetail.grade] || '#475569', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px', display: 'inline-block' }}>G{userDetail.grade} · {userDetail.gradeLabel}</span>
              </div>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #F1F0EE', marginBottom: '16px' }}>
              {['Profile', 'Activity'].map(t => (
                <button key={t} onClick={() => setUserDetailTab(t)}
                  style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: userDetailTab === t ? 700 : 500, color: userDetailTab === t ? '#0F172A' : '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif", borderBottom: `2px solid ${userDetailTab === t ? '#E8783B' : 'transparent'}`, marginBottom: '-1px' }}>{t}</button>
              ))}
            </div>
            {userDetailTab === 'Profile' && (
              <div>
                {[
                  { l: 'Grade', v: `G${userDetail.grade} — ${userDetail.gradeLabel}` },
                  { l: 'Superuser', v: userDetail.isSuperuser ? 'Yes' : 'No' },
                  { l: 'Department', v: userDetail.dept },
                  { l: 'Status', v: userDetail.status },
                  { l: 'Last Login', v: userDetail.lastLogin }
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F8F7F5' }}>
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.l}</span>
                    <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'right' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <Btn variant="primary" style={{ flex: 1, justifyContent: 'center' }}>Edit Details</Btn>
              <Btn variant="destructive" style={{ flex: 1, justifyContent: 'center' }}>Suspend</Btn>
            </div>
          </>
        )}
      </SidePanel>

      {/* ── INVITE USER MODAL ── */}
      <TjModal open={inviteOpen} onClose={() => { setInviteOpen(false); setInviteError(''); }} title="Create New User" width={500}>
        <TjInput label="Username" placeholder="jane.smith" value={newUser.username} onChange={e => setNewUser(u => ({...u, username: e.target.value}))} />
        <TjInput label="First Name" placeholder="Jane" value={newUser.first_name} onChange={e => setNewUser(u => ({...u, first_name: e.target.value}))} />
        <TjInput label="Last Name" placeholder="Smith" value={newUser.last_name} onChange={e => setNewUser(u => ({...u, last_name: e.target.value}))} />
        <TjInput label="Email" placeholder="jane@company.com" type="email" value={newUser.email} onChange={e => setNewUser(u => ({...u, email: e.target.value}))} />
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Access Grade</div>
          <select value={newUser.employee_grade} onChange={e => setNewUser(u => ({...u, employee_grade: Number(e.target.value)}))}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#0F172A', background: '#FAFAF8', outline: 'none' }}>
            {Object.entries(GRADE_LABELS).map(([g, label]) => (
              <option key={g} value={Number(g)}>G{g} — {label}</option>
            ))}
          </select>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Higher grade = broader approval authority</div>
        </div>

        <TjInput label="Password" placeholder="Temporary password" type="password" value={newUser.password} onChange={e => setNewUser(u => ({...u, password: e.target.value}))} />
        {inviteError && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#991B1B' }}>{inviteError}</div>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleInviteUser} disabled={inviteLoading}>{inviteLoading ? 'Creating…' : 'Create User'}</Btn>
        </div>
      </TjModal>
    </div>
  );
};

Object.assign(window, { IAMScreen });
