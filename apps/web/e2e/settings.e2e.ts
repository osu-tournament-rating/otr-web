import { test, expect, type Page } from '@playwright/test';
import { STORAGE_STATE } from './fixtures/auth';
import { ROUTES } from './fixtures/test-config';

const API_KEY_TEST_NAME = 'E2E generate-key spec';

/** Removes every API key row named {@link name}; keys are capped per user. */
async function deleteApiKeysByName(page: Page, name: string): Promise<void> {
  await page.goto(ROUTES.settings);
  await page.waitForLoadState('networkidle');

  const section = page.locator('[data-testid="settings-api-keys-section"]');
  await expect(section).toBeVisible({ timeout: 10000 });

  // The list re-renders after each deletion
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

      const dialogTitle = page.getByRole('heading', {
        name: 'Delete your account?',
      });
      await expect(dialogTitle).toBeVisible({ timeout: 10000 });

      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      await expect(cancelButton).toBeVisible({ timeout: 10000 });
      await cancelButton.click();

      await expect(dialogTitle).toBeHidden({ timeout: 10000 });
    });

    test('arriving from the account menu leaves no tooltip on the avatar', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const trigger = page.getByTestId('account-menu-trigger');
      await trigger.click();
      await page.getByRole('menuitem', { name: 'Settings' }).click();
      await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });

      // The menu hands focus back to the avatar as it closes.
      await expect(trigger).toBeFocused();
      // Longer than a tooltip's open delay, so a tooltip would show.
      await page.waitForTimeout(500);
      await expect(page.getByRole('tooltip')).toHaveCount(0);

      // Keyboard focus from the next control still shows it.
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('tooltip', { name: 'Account menu' })
      ).toBeVisible();
    });
  });

  test.describe('API key generation', () => {
    test.use({ storageState: STORAGE_STATE.user });

    test.afterEach(async ({ page }) => {
      await deleteApiKeysByName(page, API_KEY_TEST_NAME);
    });

    test('the Generate API key button creates a new key', async ({ page }) => {
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

      const createdRow = section
        .getByRole('row')
        .filter({ hasText: API_KEY_TEST_NAME });
      await expect(createdRow).toBeVisible({ timeout: 15000 });
      await expect(section.getByLabel('Key name')).toHaveValue('');

      await deleteApiKeysByName(page, API_KEY_TEST_NAME);
      await expect(
        section.getByRole('row').filter({ hasText: API_KEY_TEST_NAME })
      ).toHaveCount(0);
    });
  });
});
