// Tijori AI — IAM: Identity & Access Management (Complete RBAC)

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const GRADE_COLORS = {
  1: '#10B981',
  2: '#8B5CF6',
  3: '#3B82F6',
  4: '#E8783B',
  5: '#EF4444' // superuser/CFO
};
const GRADE_LABELS = {
  1: 'Employee',
  2: 'Dept Head',
  3: 'Finance Manager',
  4: 'Finance Admin'
};
const GRADE_ICONS = {
  1: '👤',
  2: '👥',
  3: '💼',
  4: '🔑'
};

// RBAC matrix: what each grade can do per resource
const RBAC_MATRIX = {
  'Expenses': {
    'Submit': {
      1: true,
      2: true,
      3: true,
      4: true
    },
    'View Own': {
      1: true,
      2: true,
      3: true,
      4: true
    },
    'View All': {
      1: false,
      2: true,
      3: true,
      4: true
    },
    'Approve L1': {
      1: false,
      2: true,
      3: true,
      4: true
    },
    'Approve L2': {
      1: false,
      2: false,
      3: true,
      4: true
    },
    'Reject': {
      1: false,
      2: true,
      3: true,
      4: true
    },
    'Export': {
      1: false,
      2: false,
      3: true,
      4: true
    }
  },
  'Vendors': {
    'View': {
      1: false,
      2: false,
      3: true,
      4: true
    },
    'Create': {
      1: false,
      2: false,
      3: false,
      4: true
    },
    'Edit': {
      1: false,
      2: false,
      3: false,
      4: true
    },
    'Approve': {
      1: false,
      2: false,
      3: false,
      4: true
    },
    'Delete': {
      1: false,
      2: false,
      3: false,
      4: false
    }
  },
  'Budgets': {
    'View Dept': {
      1: false,
      2: true,
      3: true,
      4: true
    },
    'View All': {
      1: false,
      2: false,
      3: true,
      4: true
    },
    'Create': {
      1: false,
      2: false,
      3: false,
      4: true
    },
    'Edit': {
      1: false,
      2: false,
      3: false,
      4: true
    },
    'Allocate': {
      1: false,
      2: false,
      3: true,
      4: true
    }
  },
  'Reports': {
    'View Basic': {
      1: false,
      2: true,
      3: true,
      4: true
    },
    'View Full': {
      1: false,
      2: false,
      3: true,
      4: true
    },
    'Export': {
      1: false,
      2: false,
      3: true,
      4: true
    },
    'Analytics': {
      1: false,
      2: false,
      3: true,
      4: true
    }
  },
  'Users & IAM': {
    'View Users': {
      1: false,
      2: false,
      3: false,
      4: true
    },
    'Create': {
      1: false,
      2: false,
      3: false,
      4: true
    },
    'Edit': {
      1: false,
      2: false,
      3: false,
      4: true
    },
    'Suspend': {
      1: false,
      2: false,
      3: false,
      4: true
    },
    'Delete': {
      1: false,
      2: false,
      3: false,
      4: false
    }
  },
  'AI Tools': {
    'NL Query': {
      1: false,
      2: false,
      3: true,
      4: true
    },
    'Anomaly': {
      1: false,
      2: false,
      3: true,
      4: true
    },
    'Forecasts': {
      1: false,
      2: false,
      3: false,
      4: true
    }
  }
};

// ─── RBAC MATRIX COMPONENT ───────────────────────────────────────────────────

const RBACMatrixView = () => {
  const grades = [1, 2, 3, 4];
  const resources = Object.keys(RBAC_MATRIX);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'fadeUp 220ms ease both'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20,
      padding: '14px 18px',
      background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)',
      borderRadius: 12,
      border: '1px solid #BFDBFE',
      fontSize: 13,
      color: '#1E40AF',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Grade-Based RBAC:"), " Permissions are inherited by grade level. Superuser (CFO) has unrestricted access to everything."), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: '10px 14px',
      textAlign: 'left',
      fontSize: 10,
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      minWidth: 120
    }
  }, "Resource / Action"), grades.map(g => /*#__PURE__*/React.createElement("th", {
    key: g,
    style: {
      padding: '10px 14px',
      textAlign: 'center',
      minWidth: 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, GRADE_ICONS[g]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: GRADE_COLORS[g],
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "G", g, " ", GRADE_LABELS[g])))))), /*#__PURE__*/React.createElement("tbody", null, resources.map((res, ri) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: res
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 5,
    style: {
      padding: '12px 14px 4px',
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: '#FAFAF8',
      borderTop: ri > 0 ? '2px solid #F1F0EE' : 'none'
    }
  }, res)), Object.keys(RBAC_MATRIX[res]).map(action => /*#__PURE__*/React.createElement("tr", {
    key: action,
    style: {
      borderBottom: '1px solid #F8F7F5'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 14px',
      color: '#0F172A',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, action), grades.map(g => /*#__PURE__*/React.createElement("td", {
    key: g,
    style: {
      padding: '10px 14px',
      textAlign: 'center'
    }
  }, RBAC_MATRIX[res][action][g] ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#D1FAE5',
      color: '#059669',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px'
    }
  }, "\u2713") : /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#E2E8F0',
      fontSize: '14px'
    }
  }, "\u2014")))))))))));
};

