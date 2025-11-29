import { Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LeaderboardPage extends BasePage {
  readonly pageTitle: Locator;
  readonly dataTable: Locator;
  readonly tableRows: Locator;
  readonly filterButton: Locator;
  readonly pagination: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: 'Global Leaderboard' });
    this.dataTable = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.pagination = page.locator('nav[aria-label="pagination"]');
    this.previousButton = page.getByRole('link', { name: /previous/i });
    this.nextButton = page.getByRole('link', { name: /next/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/leaderboard');
    await this.waitForPageLoad();
  }

  async gotoWithFilters(params: Record<string, string>): Promise<void> {
    const searchParams = new URLSearchParams(params);
    await this.page.goto(`/leaderboard?${searchParams}`);
    await this.waitForPageLoad();
  }

  async getPlayerRow(index: number): Promise<Locator> {
    return this.tableRows.nth(index);
  }

  async expectPlayerCount(count: number): Promise<void> {
    await expect(this.tableRows).toHaveCount(count);
  }

  async expectPlayerVisible(username: string): Promise<void> {
    await expect(this.dataTable.getByText(username)).toBeVisible();
  }

  async goToNextPage(): Promise<void> {
    await this.nextButton.click();
    await this.waitForPageLoad();
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousButton.click();
    await this.waitForPageLoad();
  }

  async openFilterDialog(): Promise<void> {
    await this.filterButton.click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }
}
