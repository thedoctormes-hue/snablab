import { Page, APIRequestContext, request, expect } from '@playwright/test'

// ── Constants ──────────────────────────────────────────────

export const BACKEND_URL = 'http://127.0.0.1:8000'
export const FRONTEND_URL = 'http://127.0.0.1:5173'
export const API_BASE = `${BACKEND_URL}/api/v1`

// ── Test user credentials ──────────────────────────────────

export const TEST_USER = {
  username: `e2e_test_${Date.now()}`,
  password: 'E2E_Test_P@ssw0rd!',
  full_name: 'E2E Test User',
  role: 'lab_head',
}

// ── API Helpers ────────────────────────────────────────────

/**
 * Создаёт APIRequestContext с базовым URL backend-а
 */
export async function createApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BACKEND_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  })
}

/**
 * Регистрирует тестового пользователя через API
 */
export async function registerUser(api: APIRequestContext, user = TEST_USER) {
  const res = await api.post('/api/v1/users/register', { data: user })
  if (!res.ok() && res.status() !== 409) {
    throw new Error(`Failed to register user: ${res.status()} ${await res.text()}`)
  }
  return user
}

/**
 * Логинится через API и возвращает токен
 */
export async function loginApi(api: APIRequestContext, user = TEST_USER) {
  const res = await api.post('/api/v1/users/login', {
    data: { username: user.username, password: user.password },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.access_token as string
}

/**
 * Создаёт API контекст с авторизацией
 */
export async function createAuthenticatedApi(user = TEST_USER) {
  const api = await createApiContext()
  await registerUser(api, user)
  const token = await loginApi(api, user)
  const authApi = await request.newContext({
    baseURL: BACKEND_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  return { api: authApi, token, user }
}

// ── Browser Helpers ────────────────────────────────────────

/**
 * Выполняет логин через UI и ждёт редиректа на дашборд
 */
export async function loginViaUI(page: Page, user = TEST_USER) {
  await page.goto('/login')
  await page.fill('input[placeholder="Введите логин"]', user.username)
  await page.fill('input[placeholder="Введите пароль"]', user.password)
  await page.click('button:has-text("Войти")')
  // Ждём редирект на дашборд
  await page.waitForURL('**/')
  await expect(page.locator('h1:has-text("Дашборд")')).toBeVisible()
}

/**
 * Устанавливает токен в localStorage (быстрый логин без UI)
 */
export async function setAuthToken(page: Page, token: string, user = TEST_USER) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('snablab_token', token)
      localStorage.setItem('snablab_user', JSON.stringify(user))
    },
    { token, user }
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // Ждём появления контента приложения
  await page.waitForSelector('h1', { timeout: 10_000 }).catch(() => {})
}

/**
 * Очищает авторизацию (логаут)
 * Безопасно — сначала переходит на страницу приложения
 */
export async function clearAuth(page: Page) {
  // Переходим на страницу приложения чтобы иметь доступ к localStorage
  if (page.url() === 'about:blank' || !page.url().includes('localhost')) {
    await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {})
  }
  await page.evaluate(() => {
    localStorage.removeItem('snablab_token')
    localStorage.removeItem('snablab_user')
  }).catch(() => {
    // Игнорируем ошибки — localStorage может быть недоступен
  })
}

// ── Data Helpers ───────────────────────────────────────────

export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export const SAMPLE_NOMENCLATURE = () => ({
  name: uniqueName('Реактив'),
  catalog_number: `CAT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  manufacturer: 'БиоРад',
  unit: 'шт',
  shelf_life_months: 12,
  storage_conditions: '+2..+8°C',
})

export const SAMPLE_SUPPLIER = () => ({
  name: uniqueName('Поставщик'),
  inn: '7701234567',
  kpp: '770101001',
  address: 'г. Москва, ул. Лабораторная, д. 1',
  bank_details: 'Р/с 40702810100000000001 в Сбербанке',
  contact_email: 'info@shtab-ai.ru',
  contact_phone: '+7 (495) 123-45-67',
  manager_name: 'Иванов И.И.',
})

export const SAMPLE_EQUIPMENT = () => ({
  name: uniqueName('Анализатор'),
  equipment_type: 'Гематологический анализатор',
  manufacturer: 'Sysmex',
  model: 'XN-1000',
  serial_number: `SN-${Date.now()}`,
  department: 'КДЛ',
  location: 'Каб. 205',
  status: 'active',
})

export const SAMPLE_INVENTORY = (nomenclatureId: number) => ({
  nomenclature_id: nomenclatureId,
  batch_number: `BATCH-${Date.now()}`,
  quantity: 100,
  unit: 'шт',
  received_date: new Date().toISOString().split('T')[0],
  expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
})

// ── Wait Helpers ───────────────────────────────────────────

/**
 * Ждёт появления текста на странице
 */
export async function waitForText(page: Page, text: string, timeout = 10_000) {
  await page.waitForSelector(`text=${text}`, { timeout })
}

/**
 * Ждёт исчезновения спиннера загрузки
 */
export async function waitForLoadingComplete(page: Page, timeout = 15_000) {
  // Ждём пока пропадёт спиннер (если есть)
  const spinner = page.locator('.animate-spin, [class*="spinner"], [class*="loading"]').first()
  if (await spinner.isVisible().catch(() => false)) {
    await spinner.waitFor({ state: 'hidden', timeout })
  }
}

// ── Screenshot Helper ─────────────────────────────────────

/**
 * Делает скриншот с именем теста
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e-screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  })
}
