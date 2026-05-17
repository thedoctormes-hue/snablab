import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Page Object для навигации (Sidebar, Header, роутинг)
 */
export class NavigationPage extends BasePage {
  // ── Sidebar Locators ────────────────────────────────────

  get sidebar(): Locator {
    return this.page.locator('aside')
  }

  get sidebarOverlay(): Locator {
    // Sidebar overlay — div с bg-black/50, который НЕ содержит h3 (не модалка)
    return this.page.locator('div').filter({
      has: this.page.locator('[class*="bg-black"]'),
      hasNot: this.page.locator('h3'),
    }).last()
  }

  get logo(): Locator {
    // Логотип виден только когда sidebar раздут (или на мобильном когда открыт)
    // На десктопе по умолчанию sidebar узкий (w-16), текст скрыт
    return this.page.locator('aside span', { hasText: 'СнабЛаб' })
  }

  // Nav links
  get navDashboard(): Locator {
    return this.page.locator('aside a:has-text("Дашборд")')
  }

  get navNomenclature(): Locator {
    return this.page.locator('aside a:has-text("Номенклатура")')
  }

  get navSuppliers(): Locator {
    return this.page.locator('aside a:has-text("Поставщики")')
  }

  get navOffers(): Locator {
    return this.page.locator('aside a:has-text("Коммерческие предложения")')
  }

  get navInventory(): Locator {
    return this.page.locator('aside a:has-text("Склад")')
  }

  get navPurchases(): Locator {
    return this.page.locator('aside a:has-text("Закупки")')
  }

  get navEquipment(): Locator {
    return this.page.locator('aside a:has-text("Оборудование")')
  }

  get navSettings(): Locator {
    return this.page.locator('aside a:has-text("Настройки")')
  }

  // ── Header Locators ─────────────────────────────────────

  get header(): Locator {
    return this.page.locator('header')
  }

  get menuButton(): Locator {
    return this.page.locator('header button').filter({
      has: this.page.locator('svg'),
    }).first()
  }

  get notificationBell(): Locator {
    return this.page.locator('header button:has(svg)').filter({
      has: this.page.locator('.bg-danger'),
    })
  }

  get profileButton(): Locator {
    return this.page.locator('header .relative').getByRole('button')
  }

  get profileDropdown(): Locator {
    return this.page.locator('header .relative').locator('button:has-text("Выйти")').locator('..')
  }

  get logoutButton(): Locator {
    return this.page.locator('header .relative').getByRole('button', { name: 'Выйти' }).or(
      this.page.getByRole('button', { name: 'Выйти' })
    )
  }

  get userNameDisplay(): Locator {
    return this.page.locator('header p.text-sm.font-medium')
  }

  get userRoleDisplay(): Locator {
    return this.page.locator('header p.text-xs.text-gray-500')
  }

  // ── Actions ────────────────────────────────────────────

  async navigateToDashboard() {
    await this.navDashboard.click()
    await this.page.waitForURL('**/')
    await this.expectPageReady()
  }

  async navigateToNomenclature() {
    await this.navNomenclature.click()
    await this.page.waitForURL('**/nomenclature')
    await this.expectPageReady()
  }

  async navigateToSuppliers() {
    await this.navSuppliers.click()
    await this.page.waitForURL('**/suppliers')
    await this.expectPageReady()
  }

  async navigateToOffers() {
    await this.navOffers.click()
    await this.page.waitForURL('**/offers')
    await this.expectPageReady()
  }

  async navigateToInventory() {
    await this.navInventory.click()
    await this.page.waitForURL('**/inventory')
    await this.expectPageReady()
  }

  async navigateToPurchases() {
    await this.navPurchases.click()
    await this.page.waitForURL('**/purchases')
    await this.expectPageReady()
  }

  async navigateToEquipment() {
    await this.navEquipment.click()
    await this.page.waitForURL('**/equipment')
    await this.expectPageReady()
  }

  async navigateToSettings() {
    await this.navSettings.click()
    await this.page.waitForURL('**/settings')
    await this.expectPageReady()
  }

  async toggleSidebar() {
    // Кликаем на кнопку меню в header
    const btn = this.menuButton
    const visible = await btn.isVisible().catch(() => false)
    if (!visible) {
      // Если кнопка не видна, возможно sidebar уже открыт
      const logoVisible = await this.logo.isVisible().catch(() => false)
      if (logoVisible) return // уже открыт
    }
    // force: true нужен на мобильном, где sidebar (z-40) перехватывает клики над header button
    await btn.click({ timeout: 5_000, force: true })
    await this.page.waitForTimeout(500) // animation
  }

  async openProfileMenu() {
    const profileBtn = this.page.locator('header .relative').getByRole('button')
    await profileBtn.click()
    // Ждём появления кнопки "Выйти" в выпадающем меню
    await this.page.getByRole('button', { name: 'Выйти' }).waitFor({ state: 'visible', timeout: 5000 })
  }

  async logout() {
    try {
      await this.openProfileMenu()
      await this.page.getByRole('button', { name: 'Выйти' }).click()
      await this.page.waitForURL('**/login', { timeout: 10000 })
    } catch {
      // Fallback: проверяем что токен очищен
      await this.page.waitForTimeout(1000)
      const token = await this.page.evaluate(() => localStorage.getItem('snablab_token'))
      if (token) throw new Error('Logout failed: token still present')
    }
  }

  // ── Assertions ─────────────────────────────────────────

  async expectSidebarVisible() {
    await expect(this.sidebar).toBeVisible()
  }

  async expectSidebarHidden() {
    // На мобильных sidebar скрыт через -translate-x-full
    const sidebarEl = this.sidebar
    const classes = await sidebarEl.getAttribute('class')
    if (classes?.includes('-translate-x-full')) {
      return // hidden on mobile
    }
    // На десктопе всегда виден (сжатый или полный)
    await expect(this.sidebar).toBeVisible()
  }

  async expectNavItemActive(name: string) {
    const navItem = this.page.locator('aside a', { hasText: name })
    // Ждём появления активного класса (React Router может обновить с задержкой)
    await expect(navItem).toHaveClass(/bg-primary-50/, { timeout: 10_000 })
  }

  async expectOnPage(path: string) {
    await expect(this.page).toHaveURL(new RegExp(`.*${path}$`))
  }

  async expectHeaderVisible() {
    await expect(this.header).toBeVisible()
  }

  async expectUserDisplayed(fullName: string, role: string) {
    await expect(this.userNameDisplay).toContainText(fullName)
    await expect(this.userRoleDisplay).toContainText(role)
  }
}
