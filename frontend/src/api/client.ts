import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const API_BASE_URL = '/api/v1'

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // If error is 401 and not a retry attempt
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Try to refresh token
        const { refreshToken } = useAuthStore.getState()
        await useAuthStore.getState().refreshToken()
        
        // Retry original request
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
        await useAuthStore.getState().logout()
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)

// Helper function to handle API errors
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error
    const { data } = error.response
    
    if (typeof data === 'string') {
      return data
    } else if (data?.detail) {
      return data.detail
    } else if (data?.message) {
      return data.message
    } else if (data?.errors) {
      // Handle validation errors
      return Object.values(data.errors)
        .flat()
        .join(', ')
    }
    
    return `Server error: ${error.response.status}`
  } else if (error.request) {
    // Request made but no response
    return 'No response from server. Please check your connection.'
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred.'
  }
}