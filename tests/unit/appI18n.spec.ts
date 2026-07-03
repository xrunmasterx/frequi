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
    expect(resolveLocaleText('nav.login', 'bilingual')).toBe('Login / 登录');
    expect(resolveLocaleText('nav.noBotSelected', 'bilingual')).toBe(
      'No bot selected / 未选择机器人',
    );
    expect(resolveLocaleText('nav.version', 'bilingual')).toBe('Version / 版本');
    expect(resolveLocaleText('nav.confirmDialogDisabled', 'bilingual')).toBe(
      'Confirm Dialog deactivated. / 确认对话框已停用。',
    );
    expect(resolveLocaleText('nav.trades', 'bilingual')).toBe('Trades / 交易');
  });

  it('resolves login and confirmation labels', () => {
    expect(resolveLocaleText('login.botName', 'bilingual')).toBe('Bot Name / 机器人名称');
    expect(resolveLocaleText('login.modalTitle', 'bilingual')).toBe(
      'Login to your bot / 登录到你的机器人',
    );
    expect(resolveLocaleText('login.modalDescription', 'bilingual')).toBe(
      'Enter your bot credentials to connect / 输入机器人凭据以连接',
    );
    expect(resolveLocaleText('login.submit', 'bilingual')).toBe('Submit / 提交');
    expect(resolveLocaleText('confirm.cancel', 'bilingual')).toBe('Cancel / 取消');
    expect(resolveLocaleText('confirm.ok', 'bilingual')).toBe('Ok / 确定');
    expect(resolveLocaleText('common.limit', 'bilingual')).toBe('Limit / 限价');
    expect(resolveLocaleText('trade.tradesEmpty', 'bilingual')).toBe(
      'No Trades to show. / 没有可显示的交易。',
    );
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
    expect(resolveLocaleText('settings.confirmDialogTitleBarHint', 'bilingual')).toBe(
      'Title bar warning icons are shown when confirmation dialogs are disabled. / 确认对话框停用时，标题栏会显示警告图标。',
    );
  });
});

describe('deep coverage locale labels', () => {
  it('resolves plot, chart, trade, dashboard, and bot labels', () => {
    expect(resolveLocaleText('plot.configuratorTitle', 'bilingual')).toBe(
      'Plot Configurator / 图表绘制配置',
    );
    expect(resolveLocaleText('plot.addIndicator', 'bilingual')).toBe('Add indicator / 添加指标');
    expect(resolveLocaleText('chart.refreshChart', 'bilingual')).toBe('Refresh chart / 刷新图表');
    expect(resolveLocaleText('chart.noDataAvailable', 'bilingual')).toBe(
      'No data available / 暂无数据',
    );
    expect(resolveLocaleText('trade.openTrades', 'bilingual')).toBe('Open Trades / 未平仓交易');
    expect(resolveLocaleText('trade.reloadConfig', 'bilingual')).toBe(
      'Reload Config / 重新加载配置',
    );
    expect(resolveLocaleText('trade.forceExitTrade', 'bilingual')).toBe(
      'Force exit trade / 强制退出交易',
    );
    expect(resolveLocaleText('trade.table.profitPercent', 'bilingual')).toBe('Profit % / 收益率 %');
    expect(resolveLocaleText('dashboard.botComparison', 'bilingual')).toBe(
      'Bot comparison / 机器人对比',
    );
    expect(resolveLocaleText('dashboard.cumulativeProfit', 'bilingual')).toBe(
      'Cumulative Profit / 累计收益',
    );
    expect(resolveLocaleText('bot.performance', 'bilingual')).toBe('Performance / 表现');
    expect(resolveLocaleText('bot.balance', 'bilingual')).toBe('Balance / 余额');
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
