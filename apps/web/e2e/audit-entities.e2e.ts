import { test, expect, type Page } from '@playwright/test';
import {
  TEST_AUDIT_MATCH_ID,
  TEST_AUDIT_GAME_ID,
  TEST_AUDIT_SCORE_ID,
  ROUTES,
} from './fixtures/test-config';

type EntityCase = {
  label: string;
  id: number;
  route: string;
  /** Expected href for the "view entity" link, or null when none is rendered. */
  viewEntityHref: string | null;
};

const ENTITY_CASES: EntityCase[] = [
  {
    label: 'Match',
    id: TEST_AUDIT_MATCH_ID,
    route: ROUTES.auditMatch(TEST_AUDIT_MATCH_ID),
    viewEntityHref: `/matches/${TEST_AUDIT_MATCH_ID}`,
  },
  {
    label: 'Game',
    id: TEST_AUDIT_GAME_ID,
    route: ROUTES.auditGame(TEST_AUDIT_GAME_ID),
    viewEntityHref: null,
  },
  {
    label: 'Score',
    id: TEST_AUDIT_SCORE_ID,
    route: ROUTES.auditScore(TEST_AUDIT_SCORE_ID),
    viewEntityHref: null,
  },
];

async function gotoAudit(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
}

for (const entity of ENTITY_CASES) {
  test.describe(`${entity.label} Audit Timeline Page`, () => {
    test.describe('Page Header', () => {
      test('displays breadcrumb and entity title', async ({ page }) => {
        await gotoAudit(page, entity.route);

        const header = page.locator('[data-testid="audit-page-header"]');
        await expect(header).toBeVisible({ timeout: 10000 });

        const breadcrumb = page.locator('[data-testid="audit-breadcrumb"]');
        await expect(breadcrumb).toBeVisible();

        const title = page.locator('[data-testid="audit-entity-title"]');
        await expect(title).toBeVisible();
        await expect(title).toContainText(`#${entity.id}`);
      });

      test('breadcrumb link navigates back to audit feed', async ({ page }) => {
        await gotoAudit(page, entity.route);

        const breadcrumbLink = page.locator(
          '[data-testid="audit-breadcrumb-link"]'
        );
        await expect(breadcrumbLink).toBeVisible({ timeout: 10000 });
        await expect(breadcrumbLink).toHaveText('Audit Logs');

        await breadcrumbLink.click();
        await page.waitForURL('**/tools/audit-logs', { timeout: 10000 });
      });

      test('view entity link matches entity type behavior', async ({
        page,
      }) => {
        await gotoAudit(page, entity.route);

        const viewLink = page.locator('[data-testid="audit-view-entity-link"]');

        if (entity.viewEntityHref) {
          await expect(viewLink).toBeVisible({ timeout: 10000 });
          await expect(viewLink).toHaveAttribute('href', entity.viewEntityHref);
        } else {
          // Game/Score have no view-entity link (getEntityHref returns null).
          await expect(viewLink).toHaveCount(0);
        }
      });
    });

    test.describe('Timeline Content', () => {
      test('shows change count in summary header', async ({ page }) => {
        await gotoAudit(page, entity.route);

        const summary = page.locator('[data-testid="timeline-summary"]');
        await expect(summary).toBeVisible({ timeout: 15000 });
        await expect(summary).toContainText(/\d+ changes?/);
      });

      test('renders timeline entries with action badges', async ({ page }) => {
        await gotoAudit(page, entity.route);

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
        await gotoAudit(page, entity.route);

        const entryList = page.locator('[data-testid="timeline-entry-list"]');
        await expect(entryList).toBeVisible({ timeout: 15000 });

        // Find an entry with a non-disabled trigger (has diffs)
        const entries = page.locator('[data-testid="timeline-entry"]');
        const entryCount = await entries.count();

        for (let i = 0; i < entryCount; i++) {
          const entry = entries.nth(i);
          const trigger = entry.locator('button').first();
          const isDisabled = (await trigger.getAttribute('disabled')) !== null;

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
        await gotoAudit(page, entity.route);

        const entryList = page.locator('[data-testid="timeline-entry-list"]');
        await expect(entryList).toBeVisible({ timeout: 15000 });

        // Timeline entries have <time> elements for timestamps
        const firstEntry = page
          .locator('[data-testid="timeline-entry"]')
          .first();
        const timestamp = firstEntry.locator('time');
        await expect(timestamp).toBeVisible();
        await expect(timestamp).not.toBeEmpty();
      });
    });
  });
}
