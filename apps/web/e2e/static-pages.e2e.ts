import { test, expect } from '@playwright/test';
import { ROUTES } from './fixtures/test-config';

test.describe('API Reference Page', () => {
  test('displays the API Stability Notice alert', async ({ page }) => {
    await page.goto(ROUTES.spec);
    // Avoid waiting on the external Scalar CDN script, which may be slow or
    // blocked in CI. The static DOM is available after the document loads.
    await page.waitForLoadState('domcontentloaded');

    const notice = page.locator('[data-testid="api-stability-notice"]');
    await expect(notice).toBeVisible({ timeout: 10000 });
    await expect(notice).toContainText('API Stability Notice');
  });

  test('renders the scalar api reference container', async ({ page }) => {
    await page.goto(ROUTES.spec);
    await page.waitForLoadState('domcontentloaded');

    // The container is hydrated by an external script; we only assert it is
    // present in the DOM, not that the API doc has finished rendering.
    const container = page.locator('#scalar-api-reference');
    await expect(container).toBeAttached({ timeout: 10000 });
  });

  test('has a non-empty page title referencing the API', async ({ page }) => {
    await page.goto(ROUTES.spec);
    await page.waitForLoadState('domcontentloaded');

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).toContain('API');
  });
});

test.describe('Banned Page', () => {
  test('renders the suspended heading without a reason', async ({ page }) => {
    await page.goto(ROUTES.banned);
    await page.waitForLoadState('networkidle');

    const heading = page.locator('[data-testid="banned-heading"]');
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toHaveText('Account Suspended');

    // With no reason param, the reason section should not render.
    await expect(page.locator('[data-testid="banned-reason"]')).toHaveCount(0);
  });

  test('displays the decoded reason from the search param', async ({
    page,
  }) => {
    await page.goto(`${ROUTES.banned}?reason=Cheating+during+a+tournament`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="banned-heading"]')).toBeVisible({
      timeout: 10000,
    });

    const reason = page.locator('[data-testid="banned-reason"]');
    await expect(reason).toBeVisible({ timeout: 10000 });
    await expect(reason).toHaveText('Cheating during a tournament');
  });
});

test.describe('Unauthorized Page', () => {
  test('renders the unauthorized heading and message', async ({ page }) => {
    await page.goto(ROUTES.unauthorized);
    await page.waitForLoadState('networkidle');

    const container = page.locator('[data-testid="unauthorized-container"]');
    await expect(container).toBeVisible({ timeout: 10000 });

    const heading = page.locator('[data-testid="unauthorized-heading"]');
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toHaveText('Unauthorized');

    await expect(container).toContainText(
      'You are not authorized to access this page.'
    );
  });
});
