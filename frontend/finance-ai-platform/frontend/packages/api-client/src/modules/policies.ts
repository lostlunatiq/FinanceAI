import { api } from '../http'
import type { ApprovalPolicy, UserRole } from '@finance-ai/core'

export interface ApprovalPolicyInput {
  name: string
  minAmountBase: number
  maxAmountBase?: number
  categoryId?: string
  costCenterId?: string
  requiredChain: UserRole[]
  priority: number
  isActive?: boolean
}

export const policiesApi = {
  list: () => api.get<ApprovalPolicy[]>('/approval-policies'),
  create: (input: ApprovalPolicyInput) => api.post<ApprovalPolicy>('/approval-policies', input),
  update: (id: string, patch: Partial<ApprovalPolicyInput>) =>
    api.patch<ApprovalPolicy>(`/approval-policies/${id}`, patch),
  delete: (id: string) => api.delete<void>(`/approval-policies/${id}`)
}
