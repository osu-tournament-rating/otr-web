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
        queueMicrotask(() => {
          this.dispatchEvent(new Event('timeupdate'));
          if (!this.paused && this.previewTime >= this.duration) {
            this.paused = true;
            this.dispatchEvent(new Event('ended'));
          }
        });
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

    test('shows map metadata, tournament evidence, and top mods', async ({
      page,
    }) => {
      await page.goto(ROUTES.beatmaps);
      const firstRow = page
        .locator('[data-testid^="beatmap-list-row-"]')
        .first();

      await expect(firstRow).toBeVisible({ timeout: 10000 });
      await expect(firstRow.getByLabel(/\d+\.\d{2} star rating/)).toBeVisible();
      await expect(firstRow.getByLabel(/\d+ BPM/)).toBeVisible();
      await expect(
        firstRow.locator('[data-testid="beatmap-games-count"]')
      ).toHaveAccessibleName(/\d[\d,]* verified games/);
      await expect(
        firstRow.locator('[data-testid="beatmap-tournaments-count"]')
      ).toHaveAccessibleName(/\d[\d,]* verified tournaments/);
      await expect(firstRow.getByText('games', { exact: true })).toHaveCount(0);
      await expect(
        firstRow.getByText('tournaments', { exact: true })
      ).toHaveCount(0);

      const topMods = firstRow.getByRole('list', {
        name: 'Top mods by score usage',
      });
      await expect(topMods).toBeVisible();
      const displayedMods = topMods.locator('li');
      expect(await displayedMods.count()).toBeGreaterThan(0);
      expect(await displayedMods.count()).toBeLessThanOrEqual(2);
      await expect(displayedMods.first()).toContainText(/%/);

      await expect(page.getByText(/verified games/i)).toHaveCount(0);
      await expect(page.locator('header svg.lucide-music')).toBeVisible();
      await expect(firstRow.locator('svg.lucide-chevron-right')).toHaveCount(0);
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
      await expect(
        transport.getByText('Preview', { exact: true })
      ).toBeVisible();

      await transport
        .getByRole('button', { name: 'Pause beatmap preview' })
        .click();
      await expect(transport).toHaveAttribute('data-player-state', 'paused');
      await expect(
        transport.getByRole('button', { name: 'Play beatmap preview' })
      ).toBeVisible();
      await expect(
        firstRow.getByRole('button', { name: 'Resume preview' })
      ).toBeVisible();

      const position = transport.getByRole('slider', {
        name: 'Preview progress',
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

      const safeSpacing = await page.evaluate(() => {
        const transportElement = document.querySelector(
          '[data-testid="audio-preview-transport"]'
        );
        return {
          bodyPadding: Number.parseFloat(
            getComputedStyle(document.body).paddingBottom
          ),
          transportHeight:
            transportElement?.getBoundingClientRect().height ??
            Number.MAX_VALUE,
        };
      });
      expect(safeSpacing.bodyPadding).toBeGreaterThanOrEqual(
        safeSpacing.transportHeight
      );

      await transport
        .getByRole('button', { name: 'Close audio preview' })
        .click();
      await expect(transport).toBeHidden();
      await expect(page).toHaveURL(before);
      expect(
        await page.evaluate(() =>
          document.documentElement.classList.contains('audio-transport-visible')
        )
      ).toBe(false);
    });

    test('audio transport hides when preview playback ends', async ({
      page,
    }) => {
      await installMockPreviewAudio(page);
      await page.goto(ROUTES.beatmaps);
      const firstRow = page
        .locator('[data-testid^="beatmap-list-row-"]')
        .first();
      const preview = firstRow.getByRole('button', { name: 'Play preview' });

      await expect(preview).toBeVisible({ timeout: 10000 });
      await preview.click();

      const transport = page.locator('[data-testid="audio-preview-transport"]');
      await expect(transport).toHaveAttribute('data-player-state', 'playing');
      await transport
        .getByRole('slider', { name: 'Preview progress' })
        .press('End');

      await expect(transport).toBeHidden();
      await expect(preview).toHaveAttribute('data-preview-state', 'idle');
      expect(
        await page.evaluate(() =>
          document.documentElement.classList.contains('audio-transport-visible')
        )
      ).toBe(false);
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

    test('moves labeled ruleset filters into the filter sheet on mobile', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 520, height: 844 });
      await page.goto(ROUTES.beatmaps);

      const desktopRulesets = page.locator(
        '[data-testid="beatmap-ruleset-filters-desktop"]'
      );
      const filterButton = page.locator(
        '[data-testid="beatmap-filter-button"]'
      );

      await expect(desktopRulesets).toBeHidden();
      await expect(filterButton).toBeVisible({ timeout: 10000 });
      await expect(filterButton).toHaveAccessibleName(/^Filters/);
      await expect(
        filterButton.getByText('Filters', { exact: true })
      ).toBeHidden();
      await filterButton.click();

      const mobileRulesets = page.locator(
        '[data-testid="beatmap-ruleset-filters-mobile"]'
      );
      await expect(mobileRulesets).toBeVisible();

      const rulesetButtons = mobileRulesets.getByRole('button');
      await expect(rulesetButtons).toHaveCount(6);
      for (const name of [
        'All',
        'osu!',
        'taiko',
        'catch',
        'mania 4K',
        'mania 7K',
      ]) {
        const button = mobileRulesets.getByRole('button', {
          name,
          exact: true,
        });
        await expect(button).toBeVisible();
        await expect(button).toHaveText(name);
      }

      const mania4k = mobileRulesets.getByRole('button', {
        name: 'mania 4K',
        exact: true,
      });
      const mania7k = mobileRulesets.getByRole('button', {
        name: 'mania 7K',
        exact: true,
      });
      const [mania4kBox, mania7kBox, mania7kIconBox] = await Promise.all([
        mania4k.boundingBox(),
        mania7k.boundingBox(),
        mania7k.locator('svg').boundingBox(),
      ]);

      expect(mania4kBox).not.toBeNull();
      expect(mania7kBox).not.toBeNull();
      expect(mania7kIconBox).not.toBeNull();
      expect(mania7kBox!.height).toBe(40);
      expect(mania7kIconBox!.width).toBe(20);
      expect(Math.abs(mania4kBox!.y - mania7kBox!.y)).toBeLessThanOrEqual(1);

      await mobileRulesets
        .getByRole('button', { name: 'mania 7K', exact: true })
        .click();
      await page.locator('[data-testid="beatmap-filter-apply"]').click();
      await page.waitForURL(/ruleset=5/);
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

  test('does not create page-level horizontal overflow across card breakpoints', async ({
    page,
  }) => {
    for (const width of [390, 768, 1023, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(ROUTES.beatmaps);
      await expect(
        page.locator('[data-testid^="beatmap-list-row-"]').first()
      ).toBeVisible({ timeout: 10000 });

      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth
            ),
          { timeout: 10000 }
        )
        .toBe(0);
    }
  });

  test('keeps cards compact and aligned at the tablet breakpoint', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(ROUTES.beatmaps);

    const firstRow = page.locator('[data-testid^="beatmap-list-row-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    const cover = firstRow.locator('[data-testid="beatmap-cover-cell"]');
    const content = firstRow.locator('[data-testid="beatmap-card-content"]');
    const usage = firstRow.locator('[data-testid="beatmap-usage-summary"]');
    const games = firstRow.locator('[data-testid="beatmap-games-count"]');
    const tournaments = firstRow.locator(
      '[data-testid="beatmap-tournaments-count"]'
    );
    const preview = firstRow.getByRole('button', { name: 'Play preview' });
    const [
      rowBox,
      coverBox,
      contentBox,
      usageBox,
      gamesBox,
      tournamentsBox,
      previewBox,
    ] = await Promise.all([
      firstRow.boundingBox(),
      cover.boundingBox(),
      content.boundingBox(),
      usage.boundingBox(),
      games.boundingBox(),
      tournaments.boundingBox(),
      preview.boundingBox(),
    ]);

    expect(rowBox).not.toBeNull();
    expect(coverBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(usageBox).not.toBeNull();
    expect(gamesBox).not.toBeNull();
    expect(tournamentsBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    expect(rowBox!.height - coverBox!.height).toBeLessThanOrEqual(34);
    expect(Math.abs(coverBox!.height - contentBox!.height)).toBeLessThanOrEqual(
      1
    );
    expect(usageBox!.y + usageBox!.height).toBeLessThanOrEqual(
      contentBox!.y + contentBox!.height + 1
    );
    expect(Math.abs(gamesBox!.y - tournamentsBox!.y)).toBeLessThanOrEqual(2);
    expect(previewBox!.x).toBeGreaterThanOrEqual(coverBox!.x);
    expect(previewBox!.y).toBeGreaterThanOrEqual(coverBox!.y);
    expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(
      coverBox!.x + coverBox!.width
    );
    expect(previewBox!.y + previewBox!.height).toBeLessThanOrEqual(
      coverBox!.y + coverBox!.height
    );
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

      const activeDifficulty = page.locator(
        '[data-testid^="related-difficulty-"][aria-current="page"]:visible'
      );

      await expect(activeDifficulty).toBeVisible({ timeout: 10000 });
      await expect(activeDifficulty).toBeInViewport();
      await expect(activeDifficulty).toHaveAttribute('href', /\/beatmaps\/\d+/);
      await expect(activeDifficulty.getByText(/ SR/)).toBeVisible();

      const collapsedDifficulty = page
        .locator(
          '[data-testid^="related-difficulty-"]:not([aria-current="page"]):visible'
        )
        .first();
      if ((await collapsedDifficulty.count()) > 0) {
        await expect(collapsedDifficulty).toHaveAccessibleName(/star rating/);
        const box = await collapsedDifficulty.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(42);
        expect(box?.height).toBeGreaterThanOrEqual(40);
        const iconColors = await collapsedDifficulty
          .locator('svg')
          .evaluate((icon) => {
            const iconStyle = getComputedStyle(icon);
            const pathStyle = getComputedStyle(icon.querySelector('path')!);
            return { color: iconStyle.color, fill: pathStyle.fill };
          });
        expect(iconColors.fill).toBe(iconColors.color);

        await collapsedDifficulty.hover();
        await expect(page.getByRole('tooltip')).toContainText(/ SR/);
      }
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
      await expect(
        transport.getByText('Preview', { exact: true })
      ).toBeVisible();
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

      const attributes = page.getByRole('heading', { name: 'Attributes' });
      await expect(attributes).toBeVisible({ timeout: 10000 });
      await expect(page.locator('abbr[title="Circle size"]')).toBeVisible();
      await expect(page.locator('abbr[title="Approach rate"]')).toBeVisible();
      await expect(
        page.locator('abbr[title="Overall difficulty"]')
      ).toBeVisible();
      await expect(page.locator('abbr[title="HP drain"]')).toBeVisible();
    });
  });

  test('detail dashboard fits a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: 10000,
    });

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          ),
        { timeout: 10000 }
      )
      .toBe(0);
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
      await expect(chart.locator('.density-cells rect').first()).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Score vs TR' })
      ).toHaveCount(1);
      await expect(page.getByText(/SR does not affect TR/i)).toHaveCount(0);
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
      await expect(
        topPerformers.getByRole('heading', { name: 'Top plays' })
      ).toBeVisible();
      await expect(topPerformers.getByText(/verified/i)).toHaveCount(0);

      const metricBoxes = await topPerformers
        .locator('[data-testid="beatmap-top-play-metrics"]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().x)
        );
      const scoreBoxes = await topPerformers
        .locator('[data-testid="beatmap-top-play-score"]')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const bounds = element.getBoundingClientRect();
            return { x: bounds.x, width: bounds.width };
          })
        );

      expect(metricBoxes.length).toBeGreaterThan(1);
      expect(Math.max(...metricBoxes) - Math.min(...metricBoxes)).toBeLessThan(
        1
      );
      expect(scoreBoxes.length).toBeGreaterThan(1);
      expect(
        Math.max(...scoreBoxes.map(({ x }) => x)) -
          Math.min(...scoreBoxes.map(({ x }) => x))
      ).toBeLessThan(1);
      expect(
        Math.max(...scoreBoxes.map(({ width }) => width)) -
          Math.min(...scoreBoxes.map(({ width }) => width))
      ).toBeLessThan(1);
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
