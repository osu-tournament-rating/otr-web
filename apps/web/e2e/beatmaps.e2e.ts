import { test, expect, type Page } from '@playwright/test';
import { TEST_BEATMAP_OSU_ID, ROUTES } from './fixtures/test-config';

async function installMockPreviewAudio(page: Page) {
  await page.addInitScript(() => {
    class PreviewAudioMock extends EventTarget {
      private source = '';
      private previewTime = 0;

      paused = true;
      duration = 30;
      volume = 0.25;

      get src() {
        return this.source;
      }

      set src(value: string) {
        this.source = value;
        this.previewTime = 0;
        queueMicrotask(() => {
          this.dispatchEvent(new Event('loadedmetadata'));
          this.dispatchEvent(new Event('canplay'));
        });
      }

      get currentTime() {
        return this.previewTime;
      }

      set currentTime(value: number) {
        this.previewTime = value;
        queueMicrotask(() => this.dispatchEvent(new Event('timeupdate')));
      }

      play() {
        this.paused = false;
        queueMicrotask(() => this.dispatchEvent(new Event('playing')));
        return Promise.resolve();
      }

      pause() {
        if (this.paused) return;
        this.paused = true;
        this.dispatchEvent(new Event('pause'));
      }

      load() {}

      removeAttribute(name: string) {
        if (name === 'src') this.source = '';
      }
    }

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: PreviewAudioMock,
    });
  });
}

