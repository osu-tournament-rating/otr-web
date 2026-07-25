import { test, expect } from '@playwright/test';
import { ROUTES, Ruleset } from './fixtures/test-config';

test.describe('Leaderboard Page', () => {
  // The leaderboard shows a blocking first-visit dialog (with a 5s countdown)
  // until a localStorage flag is set. Pre-set the flag so the dialog never
  // opens and never intercepts pointer events during the tests.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'otr-leaderboard-first-visit-dismissed',
        'true'
      );
    });
  });

  test.describe('Page Load', () => {
    test('displays leaderboard card and title', async ({ page }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const card = page.locator('[data-testid="leaderboard-card"]');
      await expect(card).toBeVisible({ timeout: 10000 });

      const title = page.locator('[data-testid="leaderboard-title"]');
      await expect(title).toBeVisible({ timeout: 10000 });
    });

    test('displays the rankings table', async ({ page }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const table = page.locator('[data-testid="leaderboard-table"]');
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('table renders player ranking rows', async ({ page }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const rows = page.locator('[data-testid^="leaderboard-row-"]');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });

      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('table displays rank, player, tier and rating columns', async ({
      page,
    }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const table = page.locator('[data-testid="leaderboard-table"]');
      await expect(table).toBeVisible({ timeout: 10000 });

      await expect(
        table.getByRole('columnheader', { name: 'Rank' })
      ).toBeVisible({ timeout: 10000 });
      await expect(
        table.getByRole('columnheader', { name: 'Player' })
      ).toBeVisible({ timeout: 10000 });
      await expect(
        table.getByRole('columnheader', { name: 'Tier' })
      ).toBeVisible({ timeout: 10000 });
      await expect(
        table.getByRole('columnheader', { name: 'Rating' })
      ).toBeVisible({ timeout: 10000 });
    });

    test('page title contains expected text', async ({ page }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test.describe('Filters', () => {
    // The filter popover is tall; use a taller viewport so the clear button at
    // the bottom of the popover stays within the clickable viewport area.
    test.use({ viewport: { width: 1280, height: 1080 } });

    test('opens the filter popover from the trigger button', async ({
      page,
    }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const filterButton = page.locator(
        '[data-testid="leaderboard-filter-button"]'
      );
      await expect(filterButton).toBeVisible({ timeout: 10000 });
      await filterButton.click();

      const popover = page.locator(
        '[data-testid="leaderboard-filter-popover"]'
      );
      await expect(popover).toBeVisible({ timeout: 10000 });

      const rulesetGroup = page.locator(
        '[data-testid="leaderboard-filter-ruleset-group"]'
      );
      await expect(rulesetGroup).toBeVisible({ timeout: 10000 });
    });

    test('ruleset filter updates URL and rankings', async ({ page }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="leaderboard-filter-button"]').click();
      await expect(
        page.locator('[data-testid="leaderboard-filter-popover"]')
      ).toBeVisible({ timeout: 10000 });

      const taikoRuleset = page.locator(
        `[data-testid="leaderboard-filter-ruleset-${Ruleset.Taiko}"]`
      );
      await expect(taikoRuleset).toBeVisible({ timeout: 10000 });
      await taikoRuleset.click();

      await page.waitForURL(/ruleset=1/, { timeout: 10000 });
      expect(page.url()).toContain('ruleset=1');

      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('country filter narrows results to a selected country', async ({
      page,
    }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="leaderboard-filter-button"]').click();
      await expect(
        page.locator('[data-testid="leaderboard-filter-popover"]')
      ).toBeVisible({ timeout: 10000 });

      const countryButton = page.locator(
        '[data-testid="leaderboard-filter-country-button"]'
      );
      await expect(countryButton).toBeVisible({ timeout: 10000 });
      await countryButton.click();

      const countrySearch = page.getByPlaceholder('Search countries...');
      await expect(countrySearch).toBeVisible({ timeout: 10000 });
      await countrySearch.fill('United States');

      // The accessible name of each option ends with the country code, so
      // anchoring on "United States US" avoids matching the alphabetically
      // earlier "United States Minor Outlying Islands" (UM) option.
      const option = page.getByRole('option', {
        name: /United States of America US$/,
      });
      await expect(option).toBeVisible({ timeout: 10000 });
      await option.click();

      await page.waitForURL(/country=US/, { timeout: 10000 });
      expect(page.url()).toContain('country=US');

      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('tier filter narrows results to a selected tier', async ({ page }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="leaderboard-filter-button"]').click();
      await expect(
        page.locator('[data-testid="leaderboard-filter-popover"]')
      ).toBeVisible({ timeout: 10000 });

      const tiers = page.locator('[data-testid="leaderboard-filter-tiers"]');
      await expect(tiers).toBeVisible({ timeout: 10000 });
      await tiers.click();

      const goldOption = page.getByRole('option', { name: /Gold/i });
      await expect(goldOption.first()).toBeVisible({ timeout: 10000 });
      await goldOption.first().click();

      await page.waitForURL(/tiers/, { timeout: 10000 });
      expect(page.url()).toContain('tiers');

      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('combining ruleset and country filters works together', async ({
      page,
    }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      // Apply ruleset filter
      await page.locator('[data-testid="leaderboard-filter-button"]').click();
      await expect(
        page.locator('[data-testid="leaderboard-filter-popover"]')
      ).toBeVisible({ timeout: 10000 });
      await page
        .locator(`[data-testid="leaderboard-filter-ruleset-${Ruleset.Taiko}"]`)
        .click();
      await page.waitForURL(/ruleset=1/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // Applying the ruleset filter does not close the popover, and it persists
      // across the soft navigation. Only re-open it if it has actually closed,
      // otherwise clicking the trigger again would toggle it shut.
      const popover = page.locator(
        '[data-testid="leaderboard-filter-popover"]'
      );
      if (!(await popover.isVisible())) {
        await page.locator('[data-testid="leaderboard-filter-button"]').click();
      }
      await expect(popover).toBeVisible({ timeout: 10000 });
      await page
        .locator('[data-testid="leaderboard-filter-country-button"]')
        .click();
      const countrySearch = page.getByPlaceholder('Search countries...');
      await expect(countrySearch).toBeVisible({ timeout: 10000 });
      await countrySearch.fill('United States');
      const option = page.getByRole('option', {
        name: /United States of America US$/,
      });
      await expect(option).toBeVisible({ timeout: 10000 });
      await option.click();

      await page.waitForURL(/country=US/, { timeout: 10000 });
      expect(page.url()).toContain('ruleset=1');
      expect(page.url()).toContain('country=US');

      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('clear filters button resets to the base leaderboard URL', async ({
      page,
    }) => {
      await page.goto(`${ROUTES.leaderboard}?country=US`);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="leaderboard-filter-button"]').click();
      await expect(
        page.locator('[data-testid="leaderboard-filter-popover"]')
      ).toBeVisible({ timeout: 10000 });

      const clearButton = page.locator(
        '[data-testid="leaderboard-filter-clear-button"]'
      );
      await expect(clearButton).toBeVisible({ timeout: 10000 });
      await clearButton.click();

      await page.waitForURL(/\/leaderboard$/, { timeout: 10000 });
      expect(page.url()).not.toContain('country=');
    });
  });

  test.describe('Query Parameters', () => {
    test('loads filtered state from a ruleset query param', async ({
      page,
    }) => {
      await page.goto(`${ROUTES.leaderboard}?ruleset=${Ruleset.Taiko}`);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain(`ruleset=${Ruleset.Taiko}`);
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });

      const rows = page.locator('[data-testid^="leaderboard-row-"]');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });
    });

    test('loads filtered state from a country query param', async ({
      page,
    }) => {
      await page.goto(`${ROUTES.leaderboard}?country=US`);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('country=US');
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('preserves query params on page reload', async ({ page }) => {
      await page.goto(`${ROUTES.leaderboard}?ruleset=${Ruleset.Taiko}`);
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain(`ruleset=${Ruleset.Taiko}`);
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Pagination', () => {
    test('displays pagination controls', async ({ page }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const pagination = page.locator('[data-testid="leaderboard-pagination"]');
      await expect(pagination).toBeVisible({ timeout: 10000 });

      await expect(
        page.locator('[data-testid="leaderboard-pagination-prev"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="leaderboard-pagination-next"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('next button advances to page 2 and updates the URL', async ({
      page,
    }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const firstRowId = await page
        .locator('[data-testid^="leaderboard-row-"]')
        .first()
        .getAttribute('data-testid');

      const nextButton = page.locator(
        '[data-testid="leaderboard-pagination-next"]'
      );
      await expect(nextButton).toBeVisible({ timeout: 10000 });
      await nextButton.click();

      await page.waitForURL(/page=2/, { timeout: 10000 });
      expect(page.url()).toContain('page=2');

      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });

      const newFirstRowId = await page
        .locator('[data-testid^="leaderboard-row-"]')
        .first()
        .getAttribute('data-testid');
      expect(newFirstRowId).not.toBe(firstRowId);
    });

    test('prev button returns from page 2 to page 1', async ({ page }) => {
      await page.goto(`${ROUTES.leaderboard}?page=2`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('page=2');

      const prevButton = page.locator(
        '[data-testid="leaderboard-pagination-prev"]'
      );
      await expect(prevButton).toBeVisible({ timeout: 10000 });
      await prevButton.click();

      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });
      expect(page.url()).not.toContain('page=2');
    });

    test('clicking a numbered page control updates the URL', async ({
      page,
    }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const pageTwo = page.locator(
        '[data-testid="leaderboard-pagination-page-2"]'
      );
      await expect(pageTwo).toBeVisible({ timeout: 10000 });
      await pageTwo.click();

      await page.waitForURL(/page=2/, { timeout: 10000 });
      expect(page.url()).toContain('page=2');

      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Navigation and Links', () => {
    test('a player row link navigates to the player profile', async ({
      page,
    }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const playerLink = page
        .locator('[data-testid^="leaderboard-row-"]')
        .first()
        .locator('a[href*="/players/"]');
      await expect(playerLink).toBeVisible({ timeout: 10000 });

      const href = await playerLink.getAttribute('href');
      expect(href).toMatch(/\/players\/\d+/);

      await playerLink.click();
      await page.waitForURL(/\/players\/\d+/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/players\/\d+/);
    });

    test('a country cell link navigates to a filtered country leaderboard', async ({
      page,
    }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      const countryLink = page
        .locator('[data-testid^="leaderboard-row-"]')
        .first()
        .locator('a[href*="/leaderboard?country="]');
      await expect(countryLink).toBeVisible({ timeout: 10000 });

      const href = await countryLink.getAttribute('href');
      expect(href).toContain('country=');

      await countryLink.click();
      await page.waitForURL(/country=/, { timeout: 10000 });
      expect(page.url()).toContain('country=');
    });
  });

  test.describe('Authentication Gating', () => {
    test('friends tab is gated for unauthenticated users', async ({ page }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      // Tabs (including the Friends tab) only render for an authenticated
      // session, so an unauthenticated visitor should not see them.
      const tabs = page.locator('[data-testid="leaderboard-tabs"]');
      await expect(tabs).toHaveCount(0);
    });

    test('navigating directly to the friends tab redirects to the base leaderboard', async ({
      page,
    }) => {
      await page.goto(`${ROUTES.leaderboard}?friend=true`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="leaderboard-table"]')
      ).toBeVisible({ timeout: 10000 });
      expect(page.url()).not.toContain('friend=true');
    });
  });
});
