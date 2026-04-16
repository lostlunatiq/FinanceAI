import { api } from '../http'
import type { Payment, PaymentRail, PaymentStatus, PaginationParams } from '@finance-ai/core'

export interface PaymentListParams extends PaginationParams {
  status?: PaymentStatus
  vendorId?: string
}

export const paymentsApi = {
  list: (params?: PaymentListParams) => api.getList<Payment>('/payments', { params }),
  get: (id: string) => api.get<Payment>(`/payments/${id}`),
  schedule: (input: { invoiceId: string; scheduledFor: string; rail: PaymentRail; vendorBankId?: string }) =>
    api.post<Payment>('/payments/schedule', input),
  markPaid: (id: string, input: { externalRef: string; paidAt?: string }) =>
    api.post<Payment>(`/payments/${id}/mark-paid`, input),
  cancel: (id: string, reason?: string) => api.post<Payment>(`/payments/${id}/cancel`, { reason }),
  reconcile: (id: string, externalRef: string) =>
    api.post<Payment>(`/payments/${id}/reconcile`, { externalRef })
}
