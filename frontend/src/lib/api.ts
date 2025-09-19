import axios, { AxiosResponse } from 'axios'
import { LoginRequest, LoginResponse, RefreshTokenResponse } from '@/types/auth'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post<RefreshTokenResponse>(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          )
          
          const { accessToken } = response.data
          localStorage.setItem('accessToken', accessToken)
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (data: LoginRequest): Promise<AxiosResponse<LoginResponse>> =>
    api.post('/auth/login', data),
  
  register: (data: any): Promise<AxiosResponse> =>
    api.post('/auth/register', data),
  
  logout: (): Promise<AxiosResponse> =>
    api.post('/auth/logout'),
  
  refreshToken: (refreshToken: string): Promise<AxiosResponse<RefreshTokenResponse>> =>
    api.post('/auth/refresh', { refreshToken }),
  
  getCurrentUser: (): Promise<AxiosResponse> =>
    api.get('/auth/me'),
  
  forgotPassword: (email: string): Promise<AxiosResponse> =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, newPassword: string): Promise<AxiosResponse> =>
    api.post('/auth/reset-password', { token, newPassword }),
  
  changePassword: (currentPassword: string, newPassword: string): Promise<AxiosResponse> =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  
  verifyEmail: (token: string): Promise<AxiosResponse> =>
    api.post('/auth/verify-email', { token }),
  
  // MFA related endpoints
  setupMFA: (): Promise<AxiosResponse> =>
    api.post('/auth/mfa/setup'),
  
  enableMFA: (mfaCode: string): Promise<AxiosResponse> =>
    api.post('/auth/mfa/enable', { mfaCode }),
  
  disableMFA: (password: string, mfaCode: string): Promise<AxiosResponse> =>
    api.post('/auth/mfa/disable', { password, mfaCode }),
  
  getMFAStatus: (): Promise<AxiosResponse> =>
    api.get('/auth/mfa/status'),
  
  generateBackupCodes: (): Promise<AxiosResponse> =>
    api.post('/auth/mfa/backup-codes'),
}

// Employee API
export const employeeAPI = {
  getEmployees: (params?: any): Promise<AxiosResponse> =>
    api.get('/employees', { params }),
  
  getEmployee: (id: string): Promise<AxiosResponse> =>
    api.get(`/employees/${id}`),
  
  createEmployee: (data: any): Promise<AxiosResponse> =>
    api.post('/employees', data),
  
  updateEmployee: (id: string, data: any): Promise<AxiosResponse> =>
    api.put(`/employees/${id}`, data),
  
  deleteEmployee: (id: string): Promise<AxiosResponse> =>
    api.delete(`/employees/${id}`),
  
  getAnalytics: (params?: any): Promise<AxiosResponse> =>
    api.get('/employees/analytics', { params }),
  
  getUpcomingBirthdays: (days?: number): Promise<AxiosResponse> =>
    api.get('/employees/birthdays', { params: { days } }),
  
  getUpcomingAnniversaries: (days?: number): Promise<AxiosResponse> =>
    api.get('/employees/anniversaries', { params: { days } }),
  
  getHierarchy: (params?: any): Promise<AxiosResponse> =>
    api.get('/employees/hierarchy', { params }),
}

// Department API
export const departmentAPI = {
  getDepartments: (params?: any): Promise<AxiosResponse> =>
    api.get('/departments', { params }),
  
  getDepartment: (id: string): Promise<AxiosResponse> =>
    api.get(`/departments/${id}`),
  
  createDepartment: (data: any): Promise<AxiosResponse> =>
    api.post('/departments', data),
  
  updateDepartment: (id: string, data: any): Promise<AxiosResponse> =>
    api.put(`/departments/${id}`, data),
  
  deleteDepartment: (id: string): Promise<AxiosResponse> =>
    api.delete(`/departments/${id}`),
}

// Position API
export const positionAPI = {
  getPositions: (params?: any): Promise<AxiosResponse> =>
    api.get('/positions', { params }),
  
  getPosition: (id: string): Promise<AxiosResponse> =>
    api.get(`/positions/${id}`),
  
  createPosition: (data: any): Promise<AxiosResponse> =>
    api.post('/positions', data),
  
  updatePosition: (id: string, data: any): Promise<AxiosResponse> =>
    api.put(`/positions/${id}`, data),
}

export default api
