import { test, expect } from '@playwright/test';
import { TEST_TOURNAMENT_ID, ROUTES } from './fixtures/test-config';

test.describe('Audit Event Feed Page', () => {
  test.describe('Page Load', () => {
    test('displays page heading and description', async ({ page }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      const heading = page.locator('[data-testid="audit-logs-heading"]');
      await expect(heading).toBeVisible({ timeout: 10000 });
      await expect(heading).toHaveText('Audit Logs');

      const description = page.locator('text=Browse the history of changes');
      await expect(description).toBeVisible();
    });

    test('renders filter bar with all controls', async ({ page }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      const filterBar = page.locator('[data-testid="audit-filter-bar"]');
      await expect(filterBar).toBeVisible({ timeout: 10000 });

      await expect(
        page.locator('[data-testid="filter-action-type"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="filter-entity-type"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="filter-field-updated"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="filter-show-system"]')
      ).toBeVisible();
    });

    test('displays event cards after loading', async ({ page }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      const eventList = page.locator('[data-testid="audit-event-list"]');
      await expect(eventList).toBeVisible({ timeout: 15000 });

      const cards = page.locator('[data-testid="audit-event-card"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Filter Controls', () => {
    test('action type popover opens and shows options', async ({ page }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="filter-action-type"]').click();
      await expect(
        page.getByRole('option', { name: 'Created' })
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Updated' })
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Deleted' })
      ).toBeVisible();
    });

    test('entity type popover opens and shows options', async ({ page }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="filter-entity-type"]').click();
      await expect(
        page.getByRole('option', { name: 'Tournament' })
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Match' })
      ).toBeVisible();
    });

    test('field updated popover opens with search input', async ({ page }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      await page.locator('[data-testid="filter-field-updated"]').click();
      await expect(
        page.getByPlaceholder('Search fields...')
      ).toBeVisible();
    });

    test('show system events checkbox toggles', async ({ page }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      const checkbox = page.locator('[data-testid="filter-show-system"]');
      await expect(checkbox).toBeVisible();
      await expect(checkbox).toHaveAttribute('aria-checked', 'false');

      await checkbox.click();
      await expect(checkbox).toHaveAttribute('aria-checked', 'true');

      await checkbox.click();
      await expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    test('clear filters button appears when filter is active and resets on click', async ({
      page,
    }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      // Clear button should not be visible initially
      await expect(
        page.locator('[data-testid="filter-clear"]')
      ).not.toBeVisible();

      // Select an entity type filter
      await page.locator('[data-testid="filter-entity-type"]').click();
      await page.getByRole('option', { name: 'Tournament' }).click();
      // Close the popover
      await page.keyboard.press('Escape');

      // Clear button should now be visible
      const clearButton = page.locator('[data-testid="filter-clear"]');
      await expect(clearButton).toBeVisible();

      // Click clear and verify it disappears
      await clearButton.click();
      await expect(clearButton).not.toBeVisible();
    });
  });

  test.describe('Event Cards', () => {
    test('event cards display description and timestamp', async ({ page }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      const eventList = page.locator('[data-testid="audit-event-list"]');
      await expect(eventList).toBeVisible({ timeout: 15000 });

      const firstCard = page.locator('[data-testid="audit-event-card"]').first();
      await expect(firstCard).toBeVisible();

      const description = firstCard.locator(
        '[data-testid="event-card-description"]'
      );
      await expect(description).toBeVisible();
      await expect(description).not.toBeEmpty();

      const timestamp = firstCard.locator(
        '[data-testid="event-card-timestamp"]'
      );
      await expect(timestamp).toBeVisible();
    });

    test('expandable event card shows diff on click', async ({ page }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      const eventList = page.locator('[data-testid="audit-event-list"]');
      await expect(eventList).toBeVisible({ timeout: 15000 });

      // Find an expandable card (one with a chevron indicator)
      const expandableCard = page
        .locator('[data-testid="audit-event-card"]')
        .filter({ has: page.locator('svg.rotate-90, svg:not(.rotate-90)').first() })
        .filter({ has: page.locator('button:not([disabled])') })
        .first();

      if (await expandableCard.isVisible()) {
        const trigger = expandableCard.locator('button').first();
        await trigger.click();

        const diff = expandableCard.locator(
          '[data-testid="event-card-diff"]'
        );
        await expect(diff).toBeVisible({ timeout: 5000 });
      }
    });

    test('diff display shows field label, old value, and new value', async ({
      page,
    }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      const eventList = page.locator('[data-testid="audit-event-list"]');
      await expect(eventList).toBeVisible({ timeout: 15000 });

      // Find and expand a card that has diffs
      const cards = page.locator('[data-testid="audit-event-card"]');
      const cardCount = await cards.count();

      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i);
        const trigger = card.locator('button').first();
        const isDisabled =
          (await trigger.getAttribute('disabled')) !== null;

        if (!isDisabled) {
          await trigger.click();
          const diffRow = card.locator('[data-testid="audit-diff-row"]').first();
          if (await diffRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(
              diffRow.locator('[data-testid="diff-field-label"]')
            ).toBeVisible();
            await expect(
              diffRow.locator('[data-testid="diff-old-value"]')
            ).toBeVisible();
            await expect(
              diffRow.locator('[data-testid="diff-new-value"]')
            ).toBeVisible();
            break;
          }
          // Collapse and try next
          await trigger.click();
        }
      }
    });

    test('event card entity link navigates to audit timeline', async ({
      page,
    }) => {
      await page.goto(ROUTES.auditLogs);
      await page.waitForLoadState('networkidle');

      const eventList = page.locator('[data-testid="audit-event-list"]');
      await expect(eventList).toBeVisible({ timeout: 15000 });

      // Find an entity link inside the first card description
      const firstCard = page.locator('[data-testid="audit-event-card"]').first();
      const entityLink = firstCard.locator(
        '[data-testid="event-card-description"] a[href^="/audit/"]'
      );

      if (await entityLink.isVisible()) {
        const href = await entityLink.getAttribute('href');
        await entityLink.click();
        await page.waitForURL(`**${href}`, { timeout: 10000 });
        await expect(
          page.locator('[data-testid="audit-page-header"]')
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

test.describe('Entity Audit Timeline Page', () => {
  test.describe('Page Header', () => {
    test('displays breadcrumb and entity title', async ({ page }) => {
      await page.goto(ROUTES.auditTournament(TEST_TOURNAMENT_ID));
      await page.waitForLoadState('networkidle');

      const header = page.locator('[data-testid="audit-page-header"]');
      await expect(header).toBeVisible({ timeout: 10000 });

      const breadcrumb = page.locator('[data-testid="audit-breadcrumb"]');
      await expect(breadcrumb).toBeVisible();

      const title = page.locator('[data-testid="audit-entity-title"]');
      await expect(title).toBeVisible();
      await expect(title).toContainText(`#${TEST_TOURNAMENT_ID}`);
    });

    test('breadcrumb link navigates back to audit feed', async ({ page }) => {
      await page.goto(ROUTES.auditTournament(TEST_TOURNAMENT_ID));
      await page.waitForLoadState('networkidle');

      const breadcrumbLink = page.locator(
        '[data-testid="audit-breadcrumb-link"]'
      );
      await expect(breadcrumbLink).toBeVisible({ timeout: 10000 });
      await expect(breadcrumbLink).toHaveText('Audit Logs');

      await breadcrumbLink.click();
      await page.waitForURL('**/tools/audit-logs', { timeout: 10000 });
    });

    test('view entity link exists for tournaments', async ({ page }) => {
      await page.goto(ROUTES.auditTournament(TEST_TOURNAMENT_ID));
      await page.waitForLoadState('networkidle');

      const viewLink = page.locator(
        '[data-testid="audit-view-entity-link"]'
      );
      await expect(viewLink).toBeVisible({ timeout: 10000 });
      await expect(viewLink).toHaveAttribute(
        'href',
        `/tournaments/${TEST_TOURNAMENT_ID}`
      );
    });
  });

  test.describe('Timeline Content', () => {
    test('shows change count in summary header', async ({ page }) => {
      await page.goto(ROUTES.auditTournament(TEST_TOURNAMENT_ID));
      await page.waitForLoadState('networkidle');

      const summary = page.locator('[data-testid="timeline-summary"]');
      await expect(summary).toBeVisible({ timeout: 15000 });
      await expect(summary).toContainText(/\d+ changes?/);
    });

    test('renders timeline entries with action badges', async ({ page }) => {
      await page.goto(ROUTES.auditTournament(TEST_TOURNAMENT_ID));
      await page.waitForLoadState('networkidle');

      const entryList = page.locator('[data-testid="timeline-entry-list"]');
      await expect(entryList).toBeVisible({ timeout: 15000 });

      const entries = page.locator('[data-testid="timeline-entry"]');
      const count = await entries.count();
      expect(count).toBeGreaterThan(0);

      // Each entry should have an action badge
      const badges = page.locator('[data-testid="timeline-action-badge"]');
      const badgeCount = await badges.count();
      expect(badgeCount).toBeGreaterThan(0);
    });

    test('timeline entry expands to show field diffs', async ({ page }) => {
      await page.goto(ROUTES.auditTournament(TEST_TOURNAMENT_ID));
      await page.waitForLoadState('networkidle');

      const entryList = page.locator('[data-testid="timeline-entry-list"]');
      await expect(entryList).toBeVisible({ timeout: 15000 });

      // Find an entry with a non-disabled trigger (has diffs)
      const entries = page.locator('[data-testid="timeline-entry"]');
      const entryCount = await entries.count();

      for (let i = 0; i < entryCount; i++) {
        const entry = entries.nth(i);
        const trigger = entry.locator('button').first();
        const isDisabled =
          (await trigger.getAttribute('disabled')) !== null;

        if (!isDisabled) {
          // Entry may already be open (auto-expands when changeCount > 0 && < 10)
          const state = await entry.getAttribute('data-state');
          if (state !== 'open') {
            await trigger.click();
          }

          const diff = entry.locator('[data-testid="timeline-entry-diff"]');
          await expect(diff).toBeVisible({ timeout: 5000 });

          const diffRows = entry.locator('[data-testid="audit-diff-row"]');
          const rowCount = await diffRows.count();
          expect(rowCount).toBeGreaterThan(0);
          break;
        }
      }
    });

    test('timeline entries display timestamps', async ({ page }) => {
      await page.goto(ROUTES.auditTournament(TEST_TOURNAMENT_ID));
      await page.waitForLoadState('networkidle');

      const entryList = page.locator('[data-testid="timeline-entry-list"]');
      await expect(entryList).toBeVisible({ timeout: 15000 });

      // Timeline entries have <time> elements for timestamps
      const firstEntry = page.locator('[data-testid="timeline-entry"]').first();
      const timestamp = firstEntry.locator('time');
      await expect(timestamp).toBeVisible();
      await expect(timestamp).not.toBeEmpty();
    });
  });
});
