import { Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class TournamentsPage extends BasePage {
  readonly pageTitle: Locator;
  readonly tournamentList: Locator;
  readonly tournamentCards: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly emptyState: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: /tournaments/i }).first();
    this.tournamentList = page.locator('[class*="tournament-list"], main');
    this.tournamentCards = page.locator('[class*="tournament-card"], [class*="TournamentCard"]');
    this.searchInput = page.getByPlaceholder(/search/i);
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.emptyState = page.getByText(/no tournaments/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/tournaments');
    await this.waitForPageLoad();
  }

  async gotoWithFilters(params: Record<string, string>): Promise<void> {
    const searchParams = new URLSearchParams(params);
    await this.page.goto(`/tournaments?${searchParams}`);
    await this.waitForPageLoad();
  }

  async searchTournaments(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForPageLoad();
  }

  async expectTournamentVisible(name: string): Promise<void> {
    await expect(this.page.getByText(name)).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  async clickTournament(name: string): Promise<void> {
    await this.page.getByText(name).click();
    await this.waitForPageLoad();
  }
}
