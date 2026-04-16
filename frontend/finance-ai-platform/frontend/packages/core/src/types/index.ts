// ============================================================================
// Core domain types — aligned with FinanceAI backend contract (OpenAPI v1)
// ============================================================================

// ----- Identity -------------------------------------------------------------

export type UserRole =
  | 'admin'
  | 'cfo'
  | 'l2_finance_head'
  | 'l1_finance_employee'
  | 'vendor'

export interface User {
  id: string
  tenantId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  department?: string
  avatar?: string
  isActive: boolean
  mfaEnabled: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number // seconds until access token expires
  familyId?: string // refresh token family (for reuse detection)
}

export interface LoginChallenge {
  challengeId: string
  mfaRequired: true
}

export type LoginResult =
  | { mfaRequired: false; user: User; tokens: AuthTokens }
  | { mfaRequired: true; challengeId: string }

export interface MfaSetupResponse {
  secret: string
  qrUri: string // otpauth:// URI
}

// ----- API envelope ---------------------------------------------------------

export interface ApiError {
  code: string
  message: string
  field?: string
  details?: Record<string, any>
}

export interface ApiResponse<T = any> {
  data?: T
  meta?: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
  errors?: ApiError[]
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

// ----- Money & FX -----------------------------------------------------------

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AED' | 'SGD'

export interface Currency {
  code: CurrencyCode
  name: string
  symbol: string
}

export interface FxRate {
  fromCurrency: CurrencyCode
  toCurrency: CurrencyCode
  rate: number
  asOfDate: string
  source: string
}

export interface Money {
  amount: number
  currency: CurrencyCode
}

// ----- Tenant / GL ----------------------------------------------------------

export interface Tenant {
  id: string
  name: string
  baseCurrency: CurrencyCode
  createdAt: string
}

export interface GlCategory {
  id: string
  tenantId: string
  code: string
  name: string
  parentId?: string
  isLeaf: boolean
}

export interface CostCenter {
  id: string
  tenantId: string
  code: string
  name: string
  ownerId?: string
}

// ----- Vendor ---------------------------------------------------------------

export type VendorStatus =
  | 'pending_verification'
  | 'active'
  | 'suspended'
  | 'archived'

export interface Vendor {
  id: string
  tenantId: string
  legalName: string
  displayName: string
  gstin?: string
  pan?: string
  taxId?: string
  country: string // ISO alpha-2, e.g. 'IN'
  defaultCurrency: CurrencyCode
  email?: string
  phone?: string
  paymentTerms: number // days
  category?: string
  riskScore: number
  status: VendorStatus
  createdAt: string
  updatedAt: string
}

export interface VendorBankAccount {
  id: string
  vendorId: string
  accountNumberLast4: string
  ifscCode?: string
  swiftCode?: string
  bankName: string
  isPrimary: boolean
  verifiedAt?: string
  createdAt: string
}

export interface VendorDocument {
  id: string
  vendorId: string
  docType: 'gst_cert' | 'pan_card' | 'msme' | 'bank_proof' | 'other'
  s3Key: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

// ----- Invoice --------------------------------------------------------------

export type InvoiceStatus =
  | 'draft'
  | 'submitted'
  | 'l1_review'
  | 'l2_review'
  | 'cfo_review'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'paid'
  | 'cancelled'

export type InvoiceAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'request_changes'
  | 'hold'
  | 'resume'
  | 'reassign'
  | 'cancel'
  | 'mark_paid'

export interface InvoiceLineItem {
  id: string
  invoiceId: string
  lineNo: number
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  lineTotal: number
  categoryId?: string
}

export interface Invoice {
  id: string
  tenantId: string
  vendorId: string
  vendorName?: string // denormalized for UI
  invoiceNumber: string
  poNumber?: string
  issueDate: string
  dueDate: string
  currency: CurrencyCode
  subtotal: number
  taxAmount: number
  totalAmount: number
  fxRateToBase: number
  baseTotal: number
  status: InvoiceStatus
  categoryId?: string
  costCenterId?: string
  fraudScore: number
  fraudFlags: string[]
  s3Key?: string
  ocrData?: Record<string, any>
  submittedBy?: string
  submittedAt?: string
  currentAssignee?: string
  createdAt: string
  updatedAt: string
  lineItems?: InvoiceLineItem[]
}

export type ApprovalActionType =
  | 'approve'
  | 'reject'
  | 'request_changes'
  | 'escalate'
  | 'reassign'
  | 'hold'

export interface ApprovalStep {
  id: string
  invoiceId: string
  stepNo: number
  requiredRole: UserRole
  assignedTo?: string
  assigneeName?: string
  action?: ApprovalActionType
  actorId?: string
  actorName?: string
  comments?: string
  actedAt?: string
  slaDueAt?: string
}

export interface ApprovalPolicy {
  id: string
  tenantId: string
  name: string
  minAmountBase: number
  maxAmountBase?: number
  categoryId?: string
  costCenterId?: string
  requiredChain: UserRole[]
  isActive: boolean
  priority: number
  createdAt: string
}

// ----- Budget ---------------------------------------------------------------

export interface Budget {
  id: string
  tenantId: string
  costCenterId: string
  costCenterName?: string
  categoryId?: string
  categoryName?: string
  periodStart: string
  periodEnd: string
  amountBase: number
  currency: CurrencyCode
  notes?: string
  createdAt: string
}

export interface BudgetUtilization {
  budgetId: string
  amountBase: number
  consumedBase: number
  utilizationPct: number // 0..1
}

// ----- Payment --------------------------------------------------------------

export type PaymentStatus =
  | 'scheduled'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'reconciled'
  | 'cancelled'

export type PaymentRail =
  | 'manual'
  | 'upi'
  | 'neft'
  | 'rtgs'
  | 'ach'
  | 'wire'
  | 'card'

export interface Payment {
  id: string
  tenantId: string
  invoiceId: string
  invoiceNumber?: string
  vendorId?: string
  vendorName?: string
  vendorBankId?: string
  amount: number
  currency: CurrencyCode
  baseAmount: number
  fxRateToBase: number
  rail: PaymentRail
  status: PaymentStatus
  externalRef?: string
  scheduledFor?: string
  initiatedAt?: string
  completedAt?: string
  initiatedBy?: string
  failureReason?: string
  createdAt: string
}

// ----- Treasury -------------------------------------------------------------

export interface CashflowProjection {
  date: string
  inflow: number
  outflow: number
  net: number
  cumulative: number
}

export interface AgeingBucket {
  label: string // '0-30', '31-60', '61-90', '90+'
  count: number
  amountBase: number
}

export interface FxExposure {
  currency: CurrencyCode
  exposure: number // in that currency
  exposureBase: number // converted to base
  invoiceCount: number
}

// ----- Audit ----------------------------------------------------------------

export interface AuditLogEntry {
  id: number
  tenantId: string
  actorId?: string
  actorName?: string
  actorRole?: UserRole
  entityType: string
  entityId: string
  action: string
  diff?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  prevHash?: string
  rowHash: string
  createdAt: string
}

// ----- Notifications -------------------------------------------------------

export interface AppNotification {
  id: string
  tenantId: string
  userId: string
  type: string
  payload: Record<string, any>
  readAt?: string
  createdAt: string
}

// ----- Legacy / misc -------------------------------------------------------

export interface Department {
  id: string
  name: string
  code: string
  budget: number
  headId?: string
  createdAt: string
  updatedAt: string
}

export interface FileUpload {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}
