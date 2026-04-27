/**
 * FinanceAI — RBAC Layout Engine
 * Dynamically constructs sidebar based on employee_grade.
 * Includes: nav history, back-button fix, notification deep-links.
 */

// ─── Navigation History Stack ─────────────────────────────────────────────────
const NAV = {
    push(url) {
        const stack = NAV._get();
        if (stack[stack.length - 1] !== url) {
            stack.push(url);
            if (stack.length > 15) stack.shift();
            sessionStorage.setItem('financeai_nav_stack', JSON.stringify(stack));
        }
    },
    back() {
        const stack = NAV._get();
        stack.pop(); // remove current
        const prev = stack[stack.length - 1] || NAV._home();
        sessionStorage.setItem('financeai_nav_stack', JSON.stringify(stack));
        window.location.href = prev;
    },
    _get() {
        try { return JSON.parse(sessionStorage.getItem('financeai_nav_stack') || '[]'); }
        catch { return []; }
    },
    _home() {
        if (typeof AUTH === 'undefined') return '/frontend/financeai_login/code.html';
        if (AUTH.isVendor()) return '/frontend/vendor_portal/code.html';
        return AUTH.getGrade() >= 4 || AUTH.isSuperuser()
            ? '/frontend/cfo_command_center/code.html'
            : '/frontend/accounts_payable_hub/code.html';
    },
};
window.NAV = NAV;

document.addEventListener('DOMContentLoaded', () => {
    if (!AUTH.requireAuth()) return;

    // Record current page in nav history
    NAV.push(window.location.href);

    // Wire all [data-back] / .back-btn elements
    document.querySelectorAll('[data-back], .back-btn').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); NAV.back(); });
    });

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

    // ─── Notification Bell Wiring ────────────────────────────────────────────
    _wireNotificationBells();
});

// ─── Notification Bell (robust across all pages) ─────────────────────────────
// Resolves notification icons by text content OR data-icon attribute.
// Wires every bell on the page (some templates have multiple), attaches a live
// pending-count badge, opens a dropdown with live notifications and deep-links.
let _notifPollHandle = null;
let _notifCache = null;

function _findAllBells() {
    const results = new Set();
    document.querySelectorAll('button .material-symbols-outlined').forEach(icon => {
        const txt = icon.textContent.trim();
        const dataIcon = icon.getAttribute('data-icon') || '';
        if (txt === 'notifications' || dataIcon === 'notifications') {
            results.add(icon.closest('button'));
        }
    });
    return Array.from(results);
}

function _wireNotificationBells() {
    const bells = _findAllBells();
    if (bells.length === 0) return;

    bells.forEach(_wireSingleBell);

    // Initial load + poll every 60s
    _refreshNotifBadges();
    if (_notifPollHandle) clearInterval(_notifPollHandle);
    _notifPollHandle = setInterval(_refreshNotifBadges, 60000);
}

function _wireSingleBell(bellBtn) {
    if (!bellBtn || bellBtn.dataset.notifWired === '1') return;
    bellBtn.dataset.notifWired = '1';

    // Wrap so dropdown can be positioned absolutely
    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-block';
    bellBtn.parentNode.insertBefore(wrapper, bellBtn);
    wrapper.appendChild(bellBtn);

    // Ensure bell has its own count badge (replace any static red dot)
    const oldBadges = bellBtn.querySelectorAll('.absolute.bg-error, .bg-error.rounded-full');
    oldBadges.forEach(b => b.remove());
    bellBtn.classList.add('relative');
    const badge = document.createElement('span');
    badge.className = 'notif-badge absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center hidden';
    badge.textContent = '0';
    bellBtn.appendChild(badge);

    const dropdown = document.createElement('div');
    dropdown.className = 'notif-dropdown hidden absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-outline-variant/20 z-[100] overflow-hidden';
    dropdown.innerHTML = `
        <div class="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between">
            <span class="font-bold text-sm text-on-surface">Notifications</span>
            <span class="notif-count text-xs text-on-surface-variant"></span>
        </div>
        <div class="notif-list max-h-72 overflow-y-auto divide-y divide-outline-variant/10">
            <div class="px-4 py-3 text-sm text-on-surface-variant">Loading...</div>
        </div>
        <div class="px-4 py-3 border-t border-outline-variant/10 bg-surface-container-low">
            <a href="/frontend/accounts_payable_hub/code.html" class="text-xs font-bold text-primary hover:underline">View All Pending →</a>
        </div>`;
    wrapper.appendChild(dropdown);

    bellBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Close other open dropdowns
        document.querySelectorAll('.notif-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            await _loadNotifications(dropdown, badge);
        }
    });

    // Don't close when clicking inside the dropdown itself
    dropdown.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => dropdown.classList.add('hidden'));
}

