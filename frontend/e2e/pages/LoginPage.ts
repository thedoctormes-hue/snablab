import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Page Object для страницы логина
 */
export class LoginPage extends BasePage {
  // ── Locators ────────────────────────────────────────────

  get usernameInput(): Locator {
    return this.page.locator('input[placeholder="Введите логин"]')
  }

  get passwordInput(): Locator {
    return this.page.locator('input[placeholder="Введите пароль"]')
  }

  get submitButton(): Locator {
    return this.page.locator('button:has-text("Войти")')
  }

  get errorMessage(): Locator {
    return this.page.locator('.bg-red-50').or(this.page.locator('text=/Неверные|ошибка|Произошла/i'))
  }

  get loginForm(): Locator {
    return this.page.locator('form')
  }

  get logo(): Locator {
    return this.page.locator('text=СнабЛаб').first()
  }

  // ── Actions ────────────────────────────────────────────

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async fillUsername(username: string) {
    await this.usernameInput.fill(username)
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  async submit() {
    await this.submitButton.click()
  }

  async login(username: string, password: string) {
    await this.fillUsername(username)
    await this.fillPassword(password)
    await this.submit()
  }

  // ── Assertions ─────────────────────────────────────────

  async expectOnLoginPage() {
    await expect(this.page).toHaveURL(/.*login/)
    await expect(this.loginForm).toBeVisible()
  }

  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible()
  }

  async expectRedirectToDashboard() {
    await this.page.waitForURL('**/')
    await expect(this.page).not.toHaveURL(/.*login/)
  }
}