test.describe('Beatmaps Listing Page', () => {
  test.describe('Page Load', () => {
    test('displays beatmap listing with entries', async ({ page }) => {
      await page.goto(ROUTES.beatmaps);
      await page.waitForLoadState('networkidle');

      const rows = page.locator('[data-testid^="beatmap-list-row-"]');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });

      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('beatmap entry links to its detail page', async ({ page }) => {
      await page.goto(ROUTES.beatmaps);
      await page.waitForLoadState('networkidle');

      const detailLink = page.locator('a[href*="/beatmaps/"]');
      await expect(detailLink.first()).toBeVisible({ timeout: 10000 });

      const href = await detailLink.first().getAttribute('href');
      expect(href).toContain('/beatmaps/');
    });

    test('shows explicit map and verified evidence metadata', async ({
      page,
    }) => {
      await page.goto(ROUTES.beatmaps);
      const firstRow = page
        .locator('[data-testid^="beatmap-list-row-"]')
        .first();

      await expect(firstRow).toBeVisible({ timeout: 10000 });
      await expect(firstRow.getByText(/ SR/).first()).toBeVisible();
      await expect(firstRow.getByText(/ BPM/).first()).toBeVisible();
      await expect(firstRow.getByText(/verified games/).last()).toBeVisible();
    });

    test('audio transport plays, pauses, scrubs, changes volume, and closes without navigating', async ({
      page,
    }) => {
      await installMockPreviewAudio(page);
      await page.goto(ROUTES.beatmaps);
      const firstRow = page
        .locator('[data-testid^="beatmap-list-row-"]')
        .first();
      const preview = firstRow.getByRole('button', { name: 'Play preview' });

      await expect(preview).toBeVisible({ timeout: 10000 });
      const before = page.url();
      await preview.click();
      await expect(page).toHaveURL(before);

      const transport = page.locator('[data-testid="audio-preview-transport"]');
      await expect(transport).toBeVisible();
      await expect(transport).toHaveAttribute('data-player-state', 'playing');
      await expect(transport.getByText('Now previewing')).toBeVisible();

      await transport.getByRole('button', { name: 'Pause preview' }).click();
      await expect(transport).toHaveAttribute('data-player-state', 'paused');
      await expect(
        firstRow.getByRole('button', { name: 'Resume preview' })
      ).toBeVisible();

      const position = transport.getByRole('slider', {
        name: 'Preview position',
      });
      await position.press('End');
      await expect(position).toHaveAttribute('aria-valuetext', '0:30 of 0:30');

      const volume = transport.getByRole('slider', {
        name: 'Preview volume',
      });
      await volume.press('Home');
      await expect(volume).toHaveAttribute('aria-valuetext', '0 percent');
      await expect(
        transport.getByRole('button', { name: 'Unmute preview' })
      ).toBeVisible();

      await transport
        .getByRole('button', { name: 'Close audio preview' })
        .click();
      await expect(transport).toBeHidden();
      await expect(page).toHaveURL(before);
    });

    test('page title contains expected text', async ({ page }) => {
      await page.goto(ROUTES.beatmaps);
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test.describe('Filters and Search', () => {
    test('displays search input', async ({ page }) => {
      await page.goto(ROUTES.beatmaps);
      await page.waitForLoadState('networkidle');

      const search = page.locator('[data-testid="beatmap-search-input"]');
      await expect(search).toBeVisible({ timeout: 10000 });
    });

    test('search query updates the URL', async ({ page }) => {
      await page.goto(ROUTES.beatmaps);
      await page.waitForLoadState('networkidle');

      const search = page.locator('[data-testid="beatmap-search-input"]');
      await expect(search).toBeVisible({ timeout: 10000 });
      await search.fill('medley');

      await page.waitForURL(/q=medley/, { timeout: 10000 });
      expect(page.url()).toContain('q=medley');
    });

    test('opens filter popover when filter button is clicked', async ({
      page,
    }) => {
      await page.goto(ROUTES.beatmaps);
      await page.waitForLoadState('networkidle');

      const filterButton = page.locator(
        '[data-testid="beatmap-filter-button"]'
      );
      await expect(filterButton).toBeVisible({ timeout: 10000 });
      await filterButton.click();

      const popover = page.locator('[data-testid="beatmap-filter-popover"]');
      await expect(popover).toBeVisible({ timeout: 10000 });

      await expect(
        page.locator('[data-testid="beatmap-filter-apply"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="beatmap-filter-clear"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('ruleset and sort controls persist in the URL', async ({ page }) => {
      await page.goto(ROUTES.beatmaps);
      await page.getByRole('button', { name: 'taiko', exact: true }).click();
      await page.waitForURL(/ruleset=1/);

      await page.locator('[data-testid="beatmap-sort-select"]').click();
      await page.getByRole('option', { name: 'SR (star rating)' }).click();
      await page.waitForURL(/sort=sr/);
    });
  });

  test.describe('Pagination', () => {
    test('displays functional pagination controls', async ({ page }) => {
      await page.goto(ROUTES.beatmaps);
      await page.waitForLoadState('networkidle');

      const pagination = page.locator('[data-testid="beatmap-pagination"]');
      await expect(pagination).toBeVisible({ timeout: 10000 });

      await expect(
        page.locator('[data-testid="beatmap-pagination-next"]')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="beatmap-pagination-prev"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('navigates to the next page', async ({ page }) => {
      await page.goto(ROUTES.beatmaps);
      await page.waitForLoadState('networkidle');

      const next = page.locator('[data-testid="beatmap-pagination-next"]');
      await expect(next).toBeVisible({ timeout: 10000 });
      await next.click();

      await page.waitForURL(/page=2/, { timeout: 10000 });
      expect(page.url()).toContain('page=2');

      const rows = page.locator('[data-testid^="beatmap-list-row-"]');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test('does not create page-level horizontal overflow on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ROUTES.beatmaps);
    await expect(
      page.locator('[data-testid^="beatmap-list-row-"]').first()
    ).toBeVisible({ timeout: 10000 });

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  });
});

test.describe('Beatmap Detail Page', () => {
  test.describe('Page Load', () => {
    test('loads beatmap detail with external osu! link', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const externalLink = page.locator(
        '[data-testid="beatmap-external-link"]'
      );
      await expect(externalLink).toBeVisible({ timeout: 10000 });
    });

    test('shows the same-set difficulty navigator', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));

      const difficulty = page
        .locator('[data-testid^="related-difficulty-"]')
        .first();
      await expect(difficulty).toBeVisible({ timeout: 10000 });
      await expect(difficulty).toHaveAttribute('href', /\/beatmaps\/\d+/);
      await expect(difficulty.getByText(/ SR/)).toBeVisible();
    });

    test('hero preview opens the identified cinematic transport', async ({
      page,
    }) => {
      await installMockPreviewAudio(page);
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));

      const preview = page.locator('header button[data-preview-state]').first();
      await expect(preview).toBeVisible({ timeout: 10000 });
      await expect(preview).toHaveAccessibleName('Play preview');
      await preview.click();

      const transport = page.locator('[data-testid="audio-preview-transport"]');
      await expect(transport).toBeVisible();
      await expect(transport).toContainText(/\[.+\]/);
      await expect(preview).toHaveAttribute('data-preview-state', 'playing');
    });

    test('page title contains beatmap metadata', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test.describe('Metadata', () => {
    test('displays artist and title heading', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
      await expect(heading.first()).not.toBeEmpty();
    });

    test('displays star rating and BPM metadata', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(/ SR/).first()).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText(/BPM/).first()).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays difficulty attributes (CS, AR, OD, HP)', async ({
      page,
    }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('CS / AR / OD / HP')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test('detail dashboard fits a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: 10000,
    });

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  });

  test.describe('Usage Statistics', () => {
    test('displays beatmap stats card', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const statsCard = page.locator('[data-testid="beatmap-stats-card"]');
      await expect(statsCard).toBeVisible({ timeout: 10000 });
    });

    test('displays usage chart with rendered content', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const chart = page.locator('[data-testid="beatmap-usage-chart"]');
      await expect(chart).toBeVisible({ timeout: 15000 });
      await expect(chart.locator('.recharts-wrapper')).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays mod distribution chart with rendered content', async ({
      page,
    }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const chart = page.locator(
        '[data-testid="beatmap-mod-distribution-chart"]'
      );
      await expect(chart.first()).toBeVisible({ timeout: 15000 });
      await expect(chart.first().locator('.recharts-wrapper')).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays score rating chart with rendered content', async ({
      page,
    }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const chart = page.locator('[data-testid="beatmap-score-rating-chart"]');
      await expect(chart.first()).toBeVisible({ timeout: 15000 });
      await expect(chart.first().locator('.recharts-wrapper')).toBeVisible({
        timeout: 10000,
      });
    });

    test('displays tournament usage list', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const tournamentsList = page.locator(
        '[data-testid="beatmap-tournaments-list"]'
      );
      await expect(tournamentsList).toBeVisible({ timeout: 10000 });
    });

    test('displays top performers table', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const topPerformers = page.locator(
        '[data-testid="beatmap-top-performers"]'
      );
      await expect(topPerformers).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Navigation and Links', () => {
    test('external link points to the osu! beatmap page', async ({ page }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const osuLink = page.locator('a[href*="osu.ppy.sh"]');
      await expect(osuLink.first()).toBeVisible({ timeout: 10000 });

      const href = await osuLink.first().getAttribute('href');
      expect(href).toContain('osu.ppy.sh');
    });

    test('tournament usage list links to a tournament page', async ({
      page,
    }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      const tournamentsList = page.locator(
        '[data-testid="beatmap-tournaments-list"]'
      );
      await expect(tournamentsList).toBeVisible({ timeout: 10000 });

      const tournamentLink = tournamentsList.locator(
        'a[href*="/tournaments/"]'
      );
      await expect(tournamentLink.first()).toBeVisible({ timeout: 10000 });

      const href = await tournamentLink.first().getAttribute('href');
      expect(href).toContain('/tournaments/');
    });

    test('expanding tournament details reveals related matches', async ({
      page,
    }) => {
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
      await page.waitForLoadState('networkidle');

      // The details toggle is only rendered for verified tournaments, so this
      // selector targets verified tournaments only. Non-verified (e.g. rejected)
      // tournaments have no toggle and no expandable details.
      const toggle = page.locator(
        '[data-testid^="beatmap-tournament-details-toggle-"]'
      );
      await expect(toggle.first()).toBeVisible({ timeout: 10000 });
      await toggle.first().click();

      const matchLink = page.locator('a[href*="/matches/"]');
      await expect(matchLink.first()).toBeVisible({ timeout: 15000 });

      const href = await matchLink.first().getAttribute('href');
      expect(href).toContain('/matches/');
    });
  });
});
