/**
 * FinanceAI — Auth Utilities
 * JWT token management, role-based routing, and session guard.
 */

const AUTH = {
    /**
     * Check if user is authenticated. Redirect to login if not.
     */
    requireAuth() {
        const token = localStorage.getItem('financeai_access_token');
        if (!token) {
            window.location.href = '/frontend/financeai_login/code.html';
            return false;
        }

        // Check token expiry (JWT payload is base64)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 < Date.now()) {
                console.warn('Token expired, redirecting to login');
                AUTH.clearSession();
                window.location.href = '/frontend/financeai_login/code.html';
                return false;
            }
        } catch (e) {
            // If we can't parse, assume valid
        }

        return true;
    },

    /**
     * Get the current user's role
     */
    getRole() {
        const user = AUTH.getUser();
        return user?.role || '';
    },

    /**
     * Get the current user object
     */
    getUser() {
        const data = localStorage.getItem('financeai_user');
        return data ? JSON.parse(data) : null;
    },

    /**
     * Check if user has a specific role
     */
    hasRole(role) {
        return AUTH.getRole() === role;
    },

    /**
     * Check if user has any of the given roles
     */
    hasAnyRole(...roles) {
        return roles.includes(AUTH.getRole());
    },

    /**
     * Clear the session
     */
    clearSession() {
        localStorage.removeItem('financeai_access_token');
        localStorage.removeItem('financeai_refresh_token');
        localStorage.removeItem('financeai_user');
    },

    /**
     * Route user to appropriate dashboard based on their role
     */
    routeToDashboard() {
        const role = AUTH.getRole();
        const routes = {
            'vendor': '/frontend/vendor_portal/code.html',
            'employee': '/frontend/accounts_payable_hub/code.html',
            'dept_head': '/frontend/accounts_payable_hub/code.html',
            'finance_manager': '/frontend/accounts_payable_hub/code.html',
            'finance_admin': '/frontend/cfo_command_center/code.html',
        };
        window.location.href = routes[role] || '/frontend/accounts_payable_hub/code.html';
    },

    /**
     * Setup user display in header (name + role badge + logout)
     */
    setupHeader() {
        const user = AUTH.getUser();
        if (!user) return;

        // Try to find and populate header elements
        const nameEl = document.querySelector('[data-user-name]');
        const roleEl = document.querySelector('[data-user-role]');
        const logoutBtn = document.querySelector('[data-logout]');

        if (nameEl) nameEl.textContent = user.full_name || user.username;
        if (roleEl) {
            roleEl.textContent = user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                AUTH.clearSession();
                window.location.href = '/frontend/financeai_login/code.html';
            });
        }
    },
};

// Auto-check auth on page load (except login page)
if (!window.location.pathname.includes('financeai_login')) {
    document.addEventListener('DOMContentLoaded', () => {
        AUTH.requireAuth();
        AUTH.setupHeader();
    });
}
