import { describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { resolveLocaleText, useAppI18n } from '@/composables/useAppI18n';
import { useSettingsStore } from '@/stores/settings';

describe('resolveLocaleText', () => {
  it('returns bilingual text by default mode', () => {
    expect(resolveLocaleText('nav.trade', 'bilingual')).toBe('Trade / 交易');
  });

  it('resolves first-slice navigation labels', () => {
    expect(resolveLocaleText('nav.dashboard', 'bilingual')).toBe('Dashboard / 仪表盘');
    expect(resolveLocaleText('nav.chart', 'bilingual')).toBe('Chart / 图表');
    expect(resolveLocaleText('nav.logs', 'bilingual')).toBe('Logs / 日志');
    expect(resolveLocaleText('nav.settings', 'bilingual')).toBe('Settings / 设置');
    expect(resolveLocaleText('nav.trades', 'bilingual')).toBe('Trades / 交易');
  });

  it('returns English text in English mode', () => {
    expect(resolveLocaleText('nav.trade', 'en')).toBe('Trade');
  });

  it('returns Chinese text in zh-CN mode', () => {
    expect(resolveLocaleText('nav.trade', 'zh-CN')).toBe('交易');
  });

  it('falls back to English when Chinese text is missing', () => {
    expect(
      resolveLocaleText('nav.trade', 'bilingual', {
        zhMessages: {
          nav: {},
        },
      }),
    ).toBe('Trade');
    expect(
      resolveLocaleText('nav.trade', 'zh-CN', {
        zhMessages: {
          nav: {},
        },
      }),
    ).toBe('Trade');
  });
});

describe('settings locale labels', () => {
  it('resolves the three locale display option labels', () => {
    expect(resolveLocaleText('settings.languageBilingual', 'bilingual')).toBe(
      'English / Chinese / 英文 / 中文',
    );
    expect(resolveLocaleText('settings.languageChinese', 'zh-CN')).toBe('简体中文');
    expect(resolveLocaleText('settings.languageEnglish', 'en')).toBe('English');
  });
});

describe('useAppI18n', () => {
  it('uses the persisted settings locale mode', () => {
    setActivePinia(createPinia());
    const settingsStore = useSettingsStore();
    const { t } = useAppI18n();

    expect(settingsStore.localeMode).toBe('bilingual');
    expect(t('nav.trade')).toBe('Trade / 交易');

    settingsStore.localeMode = 'en';
    expect(t('nav.trade')).toBe('Trade');

    settingsStore.localeMode = 'zh-CN';
    expect(t('nav.trade')).toBe('交易');
  });
});
