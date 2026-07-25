import { test, expect, type Page } from '@playwright/test';
import { STORAGE_STATE } from './fixtures/auth';
import { ROUTES } from './fixtures/test-config';

const API_KEY_TEST_NAME = 'E2E generate-key spec';

/**
 * Removes every API key row whose name matches {@link name}. Generating a key is a
 * mutating action against the shared dev database and users are capped at a few
 * keys, so this runs both as the test's own teardown and as a best-effort safety
 * net (in `afterEach`) so a failed run can't leak keys and exhaust the limit.
 */
async function deleteApiKeysByName(page: Page, name: string): Promise<void> {
  await page.goto(ROUTES.settings);
  await page.waitForLoadState('networkidle');

  const section = page.locator('[data-testid="settings-api-keys-section"]');
  await expect(section).toBeVisible({ timeout: 10000 });

  // The list re-renders after each deletion, so delete one matching row at a
  // time until none remain.
  for (;;) {
    const row = section.getByRole('row').filter({ hasText: name }).first();
    if ((await row.count()) === 0) {
      break;
    }

    await row.getByRole('button', { name: 'Delete API key' }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.getByRole('button', { name: 'Delete key' }).click();

    await expect(row).toHaveCount(0, { timeout: 10000 });
  }
}

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

  test.describe('API key generation', () => {
    test.use({ storageState: STORAGE_STATE.user });

    // Safety net: clear any key this spec created even if an assertion failed
    // partway through, so reruns start from a clean slate.
    test.afterEach(async ({ page }) => {
      await deleteApiKeysByName(page, API_KEY_TEST_NAME);
    });

    test('the Generate API key button creates a new key', async ({ page }) => {
      // Start clean in case a previous run leaked a key with this name.
      await deleteApiKeysByName(page, API_KEY_TEST_NAME);

      await page.goto(ROUTES.settings);
      await page.waitForLoadState('networkidle');

      const section = page.locator('[data-testid="settings-api-keys-section"]');
      await expect(section).toBeVisible({ timeout: 10000 });

      await section.getByLabel('Key name').fill(API_KEY_TEST_NAME);

      const generateButton = page.locator(
        '[data-testid="settings-create-api-key-button"]'
      );
      await expect(generateButton).toBeEnabled();
      await generateButton.click();

      // On success the new key surfaces as a row in the keys table and the
      // name field resets — both are durable signals (unlike the toast).
      const createdRow = section
        .getByRole('row')
        .filter({ hasText: API_KEY_TEST_NAME });
      await expect(createdRow).toBeVisible({ timeout: 15000 });
      await expect(section.getByLabel('Key name')).toHaveValue('');

      // Revoke it here too (not just in afterEach) and confirm it disappears,
      // which also exercises the delete path end-to-end.
      await deleteApiKeysByName(page, API_KEY_TEST_NAME);
      await expect(
        section.getByRole('row').filter({ hasText: API_KEY_TEST_NAME })
      ).toHaveCount(0);
    });
  });
});
