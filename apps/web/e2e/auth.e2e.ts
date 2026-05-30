import { test, expect } from '@playwright/test';
import { STORAGE_STATE, loginAs } from './fixtures/auth';
import { ROUTES } from './fixtures/test-config';

/**
 * Smoke coverage for the e2e auth fixtures: proves an admin session and a regular
 * signed-in session resolve to the right privileges, and that authenticated-only
 * surfaces (e.g. global search, gated for signed-out users) work once logged in.
 */
test.describe('Auth fixtures', () => {
  test.describe('Admin role', () => {
    test.use({ storageState: STORAGE_STATE.admin });

    test('can open the admin dashboard', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/admin');
      await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible({
        timeout: 10000,
      });
    });

    test('header exposes the search trigger when signed in', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="search-trigger-button"]')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Regular user role', () => {
    test.use({ storageState: STORAGE_STATE.user });

    test('is redirected away from the admin dashboard', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/unauthorized/, { timeout: 10000 });
    });

    test('authenticated global search finds a player and navigates', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const trigger = page.locator('[data-testid="search-trigger-button"]');
      await expect(trigger).toBeVisible({ timeout: 10000 });
      await trigger.click();

      const dialog = page.locator('[data-testid="search-dialog"]');
      await expect(dialog).toBeVisible({ timeout: 10000 });

      await page.locator('[data-testid="search-input"]').fill('Stage');

      const playerResult = dialog.getByText('Stage', { exact: false }).first();
      await expect(playerResult).toBeVisible({ timeout: 15000 });
      await playerResult.click();

      await page.waitForURL(/\/players\//, { timeout: 15000 });
      expect(page.url()).toContain('/players/');
    });
  });

  test.describe('loginAs helper', () => {
    test('logs in dynamically without a baked storage state', async ({
      page,
    }) => {
      await loginAs(page, 'admin');

      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/admin');
      await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
