// Tijori AI — Secondary Screens

// ─── VENDOR MANAGEMENT ───────────────────────────────────────────────────────

const VENDORS = [{
  id: 'VND-001',
  name: 'TechLogistics Solutions Global',
  gst: '27AABCT3518Q1ZL',
  category: 'Logistics',
  status: 'ACTIVE',
  outstanding: '₹3,40,000'
}, {
  id: 'VND-002',
  name: 'NovaBridge Infra Ltd.',
  gst: '29AACCN2609R1ZP',
  category: 'Infrastructure',
  status: 'ACTIVE',
  outstanding: '₹8,40,000'
}, {
  id: 'VND-003',
  name: 'GlobalSync Technologies',
  gst: '06AACGG1234K1ZA',
  category: 'IT Services',
  status: 'ACTIVE',
  outstanding: '₹1,22,500'
}, {
  id: 'VND-004',
  name: 'Sigma Electrical Works',
  gst: '09AACGS5678M1ZB',
  category: 'Electrical',
  status: 'PENDING',
  outstanding: '₹2,15,500'
}, {
  id: 'VND-005',
  name: 'Acme Office Supplies',
  gst: '24AACGA9012N1ZC',
  category: 'Supplies',
  status: 'ACTIVE',
  outstanding: '₹45,200'
}, {
  id: 'VND-006',
  name: 'ShellBridge Exports',
  gst: '33AACGS3456P1ZD',
  category: 'Exports',
  status: 'SUSPENDED',
  outstanding: '₹0'
}];
const VendorsScreen = ({
  onNavigate
}) => {
  const [addOpen, setAddOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [detail, setDetail] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [vendors, setVendors] = React.useState([]);
  const [loadingVendors, setLoadingVendors] = React.useState(true);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [vendorForm, setVendorForm] = React.useState({
    name: '',
    gstin: '',
    pan: '',
    vendor_type: 'general',
    email: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    create_portal_user: false,
    portal_username: '',
    portal_password: ''
  });
  const {
    VendorAPI
  } = window.TijoriAPI;
  const loadVendors = () => {
    setLoadingVendors(true);
    VendorAPI.listAll().then(data => setVendors(data || [])).catch(() => {}).finally(() => setLoadingVendors(false));
  };
  React.useEffect(() => {
    loadVendors();
  }, []);
  const filtered = vendors.filter(v => {
    const ms = statusFilter === 'ALL' || v.status === statusFilter;
    const mq = !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.gstin?.includes(search);
    return ms && mq;
  });
  const vf = field => e => setVendorForm(f => ({
    ...f,
    [field]: e.target.value
  }));
  const handleSaveVendor = async () => {
    if (!vendorForm.name.trim()) {
      setSaveError('Vendor name is required.');
      return;
    }
    setSaveLoading(true);
    setSaveError('');
    try {
      const payload = {
        name: vendorForm.name,
        gstin: vendorForm.gstin || '',
        pan: vendorForm.pan || '',
        vendor_type: vendorForm.vendor_type || 'general',
        email: vendorForm.email || '',
        bank_account_name: vendorForm.bank_account_name || vendorForm.name,
        bank_account_number: vendorForm.bank_account_number || '',
        bank_ifsc: vendorForm.bank_ifsc || ''
      };
      if (vendorForm.create_portal_user && vendorForm.portal_username && vendorForm.portal_password) {
        payload.create_portal_user = true;
        payload.portal_username = vendorForm.portal_username;
        payload.portal_password = vendorForm.portal_password;
      }
      await VendorAPI.create(payload);
      setAddOpen(false);
      setVendorForm({
        name: '',
        gstin: '',
        pan: '',
        vendor_type: 'general',
        email: '',
        bank_account_name: '',
        bank_account_number: '',
        bank_ifsc: '',
        create_portal_user: false,
        portal_username: '',
        portal_password: ''
      });
      loadVendors();
    } catch (err) {
      setSaveError(err.message || 'Failed to save vendor.');
    } finally {
      setSaveLoading(false);
    }
  };
  const steps = ['Basic Info', 'Bank & Portal'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Vendor Management",
    subtitle: "Registry of all approved, pending, and suspended vendors.",
    right: /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement("span", null, "+"),
      onClick: () => {
        setAddOpen(true);
        setStep(0);
      }
    }, "Add Vendor")
  }), /*#__PURE__*/React.createElement(StatsRow, {
    cards: [{
      label: 'Total Vendors',
      value: loadingVendors ? '…' : String(vendors.length),
      delta: 'registered',
      deltaType: 'positive'
    }, {
      label: 'Active',
      value: loadingVendors ? '…' : String(vendors.filter(v => v.status === 'ACTIVE').length),
      delta: 'Verified',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'Pending Approval',
      value: loadingVendors ? '…' : String(vendors.filter(v => v.status === 'PENDING').length),
      delta: 'Awaiting review',
      deltaType: 'neutral',
      color: '#F59E0B'
    }, {
      label: 'Suspended',
      value: loadingVendors ? '…' : String(vendors.filter(v => v.status === 'SUSPENDED').length),
      delta: 'Blocked',
      deltaType: 'negative',
      color: '#EF4444'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px',
      marginBottom: '16px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Search by name or GST\u2026",
    style: {
      width: '100%',
      padding: '9px 12px 9px 34px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '10px',
      fontSize: '13px',
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
  }, "\uD83D\uDD0D")), ['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED'].map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    onClick: () => setStatusFilter(f),
    style: {
      padding: '6px 14px',
      borderRadius: '999px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: statusFilter === f ? '#E8783B' : '#F8F7F5',
      color: statusFilter === f ? 'white' : '#64748B'
    }
  }, f))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '16px',
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
  }, ['Vendor Name', 'GST / PAN', 'Category', 'Status', 'Outstanding', 'Actions'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtered.map(v => /*#__PURE__*/React.createElement("tr", {
    key: v.id,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 52,
      cursor: 'pointer',
      transition: 'background 150ms'
    },
    onMouseEnter: e => e.currentTarget.style.background = '#FFF8F5',
    onMouseLeave: e => e.currentTarget.style.background = 'white',
    onClick: () => setDetail(v)
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: '13px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, v.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#94A3B8',
      fontFamily: "'JetBrains Mono', monospace",
      marginTop: '2px'
    }
  }, String(v.id).slice(0, 8))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: '#475569'
    }
  }, v.gstin || '—'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, v.vendor_type || '—'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: v.status
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '14px',
      color: '#E8783B',
      letterSpacing: '-0.5px'
    }
  }, v.pending_invoices ? `${v.pending_invoices} pending` : '—'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    onClick: () => setDetail(v)
  }, "View"), v.status === 'SUSPENDED' && /*#__PURE__*/React.createElement(Btn, {
    variant: "green",
    small: true,
    onClick: async () => {
      await window.TijoriAPI.VendorAPI.activate(v.id, 'activate');
      setVendors(vs => vs.map(x => x.id === v.id ? {
        ...x,
        status: 'ACTIVE'
      } : x));
    }
  }, "Activate"), v.status === 'ACTIVE' && /*#__PURE__*/React.createElement(Btn, {
    variant: "destructive",
    small: true,
    onClick: async () => {
      await window.TijoriAPI.VendorAPI.activate(v.id, 'suspend');
      setVendors(vs => vs.map(x => x.id === v.id ? {
        ...x,
        status: 'SUSPENDED'
      } : x));
    }
  }, "Suspend"), v.status === 'PENDING' && /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    small: true,
    onClick: async () => {
      await window.TijoriAPI.VendorAPI.activate(v.id, 'activate');
      setVendors(vs => vs.map(x => x.id === v.id ? {
        ...x,
        status: 'ACTIVE',
        is_approved: true
      } : x));
    }
  }, "Approve"))))), loadingVendors && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "7",
    style: {
      padding: '32px',
      textAlign: 'center',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px'
    }
  }, "Loading vendors\u2026"))))), /*#__PURE__*/React.createElement(TjModal, {
    open: addOpen,
    onClose: () => {
      setAddOpen(false);
      setSaveError('');
    },
    title: "Add New Vendor",
    width: 520
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px'
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: i <= step ? '#E8783B' : '#F1F5F9',
      color: i <= step ? 'white' : '#94A3B8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      flexShrink: 0,
      transition: 'all 200ms'
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: i === step ? '#0F172A' : '#94A3B8',
      fontWeight: i === step ? 700 : 400,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, s), i < steps.length - 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 1,
      background: i < step ? '#E8783B' : '#E2E8F0',
      marginLeft: 4
    }
  })))), step === 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TjInput, {
    label: "Vendor Name *",
    placeholder: "Full registered business name",
    value: vendorForm.name,
    onChange: vf('name')
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "GST Number",
    placeholder: "22AAAAA0000A1Z5 (15 chars)",
    value: vendorForm.gstin,
    onChange: vf('gstin')
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "PAN",
    placeholder: "AAAAA0000A (10 chars)",
    value: vendorForm.pan,
    onChange: vf('pan')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#475569',
      marginBottom: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Category"), /*#__PURE__*/React.createElement("select", {
    value: vendorForm.vendor_type,
    onChange: vf('vendor_type'),
    style: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '10px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '14px',
      color: '#0F172A',
      background: '#FAFAF8',
      outline: 'none'
    }
  }, ['general', 'saas', 'cloud_infra', 'logistics', 'hr', 'legal', 'supplies', 'marketing', 'professional'].map(t => /*#__PURE__*/React.createElement("option", {
    key: t,
    value: t
  }, t.replace('_', ' '))))), /*#__PURE__*/React.createElement(TjInput, {
    label: "Contact Email",
    placeholder: "accounts@vendor.com",
    type: "email",
    value: vendorForm.email,
    onChange: vf('email')
  })), step === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TjInput, {
    label: "Bank Account Number",
    placeholder: "Enter account number",
    value: vendorForm.bank_account_number,
    onChange: vf('bank_account_number')
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "IFSC Code",
    placeholder: "HDFC0001234",
    value: vendorForm.bank_ifsc,
    onChange: vf('bank_ifsc')
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Account Holder Name",
    placeholder: "As per bank records",
    value: vendorForm.bank_account_name,
    onChange: vf('bank_account_name')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid #F1F0EE',
      paddingTop: '16px',
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '12px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: "create-portal",
    checked: vendorForm.create_portal_user,
    onChange: e => setVendorForm(f => ({
      ...f,
      create_portal_user: e.target.checked
    })),
    style: {
      accentColor: '#E8783B',
      width: 16,
      height: 16,
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "create-portal",
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      cursor: 'pointer'
    }
  }, "Create Vendor Portal Login")), vendorForm.create_portal_user && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TjInput, {
    label: "Portal Username",
    placeholder: "e.g. vendor_techserve",
    value: vendorForm.portal_username,
    onChange: vf('portal_username')
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Portal Password",
    placeholder: "Temporary password (min 8 chars)",
    type: "password",
    value: vendorForm.portal_password,
    onChange: vf('portal_password')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FFF7ED',
      border: '1px solid #FED7AA',
      borderRadius: '8px',
      padding: '10px 14px',
      marginBottom: '12px',
      fontSize: '12px',
      color: '#92400E',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Vendor will be able to log in with these credentials and submit invoices via the Vendor Portal.")))), saveError && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEE2E2',
      border: '1px solid #FECACA',
      borderRadius: '8px',
      padding: '10px 14px',
      marginBottom: '12px',
      fontSize: '12px',
      color: '#991B1B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, saveError), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '20px'
    }
  }, step > 0 && /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setStep(s => s - 1)
  }, "\u2190 Back"), step < steps.length - 1 && /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: () => {
      setSaveError('');
      setStep(s => s + 1);
    }
  }, "Next \u2192"), step === steps.length - 1 && /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: handleSaveVendor,
    disabled: saveLoading
  }, saveLoading ? 'Saving…' : 'Save Vendor'))), /*#__PURE__*/React.createElement(SidePanel, {
    open: !!detail,
    onClose: () => setDetail(null),
    title: detail?.name || ''
  }, detail && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '18px',
      color: 'white'
    }
  }, detail.name[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A'
    }
  }, detail.name), /*#__PURE__*/React.createElement(StatusBadge, {
    status: detail.status
  }))), [{
    l: 'GSTIN',
    v: detail.gstin || detail.gst || '—'
  }, {
    l: 'PAN',
    v: detail.pan || '—'
  }, {
    l: 'Category',
    v: detail.vendor_type || detail.category || '—'
  }, {
    l: 'Email',
    v: detail.email || '—'
  }, {
    l: 'Pending Invoices',
    v: detail.pending_invoices != null ? String(detail.pending_invoices) : '—'
  }, {
    l: 'Total Invoices',
    v: detail.total_invoices != null ? String(detail.total_invoices) : '—'
  }, {
    l: 'Total Spend',
    v: detail.total_spend != null ? `₹${Number(detail.total_spend).toLocaleString('en-IN')}` : '—'
  }, {
    l: 'IFSC',
    v: detail.bank_ifsc || '—'
  }, {
    l: 'Vendor ID',
    v: detail.id ? String(detail.id).slice(0, 8) : '—'
  }].map(r => /*#__PURE__*/React.createElement("div", {
    key: r.l,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid #F8F7F5'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, r.l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#0F172A',
      fontWeight: 600,
      fontFamily: r.l === 'GSTIN' || r.l === 'PAN' || r.l === 'Vendor ID' || r.l === 'IFSC' ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif"
    }
  }, r.v))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginTop: '16px'
    }
  }, detail.status === 'PENDING' && /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: async () => {
      await VendorAPI.activate(detail.id, 'activate');
      setDetail(d => ({
        ...d,
        status: 'ACTIVE',
        is_approved: true
      }));
      setVendors(vs => vs.map(x => x.id === detail.id ? {
        ...x,
        status: 'ACTIVE',
        is_approved: true
      } : x));
    }
  }, "Approve Vendor"), detail.status === 'ACTIVE' && /*#__PURE__*/React.createElement(Btn, {
    variant: "destructive",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: async () => {
      await VendorAPI.activate(detail.id, 'suspend');
      setDetail(d => ({
        ...d,
        status: 'SUSPENDED'
      }));
      setVendors(vs => vs.map(x => x.id === detail.id ? {
        ...x,
        status: 'SUSPENDED'
      } : x));
    }
  }, "Suspend"), detail.status === 'SUSPENDED' && /*#__PURE__*/React.createElement(Btn, {
    variant: "green",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: async () => {
      await VendorAPI.activate(detail.id, 'activate');
      setDetail(d => ({
        ...d,
        status: 'ACTIVE'
      }));
      setVendors(vs => vs.map(x => x.id === detail.id ? {
        ...x,
        status: 'ACTIVE'
      } : x));
    }
  }, "Activate")))));
};

