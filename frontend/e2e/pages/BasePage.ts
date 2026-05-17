import { Page, Locator, expect } from '@playwright/test'

/**
 * Базовый Page Object — общие методы для всех страниц
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  // ── Navigation ─────────────────────────────────────────

  async goto(path: string) {
    await this.page.goto(path)
    await this.page.waitForLoadState('networkidle')
  }

  async reload() {
    await this.page.reload()
    await this.page.waitForLoadState('networkidle')
  }

  // ── Common elements ────────────────────────────────────

  /** Заголовок страницы (h1) — исключаем h1 из header */
  get heading(): Locator {
    // Сначала пробуем найти h1 вне header
    const mainH1 = this.page.locator('h1').filter({ hasNotText: /Управление закупками|СнабЛаб/ }).first()
    return mainH1
  }

  /** Кнопка в хедере для открытия сайдбара */
  get menuButton(): Locator {
    return this.page.locator('button').filter({ has: this.page.locator('svg') }).first()
  }

  /** Бейдж ошибки */
  get errorAlert(): Locator {
    return this.page.locator('.bg-red-50.text-danger, [class*="error"]')
  }

  /** Таблица */
  get table(): Locator {
    return this.page.locator('table')
  }

  /** Строки таблицы */
  get tableRows(): Locator {
    return this.page.locator('table tbody tr')
  }

  /** Сообщение о пустом списке */
  get emptyMessage(): Locator {
    return this.page.locator('text=/не найден|не найдена|не найдено|пуст/i')
  }

  /** Счётчик записей ("Всего: N" или "Всего позиций: N") */
  get totalCount(): Locator {
    return this.page.locator('text=/Всего/')
  }

  // ── Actions ────────────────────────────────────────────

  async waitForTableLoaded() {
    await this.page.waitForSelector('table', { timeout: 10_000 })
  }

  async getRowCount(): Promise<number> {
    return this.tableRows.count()
  }

  async getHeadingText(): Promise<string> {
    return this.heading.textContent() ?? ''
  }

  async expectHeading(text: string) {
    await expect(this.heading).toContainText(text)
  }

  async expectPageReady() {
    // Ждём пока страница загрузится (нет спиннеров)
    const spinner = this.page.locator('.animate-spin').first()
    if (await spinner.isVisible().catch(() => false)) {
      await spinner.waitFor({ state: 'hidden', timeout: 15_000 })
    }
  }
}
