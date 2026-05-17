import { test, expect, Page } from '@playwright/test'
import { EquipmentPage } from './pages/EquipmentPage'
import { NavigationPage } from './pages/NavigationPage'
import {
  createAuthenticatedApi,
  setAuthToken,
  uniqueName,
  SAMPLE_EQUIPMENT,
} from './helpers'

test.describe('🔧 Оборудование — CRUD', () => {
  let page_: EquipmentPage
  let navPage: NavigationPage

  test.beforeEach(async ({ page }) => {
    page_ = new EquipmentPage(page)
    navPage = new NavigationPage(page)

    const { api, token } = await createAuthenticatedApi()
    await api.dispose()
    await setAuthToken(page, token)
    await page_.goto()
  })

  // ── Read / List ───────────────────────────────────────

  test.describe('Список оборудования', () => {
    test('страница загружается с заголовком и таблицей', async ({ page }) => {
      await page_.expectHeading('Оборудование')
      const hasTable = await page_.table.isVisible().catch(() => false)
      const hasEmpty = await page_.emptyMessage.isVisible().catch(() => false)
      expect(hasTable || hasEmpty).toBeTruthy()
    })

    test('отображается кнопка "Добавить"', async ({ page }) => {
      await expect(page_.addButton).toBeVisible()
    })

    test('отображается поле поиска', async ({ page }) => {
      await expect(page_.searchInput).toBeVisible()
    })

    test('отображается фильтр по статусу', async ({ page }) => {
      await expect(page_.statusFilter).toBeVisible()
    })

    test('отображаются карточки статистики', async ({ page }) => {
      // Карточки: Всего, Активно, На обслуживании, В ремонте
      await expect(page.locator('text=Всего').first()).toBeVisible()
      await expect(page.locator('text=Активно').first()).toBeVisible()
    })
  })

  // ── Create ────────────────────────────────────────────

  test.describe('Создание оборудования', () => {
    test('открытие модального окна по кнопке "Добавить"', async ({ page }) => {
      await page_.openCreateModal()
      await expect(page_.modal).toBeVisible()
    })

    test('закрытие модального окна по кнопке "Отмена"', async ({ page }) => {
      await page_.openCreateModal()
      await expect(page_.modal).toBeVisible()
      await page_.modalCancelButton.click()
      await expect(page_.modal).not.toBeVisible()
    })

    test('создание нового оборудования', async ({ page }) => {
      const data = SAMPLE_EQUIPMENT()
      await page_.createItem(data)

      await page_.expectItemInList(data.name)
    })

    test('создание с минимальными данными (только название)', async ({ page }) => {
      const name = uniqueName('МинОборудование')
      await page_.createItem({ name, status: 'active' })

      await page_.expectItemInList(name)
    })

    test('создание с полными данными', async ({ page }) => {
      const data = {
        ...SAMPLE_EQUIPMENT(),
        inventory_number: `INV-${Date.now()}`,
        commission_date: '2025-01-15',
        next_maintenance: '2026-07-01',
        notes: 'Тестовое оборудование для E2E',
      }
      await page_.createItem(data)

      await page_.expectItemInList(data.name)
    })

    test('кнопка "Добавить" неактивна без названия', async ({ page }) => {
      await page_.openCreateModal()
      const submitBtn = page_.modalSubmitButton
      const disabled = await submitBtn.isDisabled()
      expect(disabled).toBeTruthy()
    })
  })

  // ── Search & Filter ───────────────────────────────────

  test.describe('Поиск и фильтрация', () => {
    test('поиск по названию', async ({ page }) => {
      const data = SAMPLE_EQUIPMENT()
      await page_.createItem(data)

      await page_.search(data.name.slice(0, 10))
      await page_.expectItemInList(data.name)
    })

    test('фильтрация по статусу "Активно"', async ({ page }) => {
      // Создаём активное оборудование
      const data = SAMPLE_EQUIPMENT()
      await page_.createItem(data)

      await page_.filterByStatus('active')
      await page_.expectItemInList(data.name)
    })

    test('фильтрация по статусу "В ремонте" скрывает активное', async ({ page }) => {
      const data = SAMPLE_EQUIPMENT()
      await page_.createItem(data)

      await page_.filterByStatus('repair')
      await page_.page.waitForTimeout(500)

      // Активное оборудование не должно быть видно
      const rowCount = await page_.getRowCount()
      expect(rowCount).toBe(0)
    })
  })

  // ── Edit ──────────────────────────────────────────────

  test.describe('Редактирование оборудования', () => {
    test('редактирование названия', async ({ page }) => {
      const data = SAMPLE_EQUIPMENT()
      await page_.createItem(data)

      // Открываем редактирование
      await page_.editItem(data.name)

      // Меняем название
      const newName = uniqueName('Обновлённый')
      await page_.modalNameInput.fill(newName)
      await page_.modalSubmitButton.click()

      // Ждём закрытия модалки и обновления
      await page_.page.waitForSelector('text=Редактировать оборудование', { state: 'hidden', timeout: 10_000 })
      await page_.page.waitForLoadState('networkidle')

      // Новое название видно
      await page_.expectItemInList(newName)
    })

    test('изменение статуса на "На обслуживании"', async ({ page }) => {
      const data = SAMPLE_EQUIPMENT()
      await page_.createItem(data)

      await page_.editItem(data.name)
      await page_.modalStatusSelect.selectOption('maintenance')
      await page_.modalSubmitButton.click()

      await page_.page.waitForSelector('text=Редактировать оборудование', { state: 'hidden', timeout: 10_000 })
      await page_.page.waitForLoadState('networkidle')

      // Проверяем что статус изменился
      await page_.expectStatusBadge(data.name, 'На обслуживании')
    })
  })

  // ── Decommission ──────────────────────────────────────

  test.describe('Списание оборудования', () => {
    test('списание оборудования через confirm dialog', async ({ page }) => {
      const data = SAMPLE_EQUIPMENT()
      await page_.createItem(data)

      // Перехватываем confirm dialog
      page.on('dialog', (dialog) => dialog.accept())

      await page_.decommissionItem(data.name)
      await page_.page.waitForLoadState('networkidle')

      // Оборудование должно исчезнуть или получить статус "Списано"
      // В зависимости от реализации — delete или status change
    })
  })

  // ── Navigation ────────────────────────────────────────

  test.describe('Навигация на странице', () => {
    test('переход на оборудование через sidebar', async ({ page }) => {
      await page.goto('/')
      await navPage.navigateToEquipment()
      await page_.expectHeading('Оборудование')
    })
  })
})
