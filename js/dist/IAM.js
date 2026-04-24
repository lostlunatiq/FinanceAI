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
  const [filter, setFilter] = React.useState({
    action: '',
    entity_type: ''
  });
  const load = React.useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter.action) params.action = filter.action;
    if (filter.entity_type) params.entity_type = filter.entity_type;
    window.TijoriAPI.AuthAPI.getAuditLog(params).then(data => setLogs(data.results || [])).catch(() => {}).finally(() => setLoading(false));
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
  }, "All Entities"), /*#__PURE__*/React.createElement("option", {
    value: "EXPENSE"
  }, "Expense"), /*#__PURE__*/React.createElement("option", {
    value: "VENDOR"
  }, "Vendor"), /*#__PURE__*/React.createElement("option", {
    value: "USER"
  }, "User"), /*#__PURE__*/React.createElement("option", {
    value: "BUDGET"
  }, "Budget")), /*#__PURE__*/React.createElement(TjInput, {
    placeholder: "Filter by action (e.g. LOGIN)",
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
  }, ['Timestamp', 'User', 'Action', 'Entity', 'Details'].map(h => /*#__PURE__*/React.createElement("th", {
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
  }, log.user_full_name || 'System'), /*#__PURE__*/React.createElement("td", {
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
  }, log.entity_type), /*#__PURE__*/React.createElement("td", {
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
  React.useEffect(() => {
    if (user) setEditForm({
      ...user
    });
  }, [user]);
  const handleSave = async () => {
    try {
      await window.TijoriAPI.AuthAPI.updateUser(user.id, form);
      onUpdated();
      setEditing(false);
    } catch (e) {
      alert(e.message || 'Update failed');
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
  }, user.full_name), /*#__PURE__*/React.createElement("div", {
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
  }, "G", user.employee_grade, " \u2014 ", GRADE_LABELS[user.employee_grade])), /*#__PURE__*/React.createElement("div", {
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
    value: form.first_name,
    onChange: e => setEditForm(f => ({
      ...f,
      first_name: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Last Name",
    value: form.last_name,
    onChange: e => setEditForm(f => ({
      ...f,
      last_name: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Email",
    value: form.email,
    onChange: e => setEditForm(f => ({
      ...f,
      email: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
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
      marginBottom: 16
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
  }, "None")))));
};

// ─── MAIN IAM SCREEN ─────────────────────────────────────────────────────────

const CreateUserModal = ({
  open,
  onClose,
  departments,
  groups,
  onCreated
}) => {
  const [form, setForm] = React.useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    employee_grade: 1,
    department: '',
    password: '',
    groups: []
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const handleCreate = async () => {
    if (!form.username || !form.password) {
      setError('Username and password are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await window.TijoriAPI.AuthAPI.createUser(form);
      onCreated();
      onClose();
      setForm({ username: '', first_name: '', last_name: '', email: '', employee_grade: 1, department: '', password: '', groups: [] });
    } catch (e) {
      setError(e.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };
  return /*#__PURE__*/React.createElement(TjModal, {
    open: open,
    onClose: onClose,
    title: "Create New User",
    width: 480
  }, /*#__PURE__*/React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
    /*#__PURE__*/React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
      /*#__PURE__*/React.createElement(TjInput, { label: "First Name", value: form.first_name, onChange: e => setForm(f => ({ ...f, first_name: e.target.value })) }),
      /*#__PURE__*/React.createElement(TjInput, { label: "Last Name", value: form.last_name, onChange: e => setForm(f => ({ ...f, last_name: e.target.value })) })
    ),
    /*#__PURE__*/React.createElement(TjInput, { label: "Username *", value: form.username, onChange: e => setForm(f => ({ ...f, username: e.target.value })) }),
    /*#__PURE__*/React.createElement(TjInput, { label: "Email", value: form.email, onChange: e => setForm(f => ({ ...f, email: e.target.value })) }),
    /*#__PURE__*/React.createElement(TjInput, { label: "Password *", type: "password", value: form.password, onChange: e => setForm(f => ({ ...f, password: e.target.value })) }),
    /*#__PURE__*/React.createElement("div", { style: { marginBottom: 4 } },
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" } }, "Employee Grade"),
      /*#__PURE__*/React.createElement("select", {
        value: form.employee_grade,
        onChange: e => setForm(f => ({ ...f, employee_grade: Number(e.target.value) })),
        style: { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: '#FAFAF8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13 }
      },
        Object.entries(GRADE_LABELS).map(([v, l]) => /*#__PURE__*/React.createElement("option", { key: v, value: v }, "G", v, " - ", l))
      )
    ),
    /*#__PURE__*/React.createElement("div", { style: { marginBottom: 4 } },
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" } }, "Department"),
      /*#__PURE__*/React.createElement("select", {
        value: form.department,
        onChange: e => setForm(f => ({ ...f, department: e.target.value })),
        style: { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: '#FAFAF8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13 }
      },
        /*#__PURE__*/React.createElement("option", { value: '' }, "No Department"),
        departments.map(d => /*#__PURE__*/React.createElement("option", { key: d.id, value: d.id }, d.name))
      )
    ),
    /*#__PURE__*/React.createElement("div", { style: { marginBottom: 4 } },
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" } }, "Groups"),
      /*#__PURE__*/React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
        groups.map(g => {
          const has = form.groups.includes(g.id);
          return /*#__PURE__*/React.createElement("button", {
            key: g.id,
            onClick: () => setForm(f => ({ ...f, groups: has ? f.groups.filter(id => id !== g.id) : [...f.groups, g.id] })),
            style: { padding: '4px 10px', borderRadius: 6, border: '1px solid', borderColor: has ? '#E8783B' : '#E2E8F0', background: has ? '#FFF8F5' : 'white', color: has ? '#E8783B' : '#64748B', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }
          }, g.name);
        })
      )
    ),
    error && /*#__PURE__*/React.createElement("div", { style: { background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" } }, error),
    /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 } },
      /*#__PURE__*/React.createElement(Btn, { variant: "secondary", onClick: onClose }, "Cancel"),
      /*#__PURE__*/React.createElement(Btn, { variant: "primary", onClick: handleCreate, disabled: saving }, saving ? 'Creating…' : 'Create User')
    )
  ));
};

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
  const [newGroupName, setNewGroupName] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const load = React.useCallback(() => {
    setLoading(true);
    Promise.allSettled([window.TijoriAPI.AuthAPI.listUsers(), window.TijoriAPI.AuthAPI.listDepartments(), window.TijoriAPI.AuthAPI.listGroups()]).then(([uRes, dRes, gRes]) => {
      if (uRes.status === 'fulfilled') setUsers(uRes.value || []);
      if (dRes.status === 'fulfilled') setDepartments(dRes.value || []);
      if (gRes.status === 'fulfilled') setGroups(gRes.value || []);
      setLoading(false);
    });
  }, []);
  const handleDeleteUser = async (uid) => {
    try {
      await window.TijoriAPI.AuthAPI.deleteUser(uid);
      setDeleteConfirm(null);
      load();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };
  const handleSuspendUser = async (uid, isActive) => {
    try {
      await window.TijoriAPI.AuthAPI.updateUser(uid, { is_active: !isActive });
      load();
    } catch (e) {
      alert(e.message || 'Update failed');
    }
  };
  React.useEffect(() => {
    load();
  }, [load]);
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
    }, /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 4 } },
      /*#__PURE__*/React.createElement(Btn, {
        variant: "secondary",
        small: true,
        onClick: e => { e.stopPropagation(); setSelectedUser(u); }
      }, "Edit"),
      /*#__PURE__*/React.createElement(Btn, {
        variant: "ghost",
        small: true,
        onClick: e => { e.stopPropagation(); handleSuspendUser(u.id, u.is_active); },
        style: { background: u.is_active ? '#FFF7ED' : '#F0FDF4', color: u.is_active ? '#C2410C' : '#059669', border: '1px solid', borderColor: u.is_active ? '#FED7AA' : '#BBF7D0', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }
      }, u.is_active ? 'Suspend' : 'Activate'),
      /*#__PURE__*/React.createElement(Btn, {
        variant: "destructive",
        small: true,
        onClick: e => { e.stopPropagation(); setDeleteConfirm(u); }
      }, "Remove")
    )));
  }))))), tab === 'Groups' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
      animation: 'fadeUp 220ms ease both'
    }
  }, groups.map(g => /*#__PURE__*/React.createElement(Card, {
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
    small: true
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
  }, users.filter(u => u.group_names?.includes(g.name)).length, " members"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      borderTop: '1px solid #F1F0EE',
      paddingTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      cursor: 'pointer'
    }
  }, "View Members \u2192"))))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCreateGroupOpen(true),
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
    open: createGroupOpen,
    onClose: () => setCreateGroupOpen(false),
    title: "Create Security Group"
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Group Name",
    placeholder: "e.g. Finance Approvers",
    value: newGroupName,
    onChange: e => setNewGroupName(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'flex-end',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setCreateGroupOpen(false)
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: async () => {
      if (!newGroupName) return;
      await window.TijoriAPI.AuthAPI.createGroup(newGroupName);
      setCreateGroupOpen(false);
      setNewGroupName('');
      load();
    }
  }, "Create Group"))), /*#__PURE__*/React.createElement(CreateUserModal, {
    open: createOpen,
    onClose: () => setCreateOpen(false),
    departments: departments,
    groups: groups,
    onCreated: () => { load(); }
  }), /*#__PURE__*/React.createElement(TjModal, {
    open: !!deleteConfirm,
    onClose: () => setDeleteConfirm(null),
    title: "Remove User"
  }, deleteConfirm && /*#__PURE__*/React.createElement("div", null,
    /*#__PURE__*/React.createElement("div", { style: { background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: '#991B1B', fontFamily: "'Plus Jakarta Sans', sans-serif" } },
      "Are you sure you want to permanently remove ",
      /*#__PURE__*/React.createElement("strong", null, deleteConfirm.full_name || deleteConfirm.username),
      "? This action cannot be undone."
    ),
    /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } },
      /*#__PURE__*/React.createElement(Btn, { variant: "secondary", onClick: () => setDeleteConfirm(null) }, "Cancel"),
      /*#__PURE__*/React.createElement(Btn, { variant: "destructive", onClick: () => handleDeleteUser(deleteConfirm.id) }, "Remove User")
    )
  )), /*#__PURE__*/React.createElement(UserDetailDrawer, {
    user: selectedUser,
    departments: departments,
    groups: groups,
    open: !!selectedUser,
    onClose: () => setSelectedUser(null),
    onUpdated: () => {
      load();
      setSelectedUser(null);
    }
  }));
};
Object.assign(window, {
  IAMScreen
});
