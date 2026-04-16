import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from './stores/auth'
import LoginPage from './pages/Login'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<div>Dashboard</div>} />
          <Route path="expenses" element={<div>Expenses</div>} />
          <Route path="invoices" element={<div>Invoices</div>} />
          <Route path="reports" element={<div>Reports</div>} />
          <Route path="settings" element={<div>Settings</div>} />
        </Route>
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <Toaster position="top-right" />
    </>
  )
}

export default App