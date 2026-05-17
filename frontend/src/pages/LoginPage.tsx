import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login({ username, password })
      navigate('/')
    } catch {
      // error уже в store
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-600 text-white mb-4">
            <FlaskConical className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">СнабЛаб</h1>
          <p className="text-gray-500 mt-1">Управление закупками лаборатории</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Вход в систему</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите логин"
              required
              autoFocus
            />
            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-danger text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Войти
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Проект Бестии © 2026
        </p>
      </div>
    </div>
  )
}
