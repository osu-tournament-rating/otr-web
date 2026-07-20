import { test, expect, type Page } from '@playwright/test';
import { TEST_BEATMAP_OSU_ID, ROUTES } from './fixtures/test-config';

type PreviewPlayBehavior = 'resolve' | 'defer' | 'error';

interface PreviewAudioMockSnapshot {
  loadCalls: number;
  pendingPlayCount: number;
  playCalls: number;
  source: string;
  sourceAssignments: number;
}

interface PreviewAudioMockDriver {
  queuePlayBehaviors: (...behaviors: PreviewPlayBehavior[]) => Promise<void>;
  rejectPendingPlay: (errorName: string) => Promise<void>;
  snapshot: () => Promise<PreviewAudioMockSnapshot>;
}

async function installMockPreviewAudio(
  page: Page
): Promise<PreviewAudioMockDriver> {
  await page.addInitScript(() => {
    type PlayBehavior = 'resolve' | 'defer' | 'error';
    type PendingPlay = {
      reject: (errorName: string) => void;
      resolve: () => void;
    };

    const playBehaviors: PlayBehavior[] = [];
    const pendingPlays: PendingPlay[] = [];
    let latestSource = '';
    let loadCalls = 0;
    let playCalls = 0;
    let sourceAssignments = 0;

    class PreviewAudioMock extends EventTarget {
      private source = '';
      private previewTime = 0;
      private requiresReload = false;

      paused = true;
      duration = 30;
      volume = 0.25;

      get src() {
        return this.source;
      }

      set src(value: string) {
        this.source = value;
        latestSource = value;
        this.previewTime = 0;
        this.requiresReload = false;
        sourceAssignments += 1;
        queueMicrotask(() => {
          this.dispatchEvent(new Event('loadedmetadata'));
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

      play(): Promise<void> {
        playCalls += 1;

        if (this.requiresReload) {
          return Promise.reject(
            new DOMException(
              'The media source is unavailable',
              'NotSupportedError'
            )
          );
        }

        const behavior = playBehaviors.shift() ?? 'resolve';
        if (behavior === 'error') {
          this.requiresReload = true;
          queueMicrotask(() => this.dispatchEvent(new Event('error')));
          return Promise.reject(
            new DOMException(
              'The media source is unavailable',
              'NotSupportedError'
            )
          );
        }

        if (behavior === 'defer') {
          return new Promise<void>((resolve, reject) => {
            pendingPlays.push({
              resolve: () => {
                this.paused = false;
                this.dispatchEvent(new Event('playing'));
                resolve();
              },
              reject: (errorName: string) => {
                reject(new DOMException('Playback was interrupted', errorName));
              },
            });
          });
        }

        this.paused = false;
        queueMicrotask(() => this.dispatchEvent(new Event('playing')));
        return Promise.resolve();
      }

      pause() {
        if (this.paused) return;
        this.paused = true;
        this.dispatchEvent(new Event('pause'));
      }

      load() {
        loadCalls += 1;
        this.previewTime = 0;
        this.requiresReload = false;
        queueMicrotask(() => {
          this.dispatchEvent(new Event('loadedmetadata'));
        });
      }

      removeAttribute(name: string) {
        if (name === 'src') {
          this.source = '';
          latestSource = '';
          this.requiresReload = false;
        }
      }
    }

    const controller = {
      queuePlayBehaviors(...behaviors: PlayBehavior[]) {
        playBehaviors.push(...behaviors);
      },
      rejectPendingPlay(errorName: string) {
        const pending = pendingPlays.shift();
        if (!pending) throw new Error('No pending preview play to reject');
        pending.reject(errorName);
      },
      snapshot() {
        return {
          loadCalls,
          pendingPlayCount: pendingPlays.length,
          playCalls,
          source: latestSource,
          sourceAssignments,
        };
      },
    };

    Object.defineProperty(window, '__otrPreviewAudioMock', {
      configurable: true,
      value: controller,
    });

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: PreviewAudioMock,
    });
  });

  return {
    queuePlayBehaviors: (...behaviors) =>
      page.evaluate((queuedBehaviors) => {
        const controller = (
          window as unknown as {
            __otrPreviewAudioMock: {
              queuePlayBehaviors: (...values: PreviewPlayBehavior[]) => void;
            };
          }
        ).__otrPreviewAudioMock;
        controller.queuePlayBehaviors(...queuedBehaviors);
      }, behaviors),
    rejectPendingPlay: (errorName) =>
      page.evaluate((name) => {
        const controller = (
          window as unknown as {
            __otrPreviewAudioMock: {
              rejectPendingPlay: (value: string) => void;
            };
          }
        ).__otrPreviewAudioMock;
        controller.rejectPendingPlay(name);
      }, errorName),
    snapshot: () =>
      page.evaluate(() => {
        const controller = (
          window as unknown as {
            __otrPreviewAudioMock: {
              snapshot: () => PreviewAudioMockSnapshot;
            };
          }
        ).__otrPreviewAudioMock;
        return controller.snapshot();
      }),
  };
}

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function installMockBeatmapCovers(page: Page) {
  await page.route('https://assets.ppy.sh/beatmaps/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: ONE_PIXEL_PNG,
    })
  );
}

