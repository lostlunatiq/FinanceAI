export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  role_display: string
  department: string | null
  department_name: string | null
  is_active: boolean
  is_staff: boolean
  is_delegated: boolean
  created_at: string
  updated_at: string
  last_login: string | null
}

export interface Department {
  id: string
  name: string
  cost_centre_code: string
  head: string | null
  head_name: string | null
  budget_annual: number
  budget_q1: number
  budget_q2: number
  budget_q3: number
  budget_q4: number
  created_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  tokens: {
    refresh: string
    access: string
  }
}

export interface RefreshResponse {
  access: string
}

export interface LogoutRequest {
  refresh: string
}

export type UserRole = 
  | 'VENDOR'
  | 'EMP_L1'
  | 'EMP_L2'
  | 'HOD'
  | 'FIN_L1'
  | 'FIN_L2'
  | 'CFO'
  | 'CEO'
  | 'ADMIN'
  | 'AUDITOR'
  | 'EXTERNAL_CA'

export interface WhoAmIResponse {
  id: string
  email: string
  role: UserRole
  role_display: string
  department_id: string | null
  full_name: string
  is_staff: boolean
  is_active: boolean
  permissions: {
    can_approve_expenses: boolean
    can_view_financials: boolean
    can_manage_users: boolean
    can_manage_vendors: boolean
  }
}