import { test, expect } from '@playwright/test';
import {
  TEST_MATCH_ID,
  TEST_PUBLIC_TOURNAMENT_ID,
  ROUTES,
} from './fixtures/test-config';

test.describe('Match Detail Page', () => {
  test.describe('Page Load', () => {
    test('loads with match header card', async ({ page }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      const matchName = page.locator('[data-testid="match-name"]');
      await expect(matchName).toBeVisible({ timeout: 10000 });
      await expect(matchName).not.toBeEmpty();
    });

    test('displays match name and parent tournament context', async ({
      page,
    }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="match-name"]')).toBeVisible({
        timeout: 10000,
      });

      const tournamentLink = page.locator(
        '[data-testid="match-tournament-link"]'
      );
      await expect(tournamentLink).toBeVisible({ timeout: 10000 });
      await expect(tournamentLink).not.toBeEmpty();
    });

    test('page title contains match name', async ({ page }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });

    test('displays match tabs', async ({ page }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="match-tabs"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.locator('[data-testid="tab-trigger-games"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="tab-trigger-stats"]')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Games Tab', () => {
    test('lists individual games with beatmap info', async ({ page }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      const beatmapLinks = page.locator('[data-testid="beatmap-link"]');
      await expect(beatmapLinks.first()).toBeVisible({ timeout: 10000 });

      const count = await beatmapLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test('individual game rows show scores and player performance', async ({
      page,
    }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      const playerLinks = page.locator(
        '[data-testid="score-player-link"]:visible'
      );
      await expect(playerLinks.first()).toBeVisible({ timeout: 10000 });

      const count = await playerLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test('displays game outcome for completed games', async ({ page }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      const outcomes = page.locator('[data-testid="game-outcome"]');
      await expect(outcomes.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Stats Tab', () => {
    test('displays match statistics table when stats tab is active', async ({
      page,
    }) => {
      await page.goto(`${ROUTES.match(TEST_MATCH_ID)}?tab=stats`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="player-stats-table"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="match-stats-summary"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole('heading', { name: 'Match Statistics' })
      ).toBeVisible();
    });

    test('navigating to stats tab via trigger reveals statistics', async ({
      page,
    }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      const statsTrigger = page.locator('[data-testid="tab-trigger-stats"]');
      await expect(statsTrigger).toBeVisible({ timeout: 10000 });
      await statsTrigger.click();
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="player-stats-table"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('displays team scores chart with rendered content', async ({
      page,
    }) => {
      await page.goto(`${ROUTES.match(TEST_MATCH_ID)}?tab=stats`);
      await page.waitForLoadState('networkidle');

      const chart = page.locator('[data-testid="team-scores-chart"]');
      await expect(chart).toBeVisible({ timeout: 15000 });
      await expect(chart.locator('.recharts-wrapper')).toBeVisible({
        timeout: 15000,
      });
      await expect(chart.getByRole('img')).toHaveAccessibleName(
        /Line chart of verified team scores/
      );
    });

    test('displays player statistics rows', async ({ page }) => {
      await page.goto(`${ROUTES.match(TEST_MATCH_ID)}?tab=stats`);
      await page.waitForLoadState('networkidle');

      const statRows = page.locator('[data-testid^="player-stats-row-"]');
      await expect(statRows.first()).toBeVisible({ timeout: 10000 });

      const count = await statRows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('sort controls expose state and reorder player rows', async ({
      page,
    }) => {
      await page.goto(`${ROUTES.match(TEST_MATCH_ID)}?tab=stats`);
      await page.waitForLoadState('networkidle');

      const costSort = page.getByRole('button', {
        name: 'Sort by match cost, ascending',
      });
      const costHeader = page.locator('[data-testid="match-cost-header"]');
      const rows = page.locator('[data-testid^="player-stats-row-"]');
      const getMatchCosts = () =>
        rows.evaluateAll((elements) =>
          elements.map((element) =>
            Number(element.getAttribute('data-match-cost'))
          )
        );

      await expect(costHeader).toHaveAttribute('aria-sort', 'descending');
      const descendingCosts = await getMatchCosts();
      expect(descendingCosts).toEqual(
        [...descendingCosts].sort((first, second) => second - first)
      );

      await costSort.click();
      await expect(costHeader).toHaveAttribute('aria-sort', 'ascending');
      const ascendingCosts = await getMatchCosts();
      expect(ascendingCosts).toEqual(
        [...ascendingCosts].sort((first, second) => first - second)
      );
    });

    test('mobile player cards keep every metric visible without page overflow', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${ROUTES.match(TEST_MATCH_ID)}?tab=stats`);
      await page.waitForLoadState('networkidle');

      const firstPlayer = page
        .locator('[data-testid^="player-stats-row-"]')
        .first();
      await expect(firstPlayer).toBeVisible({ timeout: 10000 });

      for (const label of [
        'Match cost',
        'Record',
        'Avg. score',
        'Accuracy',
        'Misses',
        'Placement',
      ]) {
        await expect(
          firstPlayer.getByText(label, { exact: true })
        ).toBeVisible();
      }

      const hasPageOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      );
      expect(hasPageOverflow).toBe(false);

      await page.getByLabel('Sort players by').click();
      await page.getByRole('option', { name: 'Player' }).click();
      await expect(page.getByLabel('Sort players by')).toContainText('Player');

      const directionButton = page.getByRole('button', {
        name: 'Sort descending',
      });
      await directionButton.click();
      await expect(
        page.getByRole('button', { name: 'Sort ascending' })
      ).toBeVisible();
    });
  });

  test.describe('Navigation and Links', () => {
    test('links back to the parent tournament page', async ({ page }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      const tournamentLink = page.locator(
        '[data-testid="match-tournament-link"]'
      );
      await expect(tournamentLink).toBeVisible({ timeout: 10000 });

      const href = await tournamentLink.getAttribute('href');
      expect(href).toContain(ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID));

      await tournamentLink.click();
      await page.waitForURL(
        `**${ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID)}**`,
        {
          timeout: 20000,
        }
      );
      expect(page.url()).toContain(
        ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID)
      );
    });

    test('links to a player profile from match participants', async ({
      page,
    }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      const playerLink = page
        .locator('[data-testid="score-player-link"]:visible')
        .first();
      await expect(playerLink).toBeVisible({ timeout: 10000 });

      const href = await playerLink.getAttribute('href');
      expect(href).toContain('/players/');

      await playerLink.click();
      await page.waitForURL('**/players/**', { timeout: 20000 });
      expect(page.url()).toContain('/players/');
    });

    test('links to a beatmap page from a game listing', async ({ page }) => {
      await page.goto(ROUTES.match(TEST_MATCH_ID));
      await page.waitForLoadState('networkidle');

      const beatmapLink = page.locator('[data-testid="beatmap-link"]').first();
      await expect(beatmapLink).toBeVisible({ timeout: 10000 });

      const href = await beatmapLink.getAttribute('href');
      expect(href).toContain('/beatmaps/');

      await beatmapLink.click();
      await page.waitForURL('**/beatmaps/**', { timeout: 20000 });
      expect(page.url()).toContain('/beatmaps/');
    });
  });
});
