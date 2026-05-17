import { test, expect } from '@playwright/test'
import { NomenclaturePage } from './pages/NomenclaturePage'
import { NavigationPage } from './pages/NavigationPage'
import {
  createAuthenticatedApi,
  setAuthToken,
  uniqueName,
  SAMPLE_NOMENCLATURE,
  TEST_USER,
} from './helpers'

test.describe('📦 Номенклатура — CRUD', () => {
  let page_: NomenclaturePage
  let navPage: NavigationPage

  // Подготовка: логинимся и переходим на страницу
  test.beforeEach(async ({ page }) => {
    page_ = new NomenclaturePage(page)
    navPage = new NavigationPage(page)

    const { api, token } = await createAuthenticatedApi()
    await api.dispose()
    await setAuthToken(page, token)
    await page_.goto()
  })

  // ── Read / List ───────────────────────────────────────

  test.describe('Список номенклатуры', () => {
    test('страница загружается с заголовком и таблицей', async ({ page }) => {
      await page_.expectHeading('Номенклатура')
      // Таблица или сообщение о пустом списке
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

  test.describe('Создание номенклатуры', () => {
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

    test('создание новой позиции номенклатуры', async ({ page }) => {
      const data = SAMPLE_NOMENCLATURE()
      await page_.createItem(data)

      // Позиция появляется в списке
      await page_.expectItemInList(data.name)
    })

    test('создание с минимальными данными (только название)', async ({ page }) => {
      const name = uniqueName('МинРеактив')
      await page_.createItem({ name })

      await page_.expectItemInList(name)
    })

    test('создание с полными данными', async ({ page }) => {
      const data = {
        ...SAMPLE_NOMENCLATURE(),
        okpd2_code: '20.59.11',
        ktru_code: '3841611000001',
        nkmi_code: 'НКМИ-001',
      }
      await page_.createItem(data)

      await page_.expectItemInList(data.name)
    })

    test('кнопка "Создать" неактивна без названия', async ({ page }) => {
      await page_.openCreateModal()
      // Кнопка создания должна быть disabled при пустом названии
      const submitBtn = page_.modalSubmitButton
      const disabled = await submitBtn.isDisabled()
      expect(disabled).toBeTruthy()
    })
  })

  // ── Search ────────────────────────────────────────────

  test.describe('Поиск номенклатуры', () => {
    test('поиск по названию', async ({ page }) => {
      // Создаём уникальную позицию
      const data = SAMPLE_NOMENCLATURE()
      await page_.createItem(data)

      // Ищем по части названия
      await page_.search(data.name.slice(0, 10))
      await page_.expectItemInList(data.name)
    })

    test('поиск возвращает пустой результат для несуществующего запроса', async ({ page }) => {
      await page_.search('НЕСУЩЕСТВУЮЩИЙ_ТОВАР_XYZ_12345')
      await page_.page.waitForTimeout(500)

      const rowCount = await page_.getRowCount()
      expect(rowCount).toBe(0)
    })

    test('очистка поиска восстанавливает полный список', async ({ page }) => {
      // Создаём позицию
      const data = SAMPLE_NOMENCLATURE()
      await page_.createItem(data)

      // Ищем что-то несуществующее
      await page_.search('НЕСУЩЕСТВУЮЩИЙ_XYZ')
      await page_.page.waitForTimeout(500)

      // Очищаем поиск
      await page_.clearSearch()

      // Позиция снова видна
      await page_.expectItemInList(data.name)
    })
  })

  // ── Delete ────────────────────────────────────────────

  test.describe('Удаление номенклатуры', () => {
    test('удаление позиции с подтверждением', async ({ page }) => {
      const data = SAMPLE_NOMENCLATURE()
      await page_.createItem(data)
      await page_.expectItemInList(data.name)

      // Удаляем
      await page_.deleteItemByName(data.name)

      // Позиция исчезла из списка
      await page_.page.waitForTimeout(500)
      await page_.expectItemNotInList(data.name)
    })
  })

  // ── Navigation ────────────────────────────────────────

  test.describe('Навигация на странице', () => {
    test('переход на номенклатуру через sidebar', async ({ page }) => {
      await page.goto('/')
      await navPage.navigateToNomenclature()
      await page_.expectHeading('Номенклатура')
    })
  })
})
