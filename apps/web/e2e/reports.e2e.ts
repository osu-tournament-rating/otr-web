import { test, expect } from '@playwright/test';
import { ReportEntityType, ReportStatus } from '@otr/core/osu';

import { STORAGE_STATE } from './fixtures/auth';
import { createOrpcClientForRole } from './fixtures/orpc';
import { ROUTES, TEST_TOURNAMENT_ID } from './fixtures/test-config';

/**
 * Read-only "Your Reports" view for regular users. Covers access control
 * (logged-out / admin / user), profile-menu visibility, and the core unread
 * admin-update indicator: a dot appears for a resolved report and clears once
 * the reporter opens it. The unread spec seeds its own data via oRPC (create as
 * the user, resolve as an admin) so it does not depend on pre-existing rows.
 */
test.describe('Your Reports', () => {
  test.describe('Unauthenticated access', () => {
    test('redirects an unauthenticated visitor to /unauthorized', async ({
      page,
    }) => {
      await page.goto(ROUTES.reports);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/unauthorized/, { timeout: 10000 });
    });
  });

  test.describe('Admin role', () => {
    test.use({ storageState: STORAGE_STATE.admin });

    test('is redirected to the admin reports view', async ({ page }) => {
      await page.goto(ROUTES.reports);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/admin\/reports/, { timeout: 10000 });
      await expect(
        page.locator('[data-testid="admin-reports-heading"]')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Regular user role', () => {
    test.use({ storageState: STORAGE_STATE.user });

    test('renders the Your Reports heading and card', async ({ page }) => {
      await page.goto(ROUTES.reports);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { level: 1, name: 'Your Reports' })
      ).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="my-reports-card"]')).toBeVisible(
        { timeout: 10000 }
      );
    });

    test('the profile menu exposes Reports (and not Admin) for a regular user', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('banner')
        .getByRole('img', { name: /avatar$/i })
        .click();

      const reportsItem = page.getByRole('menuitem', { name: 'Reports' });
      await expect(reportsItem).toBeVisible({ timeout: 10000 });
      await expect(reportsItem).toHaveAttribute('href', ROUTES.reports);
      await expect(page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(
        0
      );
    });

    test('an unread admin update shows a dot that clears when the report is opened', async ({
      page,
    }) => {
      // Arrange: create a report as the user, then resolve it as an admin. A
      // resolved report the reporter has not yet viewed is "unread".
      const userClient = createOrpcClientForRole('user');
      const adminClient = createOrpcClientForRole('admin');

      const created = await userClient.reports.create({
        entityType: ReportEntityType.Tournament,
        entityId: TEST_TOURNAMENT_ID,
        suggestedChanges: { name: 'E2E unread-indicator probe' },
        justification: 'E2E: verifying the unread admin-update indicator',
      });
      expect(created.reportId).toBeGreaterThan(0);

      await adminClient.reports.resolve({
        reportId: created.reportId!,
        status: ReportStatus.Approved,
        adminNote: 'E2E admin response',
      });

      // Act: view the reports list. The freshly resolved report is the newest,
      // so it is the first row and must carry the unread dot.
      await page.goto(ROUTES.reports);
      await page.waitForLoadState('networkidle');

      const dots = page.locator('[data-testid="my-reports-unread-dot"]');
      const before = await dots.count();
      expect(before).toBeGreaterThan(0);

      const firstRow = page.locator('[data-testid="my-reports-row"]').first();
      await expect(
        firstRow.locator('[data-testid="my-reports-unread-dot"]')
      ).toBeVisible({ timeout: 10000 });
      await firstRow.click();

      // Assert: the detail view is read-only and surfaces the admin response.
      const dialog = page.locator('[data-testid="my-report-detail"]');
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await expect(
        dialog.getByText('Admin Response', { exact: true })
      ).toBeVisible();
      await expect(dialog.getByText('E2E admin response')).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: /confirm|dismiss|reopen/i })
      ).toHaveCount(0);

      // Closing the report acknowledges the update: one fewer dot, and it stays
      // cleared after a reload (the view timestamp is persisted server-side).
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({ timeout: 10000 });
      await expect(dots).toHaveCount(before - 1, { timeout: 10000 });

      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[data-testid="my-reports-unread-dot"]')
      ).toHaveCount(before - 1, { timeout: 10000 });
    });
  });
});
