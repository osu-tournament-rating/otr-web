import { test, expect } from '@playwright/test';
import { ROUTES } from './fixtures/test-config';

test.describe('Homepage and Global Navigation', () => {
  test.describe('Page Load', () => {
    test('loads with hero section', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const hero = page.locator('[data-testid="hero-section"]');
      await expect(hero).toBeVisible({ timeout: 10000 });
    });

    test('page title contains expected text', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });

    test('renders the rating ladder section', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const ladder = page.locator('[data-testid="rating-ladder-section"]');
      await expect(ladder).toBeVisible({ timeout: 10000 });
    });

    test('displays home action cards', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const actionCards = page.locator('[data-testid="home-action-cards"]');
      await expect(actionCards).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Feature Cards', () => {
    test('displays verified tournaments card', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="verified-tournaments-card"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('displays beatmap histories card', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="beatmap-histories-card"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('displays updates Tuesday card', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="updates-tuesday-card"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('displays all modes card', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="all-modes-card"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays open source card', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="open-source-card"]')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Header Navigation', () => {
    test('displays header with logo', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="header"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('[data-testid="header-logo"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays primary nav links', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="nav-leaderboard"]')).toBeVisible(
        { timeout: 10000 }
      );
      await expect(page.locator('[data-testid="nav-tournaments"]')).toBeVisible(
        { timeout: 10000 }
      );
      await expect(page.locator('[data-testid="nav-beatmaps"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('[data-testid="nav-stats"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test('logo links back to the homepage', async ({ page }) => {
      await page.goto(ROUTES.leaderboard);
      await page.waitForLoadState('networkidle');

      // The leaderboard shows a first-visit welcome modal whose overlay
      // intercepts pointer events. Dismiss it before interacting with the header.
      const welcomeAck = page.getByRole('button', { name: 'I understand' });
      if (await welcomeAck.isVisible().catch(() => false)) {
        await welcomeAck.click();
        await expect(welcomeAck).toBeHidden({ timeout: 10000 });
      }

      await page.locator('[data-testid="header-logo"]').click();
      await page.waitForURL(/\/$/, { timeout: 10000 });
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test('Leaderboard nav navigates to /leaderboard', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="nav-leaderboard"]').click();
      await page.waitForURL(/\/leaderboard/, { timeout: 10000 });
      expect(page.url()).toContain('/leaderboard');
    });

    test('Beatmaps nav navigates to /beatmaps', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="nav-beatmaps"]').click();
      await page.waitForURL(/\/beatmaps/, { timeout: 10000 });
      expect(page.url()).toContain('/beatmaps');
    });

    test('Stats nav navigates to /stats', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="nav-stats"]').click();
      await page.waitForURL(/\/stats/, { timeout: 10000 });
      expect(page.url()).toContain('/stats');
    });

    test('Tournaments dropdown reveals Browse link to /tournaments', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const tournamentsTrigger = page.locator(
        '[data-testid="nav-tournaments"]'
      );
      await expect(tournamentsTrigger).toBeVisible({ timeout: 10000 });
      await tournamentsTrigger.click();

      const browseLink = page
        .locator('a[href="/tournaments"]')
        .filter({ hasText: 'Browse' });
      await expect(browseLink.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Footer', () => {
    test('displays footer with content', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const footer = page.locator('[data-testid="footer"]');
      await expect(footer).toBeVisible({ timeout: 10000 });
      await expect(footer).toContainText('osu! Tournament Rating');
    });

    test('displays footer browse links', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="footer-leaderboard-link"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="footer-tournaments-link"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('footer leaderboard link navigates to /leaderboard', async ({
      page,
    }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="footer-leaderboard-link"]').click();
      await page.waitForURL(/\/leaderboard/, { timeout: 10000 });
      expect(page.url()).toContain('/leaderboard');
    });
  });

  test.describe('Authentication Gate', () => {
    test('shows login prompt for unauthenticated users', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const loginCard = page.locator('[data-testid="home-login-button"]');
      await expect(loginCard).toBeVisible({ timeout: 10000 });
      await expect(loginCard).toContainText('Log in');
    });
  });

  test.describe('Responsive Layout', () => {
    test('shows desktop nav and hides mobile trigger at desktop width', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="nav-leaderboard"]')).toBeVisible(
        { timeout: 10000 }
      );
      await expect(
        page.locator('[data-testid="mobile-nav-trigger"]')
      ).toBeHidden();
    });

    test('shows mobile nav trigger at mobile width', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="mobile-nav-trigger"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('shows mobile nav trigger at tablet width', async ({ page }) => {
      // The header switches to desktop nav at the Tailwind `md` breakpoint
      // (>= 768px). Below that — narrow tablet / large phone — the mobile
      // hamburger trigger is shown.
      await page.setViewportSize({ width: 767, height: 1024 });
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="mobile-nav-trigger"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('mobile nav trigger reveals navigation links when opened', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const trigger = page.locator('[data-testid="mobile-nav-trigger"]');
      await expect(trigger).toBeVisible({ timeout: 10000 });
      await trigger.click();

      // The nav link also exists in the (hidden) desktop nav, so scope the
      // assertion to the mobile sheet that the trigger reveals.
      const mobileSheet = page.locator('[data-slot="sheet-content"]');
      await expect(mobileSheet).toBeVisible({ timeout: 10000 });
      await expect(
        mobileSheet.locator('[data-testid="nav-leaderboard"]')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Theme Toggle', () => {
    test('toggles the theme class on the html element', async ({ page }) => {
      await page.goto(ROUTES.home);
      await page.waitForLoadState('networkidle');

      const toggle = page.locator('[data-testid="header-theme-toggle"]');
      await expect(toggle).toBeVisible({ timeout: 10000 });

      const html = page.locator('html');
      const initialClass = (await html.getAttribute('class')) ?? '';
      const initiallyDark = initialClass.includes('dark');

      await toggle.click();

      if (initiallyDark) {
        await expect(html).not.toHaveClass(/dark/, { timeout: 10000 });
      } else {
        await expect(html).toHaveClass(/dark/, { timeout: 10000 });
      }
    });
  });
});