// ─── EXPENSE MANAGEMENT ───────────────────────────────────────────────────────

const EXP_CATEGORIES_LIST = ['Travel', 'Software & Licences', 'Infrastructure', 'Marketing & Events', 'HR & Recruitment', 'Legal & Compliance', 'Office Supplies', 'Professional Services', 'Utilities', 'Other'];
const EXPENSES_DATA = [{
  id: 'EXP-2024-441',
  employee: 'Aisha Nair',
  amount: '₹4,200',
  amtNum: 4200,
  date: 'Apr 19',
  status: 'PENDING_L1',
  category: 'Travel',
  aiCat: true,
  catConf: 91,
  dept: null
}, {
  id: 'EXP-2024-440',
  employee: 'Rahul Desai',
  amount: '₹12,500',
  amtNum: 12500,
  date: 'Apr 18',
  status: 'APPROVED',
  category: 'Software & Licences',
  aiCat: false,
  catConf: null,
  dept: 'Engineering'
}, {
  id: 'EXP-2024-439',
  employee: 'Priya Mehta',
  amount: '₹890',
  amtNum: 890,
  date: 'Apr 18',
  status: 'PAID',
  category: 'Office Supplies',
  aiCat: false,
  catConf: null,
  dept: 'Finance'
}, {
  id: 'EXP-2024-438',
  employee: 'Dev Kapoor',
  amount: '₹6,400',
  amtNum: 6400,
  date: 'Apr 17',
  status: 'REJECTED',
  category: 'Infrastructure',
  aiCat: true,
  catConf: 78,
  dept: null
}, {
  id: 'EXP-2024-437',
  employee: 'Sunita Rao',
  amount: '₹2,100',
  amtNum: 2100,
  date: 'Apr 16',
  status: 'PENDING_L1',
  category: 'Travel',
  aiCat: true,
  catConf: 94,
  dept: null
}];
const EXP_BUDGET_MAP = {
  'Travel': {
    rem: 180000,
    total: 300000
  },
  'Software & Licences': {
    rem: 420000,
    total: 600000
  },
  'Infrastructure': {
    rem: 0,
    total: 240000
  },
  'Office Supplies': {
    rem: 85000,
    total: 100000
  },
  'Marketing & Events': {
    rem: 195000,
    total: 1300000
  }
};
const ExpensesScreen = ({
  role: propRole,
  onNavigate
}) => {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [uploadDone, setUploadDone] = React.useState(false);
  const [expCategory, setExpCategory] = React.useState('Travel');
  const [aiCatAccepted, setAiCatAccepted] = React.useState(false);
  const [expAmount, setExpAmount] = React.useState('');
  const [expDate, setExpDate] = React.useState('');
  const [expDesc, setExpDesc] = React.useState('');
  const [expandedRow, setExpandedRow] = React.useState(null);
  const [expenses, setExpenses] = React.useState([]);
  const [loadingExp, setLoadingExp] = React.useState(true);
  const [selectedInv, setSelectedInv] = React.useState(null);
  const [reviewNotes, setReviewNotes] = React.useState('');
  const [reviewLoading, setReviewLoading] = React.useState(false);
  const [reviewMsg, setReviewMsg] = React.useState('');
  const [uploadedFileRef, setUploadedFileRef] = React.useState(null);
  const [ocrLoading, setOcrLoading] = React.useState(false);
  const [ocrResult, setOcrResult] = React.useState(null);
  const [submitLoading, setSubmitLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [expVendorName, setExpVendorName] = React.useState('');
  const currentRole = propRole || localStorage.getItem('tj_role') || 'CFO';
  const isVendor = currentRole === 'Vendor';
  const inferredCategory = React.useMemo(() => {
    const text = [ocrResult?.extracted_fields?.vendor_name, ocrResult?.raw_text, expDesc].filter(Boolean).join(' ').toLowerCase();
    if (!text) return {
      name: expCategory,
      confidence: null
    };
    if (/(flight|hotel|travel|cab|uber|ola|trip)/.test(text)) return {
      name: 'Travel',
      confidence: 88
    };
    if (/(software|license|subscription|saas|google|microsoft|openai|cloud)/.test(text)) return {
      name: 'Software & Licences',
      confidence: 84
    };
    if (/(server|hosting|aws|azure|gcp|internet|network|infrastructure)/.test(text)) return {
      name: 'Infrastructure',
      confidence: 82
    };
    if (/(recruit|staff|hr|manpower|payroll)/.test(text)) return {
      name: 'HR & Recruitment',
      confidence: 78
    };
    if (/(legal|compliance|registration|filing|gst|tax)/.test(text)) return {
      name: 'Legal & Compliance',
      confidence: 76
    };
    if (/(office|stationery|printer|supplies)/.test(text)) return {
      name: 'Office Supplies',
      confidence: 74
    };
    if (/(marketing|event|campaign|advertising|promotion)/.test(text)) return {
      name: 'Marketing & Events',
      confidence: 80
    };
    if (/(consult|service|professional|vendor|solution)/.test(text)) return {
      name: 'Professional Services',
      confidence: 72
    };
    return {
      name: 'Other',
      confidence: 55
    };
  }, [ocrResult, expDesc, expCategory]);
  const ocrSucceeded = !!(ocrResult && (ocrResult.status === 'COMPLETE' || (ocrResult.confidence || 0) > 0) && ocrResult.extracted_fields && Object.keys(ocrResult.extracted_fields).length > 0);
  const ocrFailed = !!(uploadDone && ocrResult && !ocrSucceeded);
  React.useEffect(() => {
    const {
      BillsAPI
    } = window.TijoriAPI;
    setLoadingExp(true);
    BillsAPI.listExpenses().then(data => setExpenses(data || [])).catch(() => {}).finally(() => setLoadingExp(false));
  }, []);
  const handleExpFileSelect = async file => {
    if (!file) return;
    setOcrLoading(true);
    setOcrResult(null);
    setSubmitError('');
    setUploadedFileRef(null);
    try {
      const {
        FilesAPI
      } = window.TijoriAPI;
      const uploaded = await FilesAPI.upload(file);
      setUploadedFileRef(uploaded.id);
      setUploadDone(true);
      const ocr = await FilesAPI.ocr(uploaded.id);
      setOcrResult(ocr);
      if (ocr.extracted_fields && Object.keys(ocr.extracted_fields).length > 0) {
        const f = ocr.extracted_fields;
        if (f.total_amount) setExpAmount(String(f.total_amount));
        if (f.invoice_date) setExpDate(f.invoice_date);
        if (f.vendor_name) {
          setExpVendorName(f.vendor_name);
          setExpDesc(`Services from ${f.vendor_name}`);
        }
      }
      if (ocr.status === 'FAILED' || !(ocr.confidence > 0)) {
        setSubmitError(ocr.error || 'OCR could not extract fields. You can still fill the bill manually.');
      }
    } catch (err) {
      setSubmitError('Upload failed: ' + (err.message || 'Unknown'));
    } finally {
      setOcrLoading(false);
    }
  };
  const handleExpSubmit = async () => {
    if (!expAmount) {
      setSubmitError('Amount is required.');
      return;
    }
    setSubmitLoading(true);
    setSubmitError('');
    try {
      const {
        BillsAPI
      } = window.TijoriAPI;
      const payload = {
        business_purpose: expDesc || expCategory,
        total_amount: parseFloat(expAmount) || 0,
        invoice_date: expDate || null,
        pre_gst_amount: parseFloat(expAmount) || 0,
        vendor_name: expVendorName || 'Internal Expense',
        ...(uploadedFileRef ? {
          invoice_file: uploadedFileRef
        } : {})
      };
      await BillsAPI.submitExpense(payload);
      setPanelOpen(false);
      setExpAmount('');
      setExpDate('');
      setExpDesc('');
      setExpVendorName('');
      setUploadDone(false);
      setUploadedFileRef(null);
      setOcrResult(null);
      setAiCatAccepted(false);
      BillsAPI.listExpenses().then(data => setExpenses(data || [])).catch(() => {});
    } catch (err) {
      setSubmitError(err.message || 'Submit failed.');
    } finally {
      setSubmitLoading(false);
    }
  };
  const handleReviewApprove = async () => {
    if (!selectedInv) return;
    setReviewLoading(true);
    setReviewMsg('');
    try {
      const {
        BillsAPI
      } = window.TijoriAPI;
      await BillsAPI.approve(selectedInv.id, reviewNotes || 'Approved');
      setReviewMsg('Approved successfully.');
      setExpenses(prev => prev.map(e => e.id === selectedInv.id ? {
        ...e,
        status: 'APPROVED'
      } : e));
      setTimeout(() => {
        setSelectedInv(null);
        setReviewMsg('');
      }, 1000);
    } catch (err) {
      setReviewMsg('Failed: ' + (err.message || 'Error'));
    } finally {
      setReviewLoading(false);
    }
  };
  const budgetInfo = EXP_BUDGET_MAP[expCategory];
  const budgetPct = budgetInfo ? Math.round(budgetInfo.rem / budgetInfo.total * 100) : null;
  const budgetColor = budgetPct === null ? '#94A3B8' : budgetPct > 50 ? '#10B981' : budgetPct > 20 ? '#F59E0B' : '#EF4444';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Internal Expenses",
    subtitle: "Manage employee reimbursements and operational expenditures.",
    right: /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement("span", null, "+"),
      onClick: () => {
        setPanelOpen(true);
        setUploadDone(false);
        setAiCatAccepted(false);
        setExpAmount('');
      }
    }, "File Expense")
  }), /*#__PURE__*/React.createElement(StatsRow, {
    cards: [{
      label: 'Unapproved Spend',
      value: '₹12,450',
      delta: '↑ ₹3.2K',
      deltaType: 'negative',
      color: '#EF4444',
      pulse: true
    }, {
      label: 'Approved This Month',
      value: '₹48,200',
      delta: '↑ 12%',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'Reimbursed',
      value: '₹31,100',
      delta: 'Settled',
      deltaType: 'positive',
      color: '#10B981'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '16px',
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
  }, ['Report ID', 'Employee', 'Category', !isVendor && 'Department', 'Amount', 'Date', 'Status', 'Actions'].filter(Boolean).map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, loadingExp ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: !isVendor ? 8 : 7,
    style: {
      padding: '32px',
      textAlign: 'center',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px'
    }
  }, "Loading expenses\u2026")) : expenses.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: !isVendor ? 8 : 7,
    style: {
      padding: '32px',
      textAlign: 'center',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px'
    }
  }, "No expenses found.")) : null, expenses.map(e => {
    const rowId = e.invoice_number || e.ref_no || (e.id ? String(e.id).slice(0, 8).toUpperCase() : '—');
    const refNo = e.ref_no;
    const employee = e.vendor_name || e.submitted_by_name || '—';
    const category = e.business_purpose || e.category || '—';
    const dept = e.department || null;
    const amount = e.total_amount != null ? `₹${Number(e.total_amount).toLocaleString('en-IN')}` : '—';
    const date = e.invoice_date ? new Date(e.invoice_date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    }) : '—';
    const aiCat = !!(e.ocr_confidence && e.ocr_confidence > 0);
    const catConf = e.ocr_confidence ? Math.round(e.ocr_confidence * 100) : null;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: e.id || rowId
    }, /*#__PURE__*/React.createElement("tr", {
      style: {
        borderTop: '1px solid #F1F0EE',
        height: 52,
        transition: 'background 150ms',
        cursor: 'pointer'
      },
      onMouseEnter: ev => ev.currentTarget.style.background = '#FFF8F5',
      onMouseLeave: ev => ev.currentTarget.style.background = 'white',
      onClick: () => onNavigate && onNavigate('ap-match', {
        invoice: e
      })
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px',
        color: '#0F172A',
        fontWeight: 600
      }
    }, rowId), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px',
        color: '#E8783B',
        marginTop: '1px'
      }
    }, refNo)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, employee), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, aiCat ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: '#F5F3FF',
        color: '#5B21B6',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, /*#__PURE__*/React.createElement(AIBadge, {
      small: true
    }), category, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '10px',
        color: '#8B5CF6',
        fontWeight: 700,
        marginLeft: 2
      }
    }, catConf, "%")) : /*#__PURE__*/React.createElement("span", {
      style: {
        background: '#F1F5F9',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#475569',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, category)), !isVendor && /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, dept ? /*#__PURE__*/React.createElement("span", {
      style: {
        background: '#F1F5F9',
        color: '#475569',
        padding: '3px 10px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, dept) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#CBD5E1',
        fontSize: '13px',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: '14px',
        color: '#E8783B',
        letterSpacing: '-0.5px'
      }
    }, amount), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px',
        fontSize: '12px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, date), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement(StatusBadge, {
      status: e.status
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '0 16px'
      },
      onClick: ev => ev.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '6px'
      }
    }, e.status && e.status.startsWith('PENDING') && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Btn, {
      variant: "green",
      small: true,
      onClick: () => {
        setSelectedInv(e);
        setReviewNotes('');
        setReviewMsg('');
      }
    }, "Review")), (!e.status || !e.status.startsWith('PENDING')) && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, "\u2014")))), expandedRow === (e.id || rowId) && /*#__PURE__*/React.createElement("tr", {
      style: {
        background: '#FAFAF8',
        borderTop: '1px solid #F1F0EE',
        animation: 'fadeUp 200ms ease'
      }
    }, /*#__PURE__*/React.createElement("td", {
      colSpan: !isVendor ? 8 : 7,
      style: {
        padding: '16px 20px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr 1.5fr',
        gap: '20px'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '10px',
        fontWeight: 700,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '8px'
      }
    }, "Spend Analysis & Evidence"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 60,
        height: 80,
        background: '#F1F5F9',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        color: '#CBD5E1'
      }
    }, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        fontWeight: 600,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, e.invoice_number || 'No file reference'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginTop: '2px'
      }
    }, e.ocr_confidence ? `OCR Confidence: ${Math.round(e.ocr_confidence * 100)}%` : 'Manual submission'), /*#__PURE__*/React.createElement("button", {
      style: {
        marginTop: '6px',
        fontSize: '11px',
        color: '#E8783B',
        fontWeight: 700,
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer'
      },
      onClick: () => {
        if (e.invoice_file) {
          window.TijoriAPI.FilesAPI.open(e.invoice_file);
        } else {
          alert('No file attached to this expense.');
        }
      }
    }, "View Full Receipt \u2197")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '10px',
        fontWeight: 700,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '8px'
      }
    }, "Category & Policy"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#F8F7F5',
        border: '1.5px dashed #E2E8F0',
        borderRadius: '8px',
        padding: '10px 14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        color: '#475569',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600
      }
    }, category), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginTop: '2px'
      }
    }, "Policy: Global Travel & Expense v2.4"))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#ECFDF5',
        border: '1px solid #A7F3D0',
        borderRadius: '12px',
        padding: '14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '14px'
      }
    }, "\u2726"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        fontWeight: 700,
        color: '#065F46',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, "AI Policy Compliance Check")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        color: '#064E3B',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        lineHeight: 1.4
      }
    }, "I've cross-referenced this spend with the ", category, " policy. ", e.total_amount > 100000 ? '🔴 Warning: This exceeds the manager approval limit of ₹1L.' : '🟢 Spend is within limits for this department. Verified merchant category matches claim category.'))))));
  })))), selectedInv && /*#__PURE__*/React.createElement(TjModal, {
    open: !!selectedInv,
    onClose: () => {
      setSelectedInv(null);
      setReviewNotes('');
      setReviewMsg('');
    },
    title: "Review Expense",
    accentColor: "#065F46",
    width: 480
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px',
      background: '#F8F7F5',
      borderRadius: '10px',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: '#E8783B'
    }
  }, selectedInv.ref_no || String(selectedInv.id).slice(0, 8).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: '14px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '4px'
    }
  }, selectedInv.vendor_name || selectedInv.submitted_by_name || '—'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '22px',
      color: '#E8783B',
      letterSpacing: '-0.5px',
      marginTop: '4px'
    }
  }, "\u20B9", selectedInv.total_amount ? Number(selectedInv.total_amount).toLocaleString('en-IN') : '—'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      marginTop: '4px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Purpose: ", selectedInv.business_purpose || '—')), /*#__PURE__*/React.createElement(TjTextarea, {
    label: "Approval Notes (optional)",
    placeholder: "Add any notes for this approval\u2026",
    value: reviewNotes,
    onChange: e => setReviewNotes(e.target.value),
    rows: 3
  }), reviewMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: reviewMsg.includes('Failed') ? '#EF4444' : '#10B981',
      marginBottom: '8px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, reviewMsg), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => {
      setSelectedInv(null);
      setReviewNotes('');
      setReviewMsg('');
    }
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "green",
    onClick: handleReviewApprove,
    disabled: reviewLoading
  }, reviewLoading ? 'Processing…' : '✓ Approve'))), /*#__PURE__*/React.createElement(SidePanel, {
    open: panelOpen,
    onClose: () => setPanelOpen(false),
    title: "File Expense / Bill"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1.5px dashed ${ocrFailed ? '#F59E0B' : uploadDone ? '#10B981' : '#E2E8F0'}`,
      borderRadius: '12px',
      padding: '24px',
      textAlign: 'center',
      marginBottom: '20px',
      background: ocrFailed ? '#FFFBEB' : uploadDone ? '#F0FDF4' : '#FAFAF8',
      cursor: 'pointer',
      transition: 'all 200ms',
      position: 'relative'
    },
    onMouseEnter: e => {
      if (!uploadDone) e.currentTarget.style.borderColor = '#E8783B';
    },
    onMouseLeave: e => {
      if (!uploadDone) e.currentTarget.style.borderColor = '#E2E8F0';
    },
    onClick: () => {
      if (!uploadDone) document.getElementById('exp-file-input').click();
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: "exp-file-input",
    type: "file",
    accept: ".pdf,.jpg,.jpeg,.png",
    style: {
      display: 'none'
    },
    onChange: e => {
      const f = e.target.files[0];
      if (f) handleExpFileSelect(f);
      e.target.value = '';
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '28px',
      marginBottom: '8px'
    }
  }, ocrLoading ? '⏳' : ocrFailed ? '⚠️' : uploadDone ? '✅' : '📄'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: '13px',
      color: ocrLoading ? '#5B21B6' : ocrFailed ? '#92400E' : uploadDone ? '#065F46' : '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, ocrLoading ? 'AI extracting data from invoice…' : ocrFailed ? 'Invoice uploaded — OCR unavailable, fill manually below' : uploadDone ? 'Invoice uploaded — fields pre-filled below' : 'Upload invoice for AI extraction'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#94A3B8',
      marginTop: '4px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, uploadDone ? ocrResult ? ocrSucceeded ? `OCR confidence: ${Math.round((ocrResult.confidence || 0) * 100)}%` : 'OCR unavailable — manual entry mode' : 'Category suggestion ready below' : 'Drag & drop or click to browse · PDF, JPG, PNG'), uploadedFileRef && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    onClick: e => {
      e.stopPropagation();
      window.TijoriAPI.FilesAPI.open(uploadedFileRef);
    }
  }, "View Uploaded Document")), !uploadDone && !ocrLoading && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'linear-gradient(135deg, rgba(232,120,59,0.1), rgba(139,92,246,0.1))',
      border: '1px solid #EDE9FE',
      borderRadius: '999px',
      padding: '4px 12px'
    }
  }, /*#__PURE__*/React.createElement(AIBadge, {
    small: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: '#5B21B6',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "AI Powered \u2014 auto-extracts line items"))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '2px solid #E8783B',
      borderRadius: '12px',
      padding: '14px 16px',
      marginBottom: '16px',
      background: '#FFF7ED'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      color: '#E8783B',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '10px'
    }
  }, "Expense Category"), uploadDone && !aiCatAccepted && inferredCategory?.confidence && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '10px',
      padding: '9px 12px',
      background: '#F5F3FF',
      borderRadius: '8px',
      border: '1px solid #EDE9FE'
    }
  }, /*#__PURE__*/React.createElement(AIBadge, {
    small: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#5B21B6',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      flex: 1
    }
  }, "AI suggests: ", /*#__PURE__*/React.createElement("strong", null, inferredCategory.name), " \u2014 ", inferredCategory.confidence, "% confidence"), /*#__PURE__*/React.createElement(Btn, {
    variant: "purple",
    small: true,
    onClick: () => {
      setExpCategory(inferredCategory.name);
      setAiCatAccepted(true);
    }
  }, "Accept")), /*#__PURE__*/React.createElement("select", {
    value: expCategory,
    onChange: e => setExpCategory(e.target.value),
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1.5px solid #E2E8F0',
      borderRadius: '8px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px',
      color: '#0F172A',
      background: 'white',
      outline: 'none',
      cursor: 'pointer',
      marginBottom: '8px'
    }
  }, EXP_CATEGORIES_LIST.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#92400E',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.5
    }
  }, "Category helps route this to the correct budget. Your approver may update this.")), expAmount && budgetInfo && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px',
      borderRadius: '10px',
      background: budgetColor === '#EF4444' ? '#FEF2F2' : budgetColor === '#F59E0B' ? '#FFFBEB' : '#F0FDF4',
      border: `1px solid ${budgetColor === '#EF4444' ? '#FECACA' : budgetColor === '#F59E0B' ? '#FDE68A' : '#BBF7D0'}`,
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '6px'
    }
  }, "Budget Impact"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 700,
      color: budgetColor,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, expCategory, " \xB7 \u20B9", (budgetInfo.rem / 100000).toFixed(1), "L remaining of \u20B9", (budgetInfo.total / 100000).toFixed(1), "L total"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: '#F1F5F9',
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${budgetPct}%`,
      background: budgetColor,
      borderRadius: 2,
      transition: 'width 400ms ease'
    }
  })), budgetPct < 20 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#991B1B',
      marginTop: '6px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, "\u26A0 Less than 20% budget remaining \u2014 Finance will be notified")), !expAmount && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: '#F8F7F5',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Budget impact preview will appear once you enter an amount."), /*#__PURE__*/React.createElement(TjInput, {
    label: "Amount (\u20B9)",
    placeholder: "0.00",
    type: "number",
    value: expAmount,
    onChange: e => setExpAmount(e.target.value)
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Date",
    type: "date",
    value: expDate,
    onChange: e => setExpDate(e.target.value)
  }), /*#__PURE__*/React.createElement(TjTextarea, {
    label: "Description / Purpose",
    placeholder: "Brief description of the expense\u2026",
    rows: 3,
    value: expDesc,
    onChange: e => setExpDesc(e.target.value)
  }), submitError && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#EF4444',
      marginBottom: '8px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, submitError), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    style: {
      width: '100%',
      justifyContent: 'center'
    },
    onClick: handleExpSubmit,
    disabled: submitLoading || ocrLoading
  }, submitLoading ? 'Submitting…' : 'Submit for Approval')));
};

