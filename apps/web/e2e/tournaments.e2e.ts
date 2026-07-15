import { test, expect } from '@playwright/test';
import {
  ROUTES,
  TEST_PUBLIC_TOURNAMENT_ID,
  Ruleset,
} from './fixtures/test-config';

test.describe('Tournaments', () => {
  test.describe('Listing and Search', () => {
    test('loads the tournaments page with a list of tournaments', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { level: 1, name: 'Tournaments' })
      ).toBeVisible();
      await expect(
        page.getByText(/browse tournament submissions and their review status/i)
      ).toBeVisible();
      await expect(
        page.getByText(/only verified data is included in ratings/i)
      ).toBeVisible();

      const items = page.locator('[data-testid="tournament-list-item"]');
      await expect(items.first()).toBeVisible({ timeout: 10000 });
      expect(await items.count()).toBeGreaterThan(0);

      const results = page.locator('[data-testid="tournament-results"]');
      await expect(results).toBeVisible();
      await expect(results.locator('[data-slot="card"]')).toHaveCount(0);
      await expect(
        results.getByText('Tournament', { exact: true })
      ).toBeVisible();
      await expect(
        results.getByText('Tournament and review status', { exact: true })
      ).toHaveCount(0);
    });

    test('displays the search input', async ({ page }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');

      const search = page.locator('[data-testid="tournament-search-input"]');
      await expect(search).toBeVisible({ timeout: 10000 });
    });

    test('search by title returns matching tournaments', async ({ page }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');

      const search = page.locator('[data-testid="tournament-search-input"]');
      await expect(search).toBeVisible({ timeout: 10000 });
      await search.fill('Dio');
      await search.press('Enter');

      await page.waitForURL(/searchQuery=Dio/i, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      const items = page.locator('[data-testid="tournament-list-item"]');
      await expect(items.first()).toBeVisible({ timeout: 10000 });
      await expect(items.first().getByText(/Dio/i).first()).toBeVisible({
        timeout: 10000,
      });
    });

    test('search by abbreviation returns matching tournaments', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');

      const search = page.locator('[data-testid="tournament-search-input"]');
      await expect(search).toBeVisible({ timeout: 10000 });
      await search.fill('DAS');
      await search.press('Enter');

      await page.waitForURL(/searchQuery=DAS/i, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      const items = page.locator('[data-testid="tournament-list-item"]');
      await expect(items.first()).toBeVisible({ timeout: 10000 });
      expect(await items.count()).toBeGreaterThan(0);
    });

    test('filter by ruleset narrows results via URL query', async ({
      page,
    }) => {
      await page.goto(`${ROUTES.tournaments}?ruleset=${Ruleset.Osu}`);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain(`ruleset=${Ruleset.Osu}`);

      const items = page.locator('[data-testid="tournament-list-item"]');
      await expect(items.first()).toBeVisible({ timeout: 10000 });
      expect(await items.count()).toBeGreaterThan(0);
    });

    test('opens the filters popover when the filters button is clicked', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');

      const filtersButton = page.locator(
        '[data-testid="tournament-filters-button"]'
      );
      await expect(filtersButton).toBeVisible({ timeout: 10000 });
      await filtersButton.click();

      const filterSheet = page.getByRole('dialog', {
        name: 'Filter tournaments',
      });
      await expect(filterSheet).toBeVisible({ timeout: 10000 });
      await expect(
        filterSheet.getByText('Status', { exact: true })
      ).toBeVisible();
      await expect(filterSheet.getByText(/current review state/i)).toHaveCount(
        0
      );
      await expect(filterSheet.getByText(/find events within/i)).toHaveCount(0);
      await expect(filterSheet.getByText(/narrow submissions by/i)).toHaveCount(
        0
      );
    });

    test('rank slider uses tiered keyboard steps', async ({ page }) => {
      const thresholds = [
        { current: 999, next: 1_000 },
        { current: 1_000, next: 1_100 },
        { current: 5_000, next: 5_500 },
        { current: 10_000, next: 11_000 },
      ];

      for (const { current, next } of thresholds) {
        await page.goto(`${ROUTES.tournaments}?minRankRange=${current}`);
        await page.waitForLoadState('networkidle');
        await page.locator('[data-testid="tournament-filters-button"]').click();

        const minimumRank = page.getByRole('slider', {
          name: 'Minimum rank',
        });
        await minimumRank.press('ArrowRight');

        await expect(page.locator('#tournament-min-rank')).toHaveValue(
          String(next)
        );
        await expect
          .poll(
            () => new URL(page.url()).searchParams.get('minRankRange') ?? '1'
          )
          .toBe(String(next));
      }
    });

    test('quick ruleset filter updates and clears the URL', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'taiko', exact: true }).click();
      await page.waitForURL(/ruleset=1/);

      await page.getByRole('button', { name: 'All', exact: true }).click();
      await page.waitForURL(
        (url) =>
          url.pathname === ROUTES.tournaments &&
          !url.searchParams.has('ruleset')
      );
    });

    test('sort direction exposes its state and updates the URL', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');

      const direction = page.locator(
        '[data-testid="tournament-sort-direction"]'
      );
      await expect(direction).toHaveAccessibleName(/sort order is descending/i);
      await direction.click();

      await page.waitForURL(/descending=false/);
      await expect(direction).toHaveAccessibleName(/sort order is ascending/i);
    });

    test('advanced status filter stays visible and can be removed', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="tournament-filters-button"]').click();
      await page.locator('[data-testid="tournament-status-filter"]').click();
      await page
        .getByRole('menuitemcheckbox', { name: 'Verified', exact: true })
        .click();
      await page.waitForURL(/verificationStatus=4/);
      await page.getByRole('button', { name: 'Done', exact: true }).click();

      const activeFilter = page.getByRole('button', {
        name: 'Remove Status: Verified filter',
      });
      await expect(activeFilter).toBeVisible();
      await activeFilter.click();
      await page.waitForURL(
        (url) =>
          url.pathname === ROUTES.tournaments &&
          !url.searchParams.has('verificationStatus')
      );
    });

    test('rank restriction defaults to 200000 and accepts larger values', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');
      await page.locator('[data-testid="tournament-filters-button"]').click();

      const maximumRank = page.locator('#tournament-max-rank');
      await expect(maximumRank).toHaveValue('200000');
      await maximumRank.fill('250000');
      await maximumRank.blur();

      await expect
        .poll(() => new URL(page.url()).searchParams.get('maxRankRange'))
        .toBe('250000');
    });

    test('filters by multiple rejection reasons from a checkbox menu', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');
      await page.locator('[data-testid="tournament-filters-button"]').click();
      await page
        .locator('[data-testid="tournament-rejection-reason-filter"]')
        .click();

      await page
        .getByRole('menuitemcheckbox', {
          name: 'No Verified Matches',
          exact: true,
        })
        .click();
      await page
        .getByRole('menuitemcheckbox', {
          name: 'Abnormal Format',
          exact: true,
        })
        .click();

      await expect
        .poll(() => new URL(page.url()).searchParams.get('rejectionReason'))
        .toBe('9');
    });

    test('empty search offers a clear path back to the archive', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournaments);
      await page.waitForLoadState('networkidle');

      const search = page.locator('[data-testid="tournament-search-input"]');
      await search.fill('definitely-not-a-real-tournament-12345');
      await search.press('Enter');
      await page.waitForURL(
        /searchQuery=definitely-not-a-real-tournament-12345/
      );

      const emptyState = page.locator('[data-testid="tournament-empty-state"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState.getByText('No tournaments match')).toBeVisible();
      await emptyState.getByRole('link', { name: 'Clear filters' }).click();

      await page.waitForURL(
        (url) => url.pathname === ROUTES.tournaments && url.search === ''
      );
      await expect(
        page.locator('[data-testid="tournament-list-item"]').first()
      ).toBeVisible();
    });

    test('combination of search and ruleset filters works together', async ({
      page,
    }) => {
      await page.goto(
        `${ROUTES.tournaments}?ruleset=${Ruleset.Osu}&searchQuery=Dio`
      );
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain(`ruleset=${Ruleset.Osu}`);
      expect(page.url()).toContain('searchQuery=Dio');

      const items = page.locator('[data-testid="tournament-list-item"]');
      await expect(items.first()).toBeVisible({ timeout: 10000 });
      await expect(items.first().getByText(/Dio/i).first()).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Detail Page', () => {
    test('loads with tournament header info', async ({ page }) => {
      await page.goto(ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID));
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toBeVisible({ timeout: 10000 });
      await expect(heading).not.toBeEmpty();

      await expect(page.locator('[data-testid="tournament-tabs"]')).toBeVisible(
        { timeout: 10000 }
      );
    });

    test('page title is populated', async ({ page }) => {
      await page.goto(ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID));
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });

    test('matches tab lists matches', async ({ page }) => {
      await page.goto(
        `${ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID)}?tab=matches`
      );
      await page.waitForLoadState('networkidle');

      const matchesTab = page.locator('[data-testid="tab-matches"]');
      await expect(matchesTab).toBeVisible({ timeout: 10000 });
      await matchesTab.click();
      await page.waitForLoadState('networkidle');

      const content = page.locator('[data-testid="tab-content-matches"]');
      await expect(content).toBeVisible({ timeout: 10000 });
      await expect(content.getByText('Matches').first()).toBeVisible({
        timeout: 10000,
      });
    });

    test('beatmaps tab lists pooled beatmaps', async ({ page }) => {
      await page.goto(
        `${ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID)}?tab=beatmaps`
      );
      await page.waitForLoadState('networkidle');

      const beatmapsTab = page.locator('[data-testid="tab-beatmaps"]');
      await expect(beatmapsTab).toBeVisible({ timeout: 10000 });
      await beatmapsTab.click();
      await page.waitForLoadState('networkidle');

      const content = page.locator('[data-testid="tab-content-beatmaps"]');
      await expect(content).toBeVisible({ timeout: 10000 });
      await expect(content.getByText('Pooled Beatmaps').first()).toBeVisible({
        timeout: 10000,
      });
    });

    test('ratings tab shows player ratings', async ({ page }) => {
      await page.goto(
        `${ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID)}?tab=ratings`
      );
      await page.waitForLoadState('networkidle');

      const ratingsTab = page.locator('[data-testid="tab-ratings"]');
      await expect(ratingsTab).toBeVisible({ timeout: 10000 });
      await ratingsTab.click();
      await page.waitForLoadState('networkidle');

      const content = page.locator('[data-testid="tab-content-ratings"]');
      await expect(content).toBeVisible({ timeout: 10000 });
    });

    test('stats tab renders tournament statistics content', async ({
      page,
    }) => {
      await page.goto(
        `${ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID)}?tab=stats`
      );
      await page.waitForLoadState('networkidle');

      const statsTab = page.locator('[data-testid="tab-stats"]');
      await expect(statsTab).toBeVisible({ timeout: 10000 });
      await statsTab.click();
      await page.waitForLoadState('networkidle');

      const content = page.locator('[data-testid="tab-content-stats"]');
      await expect(content).toBeVisible({ timeout: 15000 });
      // The stats tab renders the Tournament Statistics summary
      // (StatCards) plus Top Performers; assert the real statistics
      // content rather than a chart, which this view does not render.
      await expect(
        content.getByText('Tournament Statistics').first()
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Submission', () => {
    test('submit page renders the submission form', async ({ page }) => {
      await page.goto(ROUTES.tournamentSubmit);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="tournament-submission-form"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('submit button is present for the submission action', async ({
      page,
    }) => {
      await page.goto(ROUTES.tournamentSubmit);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="tournament-submit-button"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('submission is auth-gated for unauthenticated users', async ({
      page,
    }) => {
      // The submit procedure is a protectedProcedure, so the underlying
      // POST endpoint must reject an unauthenticated request. Assert the
      // gate at the API boundary rather than performing a real submission.
      const response = await page.request.post('/api/tournaments:submit', {
        data: {
          name: 'E2E Gate Check',
          abbreviation: 'EGC',
          forumUrl: 'https://osu.ppy.sh/community/forums/topics/1',
          ruleset: Ruleset.Osu,
          rankRangeLowerBound: 1,
          lobbySize: 1,
          ids: [1],
          beatmapIds: [],
        },
        failOnStatusCode: false,
      });

      expect(response.ok()).toBe(false);
      expect([401, 403]).toContain(response.status());
    });
  });
});
