/**
 * FinanceAI — Shared API Client
 * Handles all API calls with JWT authentication, error handling, and token refresh.
 */

const API_BASE = window.location.origin + '/api/v1';

class FinanceAPI {
    constructor() {
        this.baseURL = API_BASE;
    }

    /**
     * Get stored JWT access token
     */
    getToken() {
        return localStorage.getItem('financeai_access_token');
    }

    /**
     * Get stored refresh token
     */
    getRefreshToken() {
        return localStorage.getItem('financeai_refresh_token');
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        const data = localStorage.getItem('financeai_user');
        return data ? JSON.parse(data) : null;
    }

    /**
     * Core fetch wrapper with auth headers
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();

        const headers = {
            ...(options.headers || {}),
        };

        // Don't set Content-Type for FormData (browser sets multipart boundary)
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            // Handle 401 — try token refresh
            if (response.status === 401 && this.getRefreshToken()) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${this.getToken()}`;
                    const retryResponse = await fetch(url, { ...options, headers });
                    return this._handleResponse(retryResponse);
                } else {
                    this.logout();
                    return null;
                }
            }

            return this._handleResponse(response);
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    async _handleResponse(response) {
        if (response.status === 204) return null;

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const error = new Error(data?.detail || data?.error || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    // ─── Auth ────────────────────────────────────────

    async login(username, password) {
        const data = await this.request('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });

        if (data) {
            localStorage.setItem('financeai_access_token', data.access);
            localStorage.setItem('financeai_refresh_token', data.refresh);
            localStorage.setItem('financeai_user', JSON.stringify(data.user));
        }

        return data;
    }

    async refreshToken() {
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.getRefreshToken() }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('financeai_access_token', data.access);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    async getMe() {
        return this.request('/auth/me/');
    }

    logout() {
        localStorage.removeItem('financeai_access_token');
        localStorage.removeItem('financeai_refresh_token');
        localStorage.removeItem('financeai_user');
        window.location.href = '/frontend/financeai_login/code.html';
    }

    // ─── Files ───────────────────────────────────────

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request('/files/upload/', {
            method: 'POST',
            body: formData,
        });
    }

    // ─── OCR ─────────────────────────────────────────

    async triggerOCR(fileId) {
        return this.request('/invoices/vendor/bills/extract/', {
            method: 'POST',
            body: JSON.stringify({ file_id: fileId }),
        });
    }

    async pollOCRResult(taskId) {
        return this.request(`/invoices/vendor/bills/extract/${taskId}/`);
    }

    /**
     * Poll OCR until complete or failed
     */
    async waitForOCR(taskId, onProgress = null, maxAttempts = 30, intervalMs = 2000) {
        for (let i = 0; i < maxAttempts; i++) {
            const result = await this.pollOCRResult(taskId);

            if (onProgress) onProgress(result);

            if (result.status === 'COMPLETE' || result.status === 'FAILED') {
                return result;
            }

            await new Promise(r => setTimeout(r, intervalMs));
        }

        return { status: 'TIMEOUT', task_id: taskId };
    }

    // ─── Vendor Portal ───────────────────────────────

    async getVendorProfile() {
        return this.request('/invoices/vendor/profile/');
    }

    async getVendorBills(statusFilter = '') {
        const params = statusFilter ? `?status=${statusFilter}` : '';
        return this.request(`/invoices/vendor/bills/${params}`);
    }

    async getVendorBillDetail(billId) {
        return this.request(`/invoices/vendor/bills/${billId}/`);
    }

    async submitBill(billData) {
        return this.request('/invoices/vendor/bills/', {
            method: 'POST',
            body: JSON.stringify(billData),
        });
    }

    // ─── Vendors CRUD ────────────────────────────────

