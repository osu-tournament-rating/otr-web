import { test, expect } from '@playwright/test';
import { ROUTES } from './fixtures/test-config';

test.describe('Statistics Page', () => {
  test.describe('Page Load', () => {
    test('displays heading and description', async ({ page }) => {
      await page.goto(ROUTES.stats);
      await page.waitForLoadState('networkidle');

      const heading = page.locator('[data-testid="stats-page-heading"]');
      await expect(heading).toBeVisible({ timeout: 10000 });

      const description = page.locator(
        '[data-testid="stats-page-description"]'
      );
      await expect(description).toBeVisible({ timeout: 10000 });
    });

    test('page title contains expected text', async ({ page }) => {
      await page.goto(ROUTES.stats);
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test.describe('Chart Rendering', () => {
    test('displays tournament verification chart with rendered content', async ({
      page,
    }) => {
      await page.goto(ROUTES.stats);
      await page.waitForLoadState('networkidle');

      const chart = page.locator(
        '[data-testid="chart-tournament-verification"]'
      );
      await expect(chart).toBeVisible({ timeout: 15000 });
      await expect(chart.locator('.recharts-wrapper')).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays tournaments by year chart with rendered content', async ({
      page,
    }) => {
      await page.goto(ROUTES.stats);
      await page.waitForLoadState('networkidle');

      const chart = page.locator('[data-testid="chart-tournaments-by-year"]');
      await expect(chart).toBeVisible({ timeout: 15000 });
      await expect(chart.locator('.recharts-wrapper')).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays tournaments by ruleset chart with rendered content', async ({
      page,
    }) => {
      await page.goto(ROUTES.stats);
      await page.waitForLoadState('networkidle');

      const chart = page.locator(
        '[data-testid="chart-tournaments-by-ruleset"]'
      );
      await expect(chart).toBeVisible({ timeout: 15000 });
      await expect(chart.locator('.recharts-wrapper')).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays tournaments by lobby size chart with rendered content', async ({
      page,
    }) => {
      await page.goto(ROUTES.stats);
      await page.waitForLoadState('networkidle');

      const chart = page.locator(
        '[data-testid="chart-tournaments-by-lobby-size"]'
      );
      await expect(chart).toBeVisible({ timeout: 15000 });
      await expect(chart.locator('.recharts-wrapper')).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays at least one rating distribution chart with rendered content', async ({
      page,
    }) => {
      await page.goto(ROUTES.stats);
      await page.waitForLoadState('networkidle');

      const charts = page.locator(
        '[data-testid^="chart-rating-distribution-"]'
      );
      await expect(charts.first()).toBeVisible({ timeout: 15000 });

      const count = await charts.count();
      expect(count).toBeGreaterThan(0);

      await expect(charts.first().locator('.recharts-wrapper')).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
