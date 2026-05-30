import { test, expect, type Page } from '@playwright/test';
import {
  ROUTES,
  TEST_PLAYER_ID,
  TEST_PUBLIC_TOURNAMENT_ID,
  TEST_MATCH_ID,
  TEST_BEATMAP_OSU_ID,
} from './fixtures/test-config';

/**
 * Global website search (issue #700).
 *
 * The command-style search dialog is gated behind an authenticated session:
 * `SearchCommandDialog` renders `null` without a session and the `/search`
 * endpoint is a `protectedProcedure`. The e2e suite runs unauthenticated, so
 * the trigger never mounts. We therefore:
 *   - Always assert the gate (trigger absent, Cmd/Ctrl+K is a no-op, banner shown).
 *   - Encode every checklist query→navigation scenario as the full
 *     open → type → wait → click → assert-navigation flow, skipped when the
 *     trigger is absent so the intended behavior stays documented and runnable
 *     once a session is available.
 */

const SEARCH_TRIGGER = '[data-testid="search-trigger-button"]';
const SEARCH_DIALOG = '[data-testid="search-dialog"]';
const SEARCH_INPUT = '[data-testid="search-input"]';
const SEARCH_RESULTS = '[data-testid="search-results-list"]';

async function searchTriggerVisible(page: Page): Promise<boolean> {
  return page
    .locator(SEARCH_TRIGGER)
    .isVisible({ timeout: 5000 })
    .catch(() => false);
}

async function openSearchViaButton(page: Page) {
  await page.locator(SEARCH_TRIGGER).click();
  await expect(page.locator(SEARCH_DIALOG)).toBeVisible({ timeout: 10000 });
}

async function typeQuery(page: Page, query: string) {
  const input = page.locator(SEARCH_INPUT);
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(query);
}

