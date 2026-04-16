import { api } from '../http'
import type { Budget, BudgetUtilization, GlCategory, CostCenter, PaginationParams } from '@finance-ai/core'

export interface BudgetListParams extends PaginationParams {
  period?: string
  costCenterId?: string
}

export interface BudgetInput {
  costCenterId: string
  categoryId?: string
  periodStart: string
  periodEnd: string
  amountBase: number
  currency?: string
  notes?: string
}

export const budgetsApi = {
  list: (params?: BudgetListParams) => api.getList<Budget>('/budgets', { params }),
  get: (id: string) => api.get<Budget>(`/budgets/${id}`),
  create: (input: BudgetInput) => api.post<Budget>('/budgets', input),
  update: (id: string, patch: Partial<BudgetInput>) => api.patch<Budget>(`/budgets/${id}`, patch),
  utilization: (id: string) => api.get<BudgetUtilization>(`/budgets/${id}/utilization`),
  variance: (params: { period: string; costCenterId?: string }) =>
    api.get<Array<Budget & { consumedBase: number; variancePct: number }>>('/budgets/variance', { params }),

  listCategories: () => api.get<GlCategory[]>('/gl-categories'),
  createCategory: (input: { code: string; name: string; parentId?: string }) =>
    api.post<GlCategory>('/gl-categories', input),

  listCostCenters: () => api.get<CostCenter[]>('/cost-centers'),
  createCostCenter: (input: { code: string; name: string; ownerId?: string }) =>
    api.post<CostCenter>('/cost-centers', input)
}