    async getVendors(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/invoices/vendors/${query ? '?' + query : ''}`);
    }

    async createVendor(vendorData) {
        return this.request('/invoices/vendors/create/', {
            method: 'POST',
            body: JSON.stringify(vendorData),
        });
    }

    async getVendorDetail(vendorId) {
        return this.request(`/invoices/vendors/${vendorId}/`);
    }

    async activateVendor(vendorId, action = 'activate') {
        return this.request(`/invoices/vendors/${vendorId}/activate/`, {
            method: 'POST',
            body: JSON.stringify({ action }),
        });
    }

    // ─── Finance Portal ──────────────────────────────

    async getApprovalQueue() {
        return this.request('/invoices/finance/bills/queue/');
    }

    async getBillDetail(billId) {
        return this.request(`/invoices/finance/bills/${billId}/`);
    }

    async approveBill(billId, reason = 'Approved', anomalyOverride = '') {
        return this.request(`/invoices/finance/bills/${billId}/approve/`, {
            method: 'POST',
            body: JSON.stringify({
                reason,
                anomaly_override_reason: anomalyOverride,
            }),
        });
    }

    // ─── Extra Modules (Expenses & Anomalies) ────────────────────
    async getInternalExpenses(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request(`/invoices/finance/expenses/${q ? '?' + q : ''}`);
    }

    async getAllExpenses(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request(`/invoices/finance/bills/all/${q ? '?' + q : ''}`);
    }

    async initiatePayment(billId, notes = '') {
        return this.request(`/invoices/finance/bills/${billId}/initiate-payment/`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
    }

    async markAsPaid(billId, utr, notes = '') {
        return this.request(`/invoices/finance/bills/${billId}/mark-paid/`, {
            method: 'POST',
            body: JSON.stringify({ utr, notes }),
        });
    }

    async submitBillOnBehalf(billData) {
        return this.request('/invoices/submit/', {
            method: 'POST',
            body: JSON.stringify(billData),
        });
    }

    async getPolicyLimits() {
        return this.request('/invoices/policy-limits/');
    }

    async setPolicyLimit(role, maxAmount, notes = '') {
        return this.request('/invoices/policy-limits/', {
            method: 'POST',
            body: JSON.stringify({ role, max_amount: maxAmount, notes }),
        });
    }

    async deletePolicyLimit(role) {
        return this.request(`/invoices/policy-limits/${role}/`, { method: 'DELETE' });
    }

    async getAnomalies(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request(`/invoices/finance/anomalies/${q ? '?' + q : ''}`);
    }

    async rejectBill(billId, reason) {
        return this.request(`/invoices/finance/bills/${billId}/reject/`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    async queryBill(billId, question) {
        return this.request(`/invoices/finance/bills/${billId}/query/`, {
            method: 'POST',
            body: JSON.stringify({ question }),
        });
    }

    async respondQuery(billId, response, queryId = null) {
        return this.request(`/invoices/finance/bills/${billId}/respond-query/`, {
            method: 'POST',
            body: JSON.stringify({ response, query_id: queryId }),
        });
    }

    // ─── Dashboard ───────────────────────────────────

    async getDashboardStats() {
        return this.request('/invoices/dashboard/stats/');
    }

    // ─── OCR (sync, no Celery needed) ────────────────

    async runOCRSync(fileId) {
        return this.request('/files/ocr/', {
            method: 'POST',
            body: JSON.stringify({ file_id: fileId }),
        });
    }

    // ─── User Management ─────────────────────────────

    async getUsers(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request(`/auth/users/${q ? '?' + q : ''}`);
    }

    async updateUser(userId, data) {
        return this.request(`/auth/users/${userId}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deactivateUser(userId) {
        return this.request(`/auth/users/${userId}/`, { method: 'DELETE' });
    }

    // ─── Budgets ──────────────────────────────────────

    async getBudgets(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request(`/invoices/budgets/${q ? '?' + q : ''}`);
    }

    async createBudget(data) {
        return this.request('/invoices/budgets/', { method: 'POST', body: JSON.stringify(data) });
    }

    async getBudgetDetail(id) {
        return this.request(`/invoices/budgets/${id}/`);
    }

    async updateBudget(id, data) {
        return this.request(`/invoices/budgets/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
    }

    async getBudgetUtilization(id) {
        return this.request(`/invoices/budgets/${id}/utilization/`);
    }

    // ─── Cash Flow ────────────────────────────────────

    async getCashFlowForecast(days = 90) {
        return this.request(`/invoices/forecasting/cashflow/?days=${days}`);
    }

    // ─── Audit Log ───────────────────────────────────

    async getAuditLog(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request(`/audit/${q ? '?' + q : ''}`);
    }

    // ─── NL Query ─────────────────────────────────────

    async nlQuery(question) {
        return this.request('/nl-query/', { method: 'POST', body: JSON.stringify({ question }) });
    }
}

// Global singleton
window.api = new FinanceAPI();
