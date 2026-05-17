import { FullConfig } from '@playwright/test'
import {
  createApiContext,
  registerUser,
  loginApi,
  TEST_USER,
  BACKEND_URL,
} from './helpers'

/**
 * Глобальный setup — регистрирует тестового пользователя
 * и сохраняет токен для использования в тестах
 */
export default async function globalSetup(_config: FullConfig) {
  console.log('\n🔧 E2E Global Setup: подготовка тестового окружения...')

  // 1. Проверяем доступность backend-а
  try {
    const healthRes = await fetch(`${BACKEND_URL}/health`)
    if (!healthRes.ok) {
      throw new Error(`Backend health check failed: ${healthRes.status}`)
    }
    const health = await healthRes.json()
    console.log(`  ✅ Backend доступен: ${health.service} v${health.version}`)
  } catch (err) {
    console.error('  ❌ Backend недоступен на', BACKEND_URL)
    console.error('     Убедитесь что backend запущен: cd backend && python -m app.main')
    throw err
  }

  // 2. Регистрируем тестового пользователя
  const api = await createApiContext()
  try {
    await registerUser(api, TEST_USER)
    console.log(`  ✅ Тестовый пользователь создан: ${TEST_USER.username}`)
  } catch (err) {
    console.error('  ❌ Не удалось создать тестового пользователя:', err)
    throw err
  }

  // 3. Логинимся и получаем токен
  try {
    const token = await loginApi(api, TEST_USER)
    // Сохраняем токен в файл для тестов
    const fs = await import('fs')
    const path = await import('path')
    const authFile = path.join(__dirname, '.auth.json')
    fs.writeFileSync(authFile, JSON.stringify({ token, user: TEST_USER }))
    console.log(`  ✅ Токен авторизации получен и сохранён`)
  } catch (err) {
    console.error('  ❌ Не удалось получить токен:', err)
    throw err
  }

  await api.dispose()
  console.log('✅ E2E Global Setup завершён\n')
}
