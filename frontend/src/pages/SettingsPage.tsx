import { useState } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { Bell, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { notificationsApi } from '@/api/notifications'

const roleLabels: Record<string, string> = {
  admin: 'Администратор',
  lab_head: 'Заведующий лабораторией',
  lab_tech: 'Лаборант',
  economist: 'Экономист',
}

export function SettingsPage() {
  const { user } = useAuthStore()
  const { success, error: toastError } = useToastStore()
  const [tgChatId, setTgChatId] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleSendTestNotification = async () => {
    setTestStatus('sending')
    try {
      const msg = tgChatId
        ? `🧪 Тестовое уведомление от СнабЛаб (Chat ID: ${tgChatId})`
        : undefined
      const result = await notificationsApi.test(msg)
      if (result.status === 'sent') {
        setTestStatus('sent')
        success('Тестовое уведомление отправлено!')
      } else {
        setTestStatus('error')
        toastError(result.reason || 'Не удалось отправить уведомление')
      }
      setTimeout(() => setTestStatus('idle'), 3000)
    } catch {
      setTestStatus('error')
      toastError('Не удалось отправить уведомление')
      setTimeout(() => setTestStatus('idle'), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="text-gray-500 mt-1">Профиль и параметры системы</p>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-gray-800 mb-4">Профиль пользователя</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Логин</span>
            <span className="text-sm font-medium text-gray-700">{user?.username || '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">ФИО</span>
            <span className="text-sm font-medium text-gray-700">{user?.full_name || '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Роль</span>
            <span className="text-sm font-medium text-gray-700">
              {user?.role ? roleLabels[user.role] || user.role : '—'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-gray-500">Статус</span>
            {user?.is_active ? (
              <Badge variant="success">Активен</Badge>
            ) : (
              <Badge variant="default">Неактивен</Badge>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary-600" />
          <h3 className="text-base font-semibold text-gray-800">Уведомления</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Настройте получение уведомлений в Telegram о низких остатках, истекающих сроках годности и статусе закупок.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Telegram Chat ID"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              placeholder="123456789"
              type="number"
            />
            <div className="flex items-end">
              <Button
                onClick={handleSendTestNotification}
                disabled={testStatus === 'sending'}
                variant={testStatus === 'error' ? 'danger' : 'primary'}
                className="w-full"
              >
                {testStatus === 'sending' ? (
                  <>
                    <Send className="h-4 w-4 mr-2 animate-pulse" />
                    Отправка...
                  </>
                ) : testStatus === 'sent' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Отправлено!
                  </>
                ) : testStatus === 'error' ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Ошибка
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Тестовое уведомление
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              💡 Чтобы узнать ваш Chat ID, отправьте команду /start боту @CrmHouseBot и используйте полученный ID.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-gray-800 mb-4">О системе</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Название</span>
            <span className="text-sm font-medium text-gray-700">СнабЛаб</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Версия</span>
            <span className="text-sm font-medium text-gray-700">0.1.0-alpha</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Автор</span>
            <span className="text-sm font-medium text-gray-700">Бестия (лаборант-силовик)</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-gray-500">Стек</span>
            <span className="text-sm font-medium text-gray-700">React + FastAPI + PostgreSQL</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
