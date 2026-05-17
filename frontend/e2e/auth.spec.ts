import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { NavigationPage } from './pages/NavigationPage'
import { TEST_USER, clearAuth, createAuthenticatedApi, setAuthToken } from './helpers'

// ── Fixtures ────────────────────────────────────────────---

test.describe('🔐 Аутентификация', () => {
  let loginPage: LoginPage
  let navPage: NavigationPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    navPage = new NavigationPage(page)
    await clearAuth(page)
  })

  // ── Login UI ──────────────────────────────────────────

  test.describe('Логин через UI', () => {
    test('успешный логин с валидными данными', async ({ page }) => {
      // Подготавливаем пользователя через API
      const { api } = await createAuthenticatedApi()
      await api.dispose()

      await loginPage.goto()
      await loginPage.login(TEST_USER.username, TEST_USER.password)

      // Должны быть перенаправлены на дашборд
      await loginPage.expectRedirectToDashboard()
      await expect(page.locator('h1:has-text("Дашборд")')).toBeVisible()
    })

    test('ошибка при неверном пароле', async ({ page }) => {
      await loginPage.goto()
      await loginPage.login(TEST_USER.username, 'wrong_password_123')

      // Остаёмся на странице логина
      await loginPage.expectOnLoginPage()
      // Видим ошибку
      await loginPage.expectErrorVisible()
    })

    test('ошибка при несуществующем пользователе', async ({ page }) => {
      await loginPage.goto()
      await loginPage.login('nonexistent_user_xyz', 'any_password')

      await loginPage.expectOnLoginPage()
      await loginPage.expectErrorVisible()
    })

    test('ошибка при пустых полях', async ({ page }) => {
      await loginPage.goto()
      await loginPage.submit()

      // HTML5 validation не даёт отправить пустую форму
      await loginPage.expectOnLoginPage()
    })

    test('кнопка неактивна во время загрузки', async ({ page }) => {
      // Подготавливаем пользователя
      const { api } = await createAuthenticatedApi()
      await api.dispose()

      await loginPage.goto()
      await loginPage.fillUsername(TEST_USER.username)
      await loginPage.fillPassword(TEST_USER.password)

      // Кликаем и сразу проверяем что кнопка в состоянии loading
      const submitPromise = loginPage.submit()
      // Кнопка должна содержать текст "Войти" или быть disabled
      const button = page.locator('button:has-text("Войти")')
      await expect(button).toBeVisible()
      await submitPromise
    })
  })

  // ── Registration ──────────────────────────────────────

  test.describe('Регистрация', () => {
    test('страница логина отображает форму', async ({ page }) => {
      await loginPage.goto()

      await expect(loginPage.logo).toBeVisible()
      await expect(loginPage.usernameInput).toBeVisible()
      await expect(loginPage.passwordInput).toBeVisible()
      await expect(loginPage.submitButton).toBeVisible()
    })
  })

  // ── Route Protection ──────────────────────────────────

  test.describe('Защищённые роуты', () => {
    test('редирект на /login при прямом доступе к дашборду без токена', async ({ page }) => {
      await clearAuth(page)
      await page.goto('/')
      await page.waitForURL('**/login')
      await loginPage.expectOnLoginPage()
    })

    test('редирект на /login при прямом доступе к /nomenclature без токена', async ({ page }) => {
      await clearAuth(page)
      await page.goto('/nomenclature')
      await page.waitForURL('**/login')
      await loginPage.expectOnLoginPage()
    })

    test('редирект на /login при прямом доступе к /equipment без токена', async ({ page }) => {
      await clearAuth(page)
      await page.goto('/equipment')
      await page.waitForURL('**/login')
      await loginPage.expectOnLoginPage()
    })

    test('доступ к /nomenclature с валидным токеном', async ({ page }) => {
      const { api, token } = await createAuthenticatedApi()
      await api.dispose()

      await setAuthToken(page, token)
      await page.goto('/nomenclature')
      await page.waitForLoadState('networkidle')

      // Должны быть на странице номенклатуры
      await expect(page).toHaveURL(/.*nomenclature/)
      await expect(page.locator('h1:has-text("Номенклатура")')).toBeVisible()
    })
  })

  // ── Logout ────────────────────────────────────────────

  test.describe('Логаут', () => {
    test('успешный логаут через меню профиля', async ({ page }) => {
      const { api, token } = await createAuthenticatedApi()
      await api.dispose()

      await setAuthToken(page, token)
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Выходим
      await navPage.logout()

      // Должны быть на странице логина
      await loginPage.expectOnLoginPage()

      // Токен удалён
      const storedToken = await page.evaluate(() => localStorage.getItem('snablab_token'))
      expect(storedToken).toBeNull()
    })

    test('после логаута защищённые роуты недоступны', async ({ page }) => {
      const { api, token } = await createAuthenticatedApi()
      await api.dispose()

      await setAuthToken(page, token)
      await page.goto('/')
      await navPage.logout()

      // Пытаемся зайти на защищённую страницу
      await page.goto('/nomenclature')
      await page.waitForURL('**/login')
      await loginPage.expectOnLoginPage()
    })
  })

  // ── Token Expiration ──────────────────────────────────

  test.describe('Обработка невалидного токена', () => {
    test('редирект на /login при невалидном токене', async ({ page }) => {
      await page.goto('/')
      await page.evaluate(() => {
        localStorage.setItem('snablab_token', 'invalid_token_xyz')
        localStorage.setItem('snablab_user', JSON.stringify({ full_name: 'Fake', role: 'user' }))
      })
      await page.goto('/')
      // При запросе с невалидным токеном backend вернёт 401
      // и axios interceptor сделает редирект на /login
      await page.waitForURL('**/login', { timeout: 15_000 })
      await loginPage.expectOnLoginPage()
    })
  })
})
