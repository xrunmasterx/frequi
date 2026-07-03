import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

const bilingualLabel = (english: string) => new RegExp(`${english}\\s*(?:/.*)?$`, 'i');

test.describe('Chart', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });
  test('Chart page', async ({ page }) => {
    await Promise.all([
      page.goto('/graph'),
      page.waitForResponse('**/whitelist'),
      page.waitForResponse('**/blacklist'),
      page.waitForResponse('**/pair_candles'),
    ]);

    // await page.waitForResponse('**/pair_candles');

    await page.getByRole('button', { name: bilingualLabel('Refresh chart') }).click();
    // await page.click('input[title="AutoRefresh"]');

    await page.waitForSelector('span:has-text("NoActionStrategyFut | 1m")');
    const heikinAshiCheck = page
      .locator('div')
      .filter({ hasText: bilingualLabel('Heikin Ashi') })
      .nth(1);
    await heikinAshiCheck.click();

    // Reload triggers a new request
    await Promise.all([
      page.getByRole('button', { name: bilingualLabel('Refresh chart') }).click(),

      page.waitForResponse('**/pair_candles'),
    ]);
    // Disable Heikin Ashi
    await heikinAshiCheck.click();
    // Default plotconfig exists

    await expect(page.locator('form').locator('#plotConfigSelect').nth(0)).toHaveText('default');
  });

  test('Plot configurator', async ({ page }) => {
    await Promise.all([
      page.goto('/graph'),
      page.waitForResponse('**/whitelist'),
      page.waitForResponse('**/blacklist'),
      page.waitForResponse('**/pair_candles'),
    ]);

    // Wait for the chart to load
    await page.waitForSelector('span:has-text("NoActionStrategyFut | 1m")');

    await page.getByRole('button', { name: bilingualLabel('Plot Configurator') }).click();
    await page.getByRole('button', { name: bilingualLabel('From template') }).click();
    // Apply bollinger bands

    await page.getByRole('option', { name: 'BollingerBands' }).click();

    // await page.getByLabel('Select Templates').selectOption('BollingerBands');
    // Select template - Try to use
    await page.getByRole('button', { name: bilingualLabel('Use Template') }).click();
    // Accept remapping and close
    await page.getByRole('button', { name: bilingualLabel('Apply Template') }).click();
    await page.getByRole('button', { name: bilingualLabel('Save') }).click();

    await expect(page.getByText(bilingualLabel('Indicators in this plot'))).toBeVisible();
    const indicatorPanel = page.getByRole('listbox').filter({
      has: page.getByRole('option', { name: 'bb_lowerband' }),
    });

    const options = await indicatorPanel.getByRole('option').allTextContents();
    await expect(options).toContain('bb_lowerband');
    await expect(options).toEqual(expect.arrayContaining(['bb_upperband', 'bb_lowerband']));

    // indicatorPanel.selectOption('bb_lowerband');
    // Close Plot configurator
    await page
      .getByRole('dialog', { name: bilingualLabel('Plot Configurator') })
      .getByRole('button', { name: /Close|关闭/ })
      .click();

    await expect(page.locator('canvas')).toBeVisible();

    await page.getByRole('button', { name: 'Toggle Night Mode' }).click();

    await expect(page.locator('canvas')).toBeVisible();
    // Should assert if indicators have been set
    // but it's a canvas ...
  });
});
