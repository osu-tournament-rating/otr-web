import { test, expect } from '@playwright/test';
import { ROUTES } from './fixtures/test-config';

test.describe('API Reference Page', () => {
  const scalarCdn = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.62.5';

  test('boots the pinned Scalar reference with the public spec', async ({
    page,
  }) => {
    await page.route(scalarCdn, async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `
          window.Scalar = {
            async createApiReference(selector, configuration) {
              const response = await fetch(configuration.url);
              const specification = await response.json();
              const container = document.querySelector(selector);
              container.dataset.scalarMounted = 'true';
              container.dataset.scalarTheme = configuration.theme;
              container.textContent = specification.info.title;
            },
          };
        `,
      });
    });

    const response = await page.goto(ROUTES.spec, {
      waitUntil: 'domcontentloaded',
    });

    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('text/html');
    await expect(page).toHaveTitle('o!TR API Reference');
    await expect(page.locator('#app')).toHaveAttribute(
      'data-scalar-mounted',
      'true'
    );
    await expect(page.locator('#app')).toHaveAttribute(
      'data-scalar-theme',
      'default'
    );
    await expect(page.locator('#app')).toHaveText('o!TR API');
  });

  test('publishes the API stability notice in the OpenAPI document', async ({
    request,
  }) => {
    const response = await request.get('/spec.json');
    const specification = (await response.json()) as {
      info?: { description?: string };
    };

    expect(response.ok()).toBe(true);
    expect(response.headers()['cache-control']).toBe('public, max-age=60');
    expect(specification.info?.description).toContain('API Stability Notice');
    expect(specification.info?.description).toContain(
      'Breaking changes may be introduced at any time without advance notice.'
    );
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
