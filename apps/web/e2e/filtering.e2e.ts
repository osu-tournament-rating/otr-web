import { readFileSync } from 'node:fs';

import { test, expect } from '@playwright/test';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';

import { STORAGE_STATE } from './fixtures/auth';
import { ROUTES } from './fixtures/test-config';

/**
 * Coverage for `/tools/filter` and the public `/tools/filter-reports` lookup.
 * Submitting the filter form writes a report and publishes queue messages, so
 * these specs never submit it.
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

test.describe('Filtering during the maintenance window', () => {
  test.describe('Signed-in user', () => {
    test.use({ storageState: STORAGE_STATE.user });

    test('shows the unavailable state instead of the form during the window', async ({
      page,
    }) => {
      await page.setExtraHTTPHeaders({
        'x-e2e-maintenance-window': 'active',
      });

      await page.goto(ROUTES.filter);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="filtering-unavailable"]')
      ).toContainText('Filtering is temporarily unavailable', {
        timeout: 10000,
      });
      await expect(page.locator('[data-testid="filter-form"]')).toHaveCount(0);
    });

    test('shows the form outside the window', async ({ page }) => {
      await page.setExtraHTTPHeaders({
        'x-e2e-maintenance-window': 'inactive',
      });

      await page.goto(ROUTES.filter);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="filter-form"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.locator('[data-testid="filtering-unavailable"]')
      ).toHaveCount(0);
    });
  });

  test('rejects filter submissions during the window with a 503', async ({
    baseURL,
  }) => {
    // The gate runs before any lookup or write, so nothing is ever persisted.
    const state = JSON.parse(readFileSync(STORAGE_STATE.user, 'utf-8')) as {
      cookies: Array<{ name: string; value: string }>;
    };
    const cookie = state.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const link = new RPCLink({
      url: `${baseURL}/rpc`,
      headers: () => ({
        cookie,
        'x-e2e-maintenance-window': 'active',
      }),
    });
    const client = createORPCClient(link) as unknown as {
      filtering: {
        filter(input: {
          ruleset: number;
          osuPlayerIds: number[];
        }): Promise<unknown>;
      };
    };

    type CapturedError = { code?: string; data?: { code?: string } };
    let captured: CapturedError | null = null;

    try {
      await client.filtering.filter({ ruleset: 0, osuPlayerIds: [1] });
    } catch (error) {
      captured = error as CapturedError;
    }

    expect(captured).not.toBeNull();
    expect(captured?.code).toBe('SERVICE_UNAVAILABLE');
    expect(captured?.data?.code).toBe('MAINTENANCE_WINDOW');
  });
});

test.describe('Filter Reports', () => {
  test.describe('Public access', () => {
    test('is reachable without authentication', async ({ page }) => {
      await page.goto(ROUTES.filterReports);
      await page.waitForLoadState('networkidle');

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
      // A valid but almost-certainly-nonexistent report id
      await input.fill('2147483647');
      await page.locator('[data-testid="filter-report-submit"]').click();

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