test.describe('Global Website Search', () => {
  test.describe('Trigger and Gating', () => {
    test('search trigger button is gated behind an authenticated session', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const header = page.locator('[data-testid="header"]');
      await expect(header).toBeVisible({ timeout: 10000 });

      if (await searchTriggerVisible(page)) {
        // Authenticated render: the trigger opens the dialog.
        await openSearchViaButton(page);
        await expect(page.locator(SEARCH_INPUT)).toBeVisible({
          timeout: 10000,
        });
      } else {
        // Unauthenticated render: the trigger and dialog are absent.
        await expect(page.locator(SEARCH_TRIGGER)).toHaveCount(0);
        await expect(page.locator(SEARCH_DIALOG)).toHaveCount(0);
      }
    });

    test('signed-out session shows the limited-features banner', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (await searchTriggerVisible(page)) {
        test.skip(true, 'Authenticated session: signed-out banner not shown');
      }

      await expect(
        page.getByText('Some features are not available while signed out.')
      ).toBeVisible({ timeout: 10000 });
    });

    test('Cmd/Ctrl+K is a no-op without a session', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (await searchTriggerVisible(page)) {
        test.skip(true, 'Authenticated session: hotkey opens the dialog');
      }

      await page.keyboard.press('ControlOrMeta+KeyK');
      await expect(page.locator(SEARCH_DIALOG)).toHaveCount(0);
    });
  });

  test.describe('Open via Header Affordances', () => {
    test('search button opens the command dialog with an input', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (!(await searchTriggerVisible(page))) {
        test.skip(true, 'Search trigger is gated behind an active session');
      }

      await openSearchViaButton(page);
      await expect(page.locator(SEARCH_INPUT)).toBeVisible({ timeout: 10000 });
      await expect(page.locator(SEARCH_RESULTS)).toBeVisible({
        timeout: 10000,
      });
    });

    test('Cmd/Ctrl+K opens the command dialog', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (!(await searchTriggerVisible(page))) {
        test.skip(true, 'Search trigger is gated behind an active session');
      }

      await page.keyboard.press('ControlOrMeta+KeyK');
      await expect(page.locator(SEARCH_DIALOG)).toBeVisible({ timeout: 10000 });
      await expect(page.locator(SEARCH_INPUT)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Query Results and Navigation', () => {
    test('player query "Stage" navigates to the player profile', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (!(await searchTriggerVisible(page))) {
        test.skip(true, 'Search trigger is gated behind an active session');
      }

      await openSearchViaButton(page);
      await typeQuery(page, 'Stage');

      const players = page.locator('[data-testid="search-group-players"]');
      await expect(players).toBeVisible({ timeout: 10000 });

      const result = players.locator(
        '[data-value="player-' + TEST_PLAYER_ID + '"]'
      );
      await expect(result).toBeVisible({ timeout: 10000 });
      await result.click();

      await page.waitForURL(
        new RegExp('/players/' + TEST_PLAYER_ID + '(\\?|$)'),
        { timeout: 10000 }
      );
      expect(page.url()).toContain('/players/' + TEST_PLAYER_ID);
    });

    test('player result links to the profile for its ruleset', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (!(await searchTriggerVisible(page))) {
        test.skip(true, 'Search trigger is gated behind an active session');
      }

      await openSearchViaButton(page);
      await typeQuery(page, 'Stage');

      const result = page.locator(
        '[data-testid="search-group-players"] [data-value="player-' +
          TEST_PLAYER_ID +
          '"]'
      );
      await expect(result).toBeVisible({ timeout: 10000 });
      await result.click();

      // The dialog routes per-ruleset when a rating ruleset is present,
      // otherwise to the bare profile; both resolve under the player route.
      await page.waitForURL(new RegExp('/players/' + TEST_PLAYER_ID), {
        timeout: 10000,
      });
      expect(page.url()).toContain('/players/' + TEST_PLAYER_ID);
    });

    test('tournament query by name navigates to the tournament', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (!(await searchTriggerVisible(page))) {
        test.skip(true, 'Search trigger is gated behind an active session');
      }

      await openSearchViaButton(page);
      await typeQuery(page, "Dio's Autumn Singles");

      const tournaments = page.locator(
        '[data-testid="search-group-tournaments"]'
      );
      await expect(tournaments).toBeVisible({ timeout: 10000 });

      const result = tournaments.locator(
        '[data-value="tournament-' + TEST_PUBLIC_TOURNAMENT_ID + '"]'
      );
      await expect(result).toBeVisible({ timeout: 10000 });
      await result.click();

      await page.waitForURL(
        new RegExp('/tournaments/' + TEST_PUBLIC_TOURNAMENT_ID + '(\\?|$)'),
        { timeout: 10000 }
      );
      expect(page.url()).toContain('/tournaments/' + TEST_PUBLIC_TOURNAMENT_ID);
    });

    test('tournament query by abbreviation "DAS" returns a result', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (!(await searchTriggerVisible(page))) {
        test.skip(true, 'Search trigger is gated behind an active session');
      }

      await openSearchViaButton(page);
      await typeQuery(page, 'DAS');

      const result = page.locator(
        '[data-testid="search-group-tournaments"] [data-value="tournament-' +
          TEST_PUBLIC_TOURNAMENT_ID +
          '"]'
      );
      await expect(result).toBeVisible({ timeout: 10000 });
      await result.click();

      await page.waitForURL(
        new RegExp('/tournaments/' + TEST_PUBLIC_TOURNAMENT_ID + '(\\?|$)'),
        { timeout: 10000 }
      );
      expect(page.url()).toContain('/tournaments/' + TEST_PUBLIC_TOURNAMENT_ID);
    });

    test('match query navigates to the match', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (!(await searchTriggerVisible(page))) {
        test.skip(true, 'Search trigger is gated behind an active session');
      }

      await openSearchViaButton(page);
      await typeQuery(page, 'DAS: (Menty) vs (LINKI)');

      const matches = page.locator('[data-testid="search-group-matches"]');
      await expect(matches).toBeVisible({ timeout: 10000 });

      const result = matches.locator(
        '[data-value="match-' + TEST_MATCH_ID + '"]'
      );
      await expect(result).toBeVisible({ timeout: 10000 });
      await result.click();

      await page.waitForURL(
        new RegExp('/matches/' + TEST_MATCH_ID + '(\\?|$)'),
        { timeout: 10000 }
      );
      expect(page.url()).toContain('/matches/' + TEST_MATCH_ID);
    });

    test('beatmap query navigates to the beatmap', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (!(await searchTriggerVisible(page))) {
        test.skip(true, 'Search trigger is gated behind an active session');
      }

      await openSearchViaButton(page);
      await typeQuery(page, 'KAC 2012 ULTIMATE MEDLEY');

      const beatmaps = page.locator('[data-testid="search-group-beatmaps"]');
      await expect(beatmaps).toBeVisible({ timeout: 10000 });

      // The dialog routes beatmaps by their osu! id.
      const result = beatmaps.locator(
        '[data-value="beatmap-' + TEST_BEATMAP_OSU_ID + '"]'
      );
      await expect(result).toBeVisible({ timeout: 10000 });
      await result.click();

      await page.waitForURL(
        new RegExp('/beatmaps/' + TEST_BEATMAP_OSU_ID + '(\\?|$)'),
        { timeout: 10000 }
      );
      expect(page.url()).toContain('/beatmaps/' + TEST_BEATMAP_OSU_ID);
    });

    test('beatmap query by artist returns a result', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      if (!(await searchTriggerVisible(page))) {
        test.skip(true, 'Search trigger is gated behind an active session');
      }

      await openSearchViaButton(page);
      await typeQuery(page, 'FLOOR LEGENDS -KAC 2012-');

      const result = page.locator(
        '[data-testid="search-group-beatmaps"] [data-value="beatmap-' +
          TEST_BEATMAP_OSU_ID +
          '"]'
      );
      await expect(result).toBeVisible({ timeout: 10000 });
      await result.click();

      await page.waitForURL(
        new RegExp('/beatmaps/' + TEST_BEATMAP_OSU_ID + '(\\?|$)'),
        { timeout: 10000 }
      );
      expect(page.url()).toContain('/beatmaps/' + TEST_BEATMAP_OSU_ID);
    });
  });
});