// ─── BUDGET MANAGEMENT ────────────────────────────────────────────────────────

const BUDGETS = [{
  dept: 'Engineering',
  spent: 2.4,
  total: 2.4,
  currency: '$',
  util: 100
}, {
  dept: 'Marketing',
  spent: 1.1,
  total: 1.3,
  currency: '$',
  util: 85
}, {
  dept: 'Operations',
  spent: 0.65,
  total: 1.5,
  currency: '$',
  util: 43
}, {
  dept: 'Human Resources',
  spent: 0.544,
  total: 0.8,
  currency: '$',
  util: 68
}, {
  dept: 'Finance',
  spent: 0.22,
  total: 0.5,
  currency: '$',
  util: 44
}];

// ─── SVG BAR CHART ────────────────────────────────────────────────────────────
const MiniBarChart = ({
  data,
  color = '#E8783B',
  height = 100
}) => {
  if (!data || data.length === 0) return /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#CBD5E1',
      fontSize: 12
    }
  }, "No data");
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 100,
    barW = Math.floor((W - (data.length - 1) * 2) / data.length);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 2,
      height,
      width: '100%',
      padding: '0 4px'
    }
  }, data.map((d, i) => {
    const h = Math.max(4, Math.round(d.value / max * (height - 28)));
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3
      },
      title: `${d.label}: ₹${d.value.toLocaleString('en-IN')}`
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        height: h,
        background: color,
        borderRadius: '3px 3px 0 0',
        opacity: 0.85,
        transition: 'height 600ms ease'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 40
      }
    }, d.label));
  }));
};

