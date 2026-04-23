/**
 * FinanceAI — Auth Utilities
 * JWT token management, grade-based routing, and session guard.
 */

const AUTH = {

    requireAuth() {
        const token = localStorage.getItem('financeai_access_token');
        if (!token) {
            window.location.href = '/frontend/financeai_login/code.html';
            return false;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 < Date.now()) {
                AUTH.clearSession();
                window.location.href = '/frontend/financeai_login/code.html';
                return false;
            }
        } catch (e) {}
        return true;
    },

    // ✅ grade is now the source of truth — not role string
    getGrade() {
        const user = AUTH.getUser();
        return user?.employee_grade || 1;
    },

    // ✅ kept for vendor detection only (vendor is still a special case)
    isVendor() {
        const user = AUTH.getUser();
        return !!user?.vendor_profile || user?.is_vendor === true;
    },

    getUser() {
        const data = localStorage.getItem('financeai_user');
        return data ? JSON.parse(data) : null;
    },

    // ✅ grade-based checks replace hasRole / hasAnyRole
    hasMinGrade(minGrade) {
        return AUTH.getGrade() >= minGrade;
    },

    isSuperuser() {
        return AUTH.getUser()?.is_superuser === true;
    },

    clearSession() {
        localStorage.removeItem('financeai_access_token');
        localStorage.removeItem('financeai_refresh_token');
        localStorage.removeItem('financeai_user');
    },

    // ✅ routing by grade, not role string
    routeToDashboard() {
        if (AUTH.isVendor()) {
            window.location.href = '/frontend/vendor_portal/code.html';
            return;
        }
        const grade = AUTH.getGrade();
        if (grade >= 4 || AUTH.isSuperuser()) {
            window.location.href = '/frontend/cfo_command_center/code.html';
        } else {
            window.location.href = '/frontend/accounts_payable_hub/code.html';
        }
    },

    setupHeader() {
        const user = AUTH.getUser();
        if (!user) return;

        const nameEl    = document.querySelector('[data-user-name]');
        const gradeEl   = document.querySelector('[data-user-role]');   // same slot, shows grade label
        const logoutBtn = document.querySelector('[data-logout]');

        if (nameEl)  nameEl.textContent  = user.full_name || user.username;
        if (gradeEl) gradeEl.textContent = AUTH._gradeLabel(AUTH.getGrade());
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                AUTH.clearSession();
                window.location.href = '/frontend/financeai_login/code.html';
            });
        }
    },

    // ── internal helpers ──────────────────────────────────────────

    _gradeLabel(grade) {
        return {
            1: 'Employee',
            2: 'Department Head',
            3: 'Finance Manager',
            4: 'Finance Admin',
        }[grade] || `Grade ${grade}`;
    },
};

if (!window.location.pathname.includes('financeai_login')) {
    document.addEventListener('DOMContentLoaded', () => {
        AUTH.requireAuth();
        AUTH.setupHeader();
    });
}
