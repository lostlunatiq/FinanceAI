import { api } from '../http'
import type {
  Invoice,
  InvoiceStatus,
  ApprovalStep,
  PaginationParams,
  AuditLogEntry
} from '@finance-ai/core'

export interface InvoiceListParams extends PaginationParams {
  status?: InvoiceStatus | InvoiceStatus[]
  assignee?: 'me' | string
  vendorId?: string
  dueBefore?: string
  q?: string
}

export interface InvoiceDraftInput {
  vendorId: string
  invoiceNumber: string
  poNumber?: string
  issueDate: string
  dueDate: string
  currency: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  categoryId?: string
  costCenterId?: string
  lineItems?: Array<{
    description: string
    quantity: number
    unitPrice: number
    taxRate: number
    lineTotal: number
    categoryId?: string
  }>
}

export const invoicesApi = {
  list: (params?: InvoiceListParams) => api.getList<Invoice>('/invoices', { params }),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  create: (input: InvoiceDraftInput, file?: File) => {
    if (file) {
      const form = new FormData()
      form.append('file', file)
      form.append('payload', JSON.stringify(input))
      return api.post<Invoice>('/invoices', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    return api.post<Invoice>('/invoices', input)
  },
  update: (id: string, patch: Partial<InvoiceDraftInput>) => api.patch<Invoice>(`/invoices/${id}`, patch),

  // State machine actions
  submit: (id: string) => api.post<Invoice>(`/invoices/${id}/submit`),
  approve: (id: string, comments?: string) => api.post<Invoice>(`/invoices/${id}/approve`, { comments }),
  reject: (id: string, reason: string) => api.post<Invoice>(`/invoices/${id}/reject`, { reason }),
  requestChanges: (id: string, comments: string) =>
    api.post<Invoice>(`/invoices/${id}/request-changes`, { comments }),
  hold: (id: string, reason: string) => api.post<Invoice>(`/invoices/${id}/hold`, { reason }),
  resume: (id: string) => api.post<Invoice>(`/invoices/${id}/resume`),
  reassign: (id: string, assigneeId: string, reason: string) =>
    api.post<Invoice>(`/invoices/${id}/reassign`, { assigneeId, reason }),
  cancel: (id: string, reason?: string) => api.post<Invoice>(`/invoices/${id}/cancel`, { reason }),

  approvalTrail: (id: string) => api.get<ApprovalStep[]>(`/invoices/${id}/approval-trail`),
  auditTrail: (id: string) => api.get<AuditLogEntry[]>(`/invoices/${id}/audit`)
}
