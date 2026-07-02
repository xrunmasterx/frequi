import { test, expect } from '@playwright/test';
import { defaultMocks, setLoginInfo } from './helpers';

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
});
