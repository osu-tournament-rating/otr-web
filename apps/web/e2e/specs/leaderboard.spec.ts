import { test, expect } from '../fixtures/base.fixture';
import { createLeaderboardResponse, createLeaderboardWithPlayers } from '../mocks/factories/leaderboard.factory';

test.describe('Leaderboard Page', () => {
  test.beforeEach(async ({ mockOrpc }) => {
    await mockOrpc([
      {
        path: 'leaderboard.list',
        response: createLeaderboardWithPlayers(10),
      },
    ]);
  });

  test('displays page title', async ({ leaderboardPage }) => {
    await leaderboardPage.goto();

    await expect(leaderboardPage.pageTitle).toBeVisible();
  });

  test('displays leaderboard table with player data', async ({ leaderboardPage }) => {
    await leaderboardPage.goto();

    await expect(leaderboardPage.dataTable).toBeVisible();
    await leaderboardPage.expectPlayerCount(10);
  });

  test('displays player usernames in table', async ({ leaderboardPage }) => {
    await leaderboardPage.goto();

    await leaderboardPage.expectPlayerVisible('Player1');
    await leaderboardPage.expectPlayerVisible('Player2');
  });

  test('displays pagination controls', async ({ leaderboardPage }) => {
    await leaderboardPage.goto();

    await expect(leaderboardPage.pagination).toBeVisible();
  });
});

test.describe('Leaderboard Page - Empty State', () => {
  test('handles empty leaderboard gracefully', async ({
    leaderboardPage,
    mockOrpc,
  }) => {
    await mockOrpc([
      {
        path: 'leaderboard.list',
        response: createLeaderboardResponse({
          leaderboard: [],
          total: 0,
          pages: 0,
        }),
      },
    ]);

    await leaderboardPage.goto();

    await expect(leaderboardPage.pageTitle).toBeVisible();
    await expect(leaderboardPage.dataTable).toBeVisible();
  });
});

test.describe('Leaderboard Page - Filters', () => {
  test('navigates with country filter', async ({ leaderboardPage, page, mockOrpc }) => {
    await mockOrpc([
      {
        path: 'leaderboard.list',
        response: createLeaderboardWithPlayers(5),
      },
    ]);

    await leaderboardPage.gotoWithFilters({ country: 'US' });

    await expect(page).toHaveURL(/country=US/);
    await expect(leaderboardPage.dataTable).toBeVisible();
  });
});
