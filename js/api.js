// Tijori AI — Centralized API client
// All backend communication goes through this module.

const API_BASE = '/api/v1';

// ── Token storage ─────────────────────────────────────────────────────────────

const Auth = {
  getAccess: () => localStorage.getItem('tj_access'),
  getRefresh: () => localStorage.getItem('tj_refresh'),
  setTokens: (access, refresh) => {
    localStorage.setItem('tj_access', access);
    if (refresh) localStorage.setItem('tj_refresh', refresh);
  },
  clear: () => {
    localStorage.removeItem('tj_access');
    localStorage.removeItem('tj_refresh');
    localStorage.removeItem('tj_authed');
    localStorage.removeItem('tj_role');
    localStorage.removeItem('tj_user');
    localStorage.removeItem('tj_screen');
  },
  headers: () => ({
    'Content-Type': 'application/json',
    ...(localStorage.getItem('tj_access') ? { 'Authorization': `Bearer ${localStorage.getItem('tj_access')}` } : {}),
  }),
};

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...Auth.headers(), ...(options.headers || {}) },
  });

  if (res.status === 401) {
    // Try token refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retry = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: { ...Auth.headers(), ...(options.headers || {}) },
      });
      if (!retry.ok) throw new APIError(retry.status, await retry.json().catch(() => ({})));
      return retry.json();
    } else {
      Auth.clear();
      window.location.reload();
      return;
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new APIError(res.status, body);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function tryRefresh() {
  const refresh = Auth.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    Auth.setTokens(data.access, null);
    return true;
  } catch {
    return false;
  }
}

class APIError extends Error {
  constructor(status, body) {
    super(body?.error || body?.detail || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

// ── Multipart fetch (for file uploads) ───────────────────────────────────────

async function apiUpload(url, formData) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: {
      ...(Auth.getAccess() ? { 'Authorization': `Bearer ${Auth.getAccess()}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new APIError(res.status, body);
  }
  return res.json();
}

// ── Role mapping ──────────────────────────────────────────────────────────────
// Maps Django role strings → Tijori AI ROLE_CONFIG keys

const ROLE_MAP = {
  'finance_admin':   'Finance Admin',
  'finance_manager': 'Finance Manager',
  'dept_head':       'Finance Manager',
  'employee':        'AP Clerk',
  'vendor':          'Vendor',
  'cfo':             'CFO',
};


const AuthAPI = {
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new APIError(res.status, body);
    }
    const data = await res.json();
    Auth.setTokens(data.access, data.refresh);
    return data.user;
  },

  async me() {
    return apiFetch('/auth/me/');
  },

  async updateProfile(data) {
    return apiFetch('/auth/me/', { method: 'PATCH', body: JSON.stringify(data) });
  },

  async listUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/auth/users/${qs ? '?' + qs : ''}`);
  },

  async updateUser(id, data) {
    return apiFetch(`/auth/users/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async createUser(data) {
    return apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify(data) });
  },

  async changePassword(data) {
    return apiFetch('/auth/change-password/', { method: 'POST', body: JSON.stringify(data) });
  },
};

// ── Dashboard API ─────────────────────────────────────────────────────────────

const DashboardAPI = {
  async stats() {
    return apiFetch('/invoices/dashboard/stats/');
  },
};

// ── Bills / AP Hub API ────────────────────────────────────────────────────────

const BillsAPI = {
  async queue() {
    return apiFetch('/invoices/finance/bills/queue/');
  },

  async detail(id) {
    return apiFetch(`/invoices/finance/bills/${id}/`);
  },

  async approve(id, reason, anomalyOverrideReason) {
    return apiFetch(`/invoices/finance/bills/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ reason, anomaly_override_reason: anomalyOverrideReason || '' }),
    });
  },

  async reject(id, reason) {
    return apiFetch(`/invoices/finance/bills/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async query(id, question) {
    return apiFetch(`/invoices/finance/bills/${id}/query/`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },

  async respondQuery(id, queryId, response) {
    return apiFetch(`/invoices/finance/bills/${id}/respond-query/`, {
      method: 'POST',
      body: JSON.stringify({ query_id: queryId, response }),
    });
  },

  async scanAnomaly(id) {
    return apiFetch(`/invoices/finance/bills/${id}/scan-anomaly/`, { method: 'POST' });
  },

  async settle(id, paymentUtr) {
    return apiFetch(`/invoices/finance/bills/${id}/settle/`, {
      method: 'POST',
      body: JSON.stringify({ payment_utr: paymentUtr || '' }),
    });
  },

  async approvalAuthority() {
    return apiFetch('/invoices/finance/approval-authority/');
  },

  async updateApprovalAuthority(data) {
    return apiFetch('/invoices/finance/approval-authority/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async markSafe(id) {
    return apiFetch(`/invoices/finance/bills/${id}/mark-safe/`, { method: 'POST' });
  },

  async escalate(id) {
    return apiFetch(`/invoices/finance/bills/${id}/escalate/`, { method: 'POST' });
  },

  async listExpenses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/invoices/finance/expenses/${qs ? '?' + qs : ''}`);
  },

  async submitExpense(data) {
    return apiFetch('/invoices/submit/', { method: 'POST', body: JSON.stringify(data) });
  },
};

// ── Vendor API ────────────────────────────────────────────────────────────────

