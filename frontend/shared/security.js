/**
 * FinanceAI Security Utility
 * Handles PII masking and data compliance on the frontend.
 */

const SECURITY = {
    /**
     * Mask PII like names, emails, and account numbers
     * @param {string} val The string to mask
     * @param {string} type 'name' | 'email' | 'bank'
     */
    mask(val, type = 'name') {
        if (!val) return '—';
        
        switch (type) {
            case 'name':
                // "John Doe" -> "J*** D**"
                return val.split(' ').map(part => part[0] + '*'.repeat(Math.max(0, part.length - 1))).join(' ');
            
            case 'email':
                // "john.doe@example.com" -> "j***.d**@e******.com"
                const [user, domain] = val.split('@');
                const maskedUser = user[0] + '*'.repeat(user.length - 2) + user.slice(-1);
                return `${maskedUser}@${domain}`;
            
            case 'bank':
                // "123456789012" -> "**** **** 9012"
                return '*'.repeat(val.length - 4).replace(/(.{4})/g, '$1 ') + val.slice(-4);
            
            default:
                return val;
        }
    },

    /**
     * Clean data before sending to AI (PII removal)
     */
    anonymizeForAI(data) {
        const clean = JSON.parse(JSON.stringify(data));
        
        const maskField = (obj, field, type) => {
            if (obj[field]) obj[field] = this.mask(obj[field], type);
        };

        const recurse = (obj) => {
            if (Array.isArray(obj)) {
                obj.forEach(recurse);
            } else if (typeof obj === 'object' && obj !== null) {
                maskField(obj, 'name', 'name');
                maskField(obj, 'submitted_by', 'name');
                maskField(obj, 'email', 'email');
                maskField(obj, 'account_no', 'bank');
                maskField(obj, 'bank_details', 'bank');
                maskField(obj, 'gstin', 'name'); // Mask GSTIN too for extra safety
                
                Object.values(obj).forEach(recurse);
            }
        };

        recurse(clean);
        return clean;
    }
};

window.SECURITY = SECURITY;