async function _refreshNotifBadges() {
    try {
        const notifs = await window.api.getNotifications();
        _notifCache = notifs || [];
        document.querySelectorAll('.notif-badge').forEach(b => {
            const n = _notifCache.length;
            if (n > 0) {
                b.textContent = n > 99 ? '99+' : String(n);
                b.classList.remove('hidden');
            } else {
                b.classList.add('hidden');
            }
        });
    } catch { /* silent */ }
}

async function _loadNotifications(dropdown, badge) {
    const list = dropdown.querySelector('.notif-list');
    const count = dropdown.querySelector('.notif-count');
    try {
        const notifs = _notifCache || await window.api.getNotifications();
        _notifCache = notifs || [];
        if (!_notifCache.length) {
            list.innerHTML = '<div class="px-4 py-6 text-sm text-on-surface-variant text-center">No pending items 🎉</div>';
            if (count) count.textContent = '';
            if (badge) badge.classList.add('hidden');
            return;
        }
        if (count) count.textContent = `${_notifCache.length} pending`;
        list.innerHTML = _notifCache.map(n => `
            <a href="${n.href}" class="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors">
                <span class="material-symbols-outlined text-primary text-[18px] mt-0.5">receipt_long</span>
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-on-surface truncate">${n.title}</p>
                    <p class="text-xs text-on-surface-variant truncate">${n.vendor} — ₹${Number(n.amount).toLocaleString('en-IN')}</p>
                </div>
            </a>`).join('');
        if (badge) {
            badge.textContent = _notifCache.length > 99 ? '99+' : String(_notifCache.length);
            badge.classList.remove('hidden');
        }
    } catch (e) {
        list.innerHTML = '<div class="px-4 py-3 text-sm text-error">Failed to load notifications</div>';
    }
}

