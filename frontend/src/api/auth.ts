import { apiClient, handleApiError } from './client'
import type {
  LoginCredentials,
  AuthResponse,
  RefreshResponse,
  User,
  Department,
} from '../types/auth'

export const authApi = {
  // Login
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/auth/login/', credentials)
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },
  
  // Logout
  logout: async (data: { refresh: string }): Promise<void> => {
    try {
      await apiClient.post('/auth/logout/', data)
    } catch (error: any) {
      console.error('Logout error:', error)
      // Don't throw error for logout to ensure user can always logout
    }
  },
  
  // Refresh token
  refreshToken: async (): Promise<RefreshResponse> => {
    try {
      const response = await apiClient.post('/auth/refresh/')
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },
  
  // Get current user
  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await apiClient.get('/auth/me/')
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },
  
  // Get whoami (minimal user info)
  whoami: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/auth/whoami/')
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },
  
  // Get departments
  getDepartments: async (): Promise<Department[]> => {
    try {
      const response = await apiClient.get('/auth/departments/')
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },
  
  // Get users (admin only)
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await apiClient.get('/auth/users/')
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },
}