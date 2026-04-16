import React, { createContext, useCallback, useEffect, useReducer, useRef } from 'react'
import type { User, AuthTokens, UserRole } from '@finance-ai/core'
import { LOCAL_STORAGE_KEYS } from '@finance-ai/core'
import { authApi, tokenStore, ApiRequestError } from '@finance-ai/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MfaChallenge {
  challengeId: string
  email: string
}

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  mfaChallenge: MfaChallenge | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

type AuthAction =
  | { type: 'INIT_START' }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'LOGIN_MFA'; payload: MfaChallenge }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_TOKENS'; payload: AuthTokens }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_MFA' }

const initialState: AuthState = {
  user: null,
  tokens: null,
  mfaChallenge: null,
  isLoading: true,
  isAuthenticated: false,
  error: null
}

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INIT_START':
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        mfaChallenge: null,
        isLoading: false,
        isAuthenticated: true,
        error: null
      }
    case 'LOGIN_MFA':
      return {
        ...state,
        mfaChallenge: action.payload,
        isLoading: false,
        error: null
      }
    case 'LOGIN_FAILURE':
      return { ...state, isLoading: false, isAuthenticated: false, error: action.payload }
    case 'LOGOUT':
      return { ...initialState, isLoading: false }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_USER':
      return { ...state, user: action.payload }
    case 'SET_TOKENS':
      return { ...state, tokens: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'CLEAR_MFA':
      return { ...state, mfaChallenge: null }
    default:
      return state
  }
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<'authenticated' | 'mfa_required'>
  verifyMfa: (totp: string) => Promise<void>
  cancelMfa: () => void
  logout: () => Promise<void>
  register: (data: any) => Promise<void>
  refreshToken: () => Promise<boolean>
  clearError: () => void
  // Dev-only affordance — lets engineers flip roles without a backend.
  setMockRole?: (role: UserRole) => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const tokenExpiresAtRef = useRef<number | null>(null)

  const init = useCallback(async () => {
    try {
      const stored = tokenStore.get()
      if (stored?.accessToken) {
        const user = await authApi.me()
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, tokens: stored } })
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    } catch {
      tokenStore.set(null)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const login = async (email: string, password: string): Promise<'authenticated' | 'mfa_required'> => {
    dispatch({ type: 'LOGIN_START' })
    try {
      const result = await authApi.login(email, password)
      if (result.mfaRequired) {
        dispatch({ type: 'LOGIN_MFA', payload: { challengeId: result.challengeId, email } })
        return 'mfa_required'
      }
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: result.user, tokens: result.tokens } })
      return 'authenticated'
    } catch (err: any) {
      const msg = err instanceof ApiRequestError ? err.message : err?.message || 'Login failed'
      dispatch({ type: 'LOGIN_FAILURE', payload: msg })
      throw err
    }
  }

  const verifyMfa = async (totp: string) => {
    if (!state.mfaChallenge) throw new Error('No MFA challenge in progress')
    try {
      const { user, tokens } = await authApi.verifyMfa(state.mfaChallenge.challengeId, totp)
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, tokens } })
    } catch (err: any) {
      const msg = err instanceof ApiRequestError ? err.message : err?.message || 'Invalid code'
      dispatch({ type: 'LOGIN_FAILURE', payload: msg })
      throw err
    }
  }

  const cancelMfa = () => dispatch({ type: 'CLEAR_MFA' })

  const logout = async () => {
    try {
      if (state.tokens) await authApi.logout()
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      tokenStore.set(null)
      dispatch({ type: 'LOGOUT' })
    }
  }

  const register = async (data: any) => {
    dispatch({ type: 'LOGIN_START' })
    try {
      // Registration isn't exposed by backend v1 (admin-provisioned users), so
      // we route self-serve signups to login with a pending state. This shim
      // keeps the existing form functional.
      const result = await authApi.login(data.email, data.password)
      if (result.mfaRequired) {
        dispatch({ type: 'LOGIN_MFA', payload: { challengeId: result.challengeId, email: data.email } })
        return
      }
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: result.user, tokens: result.tokens } })
    } catch (err: any) {
      const msg = err instanceof ApiRequestError ? err.message : err?.message || 'Registration failed'
      dispatch({ type: 'LOGIN_FAILURE', payload: msg })
      throw err
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const tokens = await authApi.refresh()
      dispatch({ type: 'SET_TOKENS', payload: tokens })
      return true
    } catch {
      await logout()
      return false
    }
  }

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' })

  useEffect(() => {
    init()
  }, [init])

  // Sync expiry ref with latest tokens so the refresh interval reads fresh state.
  useEffect(() => {
    tokenExpiresAtRef.current = state.tokens ? Date.now() + state.tokens.expiresIn * 1000 : null
  }, [state.tokens])

  useEffect(() => {
    if (!state.tokens) return
    const id = setInterval(async () => {
      if (!tokenExpiresAtRef.current) return
      const remaining = tokenExpiresAtRef.current - Date.now()
      if (remaining < 5 * 60 * 1000) await refreshToken()
    }, 60 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tokens])

  // Listen to tokenStore changes (driven by the 401 interceptor).
  useEffect(() => {
    return tokenStore.onChange((access) => {
      if (!access) dispatch({ type: 'LOGOUT' })
    })
  }, [])

  const value: AuthContextType = {
    ...state,
    login,
    verifyMfa,
    cancelMfa,
    logout,
    register,
    refreshToken,
    clearError
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
