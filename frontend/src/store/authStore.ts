import { create } from 'zustand'
import type { User, LoginRequest, RegisterRequest } from '@/types'
import { authApi } from '@/api/auth'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  clearError: () => void
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { data?: { detail?: string } } }
    const detail = axiosErr.response?.data?.detail
    if (detail) return detail
  }
  if (err instanceof Error) return err.message
  return 'Произошла ошибка'
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('snablab_user') || 'null'),
  token: localStorage.getItem('snablab_token'),
  isLoading: false,
  error: null,

  login: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.login(data)
      localStorage.setItem('snablab_token', response.access_token)
      localStorage.setItem('snablab_user', JSON.stringify(response.user))
      set({ user: response.user, token: response.access_token, isLoading: false })
    } catch (err: unknown) {
      const message = extractErrorMessage(err)
      set({ error: message, isLoading: false })
      throw err
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.register(data)
      set({ isLoading: false })
    } catch (err: unknown) {
      const message = extractErrorMessage(err)
      set({ error: message, isLoading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('snablab_token')
    localStorage.removeItem('snablab_user')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  clearError: () => set({ error: null }),
}))
