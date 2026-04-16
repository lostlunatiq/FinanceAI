/**
 * FinanceAI — Real-time Status Poller
 * Polls API for expense status changes and updates UI dynamically.
 */

class StatusPoller {
    constructor(options = {}) {
        this.interval = options.interval || 10000; // 10s default
        this.timer = null;
        this.callbacks = {};
        this.watchedIds = new Set();
        this.lastStatuses = {};
    }

    /**
     * Start watching an expense for status changes
     */
    watch(expenseId, callback) {
        this.watchedIds.add(expenseId);
        this.callbacks[expenseId] = callback;

        if (!this.timer) {
            this.start();
        }
    }

    /**
     * Stop watching an expense
     */
    unwatch(expenseId) {
        this.watchedIds.delete(expenseId);
        delete this.callbacks[expenseId];
        delete this.lastStatuses[expenseId];

        if (this.watchedIds.size === 0) {
            this.stop();
        }
    }

    /**
     * Start polling
     */
    start() {
        if (this.timer) return;
        this.poll();
        this.timer = setInterval(() => this.poll(), this.interval);
    }

    /**
     * Stop polling
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Single poll iteration
     */
    async poll() {
        for (const id of this.watchedIds) {
            try {
                const bill = await window.api.getVendorBillDetail(id);
                if (!bill) continue;

                const prevStatus = this.lastStatuses[id];
                const newStatus = bill.status;

                if (prevStatus && prevStatus !== newStatus) {
                    // Status changed!
                    this.onStatusChange(id, prevStatus, newStatus, bill);
                }

                this.lastStatuses[id] = newStatus;

                if (this.callbacks[id]) {
                    this.callbacks[id](bill);
                }

                // Auto-stop watching terminal states
                if (['PAID', 'REJECTED', 'WITHDRAWN', 'AUTO_REJECT', 'EXPIRED'].includes(newStatus)) {
                    this.unwatch(id);
                }
            } catch (error) {
                console.warn(`Status poll failed for ${id}:`, error);
            }
        }
    }

    /**
     * Called when a status changes
     */
    onStatusChange(expenseId, oldStatus, newStatus, bill) {
        console.log(`Status changed: ${oldStatus} → ${newStatus} for ${expenseId}`);

        // Show toast notification
        this.showToast(
            `Invoice ${bill.ref_no || expenseId.slice(0, 8)}`,
            `Status updated: ${this.formatStatus(oldStatus)} → ${this.formatStatus(newStatus)}`,
            newStatus === 'PAID' ? 'success' :
            newStatus === 'REJECTED' ? 'error' : 'info'
        );
    }

    /**
     * Format status for display
     */
    formatStatus(status) {
        const map = {
            'DRAFT': '📝 Draft',
            'SUBMITTED': '📤 Submitted',
            'PENDING_L1': '⏳ L1 Review',
            'PENDING_L2': '⏳ L2 Review',
            'PENDING_HOD': '⏳ HoD Review',
            'PENDING_FIN_L1': '⏳ Finance L1',
            'PENDING_FIN_L2': '⏳ Finance L2',
            'PENDING_FIN_HEAD': '⏳ Finance Head',
            'APPROVED': '✅ Approved',
            'REJECTED': '❌ Rejected',
            'QUERY_RAISED': '❓ Query Raised',
            'PENDING_D365': '🔄 Processing',
            'BOOKED_D365': '📗 Booked',
            'POSTED_D365': '📘 Posted',
            'PAID': '💰 Paid',
            'WITHDRAWN': '↩️ Withdrawn',
            'AUTO_REJECT': '⛔ Auto-Rejected',
        };
        return map[status] || status;
    }

    /**
     * Show a toast notification
     */
    showToast(title, message, type = 'info') {
        const colors = {
            success: 'bg-emerald-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-amber-500',
        };

        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-[9999] ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl 
            transform translate-x-full transition-transform duration-500 max-w-sm`;
        toast.innerHTML = `
            <div class="font-semibold text-sm">${title}</div>
            <div class="text-xs mt-1 opacity-90">${message}</div>
        `;

        document.body.appendChild(toast);

        // Slide in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
            toast.classList.add('translate-x-0');
        });

        // Slide out after 5s
        setTimeout(() => {
            toast.classList.remove('translate-x-0');
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    }
}

// Timeline renderer
class TimelineRenderer {
    /**
     * Render a status timeline
     */
    static render(containerId, bill) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const steps = [
            { status: 'SUBMITTED', label: 'Submitted', icon: '📤' },
            { status: 'PENDING_L1', label: 'L1 Review', icon: '👤' },
            { status: 'PENDING_L2', label: 'L2 Review', icon: '👥' },
            { status: 'PENDING_HOD', label: 'HoD Approval', icon: '🏢' },
            { status: 'APPROVED', label: 'Approved', icon: '✅' },
            { status: 'PAID', label: 'Paid', icon: '💰' },
        ];

        const currentStatus = bill.status;
        const statusOrder = steps.map(s => s.status);
        const currentIndex = statusOrder.indexOf(currentStatus);
        const isRejected = ['REJECTED', 'AUTO_REJECT'].includes(currentStatus);
        const isQueried = currentStatus === 'QUERY_RAISED';

        let html = '<div class="space-y-1">';

        steps.forEach((step, i) => {
            const isActive = i === currentIndex;
            const isComplete = i < currentIndex || currentStatus === 'PAID';
            const isPending = i > currentIndex && !isRejected;

            let stepClass = 'opacity-40';
            let dotClass = 'bg-gray-600';
            let lineClass = 'bg-gray-700';

            if (isComplete) {
                stepClass = 'opacity-100';
                dotClass = 'bg-emerald-500';
                lineClass = 'bg-emerald-500/50';
            } else if (isActive) {
                stepClass = 'opacity-100';
                dotClass = isRejected ? 'bg-red-500' : isQueried ? 'bg-amber-500' : 'bg-blue-500 animate-pulse';
                lineClass = 'bg-blue-500/30';
            }

            html += `
                <div class="flex items-center gap-3 ${stepClass} py-2">
                    <div class="w-3 h-3 rounded-full ${dotClass} flex-shrink-0"></div>
                    <div class="flex-1">
                        <span class="text-sm font-medium">${step.icon} ${step.label}</span>
                        ${isActive && isRejected ? '<span class="text-xs text-red-400 ml-2">Rejected</span>' : ''}
                        ${isActive && isQueried ? '<span class="text-xs text-amber-400 ml-2">Query Raised</span>' : ''}
                    </div>
                    ${isComplete ? '<span class="text-xs text-emerald-400">✓</span>' : ''}
                </div>
                ${i < steps.length - 1 ? `<div class="ml-1.5 w-0.5 h-4 ${lineClass}"></div>` : ''}
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }
}

// Global instances
window.statusPoller = new StatusPoller();
window.TimelineRenderer = TimelineRenderer;
