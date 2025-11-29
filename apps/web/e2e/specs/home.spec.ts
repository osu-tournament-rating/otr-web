import { test, expect } from '../fixtures/base.fixture';

test.describe('Home Page', () => {
  test('displays hero section with title and description', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.heroTitle).toBeVisible();
    await expect(homePage.heroDescription).toBeVisible();
  });

  test('displays rating ladder section', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.ratingLadder).toBeVisible();
  });

  test('displays navigation links', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.viewRankingsLink).toBeVisible();
    await expect(homePage.browseTournamentsLink).toBeVisible();
    await expect(homePage.readDocsLink).toBeVisible();
  });

  test('navigates to leaderboard when clicking View Rankings', async ({
    homePage,
    page,
  }) => {
    await homePage.goto();
    await homePage.clickViewRankings();

    await expect(page).toHaveURL(/\/leaderboard/);
  });

  test('navigates to tournaments when clicking Browse Tournaments', async ({
    homePage,
    page,
  }) => {
    await homePage.goto();
    await homePage.clickBrowseTournaments();

    await expect(page).toHaveURL(/\/tournaments/);
  });
});