// ─── AUDIT LOG VIEW ──────────────────────────────────────────────────────────

const AuditLogView = () => {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filtersMeta, setFiltersMeta] = React.useState({
    entity_types: [],
    actions: []
  });
  const [filter, setFilter] = React.useState({
    scope: 'business',
    state_change_only: 'true',
    action: '',
    entity_type: '',
    actor: '',
    search: ''
  });
  const load = React.useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter.scope) params.scope = filter.scope;
    if (filter.state_change_only) params.state_change_only = filter.state_change_only;
    if (filter.action) params.action = filter.action;
    if (filter.entity_type) params.entity_type = filter.entity_type;
    if (filter.actor) params.actor = filter.actor;
    if (filter.search) params.search = filter.search;
    window.TijoriAPI.AuditAPI.list(params).then(data => {
      const payload = Array.isArray(data) ? {
        results: data,
        filters: {}
      } : data || {};
      setLogs(payload.results || []);
      setFiltersMeta(payload.filters || {
        entity_types: [],
        actions: []
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);
  React.useEffect(() => {
    load();
  }, [load]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'fadeUp 220ms ease both'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: filter.scope,
    onChange: e => setFilter(f => ({
      ...f,
      scope: e.target.value
    })),
    style: {
      padding: '9px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      fontSize: 13,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none',
      background: '#FAFAF8',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "business"
  }, "Business Trail"), /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "All Visible Events"), /*#__PURE__*/React.createElement("option", {
    value: "admin"
  }, "Admin Changes"), /*#__PURE__*/React.createElement("option", {
    value: "auth"
  }, "Auth Events"), /*#__PURE__*/React.createElement("option", {
    value: "system"
  }, "System Events")), /*#__PURE__*/React.createElement("select", {
    value: filter.entity_type,
    onChange: e => setFilter(f => ({
      ...f,
      entity_type: e.target.value
    })),
    style: {
      padding: '9px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      fontSize: 13,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none',
      background: '#FAFAF8',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "All Entities"), filtersMeta.entity_types.map(type => /*#__PURE__*/React.createElement("option", {
    key: type,
    value: type
  }, type))), /*#__PURE__*/React.createElement(TjInput, {
    placeholder: "Actor",
    value: filter.actor,
    onChange: e => setFilter(f => ({
      ...f,
      actor: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    placeholder: "Search summary or object",
    value: filter.search,
    onChange: e => setFilter(f => ({
      ...f,
      search: e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: filter.state_change_only === 'true',
    onChange: e => setFilter(f => ({
      ...f,
      state_change_only: e.target.checked ? 'true' : 'false'
    }))
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      alignSelf: 'center'
    }
  }, "State changes only"), /*#__PURE__*/React.createElement(TjInput, {
    placeholder: "Filter by action (e.g. approved)",
    value: filter.action,
    onChange: e => setFilter(f => ({
      ...f,
      action: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: load
  }, "Filter")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: 16,
      border: '1px solid #F1F0EE',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Timestamp', 'Actor', 'Action', 'Entity', 'Summary', 'Details'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '12px 14px',
      textAlign: 'left',
      fontSize: 10,
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, logs.map(log => /*#__PURE__*/React.createElement("tr", {
    key: log.id,
    style: {
      borderTop: '1px solid #F1F0EE'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 14px',
      color: '#94A3B8',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11
    }
  }, new Date(log.timestamp).toLocaleString('en-IN')), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 14px',
      fontWeight: 600
    }
  }, log.actor || 'System'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: '#F1F5F9',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700
    }
  }, log.action)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 14px',
      color: '#475569'
    }
  }, log.entity_display_name || log.entity_type), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 14px',
      color: '#334155',
      maxWidth: 260,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, log.change_summary || '—'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 14px',
      color: '#94A3B8',
      maxWidth: 300,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, JSON.stringify(log.details))))))));
};

