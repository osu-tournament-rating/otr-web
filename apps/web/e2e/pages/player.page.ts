import { Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class PlayerPage extends BasePage {
  readonly playerCard: Locator;
  readonly ratingChart: Locator;
  readonly noRatingMessage: Locator;
  readonly tournamentHistory: Locator;
  readonly beatmapsList: Locator;
  readonly notFoundMessage: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.playerCard = page.locator('[class*="PlayerCard"], [class*="player-card"]').first();
    this.ratingChart = page.locator('[class*="RatingChart"], [class*="rating-chart"]').first();
    this.noRatingMessage = page.getByText('No Rating Data Available');
    this.tournamentHistory = page.getByText('Tournament History');
    this.beatmapsList = page.getByText('Pooled Beatmaps');
    this.notFoundMessage = page.getByText(/not found/i);
  }

  async goto(playerId: string | number = 1): Promise<void> {
    await this.page.goto(`/players/${playerId}`);
    await this.waitForPageLoad();
  }

  async gotoWithFilters(
    playerId: string | number,
    params: Record<string, string>
  ): Promise<void> {
    const searchParams = new URLSearchParams(params);
    await this.page.goto(`/players/${playerId}?${searchParams}`);
    await this.waitForPageLoad();
  }

  async expectPlayerName(name: string): Promise<void> {
    await expect(this.page.getByText(name)).toBeVisible();
  }

  async expectNoRating(): Promise<void> {
    await expect(this.noRatingMessage).toBeVisible();
  }

  async expectNotFound(): Promise<void> {
    await expect(this.notFoundMessage).toBeVisible();
  }

  async expectRatingVisible(): Promise<void> {
    await expect(this.page.getByText(/Global Rank/i)).toBeVisible();
  }
}
