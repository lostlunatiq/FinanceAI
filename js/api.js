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
    cache: 'no-store',
    ...options,
    headers: { ...Auth.headers(), ...(options.headers || {}) },
  });

  if (res.status === 401) {
    // Try token refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retry = await fetch(`${API_BASE}${url}`, {
        cache: 'no-store',
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

  async exportUsers() {
    // Return the blob so the frontend can trigger download
    const token = Auth.getAccess();
    const response = await fetch(`${API_BASE}/auth/users/export/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  async createUser(data) {
    return apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify(data) });
  },

  async changePassword(data) {
    return apiFetch('/auth/change-password/', { method: 'POST', body: JSON.stringify(data) });
  },

  async getUser(id) {
    return apiFetch(`/auth/users/${id}/`);
  },

  async deleteUser(id) {
    return apiFetch(`/auth/users/${id}/`, { method: 'DELETE' });
  },

  async resetPassword(id, password) {
    return apiFetch(`/auth/users/${id}/`, { method: 'PATCH', body: JSON.stringify({ password }) });
  },

  async getAuditLog(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/audit/${qs ? '?' + qs : ''}`);
  },

  async exportAuditLog(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const token = Auth.getAccess();
    return fetch(`/api/v1/audit/export/${qs ? '?' + qs : ''}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
  },

  async listDepartments() {
    return apiFetch('/auth/departments/');
  },

  async listGroups() {
    return apiFetch('/auth/groups/');
  },

  async createGroup(name, userIds = []) {
    return apiFetch('/auth/groups/', { method: 'POST', body: JSON.stringify({ name, user_ids: userIds }) });
  },

  async updateGroup(id, data) {
    return apiFetch(`/auth/groups/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async deleteGroup(id) {
    return apiFetch(`/auth/groups/${id}/`, { method: 'DELETE' });
  },
};

// ── Dashboard API ─────────────────────────────────────────────────────────────

const DashboardAPI = {
  async stats(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/invoices/dashboard/stats/${qs ? '?' + qs : ''}`);
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

  async settle(id, paymentUtr, paymentMethod, paymentNotes) {
    return apiFetch(`/invoices/finance/bills/${id}/settle/`, {
      method: 'POST',
      body: JSON.stringify({
        payment_utr: paymentUtr || '',
        payment_method: paymentMethod || 'NEFT',
        payment_notes: paymentNotes || '',
      }),
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

  async markSafe(id, note) {
    return apiFetch(`/invoices/finance/bills/${id}/mark-safe/`, {
      method: 'POST',
      body: JSON.stringify({ note: note || '' }),
    });
  },

  async escalate(id) {
    return apiFetch(`/invoices/finance/bills/${id}/escalate/`, { method: 'POST' });
  },

  async listExpenses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/invoices/finance/expenses/${qs ? '?' + qs : ''}`);
  },

  async listVendorBills(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/invoices/finance/vendor-bills/${qs ? '?' + qs : ''}`);
  },

  async submitExpense(data) {
    return apiFetch('/invoices/finance/expenses/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async remind(id, message) {
    return apiFetch(`/invoices/finance/bills/${id}/remind/`, {
      method: 'POST',
      body: JSON.stringify({ message: message || '' }),
    });
  },

  async schedulePayment(id, scheduledDate, note) {
    return apiFetch(`/invoices/finance/bills/${id}/schedule/`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_date: scheduledDate, note: note || '' }),
    });
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

// ── Notification API ──────────────────────────────────────────────────────────

const NotificationAPI = {
  async list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/notifications/${qs ? '?' + qs : ''}`);
  },
  async markRead(id = null) {
    const url = id ? `/notifications/${id}/mark-read/` : `/notifications/mark-all-read/`;
    return apiFetch(url, { method: 'POST' });
  },
  async unreadCount() {
    return apiFetch('/notifications/unread-count/');
  }
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

  async update(id, data) {
    return apiFetch(`/invoices/budgets/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async deleteBudget(id) {
    return apiFetch(`/invoices/budgets/${id}/`, { method: 'DELETE' });
  },

  async utilization(id) {
    return apiFetch(`/invoices/budgets/${id}/utilization/`);
  },

  async cashflow() {
    return apiFetch('/invoices/forecasting/cashflow/');
  },
};

// ── Analytics API (new finance automation features) ───────────────────────────

const AnalyticsAPI = {
  async spendIntelligence() {
    return apiFetch('/invoices/analytics/spend-intelligence/');
  },
  async vendorRisk() {
    return apiFetch('/invoices/analytics/vendor-risk/');
  },
  async paymentPrediction() {
    return apiFetch('/invoices/analytics/payment-prediction/');
  },
  async budgetHealth() {
    return apiFetch('/invoices/analytics/budget-health/');
  },
  async gstRecon(month) {
    return apiFetch(`/invoices/analytics/gst-recon/${month ? '?month=' + month : ''}`);
  },
  async tdsCompliance() {
    return apiFetch('/invoices/analytics/tds-compliance/');
  },
  async workingCapital() {
    return apiFetch('/invoices/analytics/working-capital/');
  },
  async spendVelocity() {
    return apiFetch('/invoices/analytics/spend-velocity/');
  },
  async policyCompliance() {
    return apiFetch('/invoices/analytics/policy-compliance/');
  },
  async supplierScorecard() {
    return apiFetch('/invoices/analytics/supplier-scorecard/');
  },
  async deptVariance() {
    return apiFetch('/invoices/analytics/dept-variance/');
  },
  async poMatch() {
    return apiFetch('/invoices/analytics/po-match/');
  },
  async commandCenter() {
    return apiFetch('/invoices/analytics/command-center/');
  },
  async auditSweep() {
    return apiFetch('/invoices/analytics/audit-sweep/', { method: 'POST' });
  },
  async generate10Q() {
    return apiFetch('/invoices/analytics/generate-10q/', { method: 'POST' });
  },
};

// ── AI Feedback API ───────────────────────────────────────────────────────────

const FeedbackAPI = {
  async submit({ task_type, expense_id, vendor_name, is_positive, comment, field_corrections, disputed_flags }) {
    return apiFetch('/invoices/ai-feedback/', {
      method: 'POST',
      body: JSON.stringify({ task_type, expense_id, vendor_name, is_positive, comment, field_corrections, disputed_flags }),
    });
  },

  async list({ task, expense_id } = {}) {
    const qs = new URLSearchParams();
    if (task) qs.set('task', task);
    if (expense_id) qs.set('expense_id', expense_id);
    return apiFetch(`/invoices/ai-feedback/${qs.toString() ? '?' + qs.toString() : ''}`);
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
  const flags = exp.anomaly_flags || exp.ocr_raw?.anomaly_flags || [];
  const primaryFlag = flags[0];
  const severity = exp.anomaly_severity || 'MEDIUM';
  const flagType = primaryFlag
    ? (typeof primaryFlag === 'string' ? primaryFlag : primaryFlag.type)
    : null;
  const flagMessage = primaryFlag
    ? (typeof primaryFlag === 'string' ? primaryFlag : (primaryFlag.message || primaryFlag.type || 'Anomaly detected'))
    : `${severity} severity anomaly detected`;
  return {
    id: `ANO-${String(index + 1).padStart(3, '0')}`,
    score: severityToScore(severity),
    entity: exp.ref_no || exp.invoice_number || exp.id,
    type: flagType ? anomalyFlagToType(flagType) : severity + ' Anomaly',
    details: flagMessage,
    logic: flags.length > 1
      ? flags.slice(1).map(f => typeof f === 'string' ? f : (f.message || f.type || '')).filter(Boolean).join(' | ')
      : `Severity: ${severity}. Vendor: ${exp.vendor_name || 'Unknown'}. Amount: ₹${Number(exp.total_amount || 0).toLocaleString('en-IN')}`,
    status: exp.anomaly_severity === 'NONE' ? 'RESOLVED' : 'OPEN',
    date: exp.created_at ? new Date(exp.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
    rawId: exp.id,
    _raw: exp,
  };
}

// ── Notifications API ─────────────────────────────────────────────────────────
const NotificationsAPI = {
  async list(unreadOnly = false) {
    return apiFetch(`/notifications/${unreadOnly ? '?unread=true' : ''}`);
  },
  async markRead(id) {
    if (id) return apiFetch(`/notifications/${id}/mark-read/`, { method: 'POST' });
    return apiFetch('/notifications/mark-all-read/', { method: 'POST' });
  },
  async unreadCount() {
    return apiFetch('/notifications/unread-count/');
  },
  async getPrefs() {
    return apiFetch('/notifications/preferences/');
  },
  async savePrefs(data) {
    return apiFetch('/notifications/preferences/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ── Export to window ──────────────────────────────────────────────────────────
window.TijoriAPI = {
  Auth, AuthAPI, DashboardAPI, BillsAPI, VendorAPI, FilesAPI, AnomalyAPI,
  AuditAPI, NotificationsAPI, BudgetAPI, NLQueryAPI, AnalyticsAPI, FeedbackAPI,
  APIError, expenseToAnomaly, anomalyFlagToType,
};
