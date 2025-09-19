import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { User, UserRole } from '@/types/auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<void>
  logout: () => void
  hasRole: (requiredRoles: UserRole[]) => boolean
  hasPermission: (permission: string) => boolean
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  } = useAuthStore()

  // Check authentication on app start
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const hasRole = (requiredRoles: UserRole[]): boolean => {
    if (!user) return false
    return requiredRoles.includes(user.role)
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    
    // Super admin has all permissions
    if (user.role === UserRole.SUPER_ADMIN) return true
    
    // Define role-based permissions
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'], // All permissions
      [UserRole.HR_MANAGER]: [
        'employees.read',
        'employees.create',
        'employees.update',
        'employees.delete',
        'departments.read',
        'departments.create',
        'departments.update',
        'positions.read',
        'positions.create',
        'positions.update',
        'analytics.read',
        'reports.read'
      ],
      [UserRole.HR_SPECIALIST]: [
        'employees.read',
        'employees.create',
        'employees.update',
        'departments.read',
        'positions.read',
        'analytics.read'
      ],
      [UserRole.DEPARTMENT_MANAGER]: [
        'employees.read',
        'employees.update', // Only for their department
        'departments.read',
        'positions.read',
        'team.read'
      ],
      [UserRole.EMPLOYEE]: [
        'profile.read',
        'profile.update',
        'team.read'
      ]
    }

    const userPermissions = rolePermissions[user.role] || []
    return userPermissions.includes('*') || userPermissions.includes(permission)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
    hasPermission,
    checkAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