// ─── BUDGET DETAIL DRAWER ────────────────────────────────────────────────────
const BudgetDetailDrawer = ({
  budget,
  open,
  onClose,
  onUpdated
}) => {
  const [util, setUtil] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({});
  React.useEffect(() => {
    if (open && budget) {
      setLoading(true);
      window.TijoriAPI.BudgetAPI.utilization(budget.id).then(data => setUtil(data)).catch(() => setUtil(null)).finally(() => setLoading(false));
      setEditForm({
        name: budget.name,
        total_amount: budget.total_amount,
        warning_threshold: budget.warning_threshold || 70,
        critical_threshold: budget.critical_threshold || 90,
        start_date: budget.start_date || '',
        end_date: budget.end_date || ''
      });
      setEditing(false);
    }
  }, [open, budget]);
  const handleSave = async () => {
    try {
      await window.TijoriAPI.BudgetAPI.update(budget.id, {
        ...editForm,
        total_amount: parseFloat(editForm.total_amount)
      });
      onUpdated();
      setEditing(false);
    } catch (e) {
      alert(e.message || 'Update failed');
    }
  };
  const fmtAmt = n => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${Number(n).toLocaleString('en-IN')}`;
  const barColor = u => u >= 90 ? '#EF4444' : u >= 70 ? '#F59E0B' : '#10B981';
  if (!budget) return null;
  const util_pct = budget.utilization_pct || 0;
  return /*#__PURE__*/React.createElement(SidePanel, {
    open: open,
    onClose: onClose,
    title: budget.name,
    width: 520
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, budget.department || 'All Departments', " \xB7 ", budget.fiscal_year), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: barColor(util_pct) + '22',
      color: barColor(util_pct),
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, util_pct, "% Used"), /*#__PURE__*/React.createElement("span", {
    style: {
      background: '#F1F5F9',
      color: '#475569',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, budget.status))), /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    onClick: () => setEditing(e => !e)
  }, editing ? 'Cancel' : '✏ Edit')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Spent: ", fmtAmt(budget.spent_amount || 0)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Budget: ", fmtAmt(budget.total_amount || 0))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 12,
      background: '#F1F5F9',
      borderRadius: 6,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${Math.min(util_pct, 100)}%`,
      background: `linear-gradient(90deg, ${barColor(util_pct)}, ${barColor(util_pct)}cc)`,
      borderRadius: 6,
      transition: 'width 800ms ease'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 4,
      fontSize: 10,
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Warning: ", budget.warning_threshold || 70, "%"), /*#__PURE__*/React.createElement("span", null, "Critical: ", budget.critical_threshold || 90, "%"))), editing && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FAFAF8',
      border: '1px solid #E2E8F0',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#475569',
      marginBottom: 12,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Edit Budget"), /*#__PURE__*/React.createElement(TjInput, {
    label: "Budget Name",
    value: editForm.name,
    onChange: e => setEditForm(f => ({
      ...f,
      name: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Total Amount (\u20B9)",
    type: "number",
    value: editForm.total_amount,
    onChange: e => setEditForm(f => ({
      ...f,
      total_amount: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Start Date",
    type: "date",
    value: editForm.start_date,
    onChange: e => setEditForm(f => ({
      ...f,
      start_date: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "End Date",
    type: "date",
    value: editForm.end_date,
    onChange: e => setEditForm(f => ({
      ...f,
      end_date: e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Warning %",
    value: editForm.warning_threshold,
    onChange: e => setEditForm(f => ({
      ...f,
      warning_threshold: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Critical %",
    value: editForm.critical_threshold,
    onChange: e => setEditForm(f => ({
      ...f,
      critical_threshold: e.target.value
    }))
  })), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: handleSave,
    style: {
      width: '100%',
      justifyContent: 'center',
      marginTop: 4
    }
  }, "Save Changes")), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      border: '2px solid rgba(15,23,42,0.1)',
      borderTopColor: '#E8783B',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      margin: '0 auto'
    }
  })) : util ? /*#__PURE__*/React.createElement(React.Fragment, null, util.monthly_spend && util.monthly_spend.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#475569',
      marginBottom: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, "Monthly Spend"), /*#__PURE__*/React.createElement(MiniBarChart, {
    height: 100,
    color: "#E8783B",
    data: util.monthly_spend.map(m => ({
      label: m.month?.slice(5),
      value: m.amount
    }))
  })), util.top_vendors && util.top_vendors.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#475569',
      marginBottom: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, "Top Vendors by Spend"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: 10,
      border: '1px solid #F1F0EE',
      overflow: 'hidden'
    }
  }, util.top_vendors.slice(0, 5).map((v, i) => {
    const maxAmt = util.top_vendors[0].amount;
    const pct = maxAmt > 0 ? v.amount / maxAmt * 100 : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '10px 14px',
        borderBottom: i < Math.min(4, util.top_vendors.length - 1) ? '1px solid #F8F7F5' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, v.vendor || 'Unknown'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: "'JetBrains Mono', monospace"
      }
    }, v.invoices, " inv \xB7 ", fmtAmt(v.amount))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        background: '#F1F5F9',
        borderRadius: 2,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: `${pct}%`,
        background: '#E8783B',
        borderRadius: 2
      }
    })));
  }))), util.top_employees && util.top_employees.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#475569',
      marginBottom: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, "Top Spenders (Employees)"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: 10,
      border: '1px solid #F1F0EE',
      overflow: 'hidden'
    }
  }, util.top_employees.slice(0, 5).map((e, i) => {
    const maxAmt = util.top_employees[0].amount;
    const pct = maxAmt > 0 ? e.amount / maxAmt * 100 : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '10px 14px',
        borderBottom: i < Math.min(4, util.top_employees.length - 1) ? '1px solid #F8F7F5' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, e.name || 'Anonymous'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: "'JetBrains Mono', monospace"
      }
    }, e.invoices, " exp \xB7 ", fmtAmt(e.amount))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        background: '#F1F5F9',
        borderRadius: 2,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: `${pct}%`,
        background: '#3B82F6',
        borderRadius: 2
      }
    })));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      borderRadius: 10,
      padding: '12px 16px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      color: '#0F172A'
    }
  }, util.total_invoices || 0), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Total Invoices")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      borderRadius: 10,
      padding: '12px 16px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      color: '#0F172A'
    }
  }, fmtAmt((budget.total_amount || 0) - (budget.spent_amount || 0))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Remaining")))) : /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#94A3B8',
      textAlign: 'center',
      padding: 24,
      fontSize: 13,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "No utilization data yet."));
};

// ─── BUDGET SCREEN ────────────────────────────────────────────────────────────
const BudgetScreen = ({
  role,
  onNavigate
}) => {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [budgets, setBudgets] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedBudget, setSelectedBudget] = React.useState(null);
  const [newBudget, setNewBudget] = React.useState({
    name: '',
    total_amount: '',
    warning_threshold: '70',
    critical_threshold: '90',
    fiscal_year: 'FY2026',
    department_id: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(new Date().getTime() + 365 * 86400000).toISOString().slice(0, 10)
  });
  const [departments, setDepartments] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [createError, setCreateError] = React.useState('');
  const barColor = u => u >= 90 ? '#EF4444' : u >= 70 ? '#F59E0B' : '#10B981';
  const fmtAmt = n => n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const load = React.useCallback(() => {
    setLoading(true);
    Promise.allSettled([window.TijoriAPI.BudgetAPI.list(), window.TijoriAPI.AuthAPI.listDepartments()]).then(([budRes, deptRes]) => {
      if (budRes.status === 'fulfilled') setBudgets(budRes.value || []);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value || []);
      setLoading(false);
    });
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);
  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.spent_amount || 0), 0);
  const atRisk = budgets.filter(b => (b.utilization_pct || 0) >= 70).length;
  const overBudget = budgets.filter(b => (b.utilization_pct || 0) >= 100);
  const handleCreate = async () => {
    if (!newBudget.name || !newBudget.total_amount) {
      setCreateError('Name and amount required.');
      return;
    }
    setSaving(true);
    setCreateError('');
    try {
      const payload = {
        name: newBudget.name,
        total_amount: parseFloat(newBudget.total_amount),
        warning_threshold: parseFloat(newBudget.warning_threshold) || 70,
        critical_threshold: parseFloat(newBudget.critical_threshold) || 90,
        fiscal_year: newBudget.fiscal_year || 'FY2026',
        start_date: newBudget.start_date,
        end_date: newBudget.end_date
      };
      if (newBudget.department_id) payload.department = newBudget.department_id;
      await window.TijoriAPI.BudgetAPI.create(payload);
      setCreateOpen(false);
      setNewBudget({
        name: '',
        total_amount: '',
        warning_threshold: '70',
        critical_threshold: '90',
        fiscal_year: 'FY2026',
        department_id: '',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(new Date().getTime() + 365 * 86400000).toISOString().slice(0, 10)
      });
      load();
    } catch (e) {
      setCreateError(e.message || 'Creation failed.');
    } finally {
      setSaving(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32,
      height: '100%',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Budget Management",
    subtitle: "Departmental budgets with real-time utilization, vendor breakdown, and monthly spend trends.",
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
    }, "New Budget"))
  }), /*#__PURE__*/React.createElement(StatsRow, {
    cards: [{
      label: 'Total Allocated',
      value: loading ? '…' : fmtAmt(totalBudget),
      delta: `${budgets.length} budgets`,
      deltaType: 'positive'
    }, {
      label: 'Total Spent',
      value: loading ? '…' : fmtAmt(totalSpent),
      delta: totalBudget > 0 ? `${Math.round(totalSpent / totalBudget * 100)}% utilized` : '—',
      deltaType: 'neutral',
      color: '#E8783B'
    }, {
      label: 'Remaining',
      value: loading ? '…' : fmtAmt(totalBudget - totalSpent),
      delta: 'Available',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'At Risk',
      value: loading ? '…' : String(atRisk),
      delta: '≥70% utilized',
      deltaType: atRisk > 0 ? 'negative' : 'positive',
      color: atRisk > 0 ? '#F59E0B' : '#10B981'
    }]
  }), overBudget.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: 14,
      padding: '14px 20px',
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, "\uD83D\uDD34"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: '#991B1B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Budget Alert \u2014 "), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: '#B91C1C',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, overBudget.map(b => b.name).join(', '), " ", overBudget.length === 1 ? 'has' : 'have', " reached 100% utilisation. New invoices may be blocked."))), loading ? /*#__PURE__*/React.createElement("div", {
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
  }, "Loading budgets\u2026")) : budgets.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 60,
      textAlign: 'center',
      color: '#94A3B8',
      fontSize: 13,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "No budgets configured. Create your first budget to start tracking spend.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: 16
    }
  }, budgets.map(b => {
    const util = b.utilization_pct || (b.total_amount > 0 ? Math.round(b.spent_amount / b.total_amount * 100) : 0);
    return /*#__PURE__*/React.createElement("div", {
      key: b.id,
      onClick: () => setSelectedBudget(b),
      style: {
        background: 'white',
        borderRadius: 16,
        border: `1px solid ${util >= 90 ? '#FECACA' : '#F1F0EE'}`,
        padding: 22,
        cursor: 'pointer',
        transition: 'all 150ms',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      },
      onMouseEnter: e => {
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'none';
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: 17,
        color: '#0F172A',
        letterSpacing: '-0.5px'
      }
    }, b.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginTop: 2
      }
    }, b.department || 'All Depts', " \xB7 ", b.fiscal_year)), /*#__PURE__*/React.createElement("span", {
      style: {
        background: barColor(util) + '22',
        color: barColor(util),
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        flexShrink: 0
      }
    }, util, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 10,
        background: '#F1F5F9',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: `${Math.min(util, 100)}%`,
        background: `linear-gradient(90deg, ${barColor(util)}, ${barColor(util)}cc)`,
        borderRadius: 5,
        transition: 'width 800ms ease'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: '#64748B',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, "Spent: ", /*#__PURE__*/React.createElement("strong", null, fmtAmt(b.spent_amount || 0))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: '#64748B',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, "of ", fmtAmt(b.total_amount || 0))), util >= 70 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: util >= 100 ? '#DC2626' : util >= 90 ? '#EF4444' : '#F59E0B',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600
      }
    }, util >= 100 ? '🔴 Booking suspended' : util >= 90 ? '⚠ Critical threshold reached' : '⚡ Approaching warning threshold'), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("span", null, "Click to view breakdown"), /*#__PURE__*/React.createElement("span", null, "\u2192")));
  })), /*#__PURE__*/React.createElement(BudgetDetailDrawer, {
    budget: selectedBudget,
    open: !!selectedBudget,
    onClose: () => setSelectedBudget(null),
    onUpdated: () => {
      load();
      setSelectedBudget(null);
    }
  }), /*#__PURE__*/React.createElement(TjModal, {
    open: createOpen,
    onClose: () => setCreateOpen(false),
    title: "Create New Budget",
    width: 500
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Budget Name *",
    placeholder: "Engineering Q3 2026",
    value: newBudget.name,
    onChange: e => setNewBudget(p => ({
      ...p,
      name: e.target.value
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
  }, "Department"), /*#__PURE__*/React.createElement("select", {
    value: newBudget.department_id,
    onChange: e => setNewBudget(p => ({
      ...p,
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
  }, "\u2014 All Departments \u2014"), departments.map(d => /*#__PURE__*/React.createElement("option", {
    key: d.id,
    value: d.id
  }, d.name)))), /*#__PURE__*/React.createElement(TjInput, {
    label: "Total Amount (\u20B9) *",
    placeholder: "5000000",
    type: "number",
    value: newBudget.total_amount,
    onChange: e => setNewBudget(p => ({
      ...p,
      total_amount: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Fiscal Year",
    placeholder: "FY2026",
    value: newBudget.fiscal_year,
    onChange: e => setNewBudget(p => ({
      ...p,
      fiscal_year: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Start Date",
    type: "date",
    value: newBudget.start_date,
    onChange: e => setNewBudget(p => ({
      ...p,
      start_date: e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "End Date",
    type: "date",
    value: newBudget.end_date,
    onChange: e => setNewBudget(p => ({
      ...p,
      end_date: e.target.value
    }))
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Warning Threshold (%)",
    placeholder: "70",
    value: newBudget.warning_threshold,
    onChange: e => setNewBudget(p => ({
      ...p,
      warning_threshold: e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Critical Threshold (%)",
    placeholder: "90",
    value: newBudget.critical_threshold,
    onChange: e => setNewBudget(p => ({
      ...p,
      critical_threshold: e.target.value
    }))
  }))), createError && /*#__PURE__*/React.createElement("div", {
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
  }, createError), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setCreateOpen(false)
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: handleCreate,
    disabled: saving
  }, saving ? 'Creating…' : 'Create Budget'))), /*#__PURE__*/React.createElement(FloatingCopilot, {
    role: role
  }));
};

// ─── BUDGETARY GUARDRAILS ─────────────────────────────────────────────────────

const GuardrailsScreen = ({
  onNavigate
}) => {
  const [resolveModal, setResolveModal] = React.useState(false);
  const [resolveNote, setResolveNote] = React.useState('');
  const [resolved, setResolved] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const handleResolve = async () => {
    setResolving(true);
    await new Promise(r => setTimeout(r, 900));
    setResolving(false);
    setResolved(true);
    setResolveModal(false);
    setResolveNote('');
  };
  const depts = [{
    name: 'Engineering',
    spent: 2.4,
    total: 2.4,
    color: '#EF4444'
  }, {
    name: 'Marketing',
    spent: 1.1,
    total: 1.3,
    color: '#F59E0B'
  }, {
    name: 'Operations',
    spent: 0.65,
    total: 1.5,
    color: '#10B981'
  }, {
    name: 'Human Resources',
    spent: 0.544,
    total: 0.8,
    color: '#F59E0B'
  }];
  const logs = [{
    time: '09:14',
    text: 'System blocked $12,400 transaction for Engineering. Cap exceeded.',
    entity: 'TechLogistics'
  }, {
    time: '08:52',
    text: 'Warning email sent to Engineering HOD — 98% threshold crossed.',
    entity: 'System'
  }, {
    time: 'Apr 18',
    text: 'System blocked $8,200 transaction for Engineering.',
    entity: 'GlobalSync'
  }, {
    time: 'Apr 17',
    text: 'Marketing budget warning triggered at 85%.',
    entity: 'System'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '32px',
      color: '#0F172A',
      letterSpacing: '-1.5px'
    }
  }, "Budgetary Guardrails"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Q3 Fiscal Year 2026"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#E8783B',
      animation: 'dotPulse 1.5s ease infinite',
      display: 'inline-block'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#E8783B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, "Updated 4 minutes ago")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: '14px',
      padding: '16px 20px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '18px'
    }
  }, "\uD83D\uDD34"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: '13px',
      color: '#991B1B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Booking Suspension Active \u2014 Engineering at 100%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#B91C1C',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '2px'
    }
  }, resolved ? "Engineering budget cap has been released by CFO." : "All new invoices for Engineering are automatically blocked until CFO releases the cap.")), !resolved && /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    small: true,
    onClick: () => setResolveModal(true)
  }, "Resolve"), resolved && /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: '#059669', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '4px 10px', background: '#D1FAE5', borderRadius: 999 } }, "✓ Resolved")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A',
      marginBottom: '20px'
    }
  }, "Departmental Utilisation"), depts.map(d => {
    const pct = Math.round(d.spent / d.total * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: d.name,
      style: {
        marginBottom: '18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, d.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        color: '#64748B',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, "$", d.spent, "M / $", d.total, "M")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 10,
        background: '#F1F5F9',
        borderRadius: 5,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: `${Math.min(pct, 100)}%`,
        background: d.color,
        borderRadius: 5
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right',
        marginTop: '3px',
        fontSize: '11px',
        color: d.color,
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, pct, "%"));
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A',
      marginBottom: '16px'
    }
  }, "Enforcement Logs"), logs.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: '12px',
      padding: '12px 0',
      borderBottom: i < logs.length - 1 ? '1px solid #F8F7F5' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#EF4444',
      marginTop: 4,
      flexShrink: 0,
      animation: i === 0 ? 'dotPulse 2s ease infinite' : 'none'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      lineHeight: 1.5
    }
  }, l.text), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      marginTop: '3px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, l.time, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      color: '#E8783B'
    }
  }, l.entity))))))), /*#__PURE__*/React.createElement(TjModal, {
    open: resolveModal,
    onClose: () => setResolveModal(false),
    title: "Release Budget Cap — Engineering"
  }, /*#__PURE__*/React.createElement("div", null,
    /*#__PURE__*/React.createElement("div", { style: { background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif" } },
      "This will release the Engineering budget suspension and allow new invoices to be processed. A CFO override note is required."
    ),
    /*#__PURE__*/React.createElement(TjTextarea, {
      label: "CFO Override Note *",
      placeholder: "State the reason for releasing the Engineering budget cap…",
      value: resolveNote,
      onChange: e => setResolveNote(e.target.value),
      rows: 3
    }),
    /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 } },
      /*#__PURE__*/React.createElement(Btn, { variant: "secondary", onClick: () => setResolveModal(false) }, "Cancel"),
      /*#__PURE__*/React.createElement(Btn, { variant: "primary", onClick: handleResolve, disabled: resolveNote.length < 10 || resolving }, resolving ? 'Releasing…' : 'Release Cap & Resolve')
    )
  )));
};

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

