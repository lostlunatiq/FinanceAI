import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../api/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    // Verify token on mount and periodically
    const verifyAuth = async () => {
      if (!isAuthenticated) return
      
      try {
        // Check if user is still valid
        await authApi.whoami()
      } catch (error) {
        console.error('Auth verification failed:', error)
        logout()
      }
    }
    
    verifyAuth()
    
    // Set up periodic verification (every 5 minutes)
    const interval = setInterval(verifyAuth, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [isAuthenticated, logout])

  if (!isAuthenticated) {
    // Redirect to login page, saving the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if user is active
  if (user && !user.is_active) {
    logout()
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute