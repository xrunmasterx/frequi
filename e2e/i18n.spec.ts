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

  test('shows bilingual home and bot list copy without translating bot names', async ({ page }) => {
    await setLoginInfo(page);
    await defaultMocks(page);

    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: bilingualLabel('Available bots') }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: bilingualLabel('Add new Bot') })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: bilingualLabel('Welcome to the FreqtradeUI') }),
    ).toBeVisible();
    await expect(
      page.getByText(bilingualLabel('This page allows you to control your trading bot.')),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: bilingualLabel('Freqtrade Documentation') }),
    ).toBeVisible();
    await expect(page.getByText('TestBot', { exact: true })).toBeVisible();
  });

  test('covers bilingual webserver mode pages', async ({ page }) => {
    await setLoginInfo(page);
    await defaultMocks(page);
    await page.route('**/api/v1/show_config', (route) => {
      return route.fulfill({ path: './e2e/testData/backtest/show_config_webserver.json' });
    });
    await page.route('**/api/v1/strategies', (route) => {
      return route.fulfill({ path: './e2e/testData/backtest/strategies.json' });
    });
    await page.route('**/api/v1/pairlists/available*', (route) => {
      return route.fulfill({ path: './e2e/testData/pairlists_available.json' });
    });

    await page.goto('/backtest');
    await expect(page.getByRole('heading', { name: bilingualLabel('Backtesting') })).toBeVisible();
    await expect(page.getByRole('tab', { name: bilingualLabel('Run backtest') })).toBeVisible();
    await expect(
      page.getByRole('button', { name: bilingualLabel('Start backtest') }),
    ).toBeVisible();

    await page.goto('/download_data');
    await expect(
      page.locator('.drag-header').filter({ hasText: bilingualLabel('Downloading Data') }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: bilingualLabel('Advanced options') }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: bilingualLabel('Start Download') }),
    ).toBeVisible();

    await page.goto('/recursive_analysis');
    await expect(
      page.locator('.drag-header').filter({ hasText: bilingualLabel('Recursive Analysis') }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: bilingualLabel('Start recursive analysis') }),
    ).toBeVisible();

    await page.goto('/lookahead_analysis');
    await expect(
      page.locator('.drag-header').filter({ hasText: bilingualLabel('Lookahead Analysis') }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: bilingualLabel('Start lookahead analysis') }),
    ).toBeVisible();

    await Promise.all([
      page.goto('/pairlist_config'),
      page.waitForResponse('**/pairlists/available*'),
    ]);
    await expect(
      page.getByRole('heading', { name: bilingualLabel('Pairlist Configurator') }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: bilingualLabel('Evaluate') })).toBeVisible();
  });
});
