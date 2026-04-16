import { api } from '../http'
import type { AuditLogEntry, AppNotification, User, UserRole, PaginationParams } from '@finance-ai/core'

export interface AuditListParams extends PaginationParams {
  entityType?: string
  entityId?: string
  actor?: string
  from?: string
  to?: string
}

export const auditApi = {
  list: (params?: AuditListParams) => api.getList<AuditLogEntry>('/audit', { params }),
  verifyChain: (params?: { fromId?: number; toId?: number }) =>
    api.get<{ valid: boolean; brokenAtId?: number }>('/audit/verify-chain', { params })
}

export const notificationsApi = {
  list: (unreadOnly = false) =>
    api.getList<AppNotification>('/notifications', { params: { unread: unreadOnly } }),
  markRead: (id: string) => api.post<void>(`/notifications/${id}/read`),
  markAllRead: () => api.post<void>('/notifications/read-all')
}

export interface UserListParams extends PaginationParams {
  role?: UserRole
  active?: boolean
  q?: string
}

export const usersApi = {
  list: (params?: UserListParams) => api.getList<User>('/users', { params }),
  get: (id: string) => api.get<User>(`/users/${id}`),
  create: (input: {
    email: string
    firstName: string
    lastName: string
    role: UserRole
    department?: string
  }) => api.post<User>('/users', input),
  update: (id: string, patch: Partial<{ role: UserRole; isActive: boolean; department: string }>) =>
    api.patch<User>(`/users/${id}`, patch),
  lock: (id: string) => api.post<void>(`/users/${id}/lock`),
  unlock: (id: string) => api.post<void>(`/users/${id}/unlock`)
}

export const reportsApi = {
  invoiceAging: (format: 'csv' | 'xlsx' | 'pdf') =>
    api.get<Blob>(`/reports/invoice-aging`, { params: { format }, responseType: 'blob' as any }),
  vendorSpend: (period: string) =>
    api.get<Array<{ vendorId: string; vendorName: string; totalBase: number; invoiceCount: number }>>(
      '/reports/vendor-spend',
      { params: { period } }
    ),
  budgetVariance: (period: string) =>
    api.get<Array<{ costCenter: string; budget: number; actual: number; variancePct: number }>>(
      '/reports/budget-variance',
      { params: { period } }
    )
}

export const dashboardsApi = {
  cfo: () => api.get<any>('/dashboards/cfo'),
  l2: () => api.get<any>('/dashboards/l2'),
  l1: () => api.get<any>('/dashboards/l1')
}
