import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import LoginForm from '@/components/auth/LoginForm'
import Register from '@/pages/auth/Register'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import UserProfile from '@/pages/auth/UserProfile'
import Dashboard from '@/pages/Dashboard'
import EmployeeList from '@/pages/employees/EmployeeList'
import EmployeeForm from '@/pages/employees/EmployeeForm'
import EmployeeProfile from '@/pages/employees/EmployeeProfile'
import EmployeeDirectory from '@/pages/employees/EmployeeDirectory'
import EmployeeAnalytics from '@/pages/employees/EmployeeAnalytics'
import EmployeeHierarchy from '@/pages/employees/EmployeeHierarchy'
import DepartmentList from '@/pages/departments/DepartmentList'
import DepartmentForm from '@/pages/departments/DepartmentForm'
import DepartmentView from '@/pages/departments/DepartmentView'
import PositionList from '@/pages/positions/PositionList'
import PositionForm from '@/pages/positions/PositionForm'
import PositionView from '@/pages/positions/PositionView'
import { UserRole } from '@/types/auth'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="employees" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST, UserRole.DEPARTMENT_MANAGER]}>
                  <EmployeeList />
                </ProtectedRoute>
              } />
              <Route path="employees/new" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST]}>
                  <EmployeeForm />
                </ProtectedRoute>
              } />
              <Route path="employees/:id" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST, UserRole.DEPARTMENT_MANAGER]}>
                  <EmployeeProfile />
                </ProtectedRoute>
              } />
              <Route path="employees/:id/edit" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST]}>
                  <EmployeeForm />
                </ProtectedRoute>
              } />
              <Route path="employees/directory" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST, UserRole.DEPARTMENT_MANAGER, UserRole.EMPLOYEE]}>
                  <EmployeeDirectory />
                </ProtectedRoute>
              } />
              <Route path="employees/analytics" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST]}>
                  <EmployeeAnalytics />
                </ProtectedRoute>
              } />
              <Route path="employees/hierarchy" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST, UserRole.DEPARTMENT_MANAGER]}>
                  <EmployeeHierarchy />
                </ProtectedRoute>
              } />
              
              {/* Department Routes */}
              <Route path="departments" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST, UserRole.DEPARTMENT_MANAGER]}>
                  <DepartmentList />
                </ProtectedRoute>
              } />
              <Route path="departments/new" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER]}>
                  <DepartmentForm />
                </ProtectedRoute>
              } />
              <Route path="departments/:id" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST, UserRole.DEPARTMENT_MANAGER]}>
                  <DepartmentView />
                </ProtectedRoute>
              } />
              <Route path="departments/:id/edit" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER]}>
                  <DepartmentForm />
                </ProtectedRoute>
              } />
              
              {/* Position Routes */}
              <Route path="positions" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST, UserRole.DEPARTMENT_MANAGER]}>
                  <PositionList />
                </ProtectedRoute>
              } />
              <Route path="positions/new" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER]}>
                  <PositionForm />
                </ProtectedRoute>
              } />
              <Route path="positions/:id" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.HR_SPECIALIST, UserRole.DEPARTMENT_MANAGER]}>
                  <PositionView />
                </ProtectedRoute>
              } />
              <Route path="positions/:id/edit" element={
                <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.HR_MANAGER]}>
                  <PositionForm />
                </ProtectedRoute>
              } />
              
              {/* User Profile Route */}
              <Route path="profile" element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } />
              
              {/* Placeholder routes for future development */}
              <Route path="attendance" element={<PlaceholderPage title="Attendance" />} />
              <Route path="leave" element={<PlaceholderPage title="Leave Management" />} />
              <Route path="performance" element={<PlaceholderPage title="Performance" />} />
              <Route path="learning" element={<PlaceholderPage title="Learning & Development" />} />
              <Route path="recruitment" element={<PlaceholderPage title="Recruitment" />} />
              <Route path="documents" element={<PlaceholderPage title="Documents" />} />
              <Route path="notifications" element={<PlaceholderPage title="Notifications" />} />
              <Route path="settings" element={<PlaceholderPage title="Settings" />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Helper component to handle login route
const LoginRoute: React.FC = () => {
  const { isAuthenticated } = useAuthStore()
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  
  return <LoginForm />
}

// Placeholder component for future pages
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600">This page is under development.</p>
      </div>
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-500">Coming soon...</p>
      </div>
    </div>
  )
}

export default App
