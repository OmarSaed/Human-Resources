import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthState, User, LoginRequest } from '@/types/auth'
import { authAPI } from '@/lib/api'

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true })
          
          const response = await authAPI.login(credentials)
          const { user, accessToken, refreshToken } = response.data

          // Store tokens in localStorage
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          localStorage.setItem('user', JSON.stringify(user))

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await authAPI.logout()
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          get().clearAuth()
        }
      },

      setUser: (user: User) => {
        set({ user })
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ accessToken, refreshToken })
      },

      clearAuth: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true })
          const token = localStorage.getItem('accessToken')
          const user = localStorage.getItem('user')
          
          if (token && user) {
            // Verify token is still valid
            const response = await authAPI.getCurrentUser()
            
            set({
              user: response.data.user,
              accessToken: token,
              refreshToken: localStorage.getItem('refreshToken'),
              isAuthenticated: true,
              isLoading: false,
            })
          } else {
            set({ isLoading: false })
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          get().clearAuth()
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
