import { test, expect } from '@playwright/test'
import { SuppliersPage } from './pages/SuppliersPage'
import { NavigationPage } from './pages/NavigationPage'
import {
  createAuthenticatedApi,
  setAuthToken,
  uniqueName,
  SAMPLE_SUPPLIER,
} from './helpers'

test.describe('🚛 Поставщики — CRUD', () => {
  let page_: SuppliersPage
  let navPage: NavigationPage

  test.beforeEach(async ({ page }) => {
    page_ = new SuppliersPage(page)
    navPage = new NavigationPage(page)

    const { api, token } = await createAuthenticatedApi()
    await api.dispose()
    await setAuthToken(page, token)
    await page_.goto()
  })

  // ── Read / List ───────────────────────────────────────

  test.describe('Список поставщиков', () => {
    test('страница загружается с заголовком и таблицей', async ({ page }) => {
      await page_.expectHeading('Поставщики')
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

    test('отображается счётчик записей', async ({ page }) => {
      await expect(page_.totalCount).toBeVisible()
    })
  })

  // ── Create ────────────────────────────────────────────

  test.describe('Создание поставщика', () => {
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

    test('создание нового поставщика', async ({ page }) => {
      const data = SAMPLE_SUPPLIER()
      await page_.createItem(data)

      await page_.expectItemInList(data.name)
    })

    test('создание с минимальными данными (только название)', async ({ page }) => {
      const name = uniqueName('МинПоставщик')
      await page_.createItem({ name })

      await page_.expectItemInList(name)
    })

    test('создание с полными данными', async ({ page }) => {
      const data = {
        ...SAMPLE_SUPPLIER(),
        rating: 5,
      }
      await page_.createItem(data)

      await page_.expectItemInList(data.name)
    })

    test('кнопка "Создать" неактивна без названия', async ({ page }) => {
      await page_.openCreateModal()
      const submitBtn = page_.modalSubmitButton
      const disabled = await submitBtn.isDisabled()
      expect(disabled).toBeTruthy()
    })
  })

  // ── Search ────────────────────────────────────────────

  test.describe('Поиск поставщиков', () => {
    test('поиск по названию', async ({ page }) => {
      const data = SAMPLE_SUPPLIER()
      await page_.createItem(data)

      await page_.search(data.name.slice(0, 10))
      await page_.expectItemInList(data.name)
    })

    test('поиск по ИНН', async ({ page }) => {
      const data = SAMPLE_SUPPLIER()
      await page_.createItem(data)

      await page_.search(data.inn!)
      await page_.expectItemInList(data.name)
    })

    test('поиск возвращает пустой результат для несуществующего запроса', async ({ page }) => {
      await page_.search('НЕСУЩЕСТВУЮЩИЙ_ПОСТАВЩИК_XYZ_12345')
      await page_.page.waitForTimeout(500)

      const rowCount = await page_.getRowCount()
      expect(rowCount).toBe(0)
    })

    test('очистка поиска восстанавливает полный список', async ({ page }) => {
      const data = SAMPLE_SUPPLIER()
      await page_.createItem(data)

      await page_.search('НЕСУЩЕСТВУЮЩИЙ_XYZ')
      await page_.page.waitForTimeout(500)

      await page_.clearSearch()
      await page_.expectItemInList(data.name)
    })
  })

  // ── Navigation ────────────────────────────────────────

  test.describe('Навигация на странице', () => {
    test('переход на поставщиков через sidebar', async ({ page }) => {
      await page.goto('/')
      await navPage.navigateToSuppliers()
      await page_.expectHeading('Поставщики')
    })
  })
})