const AUDIT_ENTRIES = [{
  id: 1,
  user: 'Rohan Kapoor',
  action: 'approved',
  entity: 'INV-2024-087',
  type: 'APPROVAL',
  time: 'Apr 19, 09:45',
  detail: '{ "invoice": "INV-2024-087", "amount": 45200, "role": "CFO", "status": "APPROVED" }'
}, {
  id: 2,
  user: 'System',
  action: 'flagged anomaly on',
  entity: 'INV-2024-082',
  type: 'SYSTEM',
  time: 'Apr 19, 09:14',
  detail: '{ "anomaly_id": "ANO-001", "score": 94, "type": "DUPLICATE_INVOICE" }'
}, {
  id: 3,
  user: 'Priya Mehta',
  action: 'raised query on',
  entity: 'INV-2024-089',
  type: 'INVOICE',
  time: 'Apr 19, 08:30',
  detail: '{ "invoice": "INV-2024-089", "query": "Please provide original PO reference." }'
}, {
  id: 4,
  user: 'Finance Admin',
  action: 'activated vendor',
  entity: 'VND-003',
  type: 'VENDOR',
  time: 'Apr 18, 17:20',
  detail: '{ "vendor_id": "VND-003", "name": "GlobalSync Technologies", "status": "ACTIVE" }'
}, {
  id: 5,
  user: 'Aisha Nair',
  action: 'submitted expense',
  entity: 'EXP-2024-441',
  type: 'INVOICE',
  time: 'Apr 18, 23:43',
  detail: '{ "expense_id": "EXP-2024-441", "amount": 4200, "category": "Travel" }'
}];
const AuditScreen = ({
  onNavigate
}) => {
  const [view, setView] = React.useState('timeline');
  const [expanded, setExpanded] = React.useState(null);
  const [filterChip, setFilterChip] = React.useState('All');
  const [auditEntries, setAuditEntries] = React.useState([]);
  const [loadingAudit, setLoadingAudit] = React.useState(true);
  const typeColor = {
    APPROVAL: '#10B981',
    INVOICE: '#E8783B',
    VENDOR: '#8B5CF6',
    SYSTEM: '#94A3B8',
    USER: '#3B82F6'
  };
  const chips = ['All', 'Invoice', 'Approval', 'Vendor', 'System'];
  React.useEffect(() => {
    const {
      AuditAPI
    } = window.TijoriAPI;
    AuditAPI.list().then(data => {
      const entries = Array.isArray(data) ? data : data && data.results ? data.results : [];
      const rows = entries.map((entry, i) => {
        const actionStr = entry.action || 'action';
        const parts = actionStr.split('.');
        const typeKey = parts[0] ? parts[0].toUpperCase() : 'SYSTEM';
        const actionVerb = parts[1] ? parts[1].replace(/_/g, ' ') : actionStr;
        const typeMap = {
          USER: 'USER',
          EXPENSE: 'INVOICE',
          VENDOR: 'VENDOR',
          SYSTEM: 'SYSTEM',
          INVOICE: 'INVOICE'
        };

        // Intelligent entity naming
        let entityName = entry.entity_type || '—';
        if (entry.entity_id) {
          const shortId = String(entry.entity_id).slice(0, 8).toUpperCase();
          // If it was an expense, use ref_no if available in after state
          const after = entry.masked_after || {};
          entityName = after.ref_no || after.invoice_number || `${entityName}:${shortId}`;
        }
        return {
          id: entry.id || i,
          user: entry.actor_name || entry.actor || 'System',
          action: actionVerb,
          entity: entityName,
          type: typeMap[typeKey] || 'SYSTEM',
          time: entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          }) : '—',
          detail: entry.masked_after || entry.masked_before ? JSON.stringify({
            before: entry.masked_before,
            after: entry.masked_after
          }, null, 2) : JSON.stringify(entry.details || {}, null, 2),
          raw: entry
        };
      });
      setAuditEntries(rows);
    }).catch(() => {}).finally(() => setLoadingAudit(false));
  }, []);
  const filtered = auditEntries.filter(e => filterChip === 'All' || e.type.startsWith(filterChip.toUpperCase()));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Audit Registry",
    subtitle: "A permanent, immutable record of every transaction and system event.",
    right: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
      type: "date",
      style: {
        padding: '8px 12px',
        border: '1.5px solid #E2E8F0',
        borderRadius: '10px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: '12px',
        outline: 'none',
        background: '#FAFAF8'
      }
    }), /*#__PURE__*/React.createElement(Btn, {
      variant: "secondary",
      small: true
    }, "Export CSV \u2193"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    }
  }, [['Invoice Actions', 12, '#E8783B'], ['Approvals', 8, '#10B981'], ['Vendor Changes', 3, '#8B5CF6'], ['Login Events', 24, '#3B82F6'], ['System Actions', 7, '#94A3B8']].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      background: 'white',
      borderRadius: '10px',
      padding: '10px 16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '18px',
      color: c
    }
  }, v), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginBottom: '20px',
      alignItems: 'center'
    }
  }, chips.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setFilterChip(c),
    style: {
      padding: '6px 14px',
      borderRadius: '999px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: filterChip === c ? '#E8783B' : '#F8F7F5',
      color: filterChip === c ? 'white' : '#64748B',
      transition: 'all 150ms'
    }
  }, c)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      background: '#F8F7F5',
      borderRadius: '10px',
      padding: '4px',
      display: 'flex',
      gap: '2px'
    }
  }, ['timeline', 'table'].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setView(v),
    style: {
      padding: '6px 12px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: view === v ? '#E8783B' : 'transparent',
      color: view === v ? 'white' : '#64748B',
      transition: 'all 150ms',
      textTransform: 'capitalize'
    }
  }, v)))), loadingAudit && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px',
      textAlign: 'center',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px'
    }
  }, "Loading audit log\u2026"), !loadingAudit && filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px',
      textAlign: 'center',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px'
    }
  }, "No audit entries found."), !loadingAudit && filtered.length > 0 && view === 'timeline' ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      paddingLeft: '32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      top: 0,
      bottom: 0,
      width: 2,
      background: 'linear-gradient(to bottom, #E8783B, #E8783B44)'
    }
  }), filtered.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    style: {
      marginBottom: '16px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -26,
      top: 12,
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: typeColor[e.type] || '#94A3B8',
      border: '2px solid white',
      boxShadow: `0 0 0 2px ${typeColor[e.type] || '#94A3B8'}44`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '12px',
      padding: '14px 16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      cursor: 'pointer',
      border: '1px solid #F1F0EE'
    },
    onClick: () => setExpanded(expanded === e.id ? null : e.id)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: (typeColor[e.type] || '#94A3B8') + '22',
      color: typeColor[e.type] || '#94A3B8',
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, e.type), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("strong", null, e.user), " ", e.action, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#E8783B',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px'
    }
  }, e.entity))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, e.time)), expanded === e.id && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      background: '#F8F7F5',
      borderRadius: '8px',
      padding: '10px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: '#475569',
      lineHeight: 1.6
    }
  }, e.detail))))) : !loadingAudit && filtered.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: '16px',
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
  }, ['Type', 'User', 'Action', 'Entity', 'Timestamp'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtered.map(e => /*#__PURE__*/React.createElement("tr", {
    key: e.id,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 52,
      transition: 'background 150ms'
    },
    onMouseEnter: ev => ev.currentTarget.style.background = '#FFF8F5',
    onMouseLeave: ev => ev.currentTarget.style.background = 'white'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: (typeColor[e.type] || '#94A3B8') + '22',
      color: typeColor[e.type] || '#94A3B8',
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, e.type)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, e.user), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontSize: '13px',
      color: '#475569',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, e.action), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: '#E8783B'
    }
  }, e.entity), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, e.time)))))));
};

// ─── SETTINGS ────────────────────────────────────────────────────────────────

