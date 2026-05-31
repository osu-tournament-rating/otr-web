import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './fixtures/auth';
import { ROUTES } from './fixtures/test-config';

test.describe('Settings', () => {
  test.describe('Unauthenticated access', () => {
    test('redirects an unauthenticated visitor to /unauthorized', async ({
      page,
    }) => {
      await page.goto(ROUTES.settings);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/unauthorized/, { timeout: 10000 });
    });
  });

  test.describe('Signed-in user', () => {
    test.use({ storageState: STORAGE_STATE.user });

    test('renders the Settings heading', async ({ page }) => {
      await page.goto(ROUTES.settings);
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', {
        level: 1,
        name: 'Settings',
      });
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('renders the API keys section', async ({ page }) => {
      await page.goto(ROUTES.settings);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="settings-api-keys-section"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('renders the friends sync section', async ({ page }) => {
      await page.goto(ROUTES.settings);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="settings-friends-sync-section"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('renders the account deletion danger zone section', async ({
      page,
    }) => {
      await page.goto(ROUTES.settings);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="settings-account-deletion-section"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('account deletion confirmation dialog opens and can be cancelled', async ({
      page,
    }) => {
      await page.goto(ROUTES.settings);
      await page.waitForLoadState('networkidle');

      const deleteTrigger = page.locator(
        '[data-testid="settings-delete-account-button"]'
      );
      await expect(deleteTrigger).toBeVisible({ timeout: 10000 });
      await deleteTrigger.click();

      // Opening the dialog reveals a confirmation prompt. Cancelling it is a
      // safe, non-mutating interaction (no account is actually deleted).
      const dialogTitle = page.getByRole('heading', {
        name: 'Delete your account?',
      });
      await expect(dialogTitle).toBeVisible({ timeout: 10000 });

      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      await expect(cancelButton).toBeVisible({ timeout: 10000 });
      await cancelButton.click();

      await expect(dialogTitle).toBeHidden({ timeout: 10000 });
    });
  });
});
