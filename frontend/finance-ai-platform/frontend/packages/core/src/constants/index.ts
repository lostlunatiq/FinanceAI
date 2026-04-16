export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1'
export const WS_BASE_URL = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000/ws'

export const APP_NAME = 'FinanceAI'
export const APP_VERSION = '1.0.0'

// INR-first: base currency for the tenant defaults to INR.
export const DEFAULT_CURRENCY = 'INR' as const

export const CURRENCIES = {
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' }
} as const

export const USER_ROLES = {
  ADMIN: 'admin',
  CFO: 'cfo',
  L2_FINANCE_HEAD: 'l2_finance_head',
  L1_FINANCE_EMPLOYEE: 'l1_finance_employee',
  VENDOR: 'vendor'
} as const

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  cfo: 'CFO',
  l2_finance_head: 'Finance Head (L2)',
  l1_finance_employee: 'Finance Associate (L1)',
  vendor: 'Vendor'
}

// Aligned with backend invoice state machine
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  L1_REVIEW: 'l1_review',
  L2_REVIEW: 'l2_review',
  CFO_REVIEW: 'cfo_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ON_HOLD: 'on_hold',
  PAID: 'paid',
  CANCELLED: 'cancelled'
} as const

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  l1_review: 'L1 Review',
  l2_review: 'L2 Review',
  cfo_review: 'CFO Review',
  approved: 'Approved',
  rejected: 'Rejected',
  on_hold: 'On Hold',
  paid: 'Paid',
  cancelled: 'Cancelled'
}

// Client-side mirror of backend state machine — used to surface available actions in UI.
// Keep in sync with backend/domain/models/invoice.py TRANSITIONS.
export const INVOICE_TRANSITIONS: Record<string, { action: string; next: string }[]> = {
  draft: [{ action: 'submit', next: 'l1_review' }],
  l1_review: [
    { action: 'approve', next: 'l2_review' },
    { action: 'reject', next: 'rejected' },
    { action: 'request_changes', next: 'draft' },
    { action: 'hold', next: 'on_hold' }
  ],
  l2_review: [
    { action: 'approve', next: 'cfo_review' },
    { action: 'reject', next: 'rejected' },
    { action: 'request_changes', next: 'l1_review' }
  ],
  cfo_review: [
    { action: 'approve', next: 'approved' },
    { action: 'reject', next: 'rejected' }
  ],
  on_hold: [{ action: 'resume', next: 'l1_review' }],
  approved: [{ action: 'mark_paid', next: 'paid' }]
}

export const VENDOR_STATUS = {
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived'
} as const

export const VENDOR_STATUS_LABELS: Record<string, string> = {
  pending_verification: 'Pending Verification',
  active: 'Active',
  suspended: 'Suspended',
  archived: 'Archived'
}

export const PAYMENT_STATUS = {
  SCHEDULED: 'scheduled',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  RECONCILED: 'reconciled',
  CANCELLED: 'cancelled'
} as const

export const PAYMENT_RAILS = {
  MANUAL: 'manual',
  UPI: 'upi',
  NEFT: 'neft',
  RTGS: 'rtgs',
  ACH: 'ach',
  WIRE: 'wire',
  CARD: 'card'
} as const

export const PAYMENT_RAIL_LABELS: Record<string, string> = {
  manual: 'Manual (mark as paid)',
  upi: 'UPI',
  neft: 'NEFT',
  rtgs: 'RTGS',
  ach: 'ACH',
  wire: 'Wire Transfer',
  card: 'Card'
}

export const FRAUD_SCORE_LEVELS = {
  LOW: { min: 0, max: 30, color: '#10b981', label: 'Low Risk' },
  MEDIUM: { min: 31, max: 60, color: '#f59e0b', label: 'Medium Risk' },
  HIGH: { min: 61, max: 85, color: '#ef4444', label: 'High Risk' },
  CRITICAL: { min: 86, max: 100, color: '#7c3aed', label: 'Critical Risk' }
} as const

export const FRAUD_FLAG_LABELS: Record<string, string> = {
  duplicate_invoice: 'Possible duplicate',
  unusual_amount: 'Unusual amount for this vendor',
  new_vendor_high_amount: 'New vendor, high amount',
  weekend_submission: 'Weekend / off-hours submission',
  round_amount: 'Round-number amount',
  rush_payment: 'Unusually short payment terms'
}

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
} as const

export const DATE_FORMATS = {
  SHORT: 'dd MMM yyyy',
  LONG: 'MMMM dd, yyyy',
  WITH_TIME: 'dd MMM yyyy, HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
} as const

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  SORT_BY: 'createdAt',
  SORT_ORDER: 'desc'
} as const

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKENS: 'finance_ai_auth_tokens',
  USER_PREFERENCES: 'finance_ai_user_prefs',
  RECENT_SEARCHES: 'finance_ai_recent_searches',
  DASHBOARD_LAYOUT: 'finance_ai_dashboard_layout',
  MOCK_ROLE: 'finance_ai_mock_role' // dev-only: switch role without backend
} as const

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MFA_REQUIRED: 'MFA_REQUIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  INVALID_TRANSITION: 'INVALID_TRANSITION'
} as const

export const FILE_TYPES = {
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  CSV: 'text/csv'
} as const

export const ALLOWED_INVOICE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
]

export const MAX_INVOICE_FILE_SIZE = 25 * 1024 * 1024 // 25MB — matches backend policy
export const MAX_FILE_SIZE = 25 * 1024 * 1024

// Indian compliance
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/