// ─── AI Chatbot Bubble (Floating, all pages) ──────────────────────────────────
(function _injectChatbot() {
    // Inject after DOM is ready (layout.js runs at DOMContentLoaded)
    const user = typeof AUTH !== 'undefined' ? AUTH.getUser() : null;
    const isVendor = typeof AUTH !== 'undefined' ? AUTH.isVendor() : false;

    const bubble = document.createElement('div');
    bubble.id = 'ai-chatbot-root';
    bubble.innerHTML = `
    <style>
      #ai-chatbot-root { position:fixed; bottom:28px; right:28px; z-index:9999; font-family:'Inter',sans-serif; display:flex; flex-direction:column; align-items:flex-end; }
      #chat-window { display:none; width:360px; height:480px; background:#fff; border-radius:16px;
        box-shadow:0 24px 60px rgba(0,83,91,0.18); border:1px solid #bec8ca33;
        flex-direction:column; overflow:hidden; margin-bottom:12px;
        pointer-events:none; opacity:0; transition:opacity .2s; }
      #chat-window.open { display:flex; pointer-events:all; opacity:1; }
      #chat-messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }
      .chat-msg { max-width:85%; padding:10px 14px; border-radius:12px; font-size:13px; line-height:1.5; }
      .chat-msg.ai { background:#f5f3f3; color:#1b1c1c; border-bottom-left-radius:4px; align-self:flex-start; }
      .chat-msg.user { background:linear-gradient(135deg,#00535b,#006d77); color:#fff; border-bottom-right-radius:4px; align-self:flex-end; }
      .chat-msg.loading { background:#f5f3f3; color:#6f797a; font-style:italic; }
      #chat-input-row { display:flex; gap:8px; padding:12px 16px; border-top:1px solid #bec8ca33; background:#fafafa; }
      #chat-input { flex:1; border:1px solid #bec8ca; border-radius:24px; padding:8px 16px; font-size:13px;
        outline:none; transition:border .2s; font-family:'Inter',sans-serif; }
      #chat-input:focus { border-color:#00535b; }
      #chat-send { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#00535b,#006d77);
        border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
      #chat-send:hover { opacity:.85; }
      #chat-fab { width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg,#00535b,#006d77);
        border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#fff;
        box-shadow:0 8px 24px rgba(0,83,91,0.35); transition:transform .2s,opacity .2s; }
      #chat-fab:hover { transform:scale(1.08); }
      #chat-fab .badge { position:absolute; top:-2px; right:-2px; width:14px; height:14px; background:#ba1a1a;
        border-radius:50%; border:2px solid #fff; display:none; }
    </style>
    <div id="chat-window">
      <div style="padding:14px 16px; background:linear-gradient(135deg,#00535b,#006d77); color:#fff; display:flex; align-items:center; justify-content:between; gap:10px;">
        <span class="material-symbols-outlined" style="font-size:20px">psychology</span>
        <div style="flex:1">
          <p style="font-weight:700;font-size:14px;margin:0">FinanceAI Assistant</p>
          <p style="font-size:10px;opacity:.8;margin:0">${isVendor ? 'Vendor Copilot' : 'Finance Intelligence'}</p>
        </div>
        <button id="chat-close" style="background:rgba(255,255,255,.15);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;">
          <span class="material-symbols-outlined" style="font-size:16px">close</span>
        </button>
      </div>
      <div id="chat-messages">
        <div class="chat-msg ai">Namaste! 👋 I'm your Finance AI assistant. Ask me anything about invoices, budgets, or spend analytics.</div>
      </div>
      <div id="chat-input-row">
        <input id="chat-input" type="text" placeholder="Ask about invoices, spend, anomalies..." />
        <button id="chat-send">
          <span class="material-symbols-outlined" style="font-size:18px">send</span>
        </button>
      </div>
    </div>
    <div style="position:relative;display:flex;justify-content:flex-end;">
      <button id="chat-fab" title="FinanceAI Assistant">
        <span class="material-symbols-outlined" style="font-size:24px">psychology</span>
        <span class="badge" id="chat-badge"></span>
      </button>
    </div>`;

    document.body.appendChild(bubble);

    const chatWindow = document.getElementById('chat-window');
    const fab = document.getElementById('chat-fab');
    const closeBtn = document.getElementById('chat-close');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const messages = document.getElementById('chat-messages');

    fab.addEventListener('click', () => { chatWindow.classList.toggle('open'); if (chatWindow.classList.contains('open')) input.focus(); });
    closeBtn.addEventListener('click', () => chatWindow.classList.remove('open'));

    function addMsg(text, type = 'ai') {
        const el = document.createElement('div');
        el.className = `chat-msg ${type}`;
        el.textContent = text;
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
        return el;
    }

    async function sendMessage() {
        const q = input.value.trim();
        if (!q) return;
        input.value = '';
        addMsg(q, 'user');
        const thinking = addMsg('Thinking...', 'loading');
        sendBtn.disabled = true;
        try {
            const resp = await window.api.nlQuery(q);
            thinking.remove();
            if (resp.answer) {
                addMsg(resp.answer, 'ai');
                if (resp.insight) addMsg(`💡 ${resp.insight}`, 'ai');
            } else {
                addMsg('Sorry, I could not find an answer. Try rephrasing your question.', 'ai');
            }
        } catch (e) {
            thinking.remove();
            addMsg('⚠️ Could not reach AI service. Check your connection.', 'ai');
        } finally {
            sendBtn.disabled = false;
            input.focus();
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

    // Public API so any page can open the chatbot programmatically
    window.openChatbot = (seedQuestion) => {
        chatWindow.classList.add('open');
        if (seedQuestion) {
            input.value = seedQuestion;
        }
        setTimeout(() => input.focus(), 50);
    };
    window.closeChatbot = () => chatWindow.classList.remove('open');
})();

// ─── Generate 10-Q Modal (CFO/Finance Admin only) ────────────────────────────
window.show10QModal = async function () {
    let modal = document.getElementById('tenq-modal');
    if (modal) { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; return; }
    else {
        modal = document.createElement('div');
        modal.id = 'tenq-modal';
        modal.className = 'fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4';
        modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <div class="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between primary-gradient text-white" style="background:linear-gradient(135deg,#00535b,#006d77)">
            <div>
              <h3 class="text-lg font-bold" style="font-family:'Manrope',sans-serif">Generate 10-Q Filing Draft</h3>
              <p class="text-xs opacity-80" id="tenq-subtitle">AI-assisted draft based on YTD financial data</p>
            </div>
            <button id="tenq-close" class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-white text-[18px]">close</span>
            </button>
          </div>
          <div id="tenq-body" class="flex-1 overflow-y-auto px-6 py-5">
            <div class="flex items-center justify-center py-16 text-on-surface-variant">
              <span class="material-symbols-outlined animate-spin mr-2">refresh</span>
              Drafting filing — pulling YTD operating expenses...
            </div>
          </div>
          <div class="px-6 py-3 border-t border-outline-variant/20 flex justify-end gap-2 bg-surface-container-low">
            <button id="tenq-download" class="px-4 py-2 bg-surface-container-high text-primary text-sm font-bold rounded-lg hover:bg-surface-container-highest transition-colors hidden">
              <span class="material-symbols-outlined text-[16px] align-middle mr-1">file_download</span>
              Download .txt
            </button>
            <button id="tenq-regenerate" class="px-4 py-2 text-sm font-bold rounded-lg text-white hidden" style="background:linear-gradient(135deg,#00535b,#006d77)">
              Regenerate
            </button>
          </div>
        </div>`;
        document.body.appendChild(modal);
        const _closeTenQ = () => { modal.classList.add('hidden'); document.body.style.overflow = ''; };
        modal.addEventListener('click', (e) => { if (e.target === modal) _closeTenQ(); });
        modal.querySelector('#tenq-close').addEventListener('click', _closeTenQ);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) _closeTenQ(); });
    }

    document.body.style.overflow = 'hidden';
    const body = modal.querySelector('#tenq-body');
    const subtitle = modal.querySelector('#tenq-subtitle');
    const downloadBtn = modal.querySelector('#tenq-download');
    const regenBtn = modal.querySelector('#tenq-regenerate');
    body.innerHTML = `
        <div class="flex items-center justify-center py-16 text-on-surface-variant">
            <span class="material-symbols-outlined animate-spin mr-2">refresh</span>
            Drafting filing — pulling YTD operating expenses...
        </div>`;
    downloadBtn.classList.add('hidden');
    regenBtn.classList.add('hidden');

    try {
        const result = await window.api.generate10Q();
        const stats = result.stats || {};
        const ytd = stats.ytd_expenses ? `₹${Number(stats.ytd_expenses).toLocaleString('en-IN')}` : '—';
        subtitle.textContent = `${result.title || '10-Q Draft'} • Generated ${new Date(result.generated_at || Date.now()).toLocaleDateString()}`;

        body.innerHTML = `
            <div class="grid grid-cols-3 gap-3 mb-5">
              <div class="bg-surface-container-low p-3 rounded-lg">
                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">YTD Op-Ex</p>
                <p class="text-base font-bold text-on-surface">${ytd}</p>
              </div>
              <div class="bg-surface-container-low p-3 rounded-lg">
                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Quarter</p>
                <p class="text-base font-bold text-on-surface">${(result.title || '').replace('10-Q Filing Draft - ', '') || 'Current'}</p>
              </div>
              <div class="bg-surface-container-low p-3 rounded-lg">
                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</p>
                <p class="text-base font-bold text-primary">DRAFT</p>
              </div>
            </div>
            <div class="bg-surface-container-low rounded-lg p-5 max-h-[40vh] overflow-y-auto">
              <pre class="whitespace-pre-wrap text-sm leading-relaxed text-on-surface" style="font-family:'Inter',sans-serif">${(result.content || '').replace(/</g,'&lt;')}</pre>
            </div>
            <p class="text-xs text-on-surface-variant mt-4 italic">
              ⚠ AI-generated draft. Review and verify all figures with audited data before SEC submission.
            </p>`;
        downloadBtn.classList.remove('hidden');
        regenBtn.classList.remove('hidden');

        downloadBtn.onclick = () => {
            const blob = new Blob([result.content || ''], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${(result.title || '10Q-Draft').replace(/\s+/g, '_')}.txt`;
            a.click();
            URL.revokeObjectURL(a.href);
        };
        regenBtn.onclick = () => window.show10QModal();

    } catch (e) {
        body.innerHTML = `<div class="py-12 text-center text-error">
            <span class="material-symbols-outlined text-[40px]">error</span>
            <p class="mt-2 font-semibold">Could not generate 10-Q</p>
            <p class="text-xs text-on-surface-variant mt-1">${e.message || 'Unknown error'}</p>
        </div>`;
        regenBtn.classList.remove('hidden');
        regenBtn.onclick = () => window.show10QModal();
    }
};
