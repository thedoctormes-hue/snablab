import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'
import type { EquipmentCreate } from '@/types'

/**
 * Page Object для страницы Оборудования
 */
export class EquipmentPage extends BasePage {
  // ── Locators ────────────────────────────────────────────

  get addButton(): Locator {
    return this.page.locator('button:has-text("Добавить")').first()
  }

  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="Поиск"]')
  }

  get statusFilter(): Locator {
    // select для фильтрации по статусу — находится в Card, НЕ в модалке
    return this.page.locator('main select, [class*="card"] select').first()
  }

  // Stats cards
  get totalCard(): Locator {
    return this.page.locator('text=Всего').locator('..').locator('p.text-2xl')
  }

  get activeCard(): Locator {
    return this.page.locator('text=Активно').locator('..').locator('p.text-2xl')
  }

  // Modal
  get modal(): Locator {
    return this.page.locator('.fixed.inset-0').filter({
      has: this.page.locator('text=Добавить оборудование').or(this.page.locator('text=Редактировать оборудование')),
    })
  }

  get modalNameInput(): Locator {
    return this.page.getByLabel('Название *')
  }

  get modalTypeInput(): Locator {
    return this.page.getByLabel('Тип оборудования')
  }

  get modalManufacturerInput(): Locator {
    return this.page.getByLabel('Производитель')
  }

  get modalModelInput(): Locator {
    return this.page.getByLabel('Модель')
  }

  get modalSerialInput(): Locator {
    return this.page.getByLabel('Серийный номер')
  }

  get modalDepartmentInput(): Locator {
    return this.page.getByLabel('Подразделение')
  }

  get modalLocationInput(): Locator {
    return this.page.getByLabel('Местоположение')
  }

  get modalStatusSelect(): Locator {
    // Label "Статус" не имеет htmlFor, ищем select после label с текстом "Статус"
    return this.page.locator('label:has-text("Статус") + select, label:has-text("Статус") ~ select').first().or(this.page.locator('select').last())
  }

  get modalNotesTextarea(): Locator {
    return this.page.locator('textarea')
  }

  get modalSubmitButton(): Locator {
    return this.modal.locator('button').filter({ hasText: /Добавить|Сохранить/ })
  }

  get modalCancelButton(): Locator {
    return this.modal.locator('button').filter({ hasText: 'Отмена' })
  }

  // ── Actions ────────────────────────────────────────────

  async goto() {
    await this.page.goto('/equipment')
    await this.expectPageReady()
  }

  async openCreateModal() {
    await this.addButton.click()
    await this.page.waitForSelector('h3:has-text("Добавить оборудование")', { state: 'visible', timeout: 5000 })
  }

  async fillCreateForm(data: Partial<EquipmentCreate>) {
    if (data.name !== undefined) await this.modalNameInput.fill(data.name)
    if (data.equipment_type !== undefined) await this.modalTypeInput.fill(data.equipment_type)
    if (data.manufacturer !== undefined) await this.modalManufacturerInput.fill(data.manufacturer)
    if (data.model !== undefined) await this.modalModelInput.fill(data.model)
    if (data.serial_number !== undefined) await this.modalSerialInput.fill(data.serial_number)
    if (data.department !== undefined) await this.modalDepartmentInput.fill(data.department)
    if (data.location !== undefined) await this.modalLocationInput.fill(data.location)
    if (data.status !== undefined) await this.modalStatusSelect.selectOption(data.status)
    if (data.notes !== undefined) await this.modalNotesTextarea.fill(data.notes)
  }

  async submitCreate() {
    await this.modalSubmitButton.click()
    // Ждём закрытия модалки
    await this.page.waitForSelector('.fixed.inset-0', { state: 'hidden', timeout: 10_000 }).catch(() => {})
  }

  async createItem(data: EquipmentCreate) {
    await this.openCreateModal()
    await this.fillCreateForm(data)
    await this.submitCreate()
    await this.page.waitForLoadState('networkidle')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500)
    await this.page.waitForLoadState('networkidle')
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status)
    await this.page.waitForLoadState('networkidle')
  }

  async editItem(name: string) {
    const row = this.page.locator('tr', { hasText: name })
    const editBtn = row.getByText('Изменить')
    await editBtn.click()
    await this.page.waitForSelector('text=Редактировать оборудование', { state: 'visible' })
  }

  async decommissionItem(name: string) {
    const row = this.page.locator('tr', { hasText: name })
    const deleteBtn = row.getByText('Списать')
    await deleteBtn.click()
    // Подтверждаем через нативный confirm dialog
    await this.page.waitForLoadState('networkidle')
  }

  // ── Assertions ─────────────────────────────────────────

  async expectItemInList(name: string) {
    await expect(this.page.locator('td, tr', { hasText: name }).first()).toBeVisible()
  }

  async expectItemNotInList(name: string) {
    const item = this.page.locator('td, tr', { hasText: name }).first()
    const visible = await item.isVisible().catch(() => false)
    expect(visible).toBeFalsy()
  }

  async expectStatusBadge(name: string, status: string) {
    const row = this.page.locator('tr', { hasText: name })
    await expect(row.locator('text=' + status)).toBeVisible()
  }
}
