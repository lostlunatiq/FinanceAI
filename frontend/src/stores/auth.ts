import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/auth'
import type { User, LoginCredentials, AuthResponse } from '../types/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authApi.login(credentials)
          set({
            user: response.user,
            accessToken: response.tokens.access,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          })
          throw error
        }
      },
      
      logout: async () => {
        set({ isLoading: true })
        
        try {
          const { accessToken } = get()
          if (accessToken) {
            await authApi.logout({ refresh: accessToken })
          }
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },
      
      refreshToken: async () => {
        try {
          const response = await authApi.refreshToken()
          set({
            accessToken: response.access,
          })
        } catch (error) {
          console.error('Token refresh failed:', error)
          get().logout()
        }
      },
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)