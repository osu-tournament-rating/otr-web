import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './fixtures/auth';
import { ROUTES } from './fixtures/test-config';

/**
 * Deeper coverage for the admin dashboard and admin reports pages. The minimal
 * "admin can open the dashboard" / "regular user is redirected" smoke tests live
 * in auth.e2e.ts; these specs exercise the dashboard tool cards, navigation, and
 * the reports list/table with read-only interactions only (no mutations).
 */
test.describe('Admin pages', () => {
  test.describe('Admin role', () => {
    test.use({ storageState: STORAGE_STATE.admin });

    test.describe('Dashboard', () => {
      test('renders heading and main tool cards', async ({ page }) => {
        await page.goto(ROUTES.admin);
        await page.waitForLoadState('networkidle');

        await expect(
          page.locator('[data-testid="admin-dashboard"]')
        ).toBeVisible({ timeout: 10000 });

        const heading = page.locator('[data-testid="admin-heading"]');
        await expect(heading).toBeVisible({ timeout: 10000 });
        await expect(heading).toHaveText('Admin');

        await expect(
          page.locator('[data-testid="admin-tool-user-lookup"]')
        ).toBeVisible({ timeout: 10000 });
        await expect(
          page.locator('[data-testid="admin-tool-mass-enqueue"]')
        ).toBeVisible({ timeout: 10000 });
      });

      test('user lookup form exposes its search controls', async ({ page }) => {
        await page.goto(ROUTES.admin);
        await page.waitForLoadState('networkidle');

        const form = page.locator('[data-testid="admin-user-lookup-form"]');
        await expect(form).toBeVisible({ timeout: 10000 });

        // Read-only: type a query without submitting it.
        const input = form.locator('#admin-player-search');
        await expect(input).toBeVisible();
        await input.fill('Stage');
        await expect(input).toHaveValue('Stage');
      });
    });

    test.describe('Reports', () => {
      test('renders heading and reports card for an admin', async ({
        page,
      }) => {
        await page.goto(ROUTES.adminReports);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('[data-testid="admin-reports"]')).toBeVisible(
          {
            timeout: 10000,
          }
        );

        const heading = page.locator('[data-testid="admin-reports-heading"]');
        await expect(heading).toBeVisible({ timeout: 10000 });
        await expect(heading).toHaveText('Data Reports');

        await expect(
          page.locator('[data-testid="admin-reports-card"]')
        ).toBeVisible({ timeout: 10000 });
      });

      test('renders either a reports list or an empty state', async ({
        page,
      }) => {
        await page.goto(ROUTES.adminReports);
        await page.waitForLoadState('networkidle');

        const list = page.locator('[data-testid="admin-reports-list"]');
        const empty = page.locator('[data-testid="admin-reports-empty"]');

        // Data may be sparse: tolerate either the populated table or empty state.
        const hasList = await list
          .isVisible({ timeout: 15000 })
          .catch(() => false);

        if (hasList) {
          const rows = page.locator('[data-testid="admin-reports-row"]');
          expect(await rows.count()).toBeGreaterThan(0);
        } else {
          await expect(empty).toBeVisible({ timeout: 10000 });
        }
      });

      test('status filter opens and exposes status options', async ({
        page,
      }) => {
        await page.goto(ROUTES.adminReports);
        await page.waitForLoadState('networkidle');

        const filter = page.locator(
          '[data-testid="admin-reports-status-filter"]'
        );
        await expect(filter).toBeVisible({ timeout: 10000 });

        await filter.click();

        await expect(
          page.getByRole('option', { name: 'All statuses' })
        ).toBeVisible({ timeout: 10000 });
        await expect(
          page.getByRole('option', { name: 'Pending' })
        ).toBeVisible();
        await expect(
          page.getByRole('option', { name: 'Approved' })
        ).toBeVisible();
        await expect(
          page.getByRole('option', { name: 'Rejected' })
        ).toBeVisible();

        // Apply a filter and confirm it sticks (read-only, no mutation).
        await page.getByRole('option', { name: 'Pending' }).click();
        await expect(filter).toContainText('Pending', { timeout: 10000 });
      });

      test('a report entity link navigates to its entity page', async ({
        page,
      }) => {
        await page.goto(ROUTES.adminReports);
        await page.waitForLoadState('networkidle');

        const list = page.locator('[data-testid="admin-reports-list"]');
        const hasList = await list
          .isVisible({ timeout: 15000 })
          .catch(() => false);

        // Skip gracefully when no report rows exist in the dev database.
        if (!hasList) {
          return;
        }

        const entityLink = page
          .locator('[data-testid="admin-reports-entity-link"]')
          .first();

        const hasLink = await entityLink
          .isVisible({ timeout: 10000 })
          .catch(() => false);
        if (!hasLink) {
          return;
        }

        const href = await entityLink.getAttribute('href');
        // Only follow real entity links (placeholder links resolve to '#').
        if (!href || href === '#') {
          return;
        }

        await entityLink.click();
        await page.waitForURL(`**${href}`, { timeout: 15000 });
        expect(page.url()).toContain(href);
      });
    });
  });

  test.describe('Regular user role', () => {
    test.use({ storageState: STORAGE_STATE.user });

    test('is redirected away from the admin reports page', async ({ page }) => {
      await page.goto(ROUTES.adminReports);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/unauthorized/, { timeout: 10000 });
    });
  });
});