const SettingsScreen = ({
  role: propRole,
  onNavigate
}) => {
  const currentRole = propRole || localStorage.getItem('tj_role') || 'CFO';
  const [tab, setTab] = React.useState('Security');
  const [toggles, setToggles] = React.useState({
    email: true,
    alerts: true,
    push: false,
    twofa: true
  });
  const [theme, setTheme] = React.useState('Light');
  const [profile, setProfile] = React.useState(null);
  const [pwForm, setPwForm] = React.useState({
    current: '',
    new_password: ''
  });
  const [pwMsg, setPwMsg] = React.useState('');
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({
    first_name: '',
    last_name: '',
    email: ''
  });
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileMsg, setProfileMsg] = React.useState('');
  const toggleFn = k => setToggles(t => ({
    ...t,
    [k]: !t[k]
  }));
  React.useEffect(() => {
    const {
      AuthAPI
    } = window.TijoriAPI;
    AuthAPI.me().then(u => {
      setProfile(u);
      setProfileForm({
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        email: u.email || ''
      });
    }).catch(() => {});
  }, []);
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const {
        AuthAPI
      } = window.TijoriAPI;
      const updated = await AuthAPI.updateProfile(profileForm);
      setProfile(p => ({
        ...p,
        ...updated
      }));
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => {
        setEditProfileOpen(false);
        setProfileMsg('');
      }, 1200);
    } catch (err) {
      setProfileMsg('Failed to update: ' + (err.message || 'Error'));
    } finally {
      setProfileSaving(false);
    }
  };
  const handleChangePassword = () => {
    const {
      AuthAPI
    } = window.TijoriAPI;
    AuthAPI.changePassword({
      old_password: pwForm.current,
      new_password: pwForm.new_password
    }).then(() => {
      setPwMsg('Password updated.');
      setPwForm({
        current: '',
        new_password: ''
      });
    }).catch(() => setPwMsg('Failed to update password.'));
  };
  const displayName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username : JSON.parse(localStorage.getItem('tj_user') || '{}').name || 'User';
  const displayInitials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const Toggle = ({
    on,
    onToggle
  }) => /*#__PURE__*/React.createElement("div", {
    onClick: onToggle,
    style: {
      width: 40,
      height: 22,
      borderRadius: 11,
      background: on ? '#E8783B' : '#E2E8F0',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 200ms',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: 'white',
      position: 'absolute',
      top: 3,
      left: on ? 21 : 3,
      transition: 'left 200ms',
      boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
    }
  }));
  const sessions = [{
    device: 'MacBook Pro · Chrome',
    loc: 'Mumbai, India',
    seen: 'Active now',
    current: true
  }, {
    device: 'iPhone 15 · Safari',
    loc: 'Mumbai, India',
    seen: '2h ago',
    current: false
  }, {
    device: 'Windows · Edge',
    loc: 'Delhi, India',
    seen: '3 days ago',
    current: false
  }];
  const tabs = ['Security', 'Integrations', 'Appearance', ...(currentRole === 'Finance Admin' ? ['Permissions'] : [])];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Account Architecture",
    subtitle: "Manage your institutional identity, access controls, and intelligence flows."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '24px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 80,
      borderRadius: '20px',
      background: 'linear-gradient(135deg, #E8783B, #FF6B35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '28px',
      color: 'white',
      margin: '0 auto 14px'
    }
  }, displayInitials), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 800,
      fontSize: '20px',
      color: '#0F172A',
      letterSpacing: '-0.5px',
      marginBottom: '6px'
    }
  }, displayName), /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'linear-gradient(135deg, #E8783B22, #FF6B3522)',
      color: '#E8783B',
      padding: '4px 14px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      border: '1px solid #E8783B44'
    }
  }, currentRole), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '16px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    style: {
      width: '100%',
      justifyContent: 'center'
    },
    onClick: () => setEditProfileOpen(true)
  }, "Edit Profile"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '15px',
      color: '#0F172A',
      marginBottom: '14px'
    }
  }, "Notifications"), [{
    key: 'email',
    label: 'Email Summaries',
    sub: 'Daily automated ledger digest'
  }, {
    key: 'alerts',
    label: 'System Alerts',
    sub: 'Critical transaction anomalies'
  }, {
    key: 'push',
    label: 'Mobile Push',
    sub: 'Real-time transaction alerts'
  }].map(n => /*#__PURE__*/React.createElement("div", {
    key: n.key,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: n.key !== 'push' ? '1px solid #F8F7F5' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, n.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, n.sub)), /*#__PURE__*/React.createElement(Toggle, {
    on: toggles[n.key],
    onToggle: () => toggleFn(n.key)
  }))))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '0',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      borderBottom: '1px solid #F1F0EE',
      padding: '0 24px'
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setTab(t),
    style: {
      padding: '16px 0',
      marginRight: '24px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: tab === t ? 700 : 500,
      color: tab === t ? '#0F172A' : '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      borderBottom: `2px solid ${tab === t ? '#E8783B' : 'transparent'}`,
      transition: 'all 150ms'
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px'
    }
  }, tab === 'Security' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '14px'
    }
  }, "Change Password"), /*#__PURE__*/React.createElement(TjInput, {
    label: "Current Password",
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    value: pwForm.current,
    onChange: e => setPwForm(p => ({
      ...p,
      current: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "New Password",
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    value: pwForm.new_password,
    onChange: e => setPwForm(p => ({
      ...p,
      new_password: e.target.value
    }))
  }), pwMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: pwMsg.includes('Failed') ? '#EF4444' : '#10B981',
      marginBottom: '8px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, pwMsg), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    small: true,
    onClick: handleChangePassword
  }, "Update Password")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A'
    }
  }, "Two-Factor Authentication"), /*#__PURE__*/React.createElement(Toggle, {
    on: toggles.twofa,
    onToggle: () => toggleFn('twofa')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Protect your account with TOTP-based authentication.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '14px'
    }
  }, "Active Sessions"), sessions.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: i < sessions.length - 1 ? '1px solid #F8F7F5' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: s.current ? '#10B981' : '#E2E8F0'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, s.device), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, s.loc, " \xB7 ", s.seen))), !s.current && /*#__PURE__*/React.createElement("button", {
    style: {
      fontSize: '12px',
      color: '#EF4444',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Revoke"))))), tab === 'Integrations' && /*#__PURE__*/React.createElement(React.Fragment, null, [{
    name: 'Microsoft Dynamics 365',
    desc: 'ERP sync for GL entries and PO matching',
    status: 'LIVE'
  }, {
    name: 'SMTP Email Server',
    desc: 'Outbound notifications and alerts',
    status: 'LIVE'
  }, {
    name: 'Webhook Endpoints',
    desc: 'Real-time event push to external systems',
    status: 'MOCK'
  }].map(int => /*#__PURE__*/React.createElement("div", {
    key: int.name,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      background: '#F8F7F5',
      borderRadius: '12px',
      marginBottom: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: '14px',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, int.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '2px'
    }
  }, int.desc)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: int.status
  }), /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true
  }, "Configure"))))), tab === 'Appearance' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '14px'
    }
  }, "Theme"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px'
    }
  }, ['Light', 'Dark', 'System'].map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    onClick: () => setTheme(t),
    style: {
      flex: 1,
      padding: '16px',
      border: `2px solid ${theme === t ? '#E8783B' : '#E2E8F0'}`,
      borderRadius: '12px',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 150ms',
      background: t === 'Dark' ? '#0F172A' : 'white'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '20px',
      marginBottom: '8px'
    }
  }, t === 'Light' ? '☀' : t === 'Dark' ? '🌙' : '⚙'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 700,
      color: t === 'Dark' ? 'white' : '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, t))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '14px'
    }
  }, "Density"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px'
    }
  }, ['Comfortable', 'Compact'].map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      flex: 1,
      padding: '14px 20px',
      border: `2px solid ${d === 'Comfortable' ? '#E8783B' : '#E2E8F0'}`,
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 150ms'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 700,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, d)))))), tab === 'Permissions' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '16px',
      color: '#0F172A',
      marginBottom: '8px'
    }
  }, "Admin Permissions"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#64748B',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '16px'
    }
  }, "Manage system-wide permission policies via the IAM screen."), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: () => window.dispatchEvent(new CustomEvent('navigate', {
      detail: 'iam'
    }))
  }, "Open IAM \u2192"))))), editProfileOpen && /*#__PURE__*/React.createElement(TjModal, {
    open: editProfileOpen,
    onClose: () => {
      setEditProfileOpen(false);
      setProfileMsg('');
    },
    title: "Edit Profile",
    width: 460
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "First Name",
    placeholder: "First name",
    value: profileForm.first_name,
    onChange: e => setProfileForm(p => ({
      ...p,
      first_name: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Last Name",
    placeholder: "Last name",
    value: profileForm.last_name,
    onChange: e => setProfileForm(p => ({
      ...p,
      last_name: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Email",
    placeholder: "you@company.com",
    type: "email",
    value: profileForm.email,
    onChange: e => setProfileForm(p => ({
      ...p,
      email: e.target.value
    }))
  }), profileMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: profileMsg.includes('Failed') ? '#EF4444' : '#10B981',
      marginBottom: '8px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, profileMsg), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => {
      setEditProfileOpen(false);
      setProfileMsg('');
    }
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: handleSaveProfile,
    disabled: profileSaving
  }, profileSaving ? 'Saving…' : 'Save Changes'))));
};

// ─── VENDOR PORTAL ────────────────────────────────────────────────────────────

