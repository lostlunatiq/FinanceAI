import { api } from '../http'
import type { Vendor, VendorBankAccount, VendorDocument, VendorStatus, PaginationParams } from '@finance-ai/core'

export interface VendorListParams extends PaginationParams {
  status?: VendorStatus
  q?: string
}

export interface VendorCreateInput {
  legalName: string
  displayName: string
  gstin?: string
  pan?: string
  taxId?: string
  country?: string
  defaultCurrency?: string
  email?: string
  phone?: string
  paymentTerms?: number
  category?: string
}

export const vendorsApi = {
  list: (params?: VendorListParams) => api.getList<Vendor>('/vendors', { params }),
  get: (id: string) => api.get<Vendor>(`/vendors/${id}`),
  create: (input: VendorCreateInput) => api.post<Vendor>('/vendors', input),
  update: (id: string, patch: Partial<VendorCreateInput>) => api.patch<Vendor>(`/vendors/${id}`, patch),
  verify: (id: string) => api.post<Vendor>(`/vendors/${id}/verify`),
  suspend: (id: string, reason?: string) => api.post<Vendor>(`/vendors/${id}/suspend`, { reason }),
  archive: (id: string) => api.delete<void>(`/vendors/${id}`),

  listBankAccounts: (id: string) => api.get<VendorBankAccount[]>(`/vendors/${id}/bank-accounts`),
  addBankAccount: (id: string, input: {
    accountNumber: string
    ifscCode?: string
    swiftCode?: string
    bankName: string
    isPrimary?: boolean
  }) => api.post<VendorBankAccount>(`/vendors/${id}/bank-accounts`, input),
  verifyBankAccount: (vendorId: string, bankId: string) =>
    api.post<VendorBankAccount>(`/vendors/${vendorId}/bank-accounts/${bankId}/verify`),

  listDocuments: (id: string) => api.get<VendorDocument[]>(`/vendors/${id}/documents`),
  uploadDocument: (id: string, file: File, docType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('docType', docType)
    return api.post<VendorDocument>(`/vendors/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  deleteDocument: (vendorId: string, docId: string) => api.delete<void>(`/vendors/${vendorId}/documents/${docId}`)
}