// ─── USER DETAIL DRAWER ─────────────────────────────────────────────────────

const UserDetailDrawer = ({
  user,
  departments,
  groups,
  open,
  onClose,
  onUpdated
}) => {
  const [editing, setEditing] = React.useState(false);
  const [form, setEditForm] = React.useState({});
  const [resetPwOpen, setResetPwOpen] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [actionMsg, setActionMsg] = React.useState('');
  React.useEffect(() => {
    if (user) {
      setEditForm({
        ...user
      });
      setEditing(false);
      setActionMsg('');
    }
  }, [user]);
  const handleSave = async () => {
    try {
      await window.TijoriAPI.AuthAPI.updateUser(user.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        employee_grade: form.employee_grade,
        groups: form.groups,
        is_active: form.is_active
      });
      setActionMsg('User updated successfully.');
      onUpdated(user.id);
      setEditing(false);
    } catch (e) {
      setActionMsg('Update failed: ' + (e.message || 'Error'));
    }
  };
  const handleDelete = async () => {
    if (!window.confirm(`Delete user ${user.username}? This cannot be undone.`)) return;
    try {
      await window.TijoriAPI.AuthAPI.deleteUser(user.id);
      onClose();
      onUpdated();
    } catch (e) {
      setActionMsg('Delete failed: ' + (e.message || 'Error'));
    }
  };
  const handleToggleActive = async () => {
    try {
      await window.TijoriAPI.AuthAPI.updateUser(user.id, {
        is_active: !user.is_active
      });
      setActionMsg(user.is_active ? 'User suspended.' : 'User activated.');
      onUpdated(user.id);
    } catch (e) {
      setActionMsg('Action failed: ' + (e.message || 'Error'));
    }
  };
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setActionMsg('Password must be at least 8 characters.');
      return;
    }
    try {
      await window.TijoriAPI.AuthAPI.resetPassword(user.id, newPassword);
      setActionMsg('Password reset successfully.');
      setResetPwOpen(false);
      setNewPassword('');
    } catch (e) {
      setActionMsg('Reset failed: ' + (e.message || 'Error'));
    }
  };
  if (!user) return null;
  return /*#__PURE__*/React.createElement(SidePanel, {
    open: open,
    onClose: onClose,
    title: "User Profile",
    width: 480
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 80,
      borderRadius: 20,
      background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
      margin: '0 auto 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 32,
      color: 'white',
      fontWeight: 800
    }
  }, ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || user.username[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: '#0F172A',
      fontFamily: "'Bricolage Grotesque', sans-serif"
    }
  }, user.full_name || user.username), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#94A3B8',
      marginTop: 4
    }
  }, user.email || 'No email provided')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px',
      background: '#F8FAFC',
      borderRadius: 12,
      border: '1px solid #E2E8F0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "Employee Grade"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: GRADE_COLORS[user.employee_grade]
    }
  }, "G", user.employee_grade, " \u2014 ", GRADE_LABELS[user.employee_grade] || 'Custom')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px',
      background: '#F8FAFC',
      borderRadius: 12,
      border: '1px solid #E2E8F0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "Department"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: '#0F172A'
    }
  }, user.department_name || 'Unassigned'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: '#475569'
    }
  }, "Settings & Access"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    small: true,
    onClick: () => setEditing(!editing)
  }, editing ? 'Cancel' : 'Edit')), editing ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "First Name",
    value: form.first_name || '',
    onChange: e => setEditForm(f => ({
      ...f,
      first_name: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Last Name",
    value: form.last_name || '',
    onChange: e => setEditForm(f => ({
      ...f,
      last_name: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Email",
    value: form.email || '',
    onChange: e => setEditForm(f => ({
      ...f,
      email: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: '#475569',
      marginBottom: 6
    }
  }, "Grade"), /*#__PURE__*/React.createElement("select", {
    value: form.employee_grade,
    onChange: e => setEditForm(f => ({
      ...f,
      employee_grade: Number(e.target.value)
    })),
    style: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      background: '#FAFAF8'
    }
  }, Object.entries(GRADE_LABELS).map(([v, l]) => /*#__PURE__*/React.createElement("option", {
    key: v,
    value: v
  }, "G", v, " - ", l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: '#475569',
      marginBottom: 6
    }
  }, "Account Status"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, [true, false].map(active => /*#__PURE__*/React.createElement("button", {
    key: String(active),
    onClick: () => setEditForm(f => ({
      ...f,
      is_active: active
    })),
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 8,
      border: '1.5px solid',
      borderColor: form.is_active === active ? active ? '#10B981' : '#EF4444' : '#E2E8F0',
      background: form.is_active === active ? active ? '#F0FDF4' : '#FEF2F2' : 'white',
      color: form.is_active === active ? active ? '#065F46' : '#991B1B' : '#64748B',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, active ? 'Active' : 'Suspended')))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: '#475569',
      marginBottom: 6
    }
  }, "Groups"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, groups.map(g => {
    const has = (form.groups || []).includes(g.id);
    return /*#__PURE__*/React.createElement("button", {
      key: g.id,
      onClick: () => {
        const next = has ? form.groups.filter(id => id !== g.id) : [...(form.groups || []), g.id];
        setEditForm(f => ({
          ...f,
          groups: next
        }));
      },
      style: {
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px solid',
        borderColor: has ? '#E8783B' : '#E2E8F0',
        background: has ? '#FFF8F5' : 'white',
        color: has ? '#E8783B' : '#64748B',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, g.name);
  }))), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    style: {
      justifyContent: 'center'
    },
    onClick: handleSave
  }, "Save Changes")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid #F1F0EE'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: '#64748B'
    }
  }, "Account Status"), /*#__PURE__*/React.createElement(StatusBadge, {
    status: user.is_active ? 'ACTIVE' : 'SUSPENDED'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid #F1F0EE'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: '#64748B'
    }
  }, "Groups"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, (user.group_names || []).map(g => /*#__PURE__*/React.createElement("span", {
    key: g,
    style: {
      background: '#F1F5F9',
      color: '#475569',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600
    }
  }, g)), (user.group_names || []).length === 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#CBD5E1',
      fontSize: 12
    }
  }, "None")))), !editing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: 4
    }
  }, "Quick Actions"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: handleToggleActive
  }, user.is_active ? 'Suspend User' : 'Activate User'), /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: () => setResetPwOpen(!resetPwOpen)
  }, "Reset Password")), !user.is_superuser && /*#__PURE__*/React.createElement(Btn, {
    variant: "destructive",
    small: true,
    style: {
      justifyContent: 'center'
    },
    onClick: handleDelete
  }, "Delete User")), resetPwOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: '14px 16px',
      background: '#F8F7F5',
      borderRadius: 12,
      border: '1px solid #E2E8F0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#0F172A',
      marginBottom: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Set New Password"), /*#__PURE__*/React.createElement(TjInput, {
    label: "New Password",
    type: "password",
    placeholder: "Minimum 8 characters",
    value: newPassword,
    onChange: e => setNewPassword(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    onClick: () => {
      setResetPwOpen(false);
      setNewPassword('');
    }
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    small: true,
    onClick: handleResetPassword
  }, "Confirm Reset"))), actionMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '10px 14px',
      background: actionMsg.includes('failed') || actionMsg.includes('Failed') ? '#FEE2E2' : '#F0FDF4',
      border: `1px solid ${actionMsg.includes('failed') || actionMsg.includes('Failed') ? '#FECACA' : '#BBF7D0'}`,
      borderRadius: 8,
      fontSize: 12,
      color: actionMsg.includes('failed') || actionMsg.includes('Failed') ? '#991B1B' : '#065F46',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, actionMsg));
};

