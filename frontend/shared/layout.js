/**
 * FinanceAI — RBAC Layout Engine
 * Dynamically constructs sidebar based on employee_grade.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!AUTH.requireAuth()) return;

    const container = document.getElementById('sidebar-container');
    if (!container) return;

    const user  = AUTH.getUser();
    const grade = AUTH.getGrade();           // ✅ integer, not role string

    const link = (href, icon, label) =>
        `<a href="${href}" class="nav-link flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-xl font-semibold transition-all text-sm">
            <span class="material-symbols-outlined text-[20px]">${icon}</span>
            <span>${label}</span>
         </a>`;

    // ✅ grade-based nav — replaces role string checks
    let navLinks = '';

    if (AUTH.isVendor()) {
        // Vendor — portal only
        navLinks =
            link('/frontend/vendor_portal/code.html', 'dashboard', 'Vendor Dashboard');

    } else if (grade === 1) {
        // Employee — submit and track own bills
        navLinks =
            link('/frontend/accounts_payable_hub/code.html', 'account_balance_wallet', 'AP Ledger') +
            link('/frontend/expense_management/code.html',   'receipt_long',            'Expenses') +
            link('/frontend/settings/code.html',             'settings',                'Settings');

    } else if (grade === 2) {
        // Dept Head — approval queue + anomaly visibility
        navLinks =
            link('/frontend/accounts_payable_hub/code.html', 'account_balance_wallet', 'AP Ledger') +
            link('/frontend/expense_management/code.html',   'receipt_long',            'Expenses') +
            link('/frontend/anomaly_detection/code.html',    'warning',                 'Anomaly Detection') +
            link('/frontend/settings/code.html',             'settings',                'Settings');

    } else if (grade === 3) {
        // Finance Manager — adds budget visibility
        navLinks =
            link('/frontend/accounts_payable_hub/code.html',  'account_balance_wallet', 'AP Ledger') +
            link('/frontend/expense_management/code.html',    'receipt_long',            'Expenses') +
            link('/frontend/budgetary_guardrails/code.html',  'verified_user',           'Budgetary Controls') +
            link('/frontend/anomaly_detection/code.html',     'warning',                 'Anomaly Detection') +
            link('/frontend/settings/code.html',              'settings',                'Settings');

    } else if (grade >= 4 || AUTH.isSuperuser()) {
        // Finance Admin / CFO / Superuser — full access
        navLinks =
            link('/frontend/cfo_command_center/code.html',       'insights',              'Intelligence Hub') +
            link('/frontend/accounts_payable_hub/code.html',     'account_balance_wallet','AP Ledger') +
            link('/frontend/budgetary_guardrails/code.html',     'verified_user',         'Budgetary Controls') +
            link('/frontend/audit_log/code.html',                'history',               'Audit Registry') +
            link('/frontend/anomaly_detection/code.html',        'warning',               'Anomaly Detection') +
            link('/frontend/expense_management/code.html',       'receipt_long',          'Expenses') +
            link('/frontend/admin_vendor_management/code.html',  'business',              'Vendor Registry') +
            link('/frontend/settings/code.html',                 'settings',              'Settings');
    }

    const displayName  = user?.full_name || user?.username || 'User';
    // ✅ show grade label instead of role string
    const displayGrade = AUTH._gradeLabel(grade);
    const initials     = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    container.innerHTML = `
        <aside class="w-64 fixed left-0 top-0 h-screen bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col z-40 hidden lg:flex shadow-sm">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-outline-variant/20">
                <div class="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-[18px]">account_balance</span>
                </div>
                <div>
                    <h1 class="text-base font-bold tracking-tight text-on-surface" style="font-family:'Manrope',sans-serif">FinanceAI</h1>
                    <p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">Enterprise</p>
                </div>
            </div>

            <nav class="flex flex-col gap-1 px-4 py-4 flex-1 overflow-y-auto">
                <p class="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest px-4 mb-2">Navigation</p>
                ${navLinks}
            </nav>

            <div class="px-4 py-4 border-t border-outline-variant/20">
                <div class="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-surface-container-low">
                    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                        ${initials}
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-on-surface truncate">${displayName}</p>
                        <p class="text-[10px] text-on-surface-variant truncate">${displayGrade}</p>
                    </div>
                </div>
                <div data-logout class="flex items-center gap-3 px-4 py-2.5 text-error hover:bg-error/10 rounded-xl font-semibold transition-all cursor-pointer text-sm">
                    <span class="material-symbols-outlined text-[20px]">logout</span>
                    <span>Sign Out</span>
                </div>
            </div>
        </aside>
    `;

    const logoutBtn = container.querySelector('[data-logout]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AUTH.clearSession();
            window.location.href = '/frontend/financeai_login/code.html';
        });
    }

    const currentPath = window.location.pathname;
    container.querySelectorAll('.nav-link').forEach(a => {
        if (currentPath.includes(a.getAttribute('href').replace('/frontend/', '').replace('/code.html', ''))) {
            a.className = 'nav-link flex items-center gap-3 px-4 py-2.5 bg-primary/10 text-primary rounded-xl font-semibold transition-all text-sm';
        }
    });

    const topHeader = document.querySelector('header');
    if (topHeader && !topHeader.className.includes('fixed')) {
        topHeader.className = 'flex justify-between items-center bg-surface-container-lowest px-8 py-4 border-b border-outline-variant/30 lg:ml-64 sticky top-0 z-30 shadow-sm';
        const oldNav = topHeader.querySelector('nav');
        if (oldNav) oldNav.remove();
    }
});
