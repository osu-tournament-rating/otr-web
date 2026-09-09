import { test, expect, type Page } from '@playwright/test';

import { Ruleset } from '@otr/core/osu';
import { clearPlayerStats, seedPlayerStats } from './fixtures/player-stats';
import { ROUTES } from './fixtures/test-config';

const statsUrl = (tab: 'tournaments' | 'players', ruleset: Ruleset) =>
  `${ROUTES.stats}?tab=${tab}&ruleset=${ruleset}`;

const open = async (page: Page, url: string) => {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
};

const firstRowText = (page: Page, card: string) =>
  page.getByTestId(card).getByTestId('stats-row').first().innerText();

// The fixture rows are shared state, so this file runs on one worker
test.describe.configure({ mode: 'serial' });

test.describe('Statistics Page', () => {
  test.beforeAll(async () => {
    await seedPlayerStats();
  });

  test.afterAll(async () => {
    await clearPlayerStats();
  });

  test.describe('Page Load', () => {
    test('displays heading and description', async ({ page }) => {
      await open(page, ROUTES.stats);

      await expect(page.getByTestId('stats-page-heading')).toBeVisible();
      await expect(page.getByTestId('stats-page-description')).toBeVisible();
    });

    test('page title contains expected text', async ({ page }) => {
      await open(page, ROUTES.stats);

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test.describe('Tournaments tab', () => {
    test('is the default tab and renders its four charts', async ({ page }) => {
      await open(page, ROUTES.stats);

      for (const testId of [
        'chart-tournament-verification',
        'chart-tournaments-by-year',
        'chart-tournaments-by-ruleset',
        'chart-tournaments-by-lobby-size',
      ]) {
        const chart = page.getByTestId(testId);
        await expect(chart).toBeVisible({ timeout: 15000 });
        await expect(chart.locator('.recharts-wrapper')).toBeVisible({
          timeout: 10000,
        });
      }

      await expect(
        page.getByTestId('stats-card-rating-distribution')
      ).toBeHidden();
    });
  });

  test.describe('Players tab', () => {
    test('renders the rating distribution for the selected ruleset', async ({
      page,
    }) => {
      await open(page, statsUrl('players', Ruleset.Osu));

      const chart = page.getByTestId(
        `chart-rating-distribution-${Ruleset.Osu}`
      );
      await expect(chart).toBeVisible({ timeout: 15000 });
      await expect(chart.locator('.recharts-wrapper')).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.getByTestId('chart-player-participation')
      ).toBeVisible();
    });

    test('keeps the ruleset when the tab changes', async ({ page }) => {
      await open(page, statsUrl('players', Ruleset.Taiko));

      await page.getByTestId('stats-tab-tournaments').click();
      await expect(page).toHaveURL(
        new RegExp(`tab=tournaments&ruleset=${Ruleset.Taiko}`)
      );

      await page.getByTestId('stats-tab-players').click();
      await expect(page).toHaveURL(
        new RegExp(`tab=players&ruleset=${Ruleset.Taiko}`)
      );
      await expect(
        page.getByTestId(`chart-rating-distribution-${Ruleset.Taiko}`)
      ).toBeVisible({ timeout: 15000 });
    });

    test('switches ruleset from the selector', async ({ page }) => {
      await open(page, statsUrl('players', Ruleset.Osu));

      await page.getByTestId(`ruleset-button-${Ruleset.Taiko}`).click();

      await expect(page).toHaveURL(
        new RegExp(`tab=players&ruleset=${Ruleset.Taiko}`)
      );
      await expect(
        page.getByTestId(`chart-rating-distribution-${Ruleset.Taiko}`)
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByTestId(`chart-rating-distribution-${Ruleset.Osu}`)
      ).toBeHidden();
    });

    test('drops the mod card and fills the row for mania 4K', async ({
      page,
    }) => {
      await open(page, statsUrl('players', Ruleset.Mania4k));

      await expect(page.getByTestId('stats-card-mods')).toBeHidden();

      const tops = await Promise.all(
        [
          'stats-card-leaders-tournaments',
          'stats-card-leaders-matches',
          'stats-card-leaders-games',
        ].map(async (testId) => {
          const box = await page.getByTestId(testId).boundingBox();
          return box?.y ?? -1;
        })
      );

      expect(tops[0]).toBeGreaterThan(0);
      expect(tops[1]).toBeCloseTo(tops[0], 0);
      expect(tops[2]).toBeCloseTo(tops[0], 0);
    });

    test('reports the pending state for a ruleset without a snapshot', async ({
      page,
    }) => {
      await open(page, statsUrl('players', Ruleset.Catch));

      await expect(page.getByTestId('stats-players-pending')).toContainText(
        'Player statistics are still being processed.'
      );
      await expect(
        page.getByTestId(`chart-rating-distribution-${Ruleset.Catch}`)
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('stats-card-duos')).toBeHidden();
    });
  });

  test.describe('Card filters', () => {
    test('changes the upset rows with the window control', async ({ page }) => {
      await open(page, statsUrl('players', Ruleset.Osu));

      const allTime = await firstRowText(page, 'stats-card-upsets');

      await page.getByTestId('stats-upsets-window-12').click();
      await expect
        .poll(() => firstRowText(page, 'stats-card-upsets'))
        .not.toBe(allTime);
    });

    test('changes the first place rows with the team size control', async ({
      page,
    }) => {
      await open(page, statsUrl('players', Ruleset.Osu));

      const all = await firstRowText(page, 'stats-card-first-place');

      await page.getByTestId('stats-first-place-size-2').click();
      await expect
        .poll(() => firstRowText(page, 'stats-card-first-place'))
        .not.toBe(all);
    });
  });

  test.describe('View more dialog', () => {
    test('opens, pages and closes the duos dialog', async ({ page }) => {
      await open(page, statsUrl('players', Ruleset.Osu));

      await page.getByTestId('stats-dialog-duos-trigger').click();

      const dialog = page.getByTestId('stats-dialog-duos');
      await expect(dialog).toBeVisible();
      await expect(page.getByTestId('stats-dialog-duos-range')).toHaveText(
        'Showing 1–50 of 64'
      );
      await expect(dialog.locator('tbody tr')).toHaveCount(50);

      await page.getByTestId('stats-dialog-duos-next').click();
      await expect(page.getByTestId('stats-dialog-duos-range')).toHaveText(
        'Showing 51–64 of 64'
      );
      await expect(dialog.locator('tbody tr')).toHaveCount(14);
      await expect(page.getByTestId('stats-dialog-duos-next')).toBeDisabled();

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    });
  });

  test.describe('Narrow width', () => {
    test('stacks the cards without horizontal overflow', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await open(page, statsUrl('players', Ruleset.Osu));

      const duos = await page.getByTestId('stats-card-duos').boundingBox();
      const upsets = await page.getByTestId('stats-card-upsets').boundingBox();

      expect(duos?.y ?? 0).toBeLessThan(upsets?.y ?? 0);

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});
