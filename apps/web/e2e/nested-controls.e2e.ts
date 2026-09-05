import { test, expect, type Page } from '@playwright/test';
import {
  ROUTES,
  TEST_PLAYER_ID,
  TEST_PUBLIC_TOURNAMENT_ID,
  TEST_MATCH_ID,
  TEST_BEATMAP_OSU_ID,
  TEST_AUDIT_MATCH_ID,
} from './fixtures/test-config';
import { STORAGE_STATE } from './fixtures/auth';

/**
 * A tooltip trigger is a real control, so a component that adds one has to know
 * it is not rendering inside a link, a button, or a listbox option. Nothing in
 * the type system says which, so the rendered pages assert it.
 *
 * The sweep covers page content and open dialogs. The site header is excluded:
 * its links wrap buttons, which predates any of this. It reports a button or a
 * link inside any of those containers; a focusable `[tabindex]` that is neither
 * is not reported, so a page that needs that covered asserts it directly.
 */
const CONTAINER = 'button, a[href], [role="option"], [role="button"]';

async function nestedControls(page: Page) {
  return page.evaluate(
    (container) =>
      [...document.querySelectorAll('main, [role="dialog"]')].flatMap((root) =>
        [...root.querySelectorAll('button, a[href]')].flatMap((el) => {
          const outer = el.parentElement?.closest(container);
          if (!outer || !root.contains(outer)) return [];
          // Pre-existing: an audit row's collapsible trigger wraps the acting
          // user's profile link. Tracked in #887. A nested *button* there is
          // still a failure, which is what a tooltip trigger would add.
          if (
            el.tagName === 'A' &&
            outer.getAttribute('data-slot') === 'collapsible-trigger'
          )
            return [];
          const name = (node: Element) =>
            node.getAttribute('aria-label') ??
            node.textContent?.trim().slice(0, 40) ??
            '';
          return [
            `${outer.tagName}[${name(outer)}] > ${el.tagName}[${name(el)}]`,
          ];
        })
      ),
    CONTAINER
  );
}

/** Each page names something it must have rendered, so the sweep cannot pass empty. */
const PAGES = [
  [
    'player profile',
    ROUTES.playerProfile(TEST_PLAYER_ID),
    '[data-testid="player-rating-chart"]',
  ],
  ['leaderboard', ROUTES.leaderboard, 'table tbody tr'],
  [
    'tournament list',
    ROUTES.tournaments,
    '[data-testid="tournament-list-item"]',
  ],
  [
    'tournament',
    ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID),
    '[data-testid="tab-content-matches"]',
  ],
  ['match', ROUTES.match(TEST_MATCH_ID), '[data-testid="match-tabs"]'],
  [
    'beatmap',
    ROUTES.beatmap(TEST_BEATMAP_OSU_ID),
    '[data-testid="beatmap-leaderboard"]',
  ],
  ['beatmap list', ROUTES.beatmaps, '[data-testid^="beatmap-list-row-"]'],
  [
    'audit log',
    ROUTES.auditMatch(TEST_AUDIT_MATCH_ID),
    '[data-testid="timeline-entry"]',
  ],
] as const;

test.describe('No nested interactive controls', () => {
  for (const [name, url, sentinel] of PAGES) {
    test(name, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await expect(page.locator(sentinel).first()).toBeVisible({
        timeout: 10000,
      });

      expect(await nestedControls(page), `nested controls on ${url}`).toEqual(
        []
      );
    });
  }

  test.describe('search results', () => {
    test.use({ storageState: STORAGE_STATE.user });

    test('a tournament result holds no controls', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await page.keyboard.press('ControlOrMeta+KeyK');
      await expect(page.locator('[data-testid="search-dialog"]')).toBeVisible({
        timeout: 10000,
      });
      const input = page.locator('[data-testid="search-input"]');
      await expect(input).toBeVisible({ timeout: 10000 });

      // A tournament result carries the verification badge, the one search
      // result element that renders a tooltip over a status.
      await input.fill("Dio's Autumn");
      const result = page.locator(
        `[data-testid="search-group-tournaments"] [data-value="tournament-${TEST_PUBLIC_TOURNAMENT_ID}"]`
      );
      await expect(result).toBeVisible({ timeout: 10000 });

      expect(await nestedControls(page), 'nested controls in search').toEqual(
        []
      );
      expect(
        await result.locator('button, a').count(),
        'controls inside a search result'
      ).toBe(0);
    });
  });
});

test('an icon-only tooltip trigger is reachable by Tab', async ({ page }) => {
  await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
  await page.waitForLoadState('networkidle');

  const trigger = page.getByRole('button', {
    name: 'About the rating history chart',
  });
  await expect(trigger).toBeVisible({ timeout: 10000 });

  // Start from a control after it rather than tabbing from the page top.
  await page.getByRole('tab', { name: 'Chart' }).focus();

  for (let press = 0; press < 30; press += 1) {
    if (await trigger.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Shift+Tab');
  }

  throw new Error('the rating chart tooltip trigger was never focused');
});
