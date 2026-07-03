import { test, expect } from '@playwright/test';
import { defaultMocks, setLoginInfo, tradeMocks } from './helpers';

const bilingualLabel = (english: string | RegExp) =>
  typeof english === 'string' ? new RegExp(`${english}\\s*/`) : english;

test.describe('Bilingual i18n', () => {
  test('defaults to bilingual labels and switches modes from settings', async ({ page }) => {
    await setLoginInfo(page);
    await defaultMocks(page);

    await page.goto('/trade');
    await expect(page.getByRole('link', { name: /Trade \/ 交易/ })).toBeVisible();

    await page.getByRole('button', { name: 'FT' }).click();
    await page.getByRole('menuitem', { name: /Settings/ }).click();
    await expect(page.getByText('FreqUI Settings / FreqUI 设置')).toBeVisible();

    await page.getByTestId('locale-mode-select').click();
    await page.getByRole('option', { name: /^English \/ (?!Chinese)/ }).click();
    await expect(page.getByRole('link', { name: /^Trade$/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: /^Trade$/ })).toBeVisible();

    await page.getByTestId('locale-mode-select').click();
    await page.getByRole('option', { name: /English \/ Chinese/ }).click();
    await expect(page.getByRole('link', { name: /Trade \/ 交易/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: /Trade \/ 交易/ })).toBeVisible();

    const settings = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem('ftUISettings') || '{}'),
    );
    expect(settings.localeMode).toBe('bilingual');
  });

  test('covers bilingual chart, trade, and dashboard surfaces', async ({ page }) => {
    await setLoginInfo(page);
    await defaultMocks(page);
    tradeMocks(page);

    await Promise.all([page.goto('/graph'), page.waitForResponse('**/pair_candles')]);

    await page.getByRole('button', { name: bilingualLabel('Plot Configurator') }).click();
    await expect(
      page.getByRole('heading', { name: bilingualLabel('Plot Configurator') }),
    ).toBeVisible();
    await expect(page.getByText(bilingualLabel('Plot config name'))).toBeVisible();
    await expect(page.getByRole('button', { name: bilingualLabel('Add indicator') })).toBeVisible();

    await Promise.all([page.goto('/trade'), page.waitForResponse('**/status')]);
    await expect(
      page.locator('.drag-header').filter({ hasText: bilingualLabel('Multi Pane') }),
    ).toBeVisible();
    await expect(
      page.locator('.drag-header').filter({ hasText: /Open [Tt]rades\s*\// }),
    ).toBeVisible();

    await Promise.all([page.goto('/dashboard'), page.waitForResponse('**/status')]);
    await expect(
      page.locator('.drag-header').filter({ hasText: bilingualLabel('Bot comparison') }),
    ).toBeVisible();
    await expect(
      page.locator('.drag-header').filter({ hasText: bilingualLabel('Cumulative Profit') }),
    ).toBeVisible();
  });
});