const VendorPortalScreen = ({
  role,
  onNavigate
}) => {
  const [activeFilter, setActiveFilter] = React.useState('All');
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [selectedInv, setSelectedInv] = React.useState(null);
  const [selectedInvLoading, setSelectedInvLoading] = React.useState(false);
  const [queryReply, setQueryReply] = React.useState('');
  const [queryReplyLoading, setQueryReplyLoading] = React.useState(false);

  // Real bills from API
  const [myInvoices, setMyInvoices] = React.useState([]);
  const [loadingBills, setLoadingBills] = React.useState(true);

  // Submit form state
  const [fileRef, setFileRef] = React.useState(null);
  const [editPurpose, setEditPurpose] = React.useState('');
  const [savingPurpose, setSavingPurpose] = React.useState(false);
  const [ocrLoading, setOcrLoading] = React.useState(false);
  const [ocrResult, setOcrResult] = React.useState(null);
  const [formData, setFormData] = React.useState({
    invoice_number: '',
    invoice_date: '',
    business_purpose: '',
    pre_gst_amount: '',
    cgst: '',
    sgst: '',
    igst: '',
    total_amount: '',
    gstin: '',
    pan: '',
    tds_section: '',
    vendor_name_ocr: '',
    bank_account: '',
    bank_ifsc: ''
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [multiInvoices, setMultiInvoices] = React.useState(null);
  const [multiSubmitted, setMultiSubmitted] = React.useState({});
  const [multiSubmitting, setMultiSubmitting] = React.useState({});
  const {
    VendorAPI,
    FilesAPI
  } = window.TijoriAPI;
  const fmtAmt = v => {
    if (!v) return '₹0';
    const n = parseFloat(v);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };
  const loadBills = () => {
    setLoadingBills(true);
    VendorAPI.myBills().then(data => setMyInvoices(data || [])).catch(() => {}).finally(() => setLoadingBills(false));
  };
  React.useEffect(() => {
    loadBills();
  }, []);
  const openInvoice = async inv => {
    setSelectedInvLoading(true);
    setQueryReply('');
    try {
      const detail = await VendorAPI.billDetail(inv.id);
      setSelectedInv(detail);
    } catch (e) {
      setSelectedInv(inv);
    } finally {
      setSelectedInvLoading(false);
    }
  };
  const handleFileSelect = async file => {
    if (!file) return;
    setOcrLoading(true);
    setOcrResult(null);
    setSubmitError('');
    setMultiInvoices(null);
    setMultiSubmitted({});
    setMultiSubmitting({});
    try {
      const uploaded = await FilesAPI.upload(file);
      setFileRef(uploaded.id);
      const ocr = await FilesAPI.ocr(uploaded.id);
      setOcrResult(ocr);
      const hasData = ocr.extracted_fields && Object.keys(ocr.extracted_fields).length > 0;
      const succeeded = ocr.status === 'COMPLETE' || ocr.confidence && ocr.confidence > 0;
      if (hasData && succeeded) {
        const f = ocr.extracted_fields;

        // Multi-invoice PDF detected
        if (f.multi_invoice && Array.isArray(f.invoices) && f.invoices.length > 1) {
          setMultiInvoices(f.invoices);
          return;
        }

        // Single invoice — pre-fill form
        setFormData(prev => ({
          ...prev,
          invoice_number: f.invoice_number || prev.invoice_number,
          invoice_date: f.invoice_date || prev.invoice_date,
          pre_gst_amount: f.pre_gst_amount ? String(f.pre_gst_amount) : prev.pre_gst_amount,
          cgst: f.cgst ? String(f.cgst) : prev.cgst,
          sgst: f.sgst ? String(f.sgst) : prev.sgst,
          igst: f.igst ? String(f.igst) : prev.igst,
          total_amount: f.total_amount ? String(f.total_amount) : prev.total_amount,
          gstin: f.gstin || prev.gstin,
          pan: f.pan || prev.pan,
          vendor_name_ocr: f.vendor_name || prev.vendor_name_ocr,
          bank_account: f.bank_details?.account_no || prev.bank_account,
          bank_ifsc: f.bank_details?.ifsc || prev.bank_ifsc,
          business_purpose: prev.business_purpose || (f.vendor_name ? `Services from ${f.vendor_name}` : prev.business_purpose)
        }));
      } else if (ocr.error) {
        setSubmitError(`OCR Error: ${ocr.error}`);
      }
    } catch (err) {
      setSubmitError('OCR failed: ' + (err.message || 'Unknown error'));
    } finally {
      setOcrLoading(false);
    }
  };
  const handleSubmit = async () => {
    if (!formData.total_amount) {
      setSubmitError('Amount is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date || null,
        business_purpose: formData.business_purpose || 'Invoice submission',
        total_amount: parseFloat(formData.total_amount) || 0,
        pre_gst_amount: parseFloat(formData.pre_gst_amount) || 0,
        cgst: parseFloat(formData.cgst) || 0,
        sgst: parseFloat(formData.sgst) || 0,
        igst: parseFloat(formData.igst) || 0,
        ...(formData.tds_section ? {
          tds_section: formData.tds_section
        } : {}),
        ...(fileRef ? {
          invoice_file: fileRef
        } : {})
      };
      await VendorAPI.submitBill(payload);
      setSubmitOpen(false);
      setFormData({
        invoice_number: '',
        invoice_date: '',
        business_purpose: '',
        pre_gst_amount: '',
        cgst: '',
        sgst: '',
        igst: '',
        total_amount: '',
        gstin: '',
        pan: '',
        tds_section: '',
        vendor_name_ocr: '',
        bank_account: '',
        bank_ifsc: ''
      });
      setFileRef(null);
      setOcrResult(null);
      loadBills();
    } catch (err) {
      setSubmitError(err.message || 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };
  const stages = ['Submitted', 'L1 Review', 'HOD', 'Finance Mgr', 'CFO', 'Payment'];
  const filterMap = {
    'In Progress': ['SUBMITTED', 'PENDING_L1', 'PENDING_L2', 'PENDING_HOD', 'PENDING_FIN_L1', 'PENDING_FIN_L2', 'PENDING_FIN_HEAD'],
    'Query': ['QUERY_RAISED'],
    'Paid': ['PAID', 'BOOKED_D365', 'POSTED_D365'],
    'Rejected': ['REJECTED', 'AUTO_REJECT']
  };
  const filteredInvoices = activeFilter === 'All' ? myInvoices : myInvoices.filter(inv => (filterMap[activeFilter] || []).includes(inv.status));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Vendor Portal",
    subtitle: "Your submitted invoices and payment status",
    right: /*#__PURE__*/React.createElement(Btn, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement("span", null, "\u2191"),
      onClick: () => {
        setSubmitOpen(true);
        setSubmitError('');
        setOcrResult(null);
        setFileRef(null);
        setMultiInvoices(null);
        setMultiSubmitted({});
      }
    }, "Submit Invoice")
  }), /*#__PURE__*/React.createElement(StatsRow, {
    cards: [{
      label: 'Total Submitted',
      value: loadingBills ? '…' : String(myInvoices.length),
      delta: 'All time',
      deltaType: 'positive'
    }, {
      label: 'In Progress',
      value: loadingBills ? '…' : String(myInvoices.filter(i => !['PAID', 'REJECTED', 'AUTO_REJECT'].includes(i.status)).length),
      delta: 'Under review',
      deltaType: 'neutral',
      color: '#E8783B'
    }, {
      label: 'Paid',
      value: loadingBills ? '…' : String(myInvoices.filter(i => ['PAID', 'BOOKED_D365', 'POSTED_D365'].includes(i.status)).length),
      delta: 'Completed',
      deltaType: 'positive',
      color: '#10B981'
    }, {
      label: 'Rejected',
      value: loadingBills ? '…' : String(myInvoices.filter(i => ['REJECTED', 'AUTO_REJECT'].includes(i.status)).length),
      delta: 'All time',
      deltaType: myInvoices.filter(i => ['REJECTED', 'AUTO_REJECT'].includes(i.status)).length > 0 ? 'negative' : 'positive'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '7fr 5fr',
      gap: '20px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '0',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px',
      borderBottom: '1px solid #F1F0EE',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '17px',
      color: '#0F172A'
    }
  }, "My Invoices"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px'
    }
  }, ['All', 'In Progress', 'Query', 'Paid', 'Rejected'].map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    onClick: () => setActiveFilter(f),
    style: {
      padding: '5px 12px',
      borderRadius: '999px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: activeFilter === f ? '#E8783B' : '#F8F7F5',
      color: activeFilter === f ? 'white' : '#64748B',
      transition: 'all 150ms'
    }
  }, f)))), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F8F7F5'
    }
  }, ['Invoice #', 'Amount', 'Date', 'Status', 'Actions'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 16px',
      textAlign: 'left',
      fontSize: '10px',
      fontWeight: 700,
      color: '#94A3B8',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, loadingBills && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "5",
    style: {
      padding: '32px',
      textAlign: 'center',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '13px'
    }
  }, "Loading invoices\u2026")), filteredInvoices.map(inv => /*#__PURE__*/React.createElement("tr", {
    key: inv.id,
    style: {
      borderTop: '1px solid #F1F0EE',
      height: 52,
      cursor: 'pointer',
      transition: 'background 150ms'
    },
    onMouseEnter: e => e.currentTarget.style.background = '#FFF8F5',
    onMouseLeave: e => e.currentTarget.style.background = 'white',
    onClick: () => {
      openInvoice(inv);
      setEditPurpose('');
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      color: '#0F172A',
      fontWeight: 600
    }
  }, inv.invoice_number || '—'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '10px',
      color: '#E8783B',
      marginTop: '1px'
    }
  }, inv.ref_no)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontWeight: 700,
      fontSize: '14px',
      color: '#0F172A',
      letterSpacing: '-0.5px'
    }
  }, fmtAmt(inv.total_amount)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px',
      fontSize: '12px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, inv.invoice_date || inv.created_at?.slice(0, 10)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: inv.status
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    small: true,
    onClick: () => openInvoice(inv)
  }, "View")))))), filteredInvoices.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '32px',
      marginBottom: '12px'
    }
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '4px'
    }
  }, "No invoices yet."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Submit your first invoice to get started."))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: '22px',
      overflowY: 'auto',
      maxHeight: '80vh'
    }
  }, selectedInvLoading ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 260,
      color: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Loading invoice\u2026") : selectedInv ? (() => {
    const fmtDate = d => d ? new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '—';
    const fmtDateOnly = d => d ? new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : '—';
    const STATUS_STAGE = {
      'SUBMITTED': 0,
      'PENDING_L1': 1,
      'PENDING_L2': 1,
      'PENDING_HOD': 2,
      'PENDING_FIN_L1': 3,
      'PENDING_FIN_L2': 3,
      'PENDING_FIN_HEAD': 4,
      'APPROVED': 5,
      'PENDING_D365': 5,
      'BOOKED_D365': 5,
      'POSTED_D365': 5,
      'PAID': 6,
      'REJECTED': -1,
      'AUTO_REJECT': -1,
      'QUERY_RAISED': 1
    };
    const stageIdx = STATUS_STAGE[selectedInv.status] ?? 0;
    const isRejected = ['REJECTED', 'AUTO_REJECT'].includes(selectedInv.status);
    const isPaid = selectedInv.status === 'PAID';
    const Row = ({
      label,
      value
    }) => /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '7px 0',
        borderBottom: '1px solid #F8F7F5'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '11px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        flexShrink: 0,
        marginRight: 12
      }
    }, label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 500,
        textAlign: 'right'
      }
    }, value || '—'));
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
        color: '#E8783B',
        fontWeight: 600
      }
    }, selectedInv.ref_no || selectedInv.id?.slice(0, 8)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 800,
        fontSize: '24px',
        color: '#0F172A',
        letterSpacing: '-1px',
        marginTop: '2px'
      }
    }, "\u20B9", parseFloat(selectedInv.total_amount || 0).toLocaleString('en-IN')), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginTop: '2px'
      }
    }, "Uploaded ", fmtDate(selectedInv.created_at))), /*#__PURE__*/React.createElement(StatusBadge, {
      status: selectedInv.status
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        fontWeight: 700,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginBottom: '8px'
      }
    }, "Invoice Details"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: '16px'
      }
    }, /*#__PURE__*/React.createElement(Row, {
      label: "Invoice #",
      value: selectedInv.invoice_number || '—'
    }), /*#__PURE__*/React.createElement(Row, {
      label: "Invoice Date",
      value: fmtDateOnly(selectedInv.invoice_date)
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '8px 0',
        borderBottom: '1px solid #F8F7F5'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        color: '#94A3B8',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '6px'
      }
    }, "Purpose"), ['DRAFT', 'SUBMITTED', 'QUERY_RAISED'].includes(selectedInv.status) ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '6px',
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("textarea", {
      value: editPurpose !== '' ? editPurpose : selectedInv.business_purpose || '',
      onChange: e => setEditPurpose(e.target.value),
      rows: 2,
      style: {
        flex: 1,
        fontSize: '12px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '6px 8px',
        resize: 'vertical',
        color: '#0F172A',
        outline: 'none'
      },
      placeholder: "Describe the business purpose\u2026"
    }), /*#__PURE__*/React.createElement("button", {
      disabled: savingPurpose || editPurpose === '',
      onClick: async () => {
        if (!editPurpose.trim()) return;
        setSavingPurpose(true);
        try {
          const updated = await VendorAPI.updateBill(selectedInv.id, {
            business_purpose: editPurpose.trim()
          });
          setSelectedInv(prev => ({
            ...prev,
            business_purpose: editPurpose.trim()
          }));
          setMyInvoices(list => list.map(i => i.id === selectedInv.id ? {
            ...i,
            business_purpose: editPurpose.trim()
          } : i));
          setEditPurpose('');
        } catch (e) {
          alert(e.message || 'Save failed');
        } finally {
          setSavingPurpose(false);
        }
      },
      style: {
        padding: '6px 12px',
        borderRadius: '8px',
        background: editPurpose && !savingPurpose ? '#E8783B' : '#F1F5F9',
        color: editPurpose && !savingPurpose ? 'white' : '#94A3B8',
        border: 'none',
        cursor: editPurpose && !savingPurpose ? 'pointer' : 'not-allowed',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        whiteSpace: 'nowrap'
      }
    }, savingPurpose ? '…' : 'Save')) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, selectedInv.business_purpose || '—')), /*#__PURE__*/React.createElement(Row, {
      label: "Pre-GST",
      value: selectedInv.pre_gst_amount ? `₹${parseFloat(selectedInv.pre_gst_amount).toLocaleString('en-IN')}` : null
    }), parseFloat(selectedInv.cgst) > 0 && /*#__PURE__*/React.createElement(Row, {
      label: "CGST",
      value: `₹${parseFloat(selectedInv.cgst).toLocaleString('en-IN')}`
    }), parseFloat(selectedInv.sgst) > 0 && /*#__PURE__*/React.createElement(Row, {
      label: "SGST",
      value: `₹${parseFloat(selectedInv.sgst).toLocaleString('en-IN')}`
    }), parseFloat(selectedInv.igst) > 0 && /*#__PURE__*/React.createElement(Row, {
      label: "IGST",
      value: `₹${parseFloat(selectedInv.igst).toLocaleString('en-IN')}`
    }), /*#__PURE__*/React.createElement(Row, {
      label: "Total",
      value: `₹${parseFloat(selectedInv.total_amount || 0).toLocaleString('en-IN')}`
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        fontWeight: 700,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginBottom: '8px'
      }
    }, "Timeline"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: '16px'
      }
    }, /*#__PURE__*/React.createElement(Row, {
      label: "Submitted",
      value: fmtDate(selectedInv.submitted_at || selectedInv.created_at)
    }), selectedInv.approved_at && /*#__PURE__*/React.createElement(Row, {
      label: "Approved",
      value: fmtDate(selectedInv.approved_at)
    }), selectedInv.invoice_file_url && /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: '10px'
      }
    }, /*#__PURE__*/React.createElement(Btn, {
      variant: "secondary",
      small: true,
      onClick: () => window.TijoriAPI.FilesAPI.open(selectedInv.invoice_file)
    }, "View Full Receipt"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        fontWeight: 700,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginBottom: '12px'
      }
    }, "Approval Progress"), isRejected ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '10px',
        padding: '12px 14px',
        marginBottom: '14px',
        fontSize: '13px',
        color: '#991B1B',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600
      }
    }, "\u274C Invoice Rejected") : /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: '16px'
      }
    }, stages.map((s, i) => {
      const done = isPaid ? true : i < stageIdx;
      const current = !isPaid && i === stageIdx;
      return /*#__PURE__*/React.createElement("div", {
        key: s,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: done ? '#10B981' : current ? '#E8783B' : '#F1F5F9',
          border: `2px solid ${done ? '#10B981' : current ? '#E8783B' : '#E2E8F0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          color: done || current ? 'white' : '#94A3B8',
          flexShrink: 0,
          animation: current ? 'dotPulse 2s ease infinite' : 'none'
        }
      }, done ? '✓' : i + 1), i < stages.length - 1 && /*#__PURE__*/React.createElement("div", {
        style: {
          width: 2,
          height: 16,
          background: done ? '#10B981' : '#F1F5F9',
          margin: '2px 0'
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          paddingBottom: i < stages.length - 1 ? '16px' : '0'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '12px',
          fontWeight: current ? 700 : 500,
          color: done ? '#10B981' : current ? '#0F172A' : '#94A3B8',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }
      }, s), current && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '10px',
          color: '#E8783B',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          marginTop: '1px'
        }
      }, "In progress")));
    })), selectedInv.queries?.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }
    }, selectedInv.queries.map(q => /*#__PURE__*/React.createElement("div", {
      key: q.id,
      style: {
        background: '#F5F3FF',
        border: '1px solid #EDE9FE',
        borderRadius: '10px',
        padding: '12px 14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        fontWeight: 700,
        color: '#5B21B6',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginBottom: '4px'
      }
    }, "Query from ", q.raised_by_name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        color: '#4C1D95',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, q.question), q.ai_suggestion && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: '8px',
        fontSize: '12px',
        color: '#92400E',
        background: '#FFF7ED',
        borderRadius: '8px',
        padding: '8px 10px',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, /*#__PURE__*/React.createElement("strong", null, "AI Suggestion:"), " ", q.ai_suggestion), q.response ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: '8px',
        fontSize: '12px',
        color: '#065F46',
        background: '#F0FDF4',
        borderRadius: '8px',
        padding: '8px 10px',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, /*#__PURE__*/React.createElement("strong", null, q.responded_by_name || 'Response', ":"), " ", q.response) : selectedInv.action_permissions?.can_respond_query ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TjTextarea, {
      label: "",
      placeholder: "Your response\u2026",
      rows: 2,
      value: queryReply,
      onChange: e => setQueryReply(e.target.value)
    }), /*#__PURE__*/React.createElement(Btn, {
      variant: "purple",
      small: true,
      disabled: queryReplyLoading || queryReply.trim().length < 3,
      onClick: async () => {
        setQueryReplyLoading(true);
        try {
          const updated = await window.TijoriAPI.VendorAPI.respondQuery(selectedInv.id, q.id, queryReply.trim());
          setSelectedInv(updated);
          setMyInvoices(list => list.map(i => i.id === updated.id ? {
            ...i,
            ...updated
          } : i));
          setQueryReply('');
        } catch (e) {
          alert(e.message || 'Reply failed');
        } finally {
          setQueryReplyLoading(false);
        }
      }
    }, queryReplyLoading ? 'Sending…' : 'Send Reply')) : null))), selectedInv.status === 'QUERY_RAISED' && !selectedInv.queries?.length && /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#F5F3FF',
        border: '1px solid #EDE9FE',
        borderRadius: '10px',
        padding: '12px 14px',
        marginBottom: '14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        fontWeight: 700,
        color: '#5B21B6',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginBottom: '4px'
      }
    }, "Query from Finance Team"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        color: '#4C1D95',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, "Please provide original PO reference number for this invoice."), /*#__PURE__*/React.createElement(TjTextarea, {
      label: "",
      placeholder: "Your response\u2026",
      rows: 2
    }), /*#__PURE__*/React.createElement(Btn, {
      variant: "purple",
      small: true
    }, "Send Reply")), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSelectedInv(null),
      style: {
        fontSize: '12px',
        color: '#94A3B8',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginTop: '4px'
      }
    }, "\u2190 Back to list"));
  })() : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 300,
      color: '#94A3B8',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '40px',
      marginBottom: '12px'
    }
  }, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14px',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: '#475569'
    }
  }, "Select an invoice"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '4px'
    }
  }, "Click any row to view details and approval status")))), /*#__PURE__*/React.createElement(TjModal, {
    open: submitOpen,
    onClose: () => {
      setSubmitOpen(false);
      setMultiInvoices(null);
      setMultiSubmitted({});
    },
    title: "Submit Invoice",
    width: 520
  }, (() => {
    const ocrOk = ocrResult && ocrResult.confidence > 0 && ocrResult.status === 'COMPLETE';
    const ocrFail = ocrResult && !ocrOk;
    const borderColor = ocrOk ? '#10B981' : ocrFail ? '#EF4444' : ocrLoading ? '#E8783B' : '#E2E8F0';
    const bg = ocrOk ? '#F0FDF4' : ocrFail ? '#FEF2F2' : '#FAFAF8';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        border: `1.5px dashed ${borderColor}`,
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        marginBottom: '16px',
        background: bg,
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "file",
      accept: ".pdf,.jpg,.jpeg,.png",
      style: {
        position: 'absolute',
        inset: 0,
        opacity: 0,
        cursor: 'pointer',
        width: '100%',
        height: '100%'
      },
      onChange: e => {
        if (e.target.files[0]) handleFileSelect(e.target.files[0]);
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '28px',
        marginBottom: '8px'
      }
    }, ocrOk ? '✅' : ocrFail ? '❌' : ocrLoading ? '⏳' : '📎'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: '13px',
        color: ocrOk ? '#065F46' : ocrFail ? '#991B1B' : ocrLoading ? '#92400E' : '#0F172A',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, ocrOk ? `OCR Complete — ${Math.round(ocrResult.confidence * 100)}% confidence` : ocrFail ? `OCR Failed — ${ocrResult.error || 'Could not extract data'}` : ocrLoading ? 'AI reading invoice… this may take 10–20 seconds' : 'Upload Invoice PDF / Image'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '12px',
        color: '#94A3B8',
        marginTop: '4px',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, ocrOk ? `${ocrResult.pages_processed} page(s) · Model: ${ocrResult.model_used || '—'}` : ocrFail ? 'Click to try another file' : ocrLoading ? 'Do not close this window' : 'Click to browse · PDF, JPG, PNG (max 10MB)'), !ocrResult && !ocrLoading && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: '10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'linear-gradient(135deg, rgba(232,120,59,0.08), rgba(139,92,246,0.08))',
        border: '1px solid #EDE9FE',
        borderRadius: '999px',
        padding: '4px 12px'
      }
    }, /*#__PURE__*/React.createElement(AIBadge, {
      small: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '11px',
        color: '#5B21B6',
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, "AI auto-extracts all invoice fields")));
  })(), ocrResult && ocrResult.confidence > 0 && ocrResult.status === 'COMPLETE' && !multiInvoices && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F0FDF4',
      border: '1px solid #BBF7D0',
      borderRadius: '10px',
      padding: '10px 14px',
      marginBottom: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#065F46',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }
  }, /*#__PURE__*/React.createElement(AIBadge, {
    small: true
  }), " Fields pre-filled from invoice"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#047857',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Confidence: ", Math.round(ocrResult.confidence * 100), "% \xB7 ", ocrResult.pages_processed, " page(s) \xB7 ", ocrResult.model_used, ocrResult.validation_errors?.length > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#92400E',
      marginLeft: 8
    }
  }, "\u26A0 ", ocrResult.validation_errors[0]))), multiInvoices && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FFF7ED',
      border: '1px solid #FED7AA',
      borderRadius: '10px',
      padding: '10px 14px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(AIBadge, {
    small: true
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#92400E',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, multiInvoices.length, " separate invoices detected in this PDF"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#78350F',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: '2px'
    }
  }, "Each invoice has been extracted separately. Submit them individually below."))), multiInvoices.map((inv, idx) => {
    const isSubmitted = multiSubmitted[idx];
    const isSubmitting = multiSubmitting[idx];
    const handleSubmitOne = async () => {
      setMultiSubmitting(s => ({
        ...s,
        [idx]: true
      }));
      try {
        const payload = {
          invoice_number: inv.invoice_number || '',
          invoice_date: inv.invoice_date || null,
          business_purpose: inv.business_purpose || (inv.vendor_name ? `Services from ${inv.vendor_name}` : 'Invoice submission'),
          total_amount: parseFloat(inv.total_amount) || 0,
          pre_gst_amount: parseFloat(inv.pre_gst_amount) || 0,
          cgst: parseFloat(inv.cgst) || 0,
          sgst: parseFloat(inv.sgst) || 0,
          igst: parseFloat(inv.igst) || 0,
          ...(fileRef ? {
            invoice_file: fileRef
          } : {})
        };
        await VendorAPI.submitBill(payload);
        setMultiSubmitted(s => ({
          ...s,
          [idx]: true
        }));
        loadBills();
      } catch (e) {
        alert(`Invoice ${idx + 1} submit failed: ${e.message || 'Unknown error'}`);
      } finally {
        setMultiSubmitting(s => ({
          ...s,
          [idx]: false
        }));
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      style: {
        border: `1.5px solid ${isSubmitted ? '#BBF7D0' : '#E2E8F0'}`,
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '10px',
        background: isSubmitted ? '#F0FDF4' : 'white'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: '15px',
        color: '#0F172A'
      }
    }, "Invoice ", idx + 1, " ", isSubmitted && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#10B981',
        fontSize: '12px'
      }
    }, "\u2713 Submitted")), !isSubmitted && /*#__PURE__*/React.createElement("button", {
      onClick: handleSubmitOne,
      disabled: isSubmitting,
      style: {
        padding: '6px 14px',
        borderRadius: '8px',
        background: isSubmitting ? '#E2E8F0' : '#E8783B',
        color: isSubmitting ? '#94A3B8' : 'white',
        border: 'none',
        cursor: isSubmitting ? 'not-allowed' : 'pointer',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, isSubmitting ? 'Submitting…' : 'Submit')), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        fontSize: '12px',
        color: '#475569',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#94A3B8',
        fontSize: '10px',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.06em'
      }
    }, "Vendor"), /*#__PURE__*/React.createElement("br", null), inv.vendor_name || '—'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#94A3B8',
        fontSize: '10px',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.06em'
      }
    }, "Invoice #"), /*#__PURE__*/React.createElement("br", null), inv.invoice_number || '—'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#94A3B8',
        fontSize: '10px',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.06em'
      }
    }, "Date"), /*#__PURE__*/React.createElement("br", null), inv.invoice_date || '—'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#94A3B8',
        fontSize: '10px',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.06em'
      }
    }, "Total"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: '15px',
        color: '#0F172A',
        letterSpacing: '-0.5px'
      }
    }, "\u20B9", parseFloat(inv.total_amount || 0).toLocaleString('en-IN'))), parseFloat(inv.cgst) > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#94A3B8',
        fontSize: '10px',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.06em'
      }
    }, "CGST"), /*#__PURE__*/React.createElement("br", null), "\u20B9", parseFloat(inv.cgst).toLocaleString('en-IN')), parseFloat(inv.sgst) > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#94A3B8',
        fontSize: '10px',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.06em'
      }
    }, "SGST"), /*#__PURE__*/React.createElement("br", null), "\u20B9", parseFloat(inv.sgst).toLocaleString('en-IN')), parseFloat(inv.igst) > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#94A3B8',
        fontSize: '10px',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.06em'
      }
    }, "IGST"), /*#__PURE__*/React.createElement("br", null), "\u20B9", parseFloat(inv.igst).toLocaleString('en-IN'))));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => {
      setSubmitOpen(false);
      setMultiInvoices(null);
    }
  }, "Close"))), !multiInvoices && /*#__PURE__*/React.createElement(React.Fragment, null, formData.vendor_name_ocr && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F0F9FF',
      border: '1px solid #BAE6FD',
      borderRadius: '8px',
      padding: '8px 12px',
      marginBottom: '10px',
      fontSize: '12px',
      color: '#0369A1',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Vendor (OCR):"), " ", formData.vendor_name_ocr), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Invoice #",
    placeholder: "INV-2026-001",
    value: formData.invoice_number,
    onChange: e => setFormData(f => ({
      ...f,
      invoice_number: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Invoice Date",
    type: "date",
    value: formData.invoice_date,
    onChange: e => setFormData(f => ({
      ...f,
      invoice_date: e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      margin: '10px 0 6px'
    }
  }, "Amount Breakdown"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Pre-GST Amount (\u20B9)",
    placeholder: "0.00",
    type: "number",
    value: formData.pre_gst_amount,
    onChange: e => setFormData(f => ({
      ...f,
      pre_gst_amount: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "Total Amount (\u20B9)",
    placeholder: "0.00",
    type: "number",
    value: formData.total_amount,
    onChange: e => setFormData(f => ({
      ...f,
      total_amount: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "CGST (\u20B9)",
    placeholder: "0.00",
    type: "number",
    value: formData.cgst,
    onChange: e => setFormData(f => ({
      ...f,
      cgst: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "SGST (\u20B9)",
    placeholder: "0.00",
    type: "number",
    value: formData.sgst,
    onChange: e => setFormData(f => ({
      ...f,
      sgst: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "IGST (\u20B9)",
    placeholder: "0.00",
    type: "number",
    value: formData.igst,
    onChange: e => setFormData(f => ({
      ...f,
      igst: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "TDS Section",
    placeholder: "194C / 194J",
    value: formData.tds_section,
    onChange: e => setFormData(f => ({
      ...f,
      tds_section: e.target.value
    }))
  })), (formData.gstin || formData.pan) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      margin: '10px 0 6px'
    }
  }, "Tax Identifiers (OCR extracted)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "GSTIN",
    placeholder: "27AABCU9603R1ZM",
    value: formData.gstin,
    onChange: e => setFormData(f => ({
      ...f,
      gstin: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "PAN",
    placeholder: "AABCU9603R",
    value: formData.pan,
    onChange: e => setFormData(f => ({
      ...f,
      pan: e.target.value
    }))
  }))), (formData.bank_account || formData.bank_ifsc) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      margin: '10px 0 6px'
    }
  }, "Bank Details (OCR extracted)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(TjInput, {
    label: "Account No",
    value: formData.bank_account,
    onChange: e => setFormData(f => ({
      ...f,
      bank_account: e.target.value
    }))
  }), /*#__PURE__*/React.createElement(TjInput, {
    label: "IFSC",
    value: formData.bank_ifsc,
    onChange: e => setFormData(f => ({
      ...f,
      bank_ifsc: e.target.value
    }))
  }))), /*#__PURE__*/React.createElement(TjInput, {
    label: "Business Purpose",
    placeholder: "Service description",
    value: formData.business_purpose,
    onChange: e => setFormData(f => ({
      ...f,
      business_purpose: e.target.value
    }))
  }), submitError && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEE2E2',
      border: '1px solid #FECACA',
      borderRadius: '8px',
      padding: '10px 14px',
      marginBottom: '12px',
      fontSize: '12px',
      color: '#991B1B',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, submitError), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FFF7ED',
      border: '1px solid #FED7AA',
      borderRadius: '10px',
      padding: '10px 14px',
      marginBottom: '16px',
      fontSize: '12px',
      color: '#92400E',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, "Your invoice will go through the approval workflow. Anomaly detection runs automatically."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "secondary",
    onClick: () => setSubmitOpen(false)
  }, "Cancel"), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: handleSubmit,
    disabled: submitting || ocrLoading
  }, submitting ? 'Submitting…' : 'Submit for Approval')))), /*#__PURE__*/React.createElement(FloatingCopilot, {
    role: role
  }));
};
Object.assign(window, {
  VendorsScreen,
  ExpensesScreen,
  BudgetScreen,
  GuardrailsScreen,
  AuditScreen,
  SettingsScreen,
  VendorPortalScreen
});
