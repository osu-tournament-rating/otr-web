import { test as apiMockTest, RouteHandler } from './api-mock.fixture';
import { HomePage } from '../pages/home.page';
import { LeaderboardPage } from '../pages/leaderboard.page';
import { PlayerPage } from '../pages/player.page';
import { TournamentsPage } from '../pages/tournaments.page';

type PageFixtures = {
  homePage: HomePage;
  leaderboardPage: LeaderboardPage;
  playerPage: PlayerPage;
  tournamentsPage: TournamentsPage;
};

export const test = apiMockTest.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  leaderboardPage: async ({ page }, use) => {
    await use(new LeaderboardPage(page));
  },
  playerPage: async ({ page }, use) => {
    await use(new PlayerPage(page));
  },
  tournamentsPage: async ({ page }, use) => {
    await use(new TournamentsPage(page));
  },
});

export { expect } from '@playwright/test';
export type { RouteHandler };
