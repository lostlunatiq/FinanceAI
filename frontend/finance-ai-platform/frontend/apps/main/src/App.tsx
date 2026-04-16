import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '@finance-ai/auth'
import { AppLayout } from '@finance-ai/ui'
import { RequireRole } from '@finance-ai/rbac'

// Auth pages
const Login = React.lazy(() => import('./pages/auth/Login'))
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'))

// Main pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const AccountsPayable = React.lazy(() => import('./pages/AccountsPayable'))
const BudgetManagement = React.lazy(() => import('./pages/BudgetManagement'))
const VendorPortal = React.lazy(() => import('./pages/VendorPortal'))
const Payments = React.lazy(() => import('./pages/Payments'))
const Treasury = React.lazy(() => import('./pages/Treasury'))
const Policies = React.lazy(() => import('./pages/Policies'))
const AuditLog = React.lazy(() => import('./pages/AuditLog'))
const Settings = React.lazy(() => import('./pages/Settings'))
const Profile = React.lazy(() => import('./pages/Profile'))
const MfaSetup = React.lazy(() => import('./pages/MfaSetup'))

const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </Box>
)

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingFallback />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingFallback />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// Helper to reduce boilerplate: wraps children in ProtectedRoute + AppLayout,
// and optionally a RequireRole guard.
const Guarded: React.FC<{ roles?: any; children: React.ReactNode }> = ({ roles, children }) => (
  <ProtectedRoute>
    <AppLayout>{roles ? <RequireRole roles={roles}>{children}</RequireRole> : children}</AppLayout>
  </ProtectedRoute>
)

const App: React.FC = () => {
  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

        {/* Protected routes — every authenticated user */}
        <Route path="/dashboard" element={<Guarded><Dashboard /></Guarded>} />
        <Route path="/ap/*" element={<Guarded><AccountsPayable /></Guarded>} />
        <Route path="/vendor/*" element={<Guarded><VendorPortal /></Guarded>} />
        <Route path="/settings" element={<Guarded><Settings /></Guarded>} />
        <Route path="/settings/mfa" element={<Guarded><MfaSetup /></Guarded>} />
        <Route path="/profile" element={<Guarded><Profile /></Guarded>} />

        {/* Role-gated routes */}
        <Route
          path="/budget/*"
          element={<Guarded roles={['l1_finance_employee', 'l2_finance_head', 'cfo', 'admin']}><BudgetManagement /></Guarded>}
        />
        <Route
          path="/payments/*"
          element={<Guarded roles={['l2_finance_head', 'cfo', 'admin']}><Payments /></Guarded>}
        />
        <Route
          path="/treasury/*"
          element={<Guarded roles={['l2_finance_head', 'cfo', 'admin']}><Treasury /></Guarded>}
        />
        <Route
          path="/policies/*"
          element={<Guarded roles={['cfo', 'admin']}><Policies /></Guarded>}
        />
        <Route
          path="/audit/*"
          element={<Guarded roles={['cfo', 'admin']}><AuditLog /></Guarded>}
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  )
}

export default App
