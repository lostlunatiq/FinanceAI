import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@finance-ai/auth'
import { hasCapability, hasAnyCapability } from '@finance-ai/core'
import type { UserRole } from '@finance-ai/core'

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useCurrentRole(): UserRole | undefined {
  const { user } = useAuth()
  return user?.role
}

export function useHasRole(roles: UserRole | UserRole[]): boolean {
  const role = useCurrentRole()
  if (!role) return false
  const list = Array.isArray(roles) ? roles : [roles]
  if (role === 'admin') return true
  return list.includes(role)
}

export function useHasCapability(capability: string | string[]): boolean {
  const role = useCurrentRole()
  return hasAnyCapability(role, capability)
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

interface RoleGateProps {
  roles?: UserRole | UserRole[]
  capability?: string | string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Conditionally renders children if the current user has the required role or
 * capability. Use at the UI level to hide actions — ALWAYS enforce server-side
 * too (RBAC middleware + RLS).
 */
export const RoleGate: React.FC<RoleGateProps> = ({ roles, capability, fallback = null, children }) => {
  const role = useCurrentRole()
  if (!role) return <>{fallback}</>
  if (role === 'admin') return <>{children}</>
  if (roles) {
    const list = Array.isArray(roles) ? roles : [roles]
    if (!list.includes(role)) return <>{fallback}</>
  }
  if (capability) {
    if (!hasAnyCapability(role, capability)) return <>{fallback}</>
  }
  return <>{children}</>
}

interface RequireRoleProps {
  roles?: UserRole | UserRole[]
  capability?: string | string[]
  redirectTo?: string
  children: React.ReactNode
}

/**
 * Route-level guard. Redirects away when the user lacks the role/capability.
 * Use inside <ProtectedRoute> — it assumes the user is already authenticated.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({
  roles,
  capability,
  redirectTo = '/dashboard',
  children
}) => {
  const role = useCurrentRole()
  if (!role) return <Navigate to="/login" replace />
  if (role === 'admin') return <>{children}</>
  if (roles) {
    const list = Array.isArray(roles) ? roles : [roles]
    if (!list.includes(role)) return <Navigate to={redirectTo} replace />
  }
  if (capability) {
    if (!hasCapability(role, Array.isArray(capability) ? capability[0] : capability)) {
      return <Navigate to={redirectTo} replace />
    }
  }
  return <>{children}</>
}
