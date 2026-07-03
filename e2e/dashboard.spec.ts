import { test, expect, type Page } from '@playwright/test';
import { setLoginInfo, defaultMocks, tradeMocks } from './helpers';

const bilingualLabel = (english: string) => new RegExp(`${english}\\s*(?:/.*)?$`, 'i');
const dragHeader = (page: Page, label: RegExp) =>
  page.locator('.drag-header').filter({ hasText: label });

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await tradeMocks(page);
    await setLoginInfo(page);
  });
  test('Dashboard Page', async ({ page }) => {
    await Promise.all([
      page.goto('/dashboard'),
      page.waitForResponse('**/status'),
      page.waitForResponse('**/profit'),
      page.waitForResponse('**/balance'),
      // page.waitForResponse('**/trades'),
      page.waitForResponse('**/whitelist'),
      page.waitForResponse('**/blacklist'),
      page.waitForResponse('**/locks'),
    ]);
    await expect(dragHeader(page, bilingualLabel('Bot comparison'))).toBeVisible();
    await expect(dragHeader(page, bilingualLabel('Bot comparison'))).toBeInViewport();
    await expect(dragHeader(page, bilingualLabel('Profit over time'))).toBeVisible();
    await expect(dragHeader(page, bilingualLabel('Profit over time'))).toBeInViewport();
    await expect(dragHeader(page, /Open [Tt]rades\s*(?:\/.*)?$/)).toBeVisible();
    await expect(dragHeader(page, /Open [Tt]rades\s*(?:\/.*)?$/)).toBeInViewport();
    await expect(dragHeader(page, bilingualLabel('Cumulative Profit'))).toBeVisible();
    await expect(dragHeader(page, bilingualLabel('Cumulative Profit'))).toBeInViewport();

    await expect(page.locator('span').filter({ hasText: /^TestBot$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: bilingualLabel('Summary') })).toBeVisible();
    // Scroll to bottom
    await dragHeader(page, bilingualLabel('Trades Log')).scrollIntoViewIfNeeded();
    await expect(dragHeader(page, bilingualLabel('Closed Trades'))).toBeInViewport();
    await expect(dragHeader(page, bilingualLabel('Profit Distribution'))).toBeInViewport();

    await expect(dragHeader(page, bilingualLabel('Trades Log'))).toBeInViewport();
  });
});
