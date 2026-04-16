import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, AuthTokens } from '@finance-ai/core'
import { API_BASE_URL, LOCAL_STORAGE_KEYS } from '@finance-ai/core'

// ---------------------------------------------------------------------------
// Shared axios instance
// ---------------------------------------------------------------------------
//
// Responsibilities:
//   * Attach Authorization header from in-memory tokens.
//   * On 401, attempt a single refresh; if refresh fails, clear tokens and
//     let callers route to /login.
//   * Serialise concurrent refreshes so a burst of 401s only triggers one.
//
// The refresh endpoint itself is called via the `rawHttp` instance to avoid
// recursion through the interceptor.

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

type RefreshListener = (token: string | null) => void

class AuthTokenStore {
  private tokens: AuthTokens | null = null
  private listeners: RefreshListener[] = []

  get(): AuthTokens | null {
    return this.tokens
  }

  set(tokens: AuthTokens | null) {
    this.tokens = tokens
    if (tokens) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens))
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKENS)
    }
  }

  hydrateFromStorage(): AuthTokens | null {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKENS)
    if (!raw) return null
    try {
      this.tokens = JSON.parse(raw) as AuthTokens
      return this.tokens
    } catch {
      return null
    }
  }

  onChange(fn: RefreshListener): () => void {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn)
    }
  }

  notify() {
    this.listeners.forEach(l => l(this.tokens?.accessToken ?? null))
  }
}

export const tokenStore = new AuthTokenStore()
tokenStore.hydrateFromStorage()

// Raw axios (no interceptors) — used for the refresh call itself.
export const rawHttp: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// Main axios instance.
export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// -- Request interceptor: attach bearer -------------------------------------
http.interceptors.request.use(
  (config) => {
    const tokens = tokenStore.get()
    if (tokens?.accessToken) {
      config.headers = config.headers ?? {}
      ;(config.headers as any).Authorization = `Bearer ${tokens.accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// -- Response interceptor: 401 → refresh → retry ----------------------------
let refreshInFlight: Promise<AuthTokens | null> | null = null

async function performRefresh(): Promise<AuthTokens | null> {
  const current = tokenStore.get()
  if (!current?.refreshToken) return null
  try {
    const res = await rawHttp.post<ApiResponse<AuthTokens>>('/auth/refresh', {
      refreshToken: current.refreshToken
    })
    const next = res.data.data ?? null
    if (next) {
      tokenStore.set(next)
      tokenStore.notify()
    }
    return next
  } catch {
    tokenStore.set(null)
    tokenStore.notify()
    return null
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined
    if (!original || original._retry) return Promise.reject(error)
    const status = error.response?.status
    const url = original.url ?? ''
    // Don't try to refresh a failed refresh — that's a hard logout.
    if (status === 401 && !url.includes('/auth/refresh') && !url.includes('/auth/login')) {
      original._retry = true
      refreshInFlight = refreshInFlight ?? performRefresh()
      const next = await refreshInFlight
      refreshInFlight = null
      if (!next) return Promise.reject(error)
      original.headers = original.headers ?? {}
      ;(original.headers as any).Authorization = `Bearer ${next.accessToken}`
      return http(original)
    }
    return Promise.reject(error)
  }
)

// ---------------------------------------------------------------------------
// Unwrap helpers
// ---------------------------------------------------------------------------

export class ApiRequestError extends Error {
  code: string
  status?: number
  details?: Record<string, any>
  fieldErrors?: Record<string, string>

  constructor(message: string, opts: { code?: string; status?: number; details?: any; fieldErrors?: Record<string, string> } = {}) {
    super(message)
    this.code = opts.code ?? 'UNKNOWN'
    this.status = opts.status
    this.details = opts.details
    this.fieldErrors = opts.fieldErrors
  }
}

function normaliseError(err: any): ApiRequestError {
  if (err?.response?.data?.errors?.length) {
    const first = err.response.data.errors[0]
    const fieldErrors: Record<string, string> = {}
    for (const e of err.response.data.errors) {
      if (e.field) fieldErrors[e.field] = e.message
    }
    return new ApiRequestError(first.message, {
      code: first.code,
      status: err.response.status,
      fieldErrors,
      details: first.details
    })
  }
  if (err?.response) {
    return new ApiRequestError(err.response.statusText || 'Request failed', {
      code: String(err.response.status),
      status: err.response.status
    })
  }
  if (err?.message) {
    return new ApiRequestError(err.message, { code: 'NETWORK_ERROR' })
  }
  return new ApiRequestError('Unknown error', { code: 'UNKNOWN' })
}

async function unwrap<T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const res = await p
    if (res.data.errors?.length) {
      throw normaliseError({ response: { data: res.data, status: 400 } })
    }
    return res.data.data as T
  } catch (err) {
    throw normaliseError(err)
  }
}

async function unwrapPaginated<T>(p: Promise<{ data: ApiResponse<T[]> }>) {
  try {
    const res = await p
    if (res.data.errors?.length) throw normaliseError({ response: { data: res.data, status: 400 } })
    return { items: (res.data.data ?? []) as T[], meta: res.data.meta }
  } catch (err) {
    throw normaliseError(err)
  }
}

// ---------------------------------------------------------------------------
// CRUD primitives
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(http.get(url, config)),
  getList: <T>(url: string, config?: AxiosRequestConfig) => unwrapPaginated<T>(http.get(url, config)),
  post: <T>(url: string, body?: any, config?: AxiosRequestConfig) => unwrap<T>(http.post(url, body, config)),
  put: <T>(url: string, body?: any, config?: AxiosRequestConfig) => unwrap<T>(http.put(url, body, config)),
  patch: <T>(url: string, body?: any, config?: AxiosRequestConfig) => unwrap<T>(http.patch(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(http.delete(url, config))
}
