import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'
import type { NomenclatureCreate } from '@/types'

/**
 * Page Object для страницы Номенклатуры
 */
export class NomenclaturePage extends BasePage {
  // ── Locators ────────────────────────────────────────────

  get addButton(): Locator {
    return this.page.getByRole('button', { name: /Добавить/ }).first()
  }

  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="Поиск"]')
  }

  // Modal — the inner content div (not the backdrop)
  get modal(): Locator {
    return this.page.locator('.fixed.inset-0').filter({
      has: this.page.getByRole('heading', { name: 'Добавить номенклатуру' }),
    })
  }

  // Use nth() for inputs since they share similar structure
  get modalNameInput(): Locator {
    return this.modal.locator('input').first()
  }

  get modalCatalogInput(): Locator {
    return this.modal.locator('input').nth(1)
  }

  get modalManufacturerInput(): Locator {
    return this.modal.locator('input').nth(2)
  }

  get modalUnitInput(): Locator {
    return this.modal.locator('input').nth(3)
  }

  get modalShelfLifeInput(): Locator {
    return this.modal.locator('input[type="number"]').first()
  }

  get modalStorageInput(): Locator {
    // Last text input in the modal
    return this.modal.locator('input').last()
  }

  get modalSubmitButton(): Locator {
    return this.modal.getByRole('button', { name: 'Создать' })
  }

  get modalCancelButton(): Locator {
    return this.modal.getByRole('button', { name: 'Отмена' })
  }

  // Delete confirmation
  get confirmDeleteButton(): Locator {
    return this.page.getByRole('button', { name: 'Удалить' }).last()
  }

  // ── Actions ────────────────────────────────────────────

  async goto() {
    await this.page.goto('/nomenclature')
    await this.expectPageReady()
  }

  async openCreateModal() {
    await this.addButton.click()
    await this.modal.waitFor({ state: 'visible', timeout: 10_000 })
  }

  async fillCreateForm(data: Partial<NomenclatureCreate>) {
    if (data.name !== undefined) {
      await this.modalNameInput.fill(data.name)
    }
    if (data.catalog_number !== undefined) {
      await this.modalCatalogInput.fill(data.catalog_number)
    }
    if (data.manufacturer !== undefined) {
      await this.modalManufacturerInput.fill(data.manufacturer)
    }
    if (data.unit !== undefined) {
      await this.modalUnitInput.fill(data.unit)
    }
    if (data.shelf_life_months !== undefined) {
      await this.modalShelfLifeInput.fill(String(data.shelf_life_months))
    }
    if (data.storage_conditions !== undefined) {
      await this.modalStorageInput.fill(data.storage_conditions)
    }
  }

  async submitCreate() {
    await this.modalSubmitButton.click()
    // Wait for modal to close
    await this.modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {})
    // Wait for API call to complete
    await this.page.waitForLoadState('networkidle')
  }

  async createItem(data: NomenclatureCreate) {
    await this.openCreateModal()
    await this.fillCreateForm(data)
    await this.submitCreate()
    // Extra wait for table to update
    await this.page.waitForTimeout(1000)
  }

  async search(query: string) {
    // React controlled input — fill не вызывает onChange, используем pressSequentially
    await this.searchInput.click()
    await this.searchInput.pressSequentially(query, { delay: 30 })
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(1000)
  }

  async clearSearch() {
    await this.searchInput.fill('')
    await this.page.waitForTimeout(500)
    await this.page.waitForLoadState('networkidle')
  }

  async deleteItemByName(name: string) {
    // Кликаем на кнопку удаления через evaluate (обходим проблему с pointer events)
    const clicked = await this.page.evaluate((itemName) => {
      const rows = document.querySelectorAll('tbody tr')
      for (const r of rows) {
        if (r.textContent?.includes(itemName)) {
          // Кнопка удаления — последняя button в строке с svg (Trash2 icon)
          const btns = r.querySelectorAll('button')
          const deleteBtn = btns[btns.length - 1]
          if (deleteBtn) {
            deleteBtn.click()
            return true
          }
        }
      }
      return false
    }, name)

    if (!clicked) {
      throw new Error(`Delete button not found for "${name}"`)
    }

    await this.page.waitForTimeout(500)

    // Ждём модалки подтверждения
    await this.page.getByText('Удалить номенклатуру?').waitFor({ state: 'visible', timeout: 5_000 })

    // Кнопка "Удалить" в модалке — кликаем через evaluate
    const confirmed = await this.page.evaluate(() => {
      const btns = document.querySelectorAll('button')
      for (const b of btns) {
        if (b.textContent?.trim() === 'Удалить' && b.closest('.fixed.inset-0')) {
          b.click()
          return true
        }
      }
      return false
    })

    if (!confirmed) {
      throw new Error('Confirm delete button not found in modal')
    }

    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(1000)
  }

  // ── Assertions ─────────────────────────────────────────

  async expectItemInList(name: string) {
    await expect(this.page.locator('td, tr', { hasText: name }).first()).toBeVisible({ timeout: 15_000 })
  }

  async expectItemNotInList(name: string) {
    // Ждём пока элемент исчезнет из DOM или станет невидимым
    await this.page.waitForTimeout(1000)
    const items = this.page.locator('td, tr', { hasText: name })
    const count = await items.count()
    if (count === 0) return // элемента нет в DOM — OK
    const visible = await items.first().isVisible().catch(() => false)
    expect(visible).toBeFalsy()
  }

  async expectTotalCount(expected: number) {
    const text = await this.totalCount.textContent()
    expect(text).toContain(String(expected))
  }
}
