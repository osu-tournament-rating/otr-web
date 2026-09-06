import { test, expect, type Page } from '@playwright/test';
import {
  ROUTES,
  TEST_PLAYER_ID,
  TEST_PUBLIC_TOURNAMENT_ID,
} from './fixtures/test-config';

const TOOLTIP = '[data-slot="tooltip-content"]';
const POPOVER = '[data-slot="popover-content"]';
const HELP_NAME = 'About the rating history chart';
const HELP_TEXT = 'Shows your rating changes over time';

async function submitterTrigger(page: Page) {
  await page.goto(ROUTES.tournament(TEST_PUBLIC_TOURNAMENT_ID));
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    "Dio's Autumn"
  );
  const trigger = page
    .locator('[data-slot="tooltip-trigger"]')
    .filter({ has: page.getByText('Submitter', { exact: true }) })
    .filter({ visible: true });
  await expect(trigger).toBeVisible();
  return trigger;
}

async function helpTrigger(page: Page) {
  await page.goto(ROUTES.playerProfile(TEST_PLAYER_ID));
  await page.waitForLoadState('networkidle');
  const trigger = page.getByRole('button', { name: HELP_NAME });
  await expect(trigger).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  return trigger;
}

test.describe('Tooltip input and dismissal', () => {
  test.describe('touch-only phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('submitter stays unobscured after a tap and emulated hover', async ({
      page,
    }) => {
      const trigger = await submitterTrigger(page);
      expect(
        await page.evaluate(() => matchMedia('(any-hover: hover)').matches)
      ).toBe(false);
      await trigger.tap();
      // Some mobile input paths report a compatibility mouse move after touch.
      await trigger.dispatchEvent('pointermove', { pointerType: 'mouse' });
      // Wait beyond Radix's hover delay so an absent overlay is not a race.
      await page.waitForTimeout(800);
      await expect(page.locator(TOOLTIP)).toHaveCount(0);
      await expect(page.locator(POPOVER)).toHaveCount(0);
      expect(
        await trigger.evaluate((el) => el.closest('button, a'))
      ).toBeNull();
    });

    test('help ignores emulated hover but still opens on tap', async ({
      page,
    }) => {
      const trigger = await helpTrigger(page);
      await trigger.dispatchEvent('pointermove', { pointerType: 'mouse' });
      await page.waitForTimeout(800);
      await expect(page.locator(TOOLTIP)).toHaveCount(0);
      await trigger.tap();
      await expect(page.locator(POPOVER)).toContainText(HELP_TEXT);
      await page.getByRole('heading', { name: 'Rating History' }).tap();
      await expect(page.locator(POPOVER)).toHaveCount(0);
      await expect(page.locator(TOOLTIP)).toHaveCount(0);
      await trigger.tap();
      await expect(page.locator(POPOVER)).toContainText(HELP_TEXT);
      await trigger.tap();
      await expect(page.locator(POPOVER)).toHaveCount(0);
      await expect(page.locator(TOOLTIP)).toHaveCount(0);
    });

    test('Escape dismisses tapped help without opening a second tooltip', async ({
      page,
    }) => {
      const trigger = await helpTrigger(page);
      await trigger.tap();
      await expect(page.locator(POPOVER)).toContainText(HELP_TEXT);
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(page.locator(POPOVER)).toHaveCount(0);
      await expect(page.locator(TOOLTIP)).toHaveCount(0);
    });

    test('a keyboard can still focus help on a touch device', async ({
      page,
    }) => {
      const trigger = await helpTrigger(page);
      await page.getByRole('tab', { name: 'Chart', exact: true }).focus();
      for (let i = 0; i < 5; i += 1) {
        await page.keyboard.press('Shift+Tab');
        if (await trigger.evaluate((el) => el === document.activeElement))
          break;
      }
      await expect(trigger).toBeFocused();
      await expect(page.locator(TOOLTIP)).toContainText(HELP_TEXT);
      await page.keyboard.press('Escape');
      await expect(page.locator(TOOLTIP)).toHaveCount(0);
    });
  });

  test.describe('mouse and keyboard', () => {
    test.use({ viewport: { width: 1440, height: 1000 } });

    test('submitter still shows its desktop hover label', async ({ page }) => {
      const trigger = await submitterTrigger(page);
      await trigger.hover();
      await expect(page.locator(TOOLTIP)).toHaveText('Submitter');
      await page.mouse.move(0, 0, { steps: 5 });
      await expect(page.locator(TOOLTIP)).toHaveCount(0);
    });

    test('help supports hover, keyboard activation, dismissal and refocus', async ({
      page,
    }) => {
      const trigger = await helpTrigger(page);
      await trigger.hover();
      await expect(page.locator(TOOLTIP)).toContainText(HELP_TEXT);
      await page.mouse.move(0, 0);
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator(POPOVER)).toContainText(HELP_TEXT);
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(page.locator(POPOVER)).toHaveCount(0);
      await expect(page.locator(TOOLTIP)).toHaveCount(0);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(trigger).toBeFocused();
      await expect(page.locator(TOOLTIP)).toContainText(HELP_TEXT);
    });
  });
});
