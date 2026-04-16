import { api } from '../http'
import type { CashflowProjection, AgeingBucket, FxExposure, FxRate, CurrencyCode } from '@finance-ai/core'

export const treasuryApi = {
  cashflow: (horizonDays = 90) => api.get<CashflowProjection[]>('/treasury/cashflow', { params: { horizonDays } }),
  ageing: () => api.get<AgeingBucket[]>('/treasury/ageing'),
  fxExposure: () => api.get<FxExposure[]>('/treasury/fx-exposure')
}

export const fxApi = {
  rates: (params: { from: CurrencyCode; to: CurrencyCode; asOf?: string }) =>
    api.get<FxRate>('/fx/rates', { params }),
  setRate: (input: { fromCurrency: CurrencyCode; toCurrency: CurrencyCode; rate: number; asOfDate: string }) =>
    api.post<FxRate>('/fx/rates', input)
}
