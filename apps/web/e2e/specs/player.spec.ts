import { test, expect } from '../fixtures/base.fixture';
import { createPlayerStats, createPlayerWithNoRating } from '../mocks/factories/player.factory';

test.describe('Player Page', () => {
  test.beforeEach(async ({ mockOrpc }) => {
    await mockOrpc([
      {
        path: 'players.stats',
        response: createPlayerStats(),
      },
      {
        path: 'players.tournaments',
        response: [],
      },
      {
        path: 'players.beatmaps',
        response: { beatmaps: [], totalCount: 0 },
      },
    ]);
  });

  test('displays player profile with rating', async ({ playerPage }) => {
    await playerPage.goto(1);

    await playerPage.expectPlayerName('TestPlayer');
    await playerPage.expectRatingVisible();
  });

  test('displays tournament history section', async ({ playerPage }) => {
    await playerPage.goto(1);

    await expect(playerPage.tournamentHistory).toBeVisible();
  });
});

test.describe('Player Page - No Rating', () => {
  test('displays no rating message when player has no rating data', async ({
    playerPage,
    mockOrpc,
  }) => {
    await mockOrpc([
      {
        path: 'players.stats',
        response: createPlayerWithNoRating({ username: 'NoRatingPlayer' }),
      },
      {
        path: 'players.tournaments',
        response: [],
      },
      {
        path: 'players.beatmaps',
        response: { beatmaps: [], totalCount: 0 },
      },
    ]);

    await playerPage.goto(999);

    await playerPage.expectNoRating();
  });
});

test.describe('Player Page - Not Found', () => {
  test('displays not found for invalid player ID', async ({ playerPage, mockOrpc }) => {
    await mockOrpc([
      {
        path: 'players.stats',
        response: null,
        status: 404,
      },
    ]);

    await playerPage.goto('invalid-id-12345');

    await playerPage.expectNotFound();
  });
});

test.describe('Player Page - Ruleset Filter', () => {
  test('navigates with ruleset filter', async ({ playerPage, page, mockOrpc }) => {
    await mockOrpc([
      {
        path: 'players.stats',
        response: createPlayerStats({ ruleset: 1 }),
      },
      {
        path: 'players.tournaments',
        response: [],
      },
      {
        path: 'players.beatmaps',
        response: { beatmaps: [], totalCount: 0 },
      },
    ]);

    await playerPage.gotoWithFilters(1, { ruleset: '1' });

    await expect(page).toHaveURL(/ruleset=1/);
  });
});
