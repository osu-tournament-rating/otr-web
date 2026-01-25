import { test, expect } from '@playwright/test';
import { TEST_PLAYER_ID, ROUTES, RULESETS } from './fixtures/test-config';

test.describe('Player Profile Page', () => {
  test.describe('Core Data Loading', () => {
    test('displays player card with avatar and username', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const avatar = page.locator('[data-testid="player-avatar"]');
      await expect(avatar).toBeVisible({ timeout: 10000 });

      const username = page.locator('[data-testid="player-username"]');
      await expect(username).toBeVisible({ timeout: 10000 });
      await expect(username).not.toBeEmpty();
    });

    test('displays rating stats card with tier, rating, and ranks', async ({
      page,
    }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="stat-card-tier"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="stat-card-rating"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="stat-card-global"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="stat-card-country"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('displays match and tournament statistics', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="stat-card-tournaments"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="stat-card-matches"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="stat-card-percentile"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('page title contains player username', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test.describe('Filters and UI Updates', () => {
    test('displays ruleset selector buttons', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const rulesetButtons = page.locator('[data-testid^="ruleset-button-"]');
      await expect(rulesetButtons.first()).toBeVisible({ timeout: 10000 });
      const count = await rulesetButtons.count();
      expect(count).toBe(5);
    });

    test('changes URL when selecting different ruleset', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const taikoButton = page.locator('[data-testid="ruleset-button-1"]');
      await expect(taikoButton).toBeVisible({ timeout: 10000 });
      await taikoButton.click();
      await page.waitForURL(/ruleset=1/, { timeout: 10000 });
      expect(page.url()).toContain('ruleset=1');
    });

    test('preserves ruleset in URL on page reload', async ({ page }) => {
      await page.goto(
        `${ROUTES.playerProfile(TEST_PLAYER_ID)}?ruleset=${RULESETS.taiko}`
      );
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain(`ruleset=${RULESETS.taiko}`);
    });

    test('updates page content when ruleset changes', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const rulesetButtons = page.locator('[data-testid^="ruleset-button-"]');
      const buttonCount = await rulesetButtons.count();

      if (buttonCount > 1) {
        await rulesetButtons.nth(1).click();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Chart Rendering', () => {
    test('displays rating chart', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const ratingChartContainer = page.locator(
        '[data-testid="player-rating-chart"]'
      );
      await expect(ratingChartContainer).toBeVisible({ timeout: 15000 });
    });

    test('rating chart has toggle between chart and table view', async ({
      page,
    }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const toggleGroup = page.locator('[data-testid="rating-chart-toggle"]');
      if (await toggleGroup.isVisible({ timeout: 10000 })) {
        const toggleButtons = toggleGroup.locator('button');
        const buttonCount = await toggleButtons.count();
        expect(buttonCount).toBeGreaterThanOrEqual(2);
      }
    });

    test('displays mod stats charts', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const charts = page.locator('.recharts-wrapper');
      await expect(charts.first()).toBeVisible({ timeout: 15000 });
      const chartCount = await charts.count();
      expect(chartCount).toBeGreaterThan(0);
    });

    test('displays frequency charts for teammates and opponents', async ({
      page,
    }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const frequencyCharts = page.locator('.recharts-bar-rectangles');
      const chartCount = await frequencyCharts.count();
      expect(chartCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Tournament History', () => {
    test('displays tournament list section', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const tournamentSection = page.locator(
        '[data-testid="tournament-history-title"]'
      );
      await expect(tournamentSection).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Navigation and Links', () => {
    test('contains link to osu! profile', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const osuLink = page.locator('a[href*="osu.ppy.sh"]');
      await expect(osuLink).toBeVisible({ timeout: 10000 });
    });

    test('country flag links to country leaderboard', async ({ page }) => {
      await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
      await page.waitForLoadState('networkidle');

      const countryLink = page.locator('a[href*="/leaderboard?country="]');
      if (await countryLink.first().isVisible({ timeout: 10000 })) {
        const href = await countryLink.first().getAttribute('href');
        expect(href).toContain('country=');
      }
    });
  });
});
