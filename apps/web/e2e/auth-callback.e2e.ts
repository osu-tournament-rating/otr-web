import { test, expect } from '@playwright/test';

test.describe('Auth callback redirects', () => {
  test('preserves a local destination with its query and fragment', async ({
    page,
  }) => {
    const destination = '/unauthorized?source=callback#details';

    await page.goto(
      `/auth/callback?redirectTo=${encodeURIComponent(destination)}`
    );

    await expect(page).toHaveURL(new URL(destination, page.url()).href);
    await expect(page.getByTestId('unauthorized-heading')).toHaveText(
      'Unauthorized'
    );
  });

  test('uses the home page when there is no destination', async ({ page }) => {
    await page.goto('/auth/callback');

    await expect(page).toHaveURL(new URL('/', page.url()).href);
  });

  for (const destination of [
    'https://example.com/phishing',
    '//example.com/phishing',
    '/\\example.com/phishing',
    '/\t/example.com/phishing',
    '/players/%2e%2e//example.com/phishing',
  ]) {
    test(`keeps an unsafe destination on the site: ${JSON.stringify(destination)}`, async ({
      page,
      baseURL,
    }) => {
      const externalRequests: string[] = [];
      await page.route('https://example.com/**', async (route) => {
        externalRequests.push(route.request().url());
        await route.abort();
      });

      await page.goto(
        `/auth/callback?redirectTo=${encodeURIComponent(destination)}`
      );

      await expect(page).toHaveURL(new URL('/', baseURL).href);
      expect(externalRequests).toEqual([]);
    });
  }
});
