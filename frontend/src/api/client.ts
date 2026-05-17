import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios'

const API_BASE = '/api/v1'

const client: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ── Interceptors ──────────────────────────────────────────

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('snablab_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function extractErrorMessage(error: AxiosError): string {
  if (error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data as Record<string, unknown>
    if (typeof data.detail === 'string') return data.detail
    if (typeof data.message === 'string') return data.message
  }
  if (error.code === 'ECONNABORTED') return 'Превышено время ожидания запроса'
  if (error.code === 'ERR_NETWORK') return 'Ошибка сети — проверьте подключение к серверу'
  if (error.response?.status === 429) return 'Слишком много запросов — подождите немного'
  if (error.response?.status === 500) return 'Внутренняя ошибка сервера'
  if (error.response?.status === 503) return 'Сервис временно недоступен'
  return error.message || 'Неизвестная ошибка'
}

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('snablab_token')
      localStorage.removeItem('snablab_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default client
export { API_BASE }
export { extractErrorMessage }
