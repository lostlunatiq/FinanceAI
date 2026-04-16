// ============================================================================
// @finance-ai/api-client — typed client for the FinanceAI backend.
// All endpoints mirror backend/openapi/financeai.v1.yaml.
// ============================================================================

export { api, http, tokenStore, ApiRequestError } from './http'

export { authApi } from './modules/auth'
export { vendorsApi } from './modules/vendors'
export type { VendorListParams, VendorCreateInput } from './modules/vendors'

export { invoicesApi } from './modules/invoices'
export type { InvoiceListParams, InvoiceDraftInput } from './modules/invoices'

export { budgetsApi } from './modules/budgets'
export type { BudgetListParams, BudgetInput } from './modules/budgets'

export { paymentsApi } from './modules/payments'
export type { PaymentListParams } from './modules/payments'

export { treasuryApi, fxApi } from './modules/treasury'
export { policiesApi } from './modules/policies'
export type { ApprovalPolicyInput } from './modules/policies'

export { auditApi, notificationsApi, usersApi, reportsApi, dashboardsApi } from './modules/misc'
export type { AuditListParams, UserListParams } from './modules/misc'

// Legacy placeholder — exposed for any lingering imports. Prefer `api` from http.ts.
export const apiClient = {
  get: <T>(url: string) => ({ data: null as T }),
  post: <T>(url: string, _body: any) => ({ data: null as T }),
  put: <T>(url: string, _body: any) => ({ data: null as T }),
  delete: <T>(url: string) => ({ data: null as T })
}
