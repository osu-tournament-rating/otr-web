import { Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly heroTitle: Locator;
  readonly heroDescription: Locator;
  readonly ratingLadder: Locator;
  readonly viewRankingsLink: Locator;
  readonly browseTournamentsLink: Locator;
  readonly readDocsLink: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.heroTitle = page.getByText('osu! Tournament Rating');
    this.heroDescription = page.getByText('A community-driven platform');
    this.ratingLadder = page.getByText('Rise to the top');
    this.viewRankingsLink = page.getByRole('link', { name: 'View Rankings' });
    this.browseTournamentsLink = page.getByRole('link', {
      name: 'Browse Tournaments',
    });
    this.readDocsLink = page.getByRole('link', { name: 'Read the docs' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async clickViewRankings(): Promise<void> {
    await this.viewRankingsLink.click();
  }

  async clickBrowseTournaments(): Promise<void> {
    await this.browseTournamentsLink.click();
  }
}