async function getDistinctBeatmapPreviewRows(page: Page) {
  const rows = page.locator('[data-testid^="beatmap-list-row-"]');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });

  const rowSources = await rows.evaluateAll((elements) =>
    elements.map((row, index) => {
      const image = row.querySelector(
        '[data-testid="beatmap-cover-cell"] img'
      ) as HTMLImageElement | null;
      const beatmapsetOsuId = image?.src.match(/\/beatmaps\/(\d+)\//)?.[1];
      return { index, beatmapsetOsuId };
    })
  );
  const first = rowSources.find((row) => row.beatmapsetOsuId !== undefined);
  const second = rowSources.find(
    (row) =>
      row.beatmapsetOsuId !== undefined &&
      row.beatmapsetOsuId !== first?.beatmapsetOsuId
  );

  if (!first?.beatmapsetOsuId || !second?.beatmapsetOsuId) {
    throw new Error('Beatmap E2E data must include two distinct beatmapsets');
  }

  return {
    first: rows.nth(first.index),
    firstBeatmapsetOsuId: first.beatmapsetOsuId,
    second: rows.nth(second.index),
    secondBeatmapsetOsuId: second.beatmapsetOsuId,
  };
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
      await expect(firstRow.getByText('SR', { exact: true })).toHaveCount(0);
      await expect(firstRow.getByText('BPM', { exact: true })).toHaveCount(0);
      await expect(
        firstRow.locator('[data-testid="beatmap-games-count"]')
      ).toHaveAccessibleName(/\d[\d,]* verified games/);
      await expect(
        firstRow.locator('[data-testid="beatmap-tournaments-count"]')
      ).toHaveAccessibleName(/\d[\d,]* verified tournaments/);
      await expect(
        firstRow.locator(
          '[data-testid="beatmap-primary-metrics"] [data-testid="beatmap-games-count"]'
        )
      ).toHaveCount(0);
      await expect(
        firstRow.locator(
          '[data-testid="beatmap-usage-summary"] [data-testid="beatmap-games-count"]'
        )
      ).toHaveCount(1);
      await expect(firstRow.getByText('games', { exact: true })).toHaveCount(0);
      await expect(
        firstRow.getByText('tournaments', { exact: true })
      ).toHaveCount(0);

      const topMods = firstRow.getByRole('list', {
        name: 'Top mods by score usage',
      });
      await expect(topMods).toBeVisible();
      const displayedMods = topMods.locator('li');
      const displayedModCount = await displayedMods.count();
      expect(displayedModCount).toBeGreaterThan(0);
      expect(displayedModCount).toBeLessThanOrEqual(2);
      await expect(displayedMods.first()).toContainText(/%/);
      if (displayedModCount === 2) {
        const secondaryPercentage = Number.parseFloat(
          (await displayedMods.nth(1).textContent())?.match(
            /[\d.]+(?=%)/
          )?.[0] ?? 'NaN'
        );
        expect(secondaryPercentage).toBeGreaterThanOrEqual(20);
      }

      await expect(page.getByText(/verified games/i)).toHaveCount(0);
      await expect(firstRow.getByText(/Mapped by/)).toHaveCount(0);
      await expect(firstRow.getByText(/^#\d+$/)).toHaveCount(0);
      await expect(page.locator('header svg.lucide-music')).toBeVisible();
      await expect(firstRow.locator('svg.lucide-chevron-right')).toHaveCount(0);

      await expect(
        firstRow.locator(
          '[data-testid="beatmap-heading"] [data-testid="beatmap-title"]'
        )
      ).toHaveCount(1);
      await expect(
        firstRow.locator(
          '[data-testid="beatmap-heading"] [data-testid="beatmap-difficulty-name"]'
        )
      ).toHaveCount(1);
      await expect(
        firstRow.locator(
          '[data-testid="beatmap-attribution"] [data-testid="beatmap-artist"]'
        )
      ).toHaveCount(1);
      await expect(
        firstRow.locator(
          '[data-testid="beatmap-attribution"] [data-testid="beatmap-mapper"]'
        )
      ).toHaveCount(1);
      await expect(
        firstRow.locator('[data-testid="beatmap-artist"] svg.lucide-music-2')
      ).toHaveCount(1);
      await expect(
        firstRow.locator('[data-testid="beatmap-mapper"] svg.lucide-user-round')
      ).toHaveCount(1);

      const [
        titleBox,
        difficultyBox,
        artistBox,
        mapperBox,
        rulesetBox,
        starBox,
      ] = await Promise.all([
        firstRow.locator('[data-testid="beatmap-title"]').boundingBox(),
        firstRow
          .locator('[data-testid="beatmap-difficulty-name"]')
          .boundingBox(),
        firstRow.locator('[data-testid="beatmap-artist"]').boundingBox(),
        firstRow.locator('[data-testid="beatmap-mapper"]').boundingBox(),
        firstRow.locator('[data-testid="beatmap-ruleset"]').boundingBox(),
        firstRow.locator('[data-testid="beatmap-star-rating"]').boundingBox(),
      ]);
      expect(titleBox).not.toBeNull();
      expect(difficultyBox).not.toBeNull();
      expect(artistBox).not.toBeNull();
      expect(mapperBox).not.toBeNull();
      expect(rulesetBox).not.toBeNull();
      expect(starBox).not.toBeNull();
      expect(difficultyBox!.x).toBeGreaterThanOrEqual(
        titleBox!.x + titleBox!.width
      );
      expect(Math.abs(titleBox!.y - difficultyBox!.y)).toBeLessThanOrEqual(4);
      expect(mapperBox!.x).toBeGreaterThanOrEqual(
        artistBox!.x + artistBox!.width
      );
      expect(Math.abs(artistBox!.y - mapperBox!.y)).toBeLessThanOrEqual(2);
      expect(artistBox!.y).toBeGreaterThan(titleBox!.y);
      expect(Math.round(starBox!.x - rulesetBox!.x - rulesetBox!.width)).toBe(
        12
      );
      expect(Math.abs(rulesetBox!.y - starBox!.y)).toBeLessThanOrEqual(2);
      await expect(
        firstRow.locator(
          '[data-testid="beatmap-primary-metrics"] [data-testid="beatmap-ruleset"]'
        )
      ).toHaveCount(1);

      const difficultyPresentation = await page
        .locator('[data-testid="beatmap-difficulty-name"]')
        .evaluateAll((elements) =>
          elements.slice(0, 10).map((element) => {
            const fullName = element.getAttribute('title') ?? '';
            const displayedName = (element.textContent ?? '').slice(1, -1);
            const style = getComputedStyle(element);

            return {
              displayedName,
              fullName,
              inlineWidth: (element as HTMLElement).style.width,
              overflow: style.overflow,
              textOverflow: style.textOverflow,
              whiteSpace: style.whiteSpace,
            };
          })
        );
      for (const difficulty of difficultyPresentation) {
        expect(difficulty.displayedName).toBe(difficulty.fullName);
        expect(difficulty.inlineWidth).toBe('');
        expect(difficulty.overflow).toBe('visible');
        expect(difficulty.textOverflow).toBe('clip');
        expect(difficulty.whiteSpace).toBe('normal');
      }

      const untruncatedText = await firstRow
        .locator(
          '[data-testid="beatmap-title"], [data-testid="beatmap-artist-name"], [data-testid="beatmap-mapper-name"]'
        )
        .evaluateAll((elements) =>
          elements.map((element) => {
            const style = getComputedStyle(element);

            return {
              overflow: style.overflow,
              textOverflow: style.textOverflow,
              whiteSpace: style.whiteSpace,
              width: (element as HTMLElement).style.width,
            };
          })
        );
      for (const text of untruncatedText) {
        expect(text.overflow).toBe('visible');
        expect(text.textOverflow).toBe('clip');
        expect(text.whiteSpace).toBe('normal');
        expect(text.width).toBe('');
      }

      const starRating = firstRow.locator(
        '[data-testid="beatmap-star-rating"]'
      );
      const starPresentation = await starRating.evaluate((pill) => {
        const pillStyle = getComputedStyle(pill);
        const icon = pill.querySelector('svg')!;
        const value = pill.querySelector(
          '[data-testid="beatmap-star-rating-value"]'
        )!;
        const iconStyle = getComputedStyle(icon);
        const valueStyle = getComputedStyle(value);
        const pathStyle = getComputedStyle(icon.querySelector('path')!);

        return {
          backgroundColor: pillStyle.backgroundColor,
          backgroundImage: pillStyle.backgroundImage,
          borderRadius: Number.parseFloat(pillStyle.borderRadius),
          boxShadow: pillStyle.boxShadow,
          color: pillStyle.color,
          filter: pillStyle.filter,
          height: pill.getBoundingClientRect().height,
          iconFilter: iconStyle.filter,
          inlineBackgroundColor: (pill as HTMLElement).style.backgroundColor,
          fill: pathStyle.fill,
          stroke: pathStyle.stroke,
          valueColor: valueStyle.color,
          valueFont: {
            family: valueStyle.fontFamily,
            size: valueStyle.fontSize,
            weight: valueStyle.fontWeight,
          },
        };
      });
      const bpmValueFont = await firstRow
        .locator('[data-testid="beatmap-bpm-value"]')
        .evaluate((value) => {
          const valueStyle = getComputedStyle(value);

          return {
            family: valueStyle.fontFamily,
            size: valueStyle.fontSize,
            weight: valueStyle.fontWeight,
          };
        });

      expect(starPresentation.backgroundColor).toBe(
        starPresentation.inlineBackgroundColor
      );
      expect(starPresentation.backgroundImage).toBe('none');
      expect(starPresentation.boxShadow).toBe('none');
      expect(starPresentation.filter).toBe('none');
      expect(starPresentation.iconFilter).toBe('none');
      expect(starPresentation.borderRadius).toBeGreaterThanOrEqual(
        starPresentation.height / 2
      );
      expect(starPresentation.fill).toBe(starPresentation.color);
      expect(starPresentation.stroke).toBe(starPresentation.color);
      expect(starPresentation.valueColor).toBe(starPresentation.color);
      expect(starPresentation.valueFont).toEqual(bpmValueFont);

      const modPresentations = await displayedMods.evaluateAll((pills) =>
        pills.map((pill) => {
          const pillStyle = getComputedStyle(pill);

          return {
            backgroundColor: pillStyle.backgroundColor,
            backgroundImage: pillStyle.backgroundImage,
            borderRadius: Number.parseFloat(pillStyle.borderRadius),
            childColors: Array.from(pill.children).map(
              (child) => getComputedStyle(child).color
            ),
            color: pillStyle.color,
            height: pill.getBoundingClientRect().height,
            inlineBackgroundColor: (pill as HTMLElement).style.backgroundColor,
          };
        })
      );
      for (const modPresentation of modPresentations) {
        expect(modPresentation.inlineBackgroundColor).toMatch(
          /^var\(--(?:chart|mod)-/
        );
        expect(modPresentation.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(modPresentation.backgroundImage).toBe('none');
        expect(modPresentation.height).toBe(24);
        expect(modPresentation.borderRadius).toBeGreaterThanOrEqual(
          modPresentation.height / 2
        );
        expect(modPresentation.childColors).toEqual([
          modPresentation.color,
          modPresentation.color,
        ]);
      }
    });

    test('hides mod summaries for mania beatmaps', async ({ page }) => {
      await page.goto(`${ROUTES.beatmaps}?ruleset=4`);
      const firstRow = page
        .locator('[data-testid^="beatmap-list-row-"]')
        .first();

      await expect(firstRow).toBeVisible({ timeout: 10000 });
      await expect(
        firstRow.locator('[data-testid="beatmap-mods-summary"]')
      ).toHaveCount(0);
      await expect(
        firstRow.locator('[data-testid="beatmap-games-count"]')
      ).toBeVisible();
      await expect(
        firstRow.locator('[data-testid="beatmap-tournaments-count"]')
      ).toBeVisible();
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

    test('failed previews reload on retry and expose error semantics', async ({
      page,
    }) => {
      const audio = await installMockPreviewAudio(page);
      await page.goto(ROUTES.beatmaps);

      const firstRow = page
        .locator('[data-testid^="beatmap-list-row-"]')
        .first();
      const preview = firstRow.locator('button[data-preview-state]').first();
      await expect(preview).toBeVisible({ timeout: 10000 });
      await expect(preview).toHaveAccessibleName('Play preview');
      await audio.queuePlayBehaviors('error');
      await preview.click();

      const transport = page.locator('[data-testid="audio-preview-transport"]');
      await expect(transport).toHaveAttribute('data-player-state', 'error');
      await expect(transport.getByRole('status')).toHaveText(
        'Preview unavailable'
      );
      await expect(preview).toHaveAccessibleName('Retry preview');
      await expect(preview).toHaveAttribute('data-preview-state', 'error');
      await expect(preview).toHaveAttribute('aria-pressed', 'false');

      expect(await audio.snapshot()).toMatchObject({
        loadCalls: 0,
        playCalls: 1,
        sourceAssignments: 1,
      });

      await transport
        .getByRole('button', { name: 'Retry beatmap preview' })
        .click();
      await expect(transport).toHaveAttribute('data-player-state', 'playing');
      await expect(preview).toHaveAccessibleName('Pause preview');
      await expect(preview).toHaveAttribute('data-preview-state', 'playing');
      await expect(preview).toHaveAttribute('aria-pressed', 'true');
      expect(await audio.snapshot()).toMatchObject({
        loadCalls: 1,
        playCalls: 2,
        sourceAssignments: 1,
      });
    });

    test('pausing a pending preview ignores its later AbortError', async ({
      page,
    }) => {
      const audio = await installMockPreviewAudio(page);
      await page.goto(ROUTES.beatmaps);

      const firstRow = page
        .locator('[data-testid^="beatmap-list-row-"]')
        .first();
      const preview = firstRow.locator('button[data-preview-state]').first();
      await expect(preview).toBeVisible({ timeout: 10000 });
      await expect(preview).toHaveAccessibleName('Play preview');
      await audio.queuePlayBehaviors('defer');
      await preview.click();

      const transport = page.locator('[data-testid="audio-preview-transport"]');
      await expect(transport).toHaveAttribute('data-player-state', 'loading');
      await expect
        .poll(async () => (await audio.snapshot()).pendingPlayCount)
        .toBe(1);

      await transport
        .getByRole('button', { name: 'Loading beatmap preview' })
        .click();
      await expect(transport).toHaveAttribute('data-player-state', 'paused');
      await audio.rejectPendingPlay('AbortError');
      await page.evaluate(
        () => new Promise<void>((resolve) => setTimeout(resolve, 0))
      );

      await expect(transport).toHaveAttribute('data-player-state', 'paused');
      await expect(
        transport.getByText('Preview unavailable', { exact: true })
      ).toHaveCount(0);
      await expect(preview).toHaveAccessibleName('Resume preview');
      await expect(preview).toHaveAttribute('data-preview-state', 'paused');
    });

    test('a stale play rejection cannot overwrite a newer track', async ({
      page,
    }) => {
      await installMockBeatmapCovers(page);
      const audio = await installMockPreviewAudio(page);
      await page.goto(ROUTES.beatmaps);

      const { first, second, secondBeatmapsetOsuId } =
        await getDistinctBeatmapPreviewRows(page);
      const firstPreview = first.locator('button[data-preview-state]').first();
      const secondPreview = second
        .locator('button[data-preview-state]')
        .first();
      await expect(firstPreview).toHaveAccessibleName('Play preview');
      await expect(secondPreview).toHaveAccessibleName('Play preview');
      const secondTitle = (
        await second.locator('[data-testid="beatmap-title"]').innerText()
      ).trim();

      await audio.queuePlayBehaviors('defer');
      await firstPreview.click();
      const firstSource = (await audio.snapshot()).source;

      const transport = page.locator('[data-testid="audio-preview-transport"]');
      await expect(transport).toHaveAttribute('data-player-state', 'loading');
      await secondPreview.click();
      await expect(transport).toHaveAttribute('data-player-state', 'playing');

      const secondSource = (await audio.snapshot()).source;
      expect(secondSource).not.toBe(firstSource);
      expect(secondSource).toContain(`/preview/${secondBeatmapsetOsuId}.mp3`);
      await expect(
        transport.getByText(secondTitle, { exact: true }).first()
      ).toBeVisible();

      await audio.rejectPendingPlay('NotSupportedError');
      await page.evaluate(
        () => new Promise<void>((resolve) => setTimeout(resolve, 0))
      );

      await expect(transport).toHaveAttribute('data-player-state', 'playing');
      await expect(
        transport.getByText('Preview unavailable', { exact: true })
      ).toHaveCount(0);
      await expect(secondPreview).toHaveAccessibleName('Pause preview');
      await expect(secondPreview).toHaveAttribute(
        'data-preview-state',
        'playing'
      );
    });

    test('audio transport preserves track identity at narrow breakpoints', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 640, height: 844 });
      await installMockPreviewAudio(page);
      await page.goto(ROUTES.beatmaps);

      const firstRow = page
        .locator('[data-testid^="beatmap-list-row-"]')
        .first();
      const title = (
        await firstRow.locator('[data-testid="beatmap-title"]').innerText()
      ).trim();
      const preview = firstRow.getByRole('button', { name: 'Play preview' });
      await preview.click();

      const transport = page.locator('[data-testid="audio-preview-transport"]');
      await expect(transport).toHaveAttribute('data-player-state', 'playing');
      const transportTitle = transport
        .getByText(title, { exact: true })
        .first();
      const progress = transport.getByRole('slider', {
        name: 'Preview progress',
      });

      for (const width of [640, 700, 767, 768]) {
        await test.step(`${width}px transport layout`, async () => {
          await page.setViewportSize({ width, height: 844 });
          await expect(transportTitle).toBeVisible();

          const [titleBox, progressBox] = await Promise.all([
            transportTitle.boundingBox(),
            progress.boundingBox(),
          ]);
          expect(titleBox).not.toBeNull();
          expect(progressBox).not.toBeNull();
          expect(titleBox!.width).toBeGreaterThanOrEqual(64);
          expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(
            progressBox!.x
          );

          const overflow = await page.evaluate(() => {
            const transportElement = document.querySelector(
              '[data-testid="audio-preview-transport"]'
            );
            return {
              document:
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
              transport: transportElement
                ? transportElement.scrollWidth - transportElement.clientWidth
                : Number.MAX_VALUE,
            };
          });
          expect(overflow).toEqual({ document: 0, transport: 0 });

          await expect
            .poll(() =>
              page.evaluate(() => {
                const transportElement = document.querySelector(
                  '[data-testid="audio-preview-transport"]'
                );
                return (
                  Number.parseFloat(
                    getComputedStyle(document.body).paddingBottom
                  ) >=
                  (transportElement?.getBoundingClientRect().height ??
                    Number.MAX_VALUE)
                );
              })
            )
            .toBe(true);
        });
      }
    });

    test('transport cover failures reset for a different beatmapset', async ({
      page,
    }) => {
      await installMockBeatmapCovers(page);
      const audio = await installMockPreviewAudio(page);
      await page.goto(ROUTES.beatmaps);

      const { first, firstBeatmapsetOsuId, second, secondBeatmapsetOsuId } =
        await getDistinctBeatmapPreviewRows(page);
      await first.getByRole('button', { name: 'Play preview' }).click();

      const transport = page.locator('[data-testid="audio-preview-transport"]');
      await expect(transport).toHaveAttribute('data-player-state', 'playing');
      const cover = transport.locator('img');
      await expect(cover).toHaveAttribute(
        'src',
        new RegExp(`/beatmaps/${firstBeatmapsetOsuId}/covers/cover@2x\\.jpg$`)
      );

      await cover.evaluate((image) => image.dispatchEvent(new Event('error')));
      await expect(cover).toHaveAttribute('src', /beatmap-background-narrow/);

      await second.getByRole('button', { name: 'Play preview' }).click();
      await expect(transport).toHaveAttribute('data-player-state', 'playing');
      expect((await audio.snapshot()).source).toContain(
        `/preview/${secondBeatmapsetOsuId}.mp3`
      );
      await expect(cover).toHaveAttribute(
        'src',
        new RegExp(`/beatmaps/${secondBeatmapsetOsuId}/covers/cover@2x\\.jpg$`)
      );
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

    test('sorts searched beatmaps by SR descending', async ({ page }) => {
      await page.goto(ROUTES.beatmaps);

      const search = page.locator('[data-testid="beatmap-search-input"]');
      await search.fill('Freedom');
      await page.waitForURL(/q=Freedom/, { timeout: 10000 });

      await page.locator('[data-testid="beatmap-sort-select"]').click();
      await page.getByRole('option', { name: 'SR (star rating)' }).click();
      await page.waitForURL(
        (url) =>
          url.searchParams.get('q') === 'Freedom' &&
          url.searchParams.get('sort') === 'sr',
        { timeout: 10000 }
      );

      const ratings = page.locator('[data-testid="beatmap-star-rating-value"]');
      await expect(ratings.first()).toBeVisible({ timeout: 10000 });
      await expect
        .poll(
          async () => {
            const values = (await ratings.allTextContents()).map(Number);
            return (
              values.length > 1 &&
              values.every(
                (value, index) => index === 0 || values[index - 1] >= value
              )
            );
          },
          { timeout: 10000 }
        )
        .toBe(true);
      await expect(
        page.locator('[data-testid="beatmap-sort-direction"]')
      ).toHaveAccessibleName('Sort order is descending');
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

    test('redirects an out-of-range mobile page to the last page', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${ROUTES.beatmaps}?sort=sr&page=999999`);
      await page.waitForURL(
        (url) => url.searchParams.get('page') !== '999999',
        { timeout: 10000 }
      );
      expect(new URL(page.url()).searchParams.get('sort')).toBe('sr');

      const status = page.locator('[data-testid="beatmap-pagination-status"]');
      await expect(status).toBeVisible({ timeout: 10000 });

      const [currentPage, totalPages] = (await status.innerText())
        .split('/')
        .map((value) => Number(value.trim()));
      expect(currentPage).toBe(totalPages);

      const rows = page.locator('[data-testid^="beatmap-list-row-"]');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });

      const noMatchQuery = 'otr-e2e-no-matching-beatmap-7fd826c1';
      await page.goto(`${ROUTES.beatmaps}?q=${noMatchQuery}&page=999999`);
      await page.waitForURL(
        (url) =>
          url.searchParams.get('q') === noMatchQuery &&
          url.searchParams.get('page') === null,
        { timeout: 10000 }
      );
      await expect(page.getByText('No beatmaps match')).toBeVisible({
        timeout: 10000,
      });
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
    const metricWidths = await firstRow.evaluate((row) => {
      const testIds = [
        'beatmap-star-rating',
        'beatmap-bpm',
        'beatmap-duration',
        'beatmap-mods-summary',
      ];

      return testIds.map((testId) =>
        Math.round(
          row
            .querySelector(`[data-testid="${testId}"]`)!
            .getBoundingClientRect().width
        )
      );
    });
    expect(metricWidths[0]).toBeGreaterThanOrEqual(60);
    expect(metricWidths[0]).toBeLessThanOrEqual(68);
    expect(metricWidths.slice(1)).toEqual([56, 68, 208]);

    const countWidths = await firstRow.evaluate((row) => {
      const games = row.querySelector('[data-testid="beatmap-games-count"]')!;
      const tournaments = row.querySelector(
        '[data-testid="beatmap-tournaments-count"]'
      )!;
      const gameValue = row.querySelector(
        '[data-testid="beatmap-games-count-value"]'
      )!;
      const tournamentValue = row.querySelector(
        '[data-testid="beatmap-tournaments-count-value"]'
      )!;

      return {
        games: Math.round(games.getBoundingClientRect().width),
        tournaments: Math.round(tournaments.getBoundingClientRect().width),
        gameValue: Math.round(gameValue.getBoundingClientRect().width),
        tournamentValue: Math.round(
          tournamentValue.getBoundingClientRect().width
        ),
      };
    });
    expect(countWidths.games).toBeLessThanOrEqual(52);
    expect(countWidths.tournaments).toBeLessThanOrEqual(52);
    expect(countWidths.gameValue).toBe(countWidths.tournamentValue);
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

      const ratingColors = await activeDifficulty
        .locator('[data-testid="related-difficulty-star-rating"]')
        .evaluate((rating) => {
          const foregroundProbe = document.createElement('span');
          foregroundProbe.className = 'text-foreground';
          document.body.append(foregroundProbe);
          const colors = {
            rating: getComputedStyle(rating).color,
            foreground: getComputedStyle(foregroundProbe).color,
          };
          foregroundProbe.remove();
          return colors;
        });
      expect(ratingColors.rating).toBe(ratingColors.foreground);

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

    test('hero preview exposes retry semantics after an audio error', async ({
      page,
    }) => {
      const audio = await installMockPreviewAudio(page);
      await page.goto(ROUTES.beatmap(TEST_BEATMAP_OSU_ID));

      const preview = page.locator('header button[data-preview-state]').first();
      await expect(preview).toBeVisible({ timeout: 10000 });
      await audio.queuePlayBehaviors('error');
      await preview.click();

      const transport = page.locator('[data-testid="audio-preview-transport"]');
      await expect(transport).toHaveAttribute('data-player-state', 'error');
      await expect(preview).toHaveAccessibleName('Retry preview');
      await expect(preview).toHaveText('Retry');
      await expect(preview).toHaveAttribute('data-preview-state', 'error');
      await expect(preview).toHaveAttribute('aria-pressed', 'false');
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