const VendorAPI = {
  async myBills(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/invoices/vendor/bills/${qs ? '?' + qs : ''}`);
  },

  async submitBill(data) {
    return apiFetch('/invoices/vendor/bills/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBill(id, data) {
    return apiFetch(`/invoices/vendor/bills/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async billDetail(id) {
    return apiFetch(`/invoices/vendor/bills/${id}/`);
  },

  async myProfile() {
    return apiFetch('/invoices/vendor/profile/');
  },

  async listAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/invoices/vendors/${qs ? '?' + qs : ''}`);
  },

  async detail(id) {
    return apiFetch(`/invoices/vendors/${id}/`);
  },

  async create(data) {
    return apiFetch('/invoices/vendors/create/', { method: 'POST', body: JSON.stringify(data) });
  },

  async update(id, data) {
    return apiFetch(`/invoices/vendors/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async activate(id, action) {
    return apiFetch(`/invoices/vendors/${id}/activate/`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  async respondQuery(billId, queryId, response) {
    return apiFetch(`/invoices/finance/bills/${billId}/respond-query/`, {
      method: 'POST',
      body: JSON.stringify({ query_id: queryId, response }),
    });
  },
};

// ── Files / OCR API ───────────────────────────────────────────────────────────

const FilesAPI = {
  async upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    return apiUpload('/files/upload/', fd);
  },

  async ocr(fileId) {
    return apiFetch('/files/ocr/', {
      method: 'POST',
      body: JSON.stringify({ file_id: fileId }),
    });
  },

  async open(fileId) {
    const res = await fetch(`${API_BASE}/files/${fileId}/`, {
      headers: {
        ...(Auth.getAccess() ? { 'Authorization': `Bearer ${Auth.getAccess()}` } : {}),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new APIError(res.status, body);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },

  downloadUrl(fileId) {
    return `${API_BASE}/files/${fileId}/`;
  },
};

// ── Anomaly API ───────────────────────────────────────────────────────────────

const AnomalyAPI = {
  async list() {
    return apiFetch('/invoices/finance/anomalies/');
  },

  async scanAll() {
    return apiFetch('/invoices/finance/scan-all/', { method: 'POST' });
  },

  async scanOne(id) {
    return apiFetch(`/invoices/finance/bills/${id}/scan-anomaly/`, { method: 'POST' });
  },
};

// ── NL Query API ──────────────────────────────────────────────────────────────

const NLQueryAPI = {
  async ask(question) {
    return apiFetch('/nl-query/', { method: 'POST', body: JSON.stringify({ question }) });
  },
};

// ── Audit API ─────────────────────────────────────────────────────────────────

const AuditAPI = {
  async list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/audit/${qs ? '?' + qs : ''}`);
  },
};

// ── Budget API ────────────────────────────────────────────────────────────────

const BudgetAPI = {
  async list() {
    return apiFetch('/invoices/budgets/');
  },

  async create(data) {
    return apiFetch('/invoices/budgets/', { method: 'POST', body: JSON.stringify(data) });
  },

  async detail(id) {
    return apiFetch(`/invoices/budgets/${id}/`);
  },

  async cashflow() {
    return apiFetch('/invoices/forecasting/cashflow/');
  },
};

// ── Anomaly severity helpers ──────────────────────────────────────────────────

function severityToScore(severity) {
  return { 'CRITICAL': 95, 'HIGH': 78, 'MEDIUM': 52, 'LOW': 28, 'NONE': 0 }[severity] || 0;
}

function anomalyFlagToType(flag) {
  const typeMap = {
    'DUPLICATE_INVOICE_NUMBER': 'Duplicate Invoice',
    'POSSIBLE_DUPLICATE': 'Possible Duplicate',
    'AMOUNT_OUTLIER_HIGH': 'Inflated Line Item',
    'ROUND_AMOUNT_FIRST_BILL': 'Round Number Pattern',
    'AMOUNT_UNUSUAL': 'Unusual Amount',
    'AMOUNT_HIGH_VS_PROFILE': 'Amount High vs Profile',
    'FUTURE_DATE': 'Future Invoice Date',
    'STALE_INVOICE': 'Stale Invoice',
    'MSME_BREACH': 'MSME Compliance Breach',
    'MSME_WARNING': 'MSME Deadline Warning',
    'GST_MATH_MISMATCH': 'GST Math Error',
    'GST_TYPE_CONFLICT': 'GST Type Conflict',
    'OFF_HOURS_SUBMISSION': 'Off-Hours Submission',
    'THRESHOLD_GAMING': 'Threshold Gaming',
    'ML_OUTLIER': 'ML Statistical Outlier',
  };
  return typeMap[flag] || flag;
}

// Map a backend Expense record to the anomaly card format the UI expects
function expenseToAnomaly(exp, index) {
  const flags = exp.ocr_raw?.anomaly_flags || [];
  const primaryFlag = flags[0];
  return {
    id: `ANO-${String(index + 1).padStart(3, '0')}`,
    score: severityToScore(exp.anomaly_severity),
    entity: exp.ref_no || exp.invoice_number || exp.id,
    type: primaryFlag ? anomalyFlagToType(primaryFlag.type) : exp.anomaly_severity + ' Anomaly',
    details: primaryFlag?.message || `Anomaly detected: ${exp.anomaly_severity}`,
    logic: flags.slice(1).map(f => f.message).join(' | ') || `Severity: ${exp.anomaly_severity}. Score: ${exp.total_score || 0}.`,
    status: 'OPEN',
    date: exp.created_at ? new Date(exp.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
    _raw: exp,
  };
}

// ── Export to window ──────────────────────────────────────────────────────────
window.TijoriAPI = {
  Auth, AuthAPI, DashboardAPI, BillsAPI, VendorAPI, FilesAPI, AnomalyAPI,
  AuditAPI, BudgetAPI, NLQueryAPI, APIError, expenseToAnomaly, anomalyFlagToType,
};
