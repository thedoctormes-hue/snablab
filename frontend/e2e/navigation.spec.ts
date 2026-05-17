import { test, expect } from '@playwright/test'
import { NavigationPage } from './pages/NavigationPage'
import { createAuthenticatedApi, setAuthToken } from './helpers'

test.describe('🧭 Навигация и роутинг', () => {
  let navPage: NavigationPage

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page)

    const { api, token } = await createAuthenticatedApi()
    await api.dispose()
    await setAuthToken(page, token)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  // ── Sidebar ───────────────────────────────────────────

  test.describe('Сайдбар', () => {
    test('сайдбар виден на десктопе', async ({ page }) => {
      await navPage.expectSidebarVisible()
    })

    test('логотип "СнабЛаб" отображается в сайдбаре', async ({ page }) => {
      // sidebarOpen по умолчанию true, поэтому логотип должен быть виден сразу
      await expect(navPage.sidebar).toBeVisible()
      await expect(navPage.logo).toBeVisible({ timeout: 10_000 })
    })

    test('все пункты навигации присутствуют', async ({ page }) => {
      await expect(navPage.navDashboard).toBeVisible()
      await expect(navPage.navNomenclature).toBeVisible()
      await expect(navPage.navSuppliers).toBeVisible()
      await expect(navPage.navOffers).toBeVisible()
      await expect(navPage.navInventory).toBeVisible()
      await expect(navPage.navPurchases).toBeVisible()
      await expect(navPage.navEquipment).toBeVisible()
      await expect(navPage.navSettings).toBeVisible()
    })

    test('переключение сайдбара кнопкой в хедере', async ({ page }) => {
      // Запоминаем начальное состояние
      const initialClasses = await navPage.sidebar.getAttribute('class')

      // Кликаем кнопку меню
      await navPage.toggleSidebar()
      await page.waitForTimeout(300)

      // Состояние должно измениться
      const newClasses = await navPage.sidebar.getAttribute('class')
      expect(newClasses).not.toBe(initialClasses)
    })
  })

  // ── Header ────────────────────────────────────────────

  test.describe('Хедер', () => {
    test('хедер виден', async ({ page }) => {
      await navPage.expectHeaderVisible()
    })

    test('кнопка меню в хедере присутствует', async ({ page }) => {
      await expect(navPage.menuButton).toBeVisible()
    })

    test('колокольчик уведомлений присутствует', async ({ page }) => {
      await expect(navPage.notificationBell).toBeVisible()
    })

    test('профиль пользователя отображается в хедере', async ({ page }) => {
      await expect(navPage.userNameDisplay).toBeVisible()
    })
  })

  // ── Page Navigation ───────────────────────────────────

  test.describe('Навигация между страницами', () => {
    test('переход на Дашборд', async ({ page }) => {
      await navPage.navigateToDashboard()
      await navPage.expectOnPage('/')
      await expect(page.locator('h1:has-text("Дашборд")')).toBeVisible()
    })

    test('переход на Номенклатуру', async ({ page }) => {
      await navPage.navigateToNomenclature()
      await navPage.expectOnPage('/nomenclature')
      await expect(page.locator('h1:has-text("Номенклатура")')).toBeVisible()
    })

    test('переход на Поставщиков', async ({ page }) => {
      await navPage.navigateToSuppliers()
      await navPage.expectOnPage('/suppliers')
      await expect(page.locator('h1:has-text("Поставщики")')).toBeVisible()
    })

    test('переход на Коммерческие предложения', async ({ page }) => {
      await navPage.navigateToOffers()
      await navPage.expectOnPage('/offers')
    })

    test('переход на Склад', async ({ page }) => {
      await navPage.navigateToInventory()
      await navPage.expectOnPage('/inventory')
      await expect(page.locator('h1:has-text("Складской")')).toBeVisible()
    })

    test('переход на Закупки', async ({ page }) => {
      await navPage.navigateToPurchases()
      await navPage.expectOnPage('/purchases')
    })

    test('переход на Оборудование', async ({ page }) => {
      await navPage.navigateToEquipment()
      await navPage.expectOnPage('/equipment')
      await expect(page.locator('h1:has-text("Оборудование")')).toBeVisible()
    })

    test('переход на Настройки', async ({ page }) => {
      await navPage.navigateToSettings()
      await navPage.expectOnPage('/settings')
    })
  })

  // ── Active State ──────────────────────────────────────

  test.describe('Активный пункт навигации', () => {
    test('Дашборд активен при загрузке', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await navPage.expectNavItemActive('Дашборд')
    })

    test('Номенклатура активна при переходе', async ({ page }) => {
      await navPage.navigateToNomenclature()
      await navPage.expectNavItemActive('Номенклатура')
    })

    test('Поставщики активны при переходе', async ({ page }) => {
      await navPage.navigateToSuppliers()
      await navPage.expectNavItemActive('Поставщики')
    })

    test('Оборудование активно при переходе', async ({ page }) => {
      await navPage.navigateToEquipment()
      await navPage.expectNavItemActive('Оборудование')
    })
  })

  // ── Direct URL Navigation ─────────────────────────────

  test.describe('Прямая навигация по URL', () => {
    test('прямой переход на /nomenclature', async ({ page }) => {
      await page.goto('/nomenclature')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h1:has-text("Номенклатура")')).toBeVisible()
    })

    test('прямой переход на /equipment', async ({ page }) => {
      await page.goto('/equipment')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h1:has-text("Оборудование")')).toBeVisible()
    })

    test('прямой переход на /inventory', async ({ page }) => {
      await page.goto('/inventory')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h1:has-text("Складской")')).toBeVisible()
    })
  })

  // ── Logout from Header ────────────────────────────────

  test.describe('Логаут из хедера', () => {
    test('меню профиля открывается по клику', async ({ page }) => {
      await navPage.openProfileMenu()
      await expect(navPage.logoutButton).toBeVisible()
    })

    test('логаут перенаправляет на /login', async ({ page }) => {
      await navPage.logout()
      await expect(page).toHaveURL(/.*login/)
    })
  })

  // ── Mobile Sidebar ────────────────────────────────────

  test.describe('Мобильный сайдбар', () => {
    test('оверлей закрывает сайдбар на мобильном', async ({ page }) => {
      // Эмулируем мобильный viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // На мобильном sidebar открыт по умолчанию (sidebarOpen: true).
      // Сначала закрываем его через toggle, чтобы потом открыть и получить overlay.
      await navPage.toggleSidebar()
      await page.waitForTimeout(500)

      // Теперь открываем sidebar — появится overlay
      await navPage.toggleSidebar()
      await page.waitForTimeout(500)

      // Ждём появления overlay (bg-black/50)
      const overlay = page.locator('.fixed.inset-0.z-30.bg-black\\/50')
      await overlay.waitFor({ state: 'visible', timeout: 5_000 })

      // Кликаем на оверлей (force: sidebar z-40 перехватывает клики над overlay z-30)
      await overlay.click({ force: true })

      // Ждём закрытия sidebar (overlay исчез)
      await overlay.waitFor({ state: 'hidden', timeout: 5_000 })

      // Восстанавливаем viewport
      await page.setViewportSize({ width: 1280, height: 720 })
    })
  })
})
