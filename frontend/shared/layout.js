/**
 * FinanceAI — RBAC Layout Engine
 * Builds the sidebar, top-right profile dropdown, and notification panel
 * for every authenticated page.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!AUTH.requireAuth()) return;

    const container = document.getElementById('sidebar-container');
    if (!container) return;

    const role = AUTH.getRole();
    const user = AUTH.getUser();
    const roleLower = role.toLowerCase();

    // ── Nav link helper ────────────────────────────────────────────
    const link = (href, icon, label) =>
        `<a href="${href}" class="nav-link flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-xl font-semibold transition-all text-sm">
            <span class="material-symbols-outlined text-[20px]">${icon}</span>
            <span>${label}</span>
         </a>`;

    // ── Section label helper ───────────────────────────────────────
    const section = (label) =>
        `<p class="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest px-4 mt-4 mb-1">${label}</p>`;

    // ── Role-based nav ─────────────────────────────────────────────
    let navLinks = '';
    if (roleLower === 'vendor') {
        navLinks =
            section('Portal') +
            link('/frontend/vendor_portal/code.html', 'storefront', 'Vendor Dashboard') +
            section('Account') +
            link('/frontend/settings/code.html', 'settings', 'Settings');

    } else if (roleLower === 'employee') {
        navLinks =
            section('Finance') +
            link('/frontend/accounts_payable_hub/code.html', 'account_balance_wallet', 'AP Ledger') +
            link('/frontend/expense_management/code.html', 'receipt_long', 'Expense Management') +
            link('/frontend/ap_match_fraud_control_1/code.html', 'fact_check', '3-Way Match') +
            section('Compliance') +
            link('/frontend/audit_log/code.html', 'history', 'Audit Registry') +
            section('Account') +
            link('/frontend/settings/code.html', 'settings', 'Settings');

    } else if (roleLower === 'dept_head') {
        navLinks =
            section('Finance') +
            link('/frontend/accounts_payable_hub/code.html', 'account_balance_wallet', 'AP Ledger') +
            link('/frontend/expense_management/code.html', 'receipt_long', 'Expense Management') +
            link('/frontend/ap_match_fraud_control_1/code.html', 'fact_check', '3-Way Match') +
            section('Compliance') +
            link('/frontend/audit_log/code.html', 'history', 'Audit Registry') +
            section('Account') +
            link('/frontend/settings/code.html', 'settings', 'Settings');

    } else if (roleLower === 'finance_manager') {
        navLinks =
            section('Finance') +
            link('/frontend/accounts_payable_hub/code.html', 'account_balance_wallet', 'AP Ledger') +
            link('/frontend/expense_management/code.html', 'receipt_long', 'Expense Management') +
            link('/frontend/ap_match_fraud_control_1/code.html', 'fact_check', '3-Way Match') +
            section('Intelligence') +
            link('/frontend/anomaly_detection/code.html', 'crisis_alert', 'Anomaly Detection') +
            link('/frontend/budget_management/code.html', 'donut_large', 'Budget Management') +
            section('Compliance') +
            link('/frontend/audit_log/code.html', 'history', 'Audit Registry') +
            section('Account') +
            link('/frontend/settings/code.html', 'settings', 'Settings');

    } else if (['cfo', 'admin', 'finance_admin'].includes(roleLower)) {
        navLinks =
            section('Command') +
            link('/frontend/cfo_command_center/code.html', 'insights', 'Intelligence Hub') +
            section('Finance') +
            link('/frontend/accounts_payable_hub/code.html', 'account_balance_wallet', 'AP Ledger') +
            link('/frontend/expense_management/code.html', 'receipt_long', 'Expense Management') +
            link('/frontend/ap_match_fraud_control_1/code.html', 'fact_check', '3-Way Match') +
            section('Intelligence') +
            link('/frontend/anomaly_detection/code.html', 'crisis_alert', 'Anomaly Detection') +
            link('/frontend/budget_management/code.html', 'donut_large', 'Budget Management') +
            link('/frontend/budgetary_guardrails/code.html', 'shield', 'Budget Guardrails') +
            section('Administration') +
            link('/frontend/admin_vendor_management/code.html', 'groups', 'Vendor Management') +
            link('/frontend/audit_log/code.html', 'history', 'Audit Registry') +
            section('Account') +
            link('/frontend/settings/code.html', 'settings', 'Settings');

    } else {
        navLinks =
            link('/frontend/accounts_payable_hub/code.html', 'account_balance_wallet', 'AP Ledger') +
            link('/frontend/settings/code.html', 'settings', 'Settings');
    }

    const displayName = user?.full_name || user?.username || 'User';
    const displayRole = (user?.role || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Finance';
    const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

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

            <nav class="flex flex-col gap-0.5 px-4 py-4 flex-1 overflow-y-auto">
                ${navLinks}
            </nav>

            <div class="px-4 py-4 border-t border-outline-variant/20">
                <div class="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-surface-container-low">
                    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                        ${initials}
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-on-surface truncate">${displayName}</p>
                        <p class="text-[10px] text-on-surface-variant truncate">${displayRole}</p>
                    </div>
                </div>
                <div data-logout class="flex items-center gap-3 px-4 py-2.5 text-error hover:bg-error/10 rounded-xl font-semibold transition-all cursor-pointer text-sm">
                    <span class="material-symbols-outlined text-[20px]">logout</span>
                    <span>Sign Out</span>
                </div>
            </div>
        </aside>
    `;

    // Sign-out handler
    container.querySelector('[data-logout]')?.addEventListener('click', () => {
        AUTH.clearSession();
        window.location.href = '/frontend/financeai_login/code.html';
    });

    // Highlight active nav link
    const currentPath = window.location.pathname;
    container.querySelectorAll('.nav-link').forEach(a => {
        const href = a.getAttribute('href');
        const segment = href.replace('/frontend/', '').replace('/code.html', '');
        if (currentPath.includes(segment) && segment.length > 0) {
            a.className = 'nav-link flex items-center gap-3 px-4 py-2.5 bg-primary/10 text-primary rounded-xl font-semibold transition-all text-sm';
        }
    });

    // Fix header offset
    const topHeader = document.querySelector('header');
    if (topHeader && !topHeader.className.includes('fixed')) {
        topHeader.className = 'flex justify-between items-center bg-surface-container-lowest px-8 py-4 border-b border-outline-variant/30 lg:ml-64 sticky top-0 z-30 shadow-sm';
        const oldNav = topHeader.querySelector('nav');
        if (oldNav) oldNav.remove();
    }

    // ── Populate dynamic user avatar initials ─────────────────────
    document.querySelectorAll('[data-user-avatar]').forEach(el => {
        el.textContent = initials;
    });

    // ── Profile dropdown ───────────────────────────────────────────
    _setupProfileDropdown(user, displayName, displayRole, initials);

    // ── Notification panel minimize ────────────────────────────────
    _setupNotificationPanel();
});


function _setupProfileDropdown(user, displayName, displayRole, initials) {
    // Auto-detect profile trigger: explicit attr, avatar div, or profile image
    let profileBtn = document.querySelector(
        '[data-profile-btn], #profile-btn, .profile-btn, [data-user-avatar]'
    );
    // Fallback: rounded-full element near the top-right that looks like an avatar
    if (!profileBtn) {
        document.querySelectorAll('.rounded-full').forEach(el => {
            const rect = el.getBoundingClientRect();
            // Must be in top-right quadrant of page and small (avatar sized)
            if (rect.top < 120 && rect.right > window.innerWidth * 0.5 &&
                rect.width >= 24 && rect.width <= 64) {
                profileBtn = profileBtn || el;
            }
        });
    }
    if (!profileBtn) return;

    // Build dropdown if not already present
    let dropdown = document.getElementById('profile-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'profile-dropdown';
        dropdown.className = 'hidden absolute right-0 top-full mt-2 w-64 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl z-50 overflow-hidden';
        dropdown.innerHTML = `
            <div class="px-4 py-4 border-b border-outline-variant/20 bg-surface-container-low">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                        ${initials}
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-on-surface truncate">${displayName}</p>
                        <p class="text-xs text-on-surface-variant truncate">${displayRole}</p>
                        <p class="text-xs text-on-surface-variant/60 truncate">${user?.email || user?.username + '@demo.3sc.co'}</p>
                    </div>
                </div>
            </div>
            <div class="py-2">
                <button data-profile-action="dashboard"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-primary/8 hover:text-primary transition-all text-sm text-left">
                    <span class="material-symbols-outlined text-[18px]">dashboard</span>
                    Go to Dashboard
                </button>
                <button data-profile-action="settings"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-primary/8 hover:text-primary transition-all text-sm text-left">
                    <span class="material-symbols-outlined text-[18px]">settings</span>
                    Account Settings
                </button>
                <div class="mx-4 my-1 border-t border-outline-variant/20"></div>
                <button data-profile-action="logout"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-error hover:bg-error/8 transition-all text-sm text-left">
                    <span class="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                </button>
            </div>
        `;

        // Attach to a relative-positioned parent
        const parent = profileBtn.closest('.relative') || profileBtn.parentElement;
        if (!parent.classList.contains('relative')) {
            parent.style.position = 'relative';
        }
        parent.appendChild(dropdown);
    }

    // Toggle dropdown on profile button click
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    // Close on outside click
    document.addEventListener('click', () => dropdown.classList.add('hidden'));
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // Handle dropdown actions
    dropdown.querySelectorAll('[data-profile-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.profileAction;
            dropdown.classList.add('hidden');
            if (action === 'logout') {
                AUTH.clearSession();
                window.location.href = '/frontend/financeai_login/code.html';
            } else if (action === 'dashboard') {
                AUTH.routeToDashboard();
            } else if (action === 'settings') {
                // Settings page (stub — show toast for now)
                _showToast('Account settings coming soon.');
            }
        });
    });
}


function _setupNotificationPanel() {
    // Find any floating notification/alert card (look for common patterns)
    const panels = document.querySelectorAll(
        '[id*="notification"], [id*="alert-panel"], [class*="floating-alert"], [data-notification-panel]'
    );
    panels.forEach(panel => _addMinimizeToPanel(panel));

    // Also look for the "Review All Alerts" / notification panels by content
    document.querySelectorAll('.fixed, .absolute').forEach(el => {
        if (el.textContent.includes('Review All Alerts') || el.textContent.includes('Active Alert')) {
            if (!el.querySelector('[data-minimize-btn]')) {
                _addMinimizeToPanel(el);
            }
        }
    });
}


function _addMinimizeToPanel(panel) {
    if (!panel || panel.dataset.minimizeSetup) return;
    panel.dataset.minimizeSetup = 'true';

    const header = panel.querySelector('.flex, .flex-row, [class*="header"]');
    if (!header) return;

    // Don't add duplicate
    if (header.querySelector('[data-minimize-btn]')) return;

    const minimizeBtn = document.createElement('button');
    minimizeBtn.dataset.minimizeBtn = 'true';
    minimizeBtn.title = 'Minimize panel';
    minimizeBtn.className = 'ml-auto p-1 rounded-lg hover:bg-black/10 transition-all text-current opacity-70 hover:opacity-100';
    minimizeBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]" style="font-size:16px">remove</span>`;

    let minimized = false;
    let content = null;

    minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimized = !minimized;

        if (!content) {
            // Cache all children except the header
            content = Array.from(panel.children).filter(c => c !== header);
        }

        content.forEach(el => {
            el.style.display = minimized ? 'none' : '';
        });
        minimizeBtn.title = minimized ? 'Expand panel' : 'Minimize panel';
        minimizeBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]" style="font-size:16px">${minimized ? 'add' : 'remove'}</span>`;
        panel.style.transition = 'all 0.2s ease';
    });

    header.style.position = header.style.position || 'relative';
    header.appendChild(minimizeBtn);
}


// ── Global toast helper ────────────────────────────────────────────────────────
window._showToast = function(message, type = 'info') {
    const existing = document.getElementById('layout-toast');
    if (existing) existing.remove();

    const colors = {
        info: 'bg-surface-container border-outline-variant/30 text-on-surface',
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
    };

    const toast = document.createElement('div');
    toast.id = 'layout-toast';
    toast.className = `fixed bottom-6 right-6 z-[999] px-5 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all ${colors[type] || colors.info}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};
