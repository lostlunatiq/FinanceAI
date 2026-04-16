// AuthProvider exported here is the MOCK (auto-login, no backend required).
// When the real backend is available, swap main.tsx to use RealAuthProvider.
//
// The mock provider exposes a `setMockRole` affordance so engineers can verify
// role-gated UI without provisioning users. Selection persists in localStorage.

import React, { useCallback, useEffect, useState, ReactNode } from 'react'
import { AuthContext } from './context/AuthContext'
import type { User, UserRole } from '@finance-ai/core'
import { LOCAL_STORAGE_KEYS, ROLE_LABELS } from '@finance-ai/core'

const MOCK_USERS: Record<UserRole, User> = {
  admin: makeUser('admin', 'Aarav', 'Administrator', 'Platform Ops'),
  cfo: makeUser('cfo', 'Priya', 'Menon', 'Finance — CFO Office'),
  l2_finance_head: makeUser('l2_finance_head', 'Rohan', 'Iyer', 'Finance — Controllers'),
  l1_finance_employee: makeUser('l1_finance_employee', 'Neha', 'Sharma', 'Finance — Accounts Payable'),
  vendor: makeUser('vendor', 'Vikram', 'Singh', 'External Vendor')
}

function makeUser(role: UserRole, firstName: string, lastName: string, department: string): User {
  const ts = new Date().toISOString()
  return {
    id: `mock-${role}`,
    tenantId: 'mock-tenant',
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@financeai.co`,
    firstName,
    lastName,
    role,
    department,
    isActive: true,
    mfaEnabled: role === 'cfo' || role === 'admin',
    createdAt: ts,
    updatedAt: ts
  }
}

function readPersistedRole(): UserRole {
  const v = localStorage.getItem(LOCAL_STORAGE_KEYS.MOCK_ROLE) as UserRole | null
  if (v && v in MOCK_USERS) return v
  return 'l1_finance_employee'
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(readPersistedRole)
  const [user, setUser] = useState<User | null>(MOCK_USERS[role])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUser(MOCK_USERS[role])
    localStorage.setItem(LOCAL_STORAGE_KEYS.MOCK_ROLE, role)
  }, [role])

  const login = useCallback(async (_email: string, _password: string) => {
    setIsLoading(true)
    setError(null)
    await new Promise(r => setTimeout(r, 500))
    setUser(MOCK_USERS[role])
    setIsLoading(false)
    return 'authenticated' as const
  }, [role])

  const logout = useCallback(async () => {
    setUser(null)
  }, [])

  const register = useCallback(async (data: any) => {
    setIsLoading(true)
    setError(null)
    await new Promise(r => setTimeout(r, 500))
    setUser({ ...MOCK_USERS[role], ...data })
    setIsLoading(false)
  }, [role])

  const verifyMfa = useCallback(async (_totp: string) => {
    setUser(MOCK_USERS[role])
  }, [role])

  const setMockRole = useCallback((r: UserRole) => setRole(r), [])

  const value = {
    user,
    tokens: null,
    mfaChallenge: null,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    verifyMfa,
    cancelMfa: () => {},
    logout,
    register,
    refreshToken: async () => true,
    clearError: () => setError(null),
    setMockRole
  }

  return <AuthContext.Provider value={value as any}>{children}</AuthContext.Provider>
}

// Real provider (requires backend at VITE_API_URL)
export { AuthProvider as RealAuthProvider } from './context/AuthContext'
export { AuthContext } from './context/AuthContext'
export type { AuthContextType } from './context/AuthContext'
export { useAuth } from './hooks/useAuth'
export { MOCK_USERS }
export { ROLE_LABELS }
