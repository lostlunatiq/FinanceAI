import { format, parseISO } from 'date-fns'
import { enUS } from 'date-fns/locale'
import type { CurrencyCode, UserRole } from '../types'
import { DEFAULT_CURRENCY, GSTIN_REGEX, PAN_REGEX, IFSC_REGEX } from '../constants'

/**
 * Format currency amount. Defaults to INR (tenant base).
 * Uses en-IN locale for INR (lakh/crore grouping), en-US otherwise.
 */
export function formatCurrency(amount: number, currency: CurrencyCode | string = DEFAULT_CURRENCY): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Compact currency (e.g. ₹2.84 Cr, $2.84M). Useful for KPI tiles.
 */
export function formatCurrencyCompact(amount: number, currency: CurrencyCode | string = DEFAULT_CURRENCY): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatPercentage(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value / 100)
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'dd MMM yyyy, HH:mm', { locale: enUS })
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'dd MMM yyyy', { locale: enUS })
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const diff = Date.now() - dateObj.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(dateObj)
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function safeJsonParse<T>(str: string): T | null {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidGstin(gstin: string): boolean {
  return GSTIN_REGEX.test(gstin)
}

export function isValidPan(pan: string): boolean {
  return PAN_REGEX.test(pan)
}

export function isValidIfsc(ifsc: string): boolean {
  return IFSC_REGEX.test(ifsc)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

/**
 * Centralised role-capability matrix. Mirrors backend RBAC; keep in sync.
 * Admin gets everything implicitly.
 */
const ROLE_CAPABILITIES: Record<UserRole, Set<string>> = {
  admin: new Set(['*']),
  cfo: new Set([
    'invoice:read', 'invoice:approve:cfo', 'invoice:reject',
    'vendor:read', 'vendor:verify',
    'payment:read', 'payment:schedule', 'payment:mark_paid', 'payment:reconcile',
    'budget:read', 'budget:write',
    'policy:read', 'policy:write',
    'treasury:read',
    'report:read',
    'audit:read',
    'user:read'
  ]),
  l2_finance_head: new Set([
    'invoice:read', 'invoice:approve:l2', 'invoice:reject', 'invoice:request_changes',
    'vendor:read', 'vendor:verify',
    'payment:read',
    'budget:read',
    'policy:read',
    'treasury:read',
    'report:read'
  ]),
  l1_finance_employee: new Set([
    'invoice:read:own', 'invoice:create', 'invoice:approve:l1',
    'invoice:request_changes',
    'vendor:read',
    'budget:read'
  ]),
  vendor: new Set([
    'invoice:create:self', 'invoice:read:self',
    'payment:read:self'
  ])
}

export function hasCapability(role: UserRole | undefined, cap: string): boolean {
  if (!role) return false
  const caps = ROLE_CAPABILITIES[role]
  if (!caps) return false
  if (caps.has('*')) return true
  return caps.has(cap)
}

/**
 * Accept capability or list. Returns true if role has ANY of them.
 */
export function hasAnyCapability(role: UserRole | undefined, caps: string | string[]): boolean {
  const list = Array.isArray(caps) ? caps : [caps]
  return list.some(c => hasCapability(role, c))
}

/**
 * Which approval action a role can perform on an invoice at a given status.
 */
export function canActOnInvoice(role: UserRole | undefined, status: string, assigneeMatches: boolean): boolean {
  if (!role) return false
  if (role === 'admin') return true
  if (!assigneeMatches && role !== 'cfo') return false
  switch (status) {
    case 'l1_review':
      return role === 'l1_finance_employee' || role === 'l2_finance_head'
    case 'l2_review':
      return role === 'l2_finance_head' || role === 'cfo'
    case 'cfo_review':
      return role === 'cfo'
    default:
      return false
  }
}