// ─── MAIN IAM SCREEN ─────────────────────────────────────────────────────────

const IAMScreen = ({
  onNavigate
}) => {
  const [tab, setTab] = React.useState('Users');
  const [users, setUsers] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false);
  const [newUser, setNewUser] = React.useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    employee_grade: 1,
    password: '',
    department_id: ''
  });
  const [createUserLoading, setCreateUserLoading] = React.useState(false);
  const [createUserError, setCreateUserError] = React.useState('');
  const [newGroupName, setNewGroupName] = React.useState('');
  const [newGroupMembers, setNewGroupMembers] = React.useState([]);
  const [addMembersGroup, setAddMembersGroup] = React.useState(null);
  const [addMembersSelected, setAddMembersSelected] = React.useState([]);
  const [addMembersLoading, setAddMembersLoading] = React.useState(false);
  const [editGroupOpen, setEditGroupOpen] = React.useState(false);
  const [editGroup, setEditGroup] = React.useState(null);
  const [editGroupName, setEditGroupName] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const load = React.useCallback((refreshUserId = null) => {
    setLoading(true);
    Promise.allSettled([window.TijoriAPI.AuthAPI.listUsers(), window.TijoriAPI.AuthAPI.listDepartments(), window.TijoriAPI.AuthAPI.listGroups()]).then(([uRes, dRes, gRes]) => {
      let latestUsers = users;
      if (uRes.status === 'fulfilled') {
        latestUsers = uRes.value || [];
        setUsers(latestUsers);
      }
      if (dRes.status === 'fulfilled') setDepartments(dRes.value || []);
      if (gRes.status === 'fulfilled') setGroups(gRes.value || []);
      setSelectedUser(prev => {
        const targetId = refreshUserId || (prev ? prev.id : null);
        if (!targetId) return prev;
        return latestUsers.find(x => x.id === targetId) || prev;
      });
      setLoading(false);
    });
  }, [users]);
  React.useEffect(() => {
    load();
  }, [load]);
  const handleExportUsers = async () => {
    try {
      const blob = await window.TijoriAPI.AuthAPI.exportUsers();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financeai_users_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  };
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
    admins: users.filter(u => u.employee_grade >= 4 || u.is_superuser).length
  };
  const tabs = ['Users', 'Groups', 'Roles & Permissions', 'Audit Log'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32,
      height: '100%',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, "\uD83D\uDD10 Identity & Access Management"),
    subtitle: "Manage users, roles, and permissions. Grade-based RBAC with full audit trail.",
    right: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Btn, {
      variant: "secondary",
      onClick: load
    }, "\u21BB Refresh"), /*#__PURE__*/React.createElement(Btn, {
      variant: "secondary",
      onClick: handleExportUsers
    }, "\u2193 Export Users"), /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement("span", null, "+"),
      onClick: () => setCreateOpen(true)
    }, "Create User"))
  }), /*#__PURE__*/React.createElement(StatsRow, {
    cards: [{
      label: 'Total Users',
      value: String(stats.total),
      delta: 'All roles',
      deltaType: 'neutral'
    }, {
      label: 'Active',
      value: String(stats.active),
      delta: 'Verified access',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'Suspended',
      value: String(stats.suspended),
      delta: 'Access revoked',
      deltaType: 'negative',
      color: '#EF4444'
    }, {
      label: 'Admins (G4+)',
      value: String(stats.admins),
      delta: 'Finance Admin & CFO',
      deltaType: 'neutral',
      color: '#E8783B'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      borderBottom: '2px solid #F1F0EE',
      marginBottom: 24,
      gap: 0
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setTab(t),
    style: {
      padding: '10px 22px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: tab === t ? 700 : 500,
      fontSize: 13,
      color: tab === t ? '#0F172A' : '#94A3B8',
      borderBottom: `3px solid ${tab === t ? '#E8783B' : 'transparent'}`,
      marginBottom: -2,
      transition: 'all 150ms',
      whiteSpace: 'nowrap'
    }
  }, t))), tab === 'Users' && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'fadeUp 220ms ease both'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginBottom: 16,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Search by name, email or username\u2026",
    style: {
      width: '100%',
      padding: '9px 12px 9px 34px',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      fontSize: 13,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none',
      background: '#FAFAF8'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#94A3B8'
    }
  }, "\uD83D\uDD0D")), /*#__PURE__*/React.createElement("select", {
    value: gradeFilter,
    onChange: e => setGradeFilter(Number(e.target.value)),
    style: {
      padding: '9px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      fontSize: 13,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none',
      background: '#FAFAF8',
      color: '#0F172A',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: 0
  }, "All Grades"), Object.entries(GRADE_LABELS).map(([g, label]) => /*#__PURE__*/React.createElement("option", {
    key: g,
    value: Number(g)
  }, "G", g, " \u2014 ", label))), /*#__PURE__*/React.createElement("select", {
    value: statusFilter,
    onChange: e => setStatusFilter(e.target.value),
    style: {
      padding: '9px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      fontSize: 13,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      outline: 'none',
      background: '#FAFAF8',
      color: '#0F172A',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "ALL"
  }, "All Status"), /*#__PURE__*/React.createElement("option", {
    value: "ACTIVE"
  }, "Active Only"), /*#__PURE__*/React.createElement("option", {
    value: "SUSPENDED"
  }, "Suspended Only"))), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 60,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 24,
      height: 24,
      border: '2.5px solid rgba(15,23,42,0.1)',
      borderTopColor: '#E8783B',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      margin: '0 auto 12px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Loading users\u2026")) : /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['User', 'Grade / Role', 'Department', 'Groups', 'Status', 'Actions'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: 10,
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtered.map(u => {
    const gColor = u.is_superuser ? '#E8783B' : GRADE_COLORS[u.employee_grade] || '#94A3B8';
    const gLabel = u.is_superuser ? 'CFO' : GRADE_LABELS[u.employee_grade] || `G${u.employee_grade}`;
    const initials = ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || u.username?.slice(0, 2).toUpperCase();
    return /*#__PURE__*/React.createElement("tr", {
      key: u.id,
      style: {
        borderTop: '1px solid #F1F0EE',
        cursor: 'pointer',
        transition: 'background 150ms'
      },
      onMouseEnter: e => e.currentTarget.style.background = '#FFF8F5',
      onMouseLeave: e => e.currentTarget.style.background = 'white',
      onClick: () => setSelectedUser(u)
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 9,
        background: `linear-gradient(135deg, ${gColor}, ${gColor}99)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        fontSize: 12,
        color: 'white',
        flexShrink: 0
      }
    }, initials), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, u.first_name || u.username, " ", u.last_name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: "'JetBrains Mono', monospace"
      }
    }, u.email || u.username)))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        background: gColor + '22',
        color: gColor,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        display: 'inline-block'
      }
    }, u.is_superuser ? '⭐ CFO' : `G${u.employee_grade}`, " \xB7 ", gLabel))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px',
        fontSize: 12,
        color: '#475569',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, u.department_name || '—'), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4
      }
    }, (u.group_names || []).map(g => /*#__PURE__*/React.createElement("span", {
      key: g,
      style: {
        background: '#F1F5F9',
        color: '#475569',
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600
      }
    }, g)), (u.group_names || []).length === 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#CBD5E1',
        fontSize: 11
      }
    }, "No groups"))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: u.is_active ? '#10B981' : '#DC2626',
        display: 'block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: u.is_active ? '#059669' : '#DC2626',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, u.is_active ? 'ACTIVE' : 'SUSPENDED'))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement(Btn, {
      variant: "secondary",
      small: true,
      onClick: e => {
        e.stopPropagation();
        setSelectedUser(u);
      }
    }, "Edit")));
  }))))), tab === 'Groups' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
      animation: 'fadeUp 220ms ease both'
    }
  }, groups.map(g => {
    const members = users.filter(u => u.group_names?.includes(g.name));
    return /*#__PURE__*/React.createElement(Card, {
      key: g.id,
      style: {
        padding: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 10,
        background: '#F5F3FF',
        color: '#7C3AED',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20
      }
    }, "\uD83D\uDC65"), /*#__PURE__*/React.createElement(Btn, {
      variant: "ghost",
      small: true,
      onClick: () => {
        setEditGroup(g);
        setEditGroupName(g.name);
        setEditGroupOpen(true);
      }
    }, "Edit")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: 17,
        color: '#0F172A'
      }
    }, g.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, members.length, " member", members.length !== 1 ? 's' : ''), members.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 10
      }
    }, members.slice(0, 4).map(u => /*#__PURE__*/React.createElement("span", {
      key: u.id,
      style: {
        background: '#F1F5F9',
        color: '#475569',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600
      }
    }, u.first_name || u.username)), members.length > 4 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: '#94A3B8'
      }
    }, "+", members.length - 4, " more")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        borderTop: '1px solid #F1F0EE',
        paddingTop: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setAddMembersGroup(g);
        setAddMembersSelected(members.map(u => u.id));
      },
      style: {
        width: '100%',
        padding: '8px',
        borderRadius: 8,
        border: '1px solid #E8783B',
        background: '#FFF8F5',
        color: '#E8783B',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: 'all 150ms'
      },
      onMouseEnter: e => {
        e.currentTarget.style.background = '#E8783B';
        e.currentTarget.style.color = 'white';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = '#FFF8F5';
        e.currentTarget.style.color = '#E8783B';
      }
    }, "+ Add / Manage Members")));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setCreateGroupOpen(true);
      setNewGroupMembers([]);
    },
    style: {
      background: 'none',
      border: '2px dashed #E2E8F0',
      borderRadius: 16,
      padding: 20,
      cursor: 'pointer',
      transition: 'all 200ms',
      minHeight: 140
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = '#E8783B';
      e.currentTarget.style.background = '#FFF8F5';
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = '#E2E8F0';
      e.currentTarget.style.background = 'none';
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      color: '#94A3B8',
      marginBottom: 8
    }
  }, "+"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Create New Group"))), tab === 'Roles & Permissions' && /*#__PURE__*/React.createElement(RBACMatrixView, null), tab === 'Audit Log' && /*#__PURE__*/React.createElement(AuditLogView, null), /*#__PURE__*/React.createElement(TjModal, {
    open: createOpen,
    onClose: () => {
      setCreateOpen(false);
      setCreateUserError('');
    },
    title: "Create New User",
    width: 500
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "First Name *",
    placeholder: "Rahul",
    value: newUser.first_name,
    onChange: e => setNewUser(u => ({
      ...u,
      first_name: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Last Name *",
    placeholder: "Mehta",
    value: newUser.last_name,
    onChange: e => setNewUser(u => ({
      ...u,
      last_name: e.target.value
    }))
  })), /*#__PURE__*/React.createElement(TjInput, {
    label: "Username *",
    placeholder: "rahul.mehta",
    value: newUser.username,
    onChange: e => setNewUser(u => ({
      ...u,
      username: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Email *",
    type: "email",
    placeholder: "rahul.mehta@company.com",
    value: newUser.email,
    onChange: e => setNewUser(u => ({
      ...u,
      email: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Password *",
    type: "password",
    placeholder: "Minimum 8 characters",
    value: newUser.password,
    onChange: e => setNewUser(u => ({
      ...u,
      password: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: '#475569',
      marginBottom: 6,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Employee Grade *"), /*#__PURE__*/React.createElement("select", {
    value: newUser.employee_grade,
    onChange: e => setNewUser(u => ({
      ...u,
      employee_grade: Number(e.target.value)
    })),
    style: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 13,
      color: '#0F172A',
      background: '#FAFAF8',
      outline: 'none'
    }
  }, Object.entries(GRADE_LABELS).map(([g, label]) => /*#__PURE__*/React.createElement("option", {
    key: g,
    value: Number(g)
  }, "G", g, " \u2014 ", label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: '#475569',
      marginBottom: 6,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Department"), /*#__PURE__*/React.createElement("select", {
    value: newUser.department_id,
    onChange: e => setNewUser(u => ({
      ...u,
      department_id: e.target.value
    })),
    style: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 13,
      color: '#0F172A',
      background: '#FAFAF8',
      outline: 'none'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 No Department \u2014"), departments.map(d => /*#__PURE__*/React.createElement("option", {
    key: d.id,
    value: d.id
  }, d.name)))), createUserError && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEE2E2',
      border: '1px solid #FECACA',
      borderRadius: 8,
      padding: '10px 14px',
      marginBottom: 12,
      fontSize: 12,
      color: '#991B1B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, createUserError), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => {
      setCreateOpen(false);
      setCreateUserError('');
    }
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    disabled: createUserLoading,
    onClick: async () => {
      if (!newUser.username || !newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name) {
        setCreateUserError('All required fields must be filled.');
        return;
      }
      setCreateUserLoading(true);
      setCreateUserError('');
      try {
        const payload = {
          username: newUser.username,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          employee_grade: newUser.employee_grade,
          password: newUser.password
        };
        if (newUser.department_id) payload.department = newUser.department_id;
        await window.TijoriAPI.AuthAPI.createUser(payload);
        setCreateOpen(false);
        setNewUser({
          username: '',
          email: '',
          first_name: '',
          last_name: '',
          employee_grade: 1,
          password: '',
          department_id: ''
        });
        load();
      } catch (e) {
        setCreateUserError(e.message || 'Failed to create user.');
      } finally {
        setCreateUserLoading(false);
      }
    }
  }, createUserLoading ? 'Creating…' : 'Create User'))), /*#__PURE__*/React.createElement(TjModal, {
    open: createGroupOpen,
    onClose: () => setCreateGroupOpen(false),
    title: "Create Security Group",
    width: 480
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Group Name *",
    placeholder: "e.g. Finance Approvers",
    value: newGroupName,
    onChange: e => setNewGroupName(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: '#475569',
      marginBottom: 8,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Add Members (optional)"), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 200,
      overflowY: 'auto',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      background: '#FAFAF8'
    }
  }, users.filter(u => u.is_active).map(u => {
    const selected = newGroupMembers.includes(u.id);
    return /*#__PURE__*/React.createElement("div", {
      key: u.id,
      onClick: () => setNewGroupMembers(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id]),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid #F1F0EE',
        background: selected ? '#FFF8F5' : 'transparent',
        transition: 'background 150ms'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 18,
        height: 18,
        borderRadius: 4,
        border: `2px solid ${selected ? '#E8783B' : '#CBD5E1'}`,
        background: selected ? '#E8783B' : 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 150ms'
      }
    }, selected && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'white',
        fontSize: 11,
        lineHeight: 1
      }
    }, "\u2713")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: '#0F172A'
      }
    }, u.first_name, " ", u.last_name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#94A3B8'
      }
    }, u.username, " \xB7 G", u.employee_grade, " ", GRADE_LABELS[u.employee_grade] || '')));
  })), newGroupMembers.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#E8783B',
      marginTop: 6,
      fontWeight: 600
    }
  }, newGroupMembers.length, " user", newGroupMembers.length !== 1 ? 's' : '', " selected")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'flex-end',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => {
      setCreateGroupOpen(false);
      setNewGroupName('');
      setNewGroupMembers([]);
    }
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: async () => {
      if (!newGroupName) return;
      try {
        await window.TijoriAPI.AuthAPI.createGroup(newGroupName, newGroupMembers);
      } catch (e) {
        alert(e.message || 'Group creation failed');
        return;
      }
      setCreateGroupOpen(false);
      setNewGroupName('');
      setNewGroupMembers([]);
      load();
    }
  }, "Create Group"))), /*#__PURE__*/React.createElement(TjModal, {
    open: !!addMembersGroup,
    onClose: () => setAddMembersGroup(null),
    title: `Members — ${addMembersGroup?.name || ''}`,
    width: 480
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64748B',
      marginBottom: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Toggle active users to add or remove them from this group."), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 320,
      overflowY: 'auto',
      border: '1.5px solid #E2E8F0',
      borderRadius: 10,
      background: '#FAFAF8'
    }
  }, users.filter(u => u.is_active).map(u => {
    const selected = addMembersSelected.includes(u.id);
    return /*#__PURE__*/React.createElement("div", {
      key: u.id,
      onClick: () => setAddMembersSelected(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id]),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid #F1F0EE',
        background: selected ? '#FFF8F5' : 'transparent',
        transition: 'background 150ms'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 18,
        height: 18,
        borderRadius: 4,
        border: `2px solid ${selected ? '#E8783B' : '#CBD5E1'}`,
        background: selected ? '#E8783B' : 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 150ms'
      }
    }, selected && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'white',
        fontSize: 11,
        lineHeight: 1
      }
    }, "\u2713")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: '#0F172A'
      }
    }, u.first_name, " ", u.last_name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#94A3B8'
      }
    }, u.username, " \xB7 G", u.employee_grade, " ", GRADE_LABELS[u.employee_grade] || '', " \xB7 ", u.department_name || 'No dept')), selected && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#E8783B',
        background: '#FFF8F5',
        padding: '2px 6px',
        borderRadius: 4
      }
    }, "MEMBER"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: 8
    }
  }, addMembersSelected.length, " member", addMembersSelected.length !== 1 ? 's' : '', " selected"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'flex-end',
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setAddMembersGroup(null)
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    disabled: addMembersLoading,
    onClick: async () => {
      if (!addMembersGroup) return;
      setAddMembersLoading(true);
      try {
        // For each active user, update their groups to include/exclude this group
        await Promise.all(users.filter(u => u.is_active).map(u => {
          const shouldBeMember = addMembersSelected.includes(u.id);
          const currentGroupIds = u.groups || [];
          const hasGroup = currentGroupIds.includes(addMembersGroup.id);
          if (shouldBeMember && !hasGroup) {
            return window.TijoriAPI.AuthAPI.updateUser(u.id, {
              groups: [...currentGroupIds, addMembersGroup.id]
            });
          } else if (!shouldBeMember && hasGroup) {
            return window.TijoriAPI.AuthAPI.updateUser(u.id, {
              groups: currentGroupIds.filter(id => id !== addMembersGroup.id)
            });
          }
          return Promise.resolve();
        }));
        setAddMembersGroup(null);
        load();
      } catch (e) {
        alert(e.message || 'Failed to update members');
      } finally {
        setAddMembersLoading(false);
      }
    }
  }, addMembersLoading ? 'Saving…' : 'Save Members'))), /*#__PURE__*/React.createElement(TjModal, {
    open: editGroupOpen,
    onClose: () => setEditGroupOpen(false),
    title: "Edit Group"
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Group Name",
    value: editGroupName,
    onChange: e => setEditGroupName(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'flex-end',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setEditGroupOpen(false)
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: async () => {
      if (!editGroup || !editGroupName) return;
      try {
        await window.TijoriAPI.AuthAPI.updateGroup(editGroup.id, {
          name: editGroupName
        });
      } catch (e) {
        alert(e.message || 'Update failed');
        return;
      }
      setEditGroupOpen(false);
      load();
    }
  }, "Save Changes"))), /*#__PURE__*/React.createElement(UserDetailDrawer, {
    user: selectedUser,
    departments: departments,
    groups: groups,
    open: !!selectedUser,
    onClose: () => setSelectedUser(null),
    onUpdated: id => {
      load(id);
    }
  }));
};
Object.assign(window, {
  IAMScreen
});