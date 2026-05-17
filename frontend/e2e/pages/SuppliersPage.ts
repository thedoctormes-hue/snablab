import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'
import type { SupplierCreate } from '@/types'

/**
 * Page Object для страницы Поставщиков
 */
export class SuppliersPage extends BasePage {
  // ── Locators ────────────────────────────────────────────

  get addButton(): Locator {
    return this.page.getByRole('button', { name: /Добавить/ }).first()
  }

  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="Поиск"]')
  }

  // Modal
  get modal(): Locator {
    return this.page.locator('.fixed.inset-0').filter({
      has: this.page.getByRole('heading', { name: 'Добавить поставщика' }),
    })
  }

  get modalNameInput(): Locator {
    return this.modal.locator('input').first()
  }

  get modalInnInput(): Locator {
    return this.modal.locator('input').nth(1)
  }

  get modalKppInput(): Locator {
    return this.modal.locator('input').nth(2)
  }

  get modalAddressInput(): Locator {
    return this.modal.locator('input').nth(3)
  }

  get modalBankInput(): Locator {
    return this.modal.locator('input').nth(4)
  }

  get modalManagerInput(): Locator {
    return this.modal.locator('input').nth(5)
  }

  get modalPhoneInput(): Locator {
    return this.modal.locator('input').nth(6)
  }

  get modalEmailInput(): Locator {
    return this.modal.locator('input[type="email"]').first()
  }

  get modalSubmitButton(): Locator {
    return this.modal.getByRole('button', { name: 'Создать' })
  }

  get modalCancelButton(): Locator {
    return this.modal.getByRole('button', { name: 'Отмена' })
  }

  // ── Actions ────────────────────────────────────────────

  async goto() {
    await this.page.goto('/suppliers')
    await this.expectPageReady()
  }

  async openCreateModal() {
    await this.addButton.click()
    await this.modal.waitFor({ state: 'visible', timeout: 10_000 })
  }

  async fillCreateForm(data: Partial<SupplierCreate>) {
    if (data.name !== undefined) await this.modalNameInput.fill(data.name)
    if (data.inn !== undefined) await this.modalInnInput.fill(data.inn)
    if (data.kpp !== undefined) await this.modalKppInput.fill(data.kpp)
    if (data.address !== undefined) await this.modalAddressInput.fill(data.address)
    if (data.bank_details !== undefined) await this.modalBankInput.fill(data.bank_details)
    if (data.manager_name !== undefined) await this.modalManagerInput.fill(data.manager_name)
    if (data.contact_phone !== undefined) await this.modalPhoneInput.fill(data.contact_phone)
    if (data.contact_email !== undefined) await this.modalEmailInput.fill(data.contact_email)
  }

  async submitCreate() {
    await this.modalSubmitButton.click()
    await this.modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {})
    await this.page.waitForLoadState('networkidle')
  }

  async createItem(data: SupplierCreate) {
    await this.openCreateModal()
    await this.fillCreateForm(data)
    await this.submitCreate()
    await this.page.waitForTimeout(1000)
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500)
    await this.page.waitForLoadState('networkidle')
  }

  async clearSearch() {
    await this.searchInput.fill('')
    await this.page.waitForTimeout(500)
    await this.page.waitForLoadState('networkidle')
  }

  // ── Assertions ─────────────────────────────────────────

  async expectItemInList(name: string) {
    await expect(this.page.locator('td, tr', { hasText: name }).first()).toBeVisible({ timeout: 15_000 })
  }

  async expectItemNotInList(name: string) {
    const item = this.page.locator('td, tr', { hasText: name }).first()
    const visible = await item.isVisible().catch(() => false)
    expect(visible).toBeFalsy()
  }
}
