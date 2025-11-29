import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  readonly header: Locator;
  readonly footer: Locator;
  readonly mainContent: Locator;
  readonly toaster: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header');
    this.footer = page.locator('footer');
    this.mainContent = page.locator('main');
    this.toaster = page.locator('[data-sonner-toaster]');
  }

  abstract goto(): Promise<void>;

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async expectToastMessage(message: string | RegExp): Promise<void> {
    await expect(this.toaster.getByText(message)).toBeVisible();
  }

  async openSearchDialog(): Promise<void> {
    await this.page.keyboard.press('Control+K');
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }
}
