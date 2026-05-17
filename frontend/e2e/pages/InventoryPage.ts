import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'
import type { InventoryCreate } from '@/types'

/**
 * Page Object для страницы Складского учёта
 */
export class InventoryPage extends BasePage {
  // ── Locators ────────────────────────────────────────────

  get addButton(): Locator {
    return this.page.getByRole('button', { name: /Поступление/ }).first()
  }

  get statusFilter(): Locator {
    return this.page.locator('select').first()
  }

  get lowStockAlert(): Locator {
    return this.page.getByText('Контроль сроков годности')
  }

  // Modal
  get modal(): Locator {
    return this.page.locator('.fixed.inset-0').filter({
      has: this.page.getByRole('heading', { name: 'Поступление на склад' }),
    })
  }

  get modalNomenclatureIdInput(): Locator {
    return this.modal.locator('input[type="number"]').first()
  }

  get modalQuantityInput(): Locator {
    return this.modal.locator('input[type="number"]').nth(1)
  }

  get modalUnitInput(): Locator {
    // 3rd visible input (after 2 number inputs)
    return this.modal.locator('input').nth(2)
  }

  get modalBatchInput(): Locator {
    // 4th visible input
    return this.modal.locator('input').nth(3)
  }

  get modalReceivedDateInput(): Locator {
    return this.modal.locator('input[type="date"]').first()
  }

  get modalExpiryDateInput(): Locator {
    return this.modal.locator('input[type="date"]').nth(1)
  }

  get modalSubmitButton(): Locator {
    return this.modal.getByRole('button', { name: 'Добавить' })
  }

  get modalCancelButton(): Locator {
    return this.modal.getByRole('button', { name: 'Отмена' })
  }

  // ── Actions ────────────────────────────────────────────

  async goto() {
    await this.page.goto('/inventory')
    await this.expectPageReady()
  }

  async openCreateModal() {
    await this.addButton.click()
    await this.modal.waitFor({ state: 'visible', timeout: 10_000 })
  }

  async fillCreateForm(data: Partial<InventoryCreate>) {
    if (data.nomenclature_id !== undefined)
      await this.modalNomenclatureIdInput.fill(String(data.nomenclature_id))
    if (data.quantity !== undefined)
      await this.modalQuantityInput.fill(String(data.quantity))
    if (data.unit !== undefined)
      await this.modalUnitInput.fill(data.unit)
    if (data.batch_number !== undefined)
      await this.modalBatchInput.fill(data.batch_number)
    if (data.received_date !== undefined)
      await this.modalReceivedDateInput.fill(data.received_date)
    if (data.expiry_date !== undefined)
      await this.modalExpiryDateInput.fill(data.expiry_date)
  }

  async submitCreate() {
    await this.modalSubmitButton.click()
    await this.modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {})
    await this.page.waitForLoadState('networkidle')
  }

  async createItem(data: InventoryCreate) {
    await this.openCreateModal()
    await this.fillCreateForm(data)
    await this.submitCreate()
    await this.page.waitForTimeout(1000)
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status)
    await this.page.waitForLoadState('networkidle')
  }

  // ── Assertions ─────────────────────────────────────────

  async expectItemInList(nomenclatureId: number) {
    await expect(
      this.page.locator('td, tr', { hasText: String(nomenclatureId) }).first()
    ).toBeVisible({ timeout: 15_000 })
  }

  async expectLowStockAlertVisible() {
    await expect(this.lowStockAlert).toBeVisible()
  }

  async expectStatusBadge(nomenclatureId: number, status: string) {
    const row = this.page.locator('tr', { hasText: String(nomenclatureId) })
    await expect(row.getByText(status)).toBeVisible()
  }
}
