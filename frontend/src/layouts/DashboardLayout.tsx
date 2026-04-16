import React, { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
  Home,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  Bell,
  User,
  LogOut,
  Building2,
  Shield,
} from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { cn } from '../utils/cn'

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const userPermissions = {
    can_approve_expenses: user?.role ? ['HOD', 'FIN_L1', 'FIN_L2', 'CFO', 'CEO', 'ADMIN'].includes(user.role) : false,
    can_view_financials: user?.role ? ['FIN_L1', 'FIN_L2', 'CFO', 'CEO', 'ADMIN', 'AUDITOR', 'EXTERNAL_CA'].includes(user.role) : false,
    can_manage_users: user?.role === 'ADMIN',
    can_manage_vendors: user?.role ? ['FIN_L1', 'FIN_L2', 'CFO', 'ADMIN'].includes(user.role) : false,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">FinanceAI</h1>
              <p className="text-xs text-gray-500">{user?.role_display}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            
            {/* Permissions badge */}
            <div className="mt-3">
              <div className="flex items-center text-xs text-gray-500">
                <Shield className="w-3 h-3 mr-1" />
                <span>Permissions:</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {userPermissions.can_approve_expenses && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                    Approve
                  </span>
                )}
                {userPermissions.can_view_financials && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                    View Financials
                  </span>
                )}
                {userPermissions.can_manage_users && (
                  <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                    Manage Users
                  </span>
                )}
                {userPermissions.can_manage_vendors && (
                  <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Manage Vendors
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1" />

            {/* Notifications and user menu */}
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <div className="relative">
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout