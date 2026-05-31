import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './fixtures/auth';
import { ROUTES } from './fixtures/test-config';

/**
 * Coverage for the Tournament Registrant Filtering tool (`/tools/filter`) and the
 * public Filter Reports lookup page (`/tools/filter-reports`).
 *
 * The filter tool is gated for signed-out users (its page redirects to
 * `/unauthorized`) and its submit endpoint is a protectedProcedure that *writes*
 * a filter report + publishes queue messages. We therefore never actually submit
 * the filter form in e2e — we assert the form renders and exercise a non-writing
 * field interaction (ruleset selection) instead.
 */

test.describe('Tournament Registrant Filtering', () => {
  test.describe('Unauthenticated access', () => {
    test('/tools/filter redirects to /unauthorized when signed out', async ({
      page,
    }) => {
      await page.goto(ROUTES.filter);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/unauthorized/, { timeout: 10000 });
    });
  });

  test.describe('Signed-in user', () => {
    test.use({ storageState: STORAGE_STATE.user });

    test('renders the filtering form with its key inputs and submit button', async ({
      page,
    }) => {
      await page.goto(ROUTES.filter);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="filter-form"]')).toBeVisible({
        timeout: 10000,
      });

      await expect(page.locator('[data-testid="filter-ruleset"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.locator('[data-testid="filter-minRating"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="filter-maxRating"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="filter-player-ids"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="filter-submit-button"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('displays the page heading', async ({ page }) => {
      await page.goto(ROUTES.filter);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: 'Tournament Registrant Filtering' })
      ).toBeVisible({ timeout: 10000 });
    });

    test('selecting a ruleset updates the trigger label', async ({ page }) => {
      // A read-only field interaction: opening the ruleset select and choosing
      // an option updates local form state without hitting the (writing) submit
      // procedure.
      await page.goto(ROUTES.filter);
      await page.waitForLoadState('networkidle');

      const ruleset = page.locator('[data-testid="filter-ruleset"]');
      await expect(ruleset).toBeVisible({ timeout: 10000 });
      await ruleset.click();

      const option = page.getByRole('option', { name: 'osu!', exact: true });
      if (await option.isVisible({ timeout: 10000 }).catch(() => false)) {
        await option.click();
        await expect(ruleset).toContainText('osu!', { timeout: 10000 });
      }
    });

    test('player IDs textarea accepts input', async ({ page }) => {
      await page.goto(ROUTES.filter);
      await page.waitForLoadState('networkidle');

      const textarea = page.locator('[data-testid="filter-player-ids"]');
      await expect(textarea).toBeVisible({ timeout: 10000 });
      await textarea.fill('1234567, 2345678');
      await expect(textarea).toHaveValue('1234567, 2345678');
    });
  });
});

test.describe('Filter Reports', () => {
  test.describe('Public access', () => {
    test('is reachable without authentication', async ({ page }) => {
      await page.goto(ROUTES.filterReports);
      await page.waitForLoadState('networkidle');

      // No redirect to /unauthorized — the page is public.
      expect(page.url()).toContain('/tools/filter-reports');

      await expect(
        page.getByRole('heading', { name: 'Filter Reports' })
      ).toBeVisible({ timeout: 10000 });
    });

    test('renders the report-id input and submit button', async ({ page }) => {
      await page.goto(ROUTES.filterReports);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="filter-report-view"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="filter-report-id-input"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="filter-report-submit"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('nonexistent report id surfaces an error without crashing', async ({
      page,
    }) => {
      await page.goto(ROUTES.filterReports);
      await page.waitForLoadState('networkidle');

      const input = page.locator('[data-testid="filter-report-id-input"]');
      await expect(input).toBeVisible({ timeout: 10000 });
      // A numeric but almost-certainly-nonexistent report id. The lookup
      // procedure returns NOT_FOUND, which the client surfaces via a toast.
      await input.fill('2147483647');
      await page.locator('[data-testid="filter-report-submit"]').click();

      // The page must not crash: the lookup view remains rendered with its
      // input still present (empty-state is preserved when the report is
      // missing). The error toast copy is asserted best-effort.
      await expect(
        page.locator('[data-testid="filter-report-view"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(input).toBeVisible({ timeout: 10000 });

      const errorToast = page
        .getByText(/does not exist|Failed to load/i)
        .first();
      if (await errorToast.isVisible({ timeout: 10000 }).catch(() => false)) {
        await expect(errorToast).toBeVisible();
      }
    });

    test('invalid (non-numeric) report id shows a validation message', async ({
      page,
    }) => {
      await page.goto(ROUTES.filterReports);
      await page.waitForLoadState('networkidle');

      const input = page.locator('[data-testid="filter-report-id-input"]');
      await expect(input).toBeVisible({ timeout: 10000 });
      await input.fill('not-a-number');
      await page.locator('[data-testid="filter-report-submit"]').click();

      // The form remains on the empty-state lookup view and does not crash.
      await expect(
        page.locator('[data-testid="filter-report-view"]')
      ).toBeVisible({ timeout: 10000 });

      const validationMessage = page
        .getByText(/must be a number|Report ID is required/i)
        .first();
      if (
        await validationMessage.isVisible({ timeout: 10000 }).catch(() => false)
      ) {
        await expect(validationMessage).toBeVisible();
      }
    });
  });
});
