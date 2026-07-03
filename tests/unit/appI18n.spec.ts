import { describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { formatLocaleText, resolveLocaleText, useAppI18n } from '@/composables/useAppI18n';
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
    expect(resolveLocaleText('dashboard.totalProfitOpenRealized', 'bilingual')).toBe(
      'Total Profit (Open and realized) {percent} / 总收益（未平仓和已实现） {percent}',
    );
    expect(
      formatLocaleText(resolveLocaleText('dashboard.totalProfitOpenRealized', 'bilingual'), {
        percent: '1.23%',
      }),
    ).toBe('Total Profit (Open and realized) 1.23% / 总收益（未平仓和已实现） 1.23%');
    expect(resolveLocaleText('dashboard.balanceAppendixDry', 'bilingual')).toBe(
      '(dry) / （模拟）',
    );
    expect(resolveLocaleText('dashboard.balanceAppendixLive', 'bilingual')).toBe(
      '(live) / （实盘）',
    );
    expect(resolveLocaleText('dashboard.balanceAppendixMixedDryAndLive', 'bilingual')).toBe(
      '(mixed dry and live) / （模拟和实盘混合）',
    );
    expect(resolveLocaleText('bot.performance', 'bilingual')).toBe('Performance / 表现');
    expect(resolveLocaleText('bot.balance', 'bilingual')).toBe('Balance / 余额');
    expect(resolveLocaleText('trade.stake', 'en')).toBe('Stake');
    expect(resolveLocaleText('bot.profitCurrency', 'bilingual')).toBe(
      'Profit {currency} / {currency} 收益',
    );
    expect(formatLocaleText(resolveLocaleText('bot.profitCurrency', 'bilingual'), { currency: 'USDT' })).toBe(
      'Profit USDT / USDT 收益',
    );
    expect(resolveLocaleText('bot.drawdownRange', 'bilingual')).toBe(
      'from {start} to {end} / 从 {start} 到 {end}',
    );
    expect(resolveLocaleText('trade.feeInCurrency', 'zh-CN')).toBe('以 {currency} 计');
  });

  it('resolves dashboard chart internal labels', () => {
    expect(resolveLocaleText('dashboard.chart.walletBalanceTitle', 'en')).toBe('Wallet Balance');
    expect(resolveLocaleText('dashboard.chart.walletHistoryAxis', 'en')).toBe('Wallet history');
    expect(resolveLocaleText('dashboard.chart.profitDistributionTitle', 'en')).toBe(
      'Profit distribution',
    );
    expect(resolveLocaleText('dashboard.chart.tradeCount', 'en')).toBe('Trade count');
    expect(resolveLocaleText('dashboard.chart.profitPercent', 'en')).toBe('Profit %');
    expect(resolveLocaleText('dashboard.chart.tradesLogTitle', 'en')).toBe('Trades log');
    expect(resolveLocaleText('dashboard.chart.dailyProfitTitle', 'en')).toBe('Daily profit');
    expect(resolveLocaleText('dashboard.chart.absoluteProfit', 'en')).toBe('Absolute profit');
    expect(resolveLocaleText('dashboard.chart.relativeProfit', 'en')).toBe('Relative profit');
    expect(resolveLocaleText('dashboard.chart.cumulativeProfitTitle', 'en')).toBe(
      'Cumulative Profit',
    );
  });

  it('formats raw bot names in dashboard wallet chart mark labels', () => {
    expect(
      formatLocaleText(resolveLocaleText('dashboard.chart.startingBalanceForBot', 'en'), {
        botName: 'AlphaBot',
      }),
    ).toBe('Starting balance AlphaBot');
    expect(
      formatLocaleText(resolveLocaleText('dashboard.chart.captureStartForBot', 'en'), {
        botName: 'AlphaBot',
      }),
    ).toBe('Capture start AlphaBot');
  });

  it('formats complete bilingual templates without nested localized placeholders', () => {
    expect(
      formatLocaleText(resolveLocaleText('bot.marketModeSummaryDemo', 'bilingual'), {
        maxOpenTrades: 3,
        stakeAmount: 100,
        stakeCurrency: 'USDT',
        exchange: 'Binance',
        tradingMode: 'futures isolated',
        strategy: 'SampleStrategy',
      }),
    ).toBe(
      'Running with 3x100 USDT on Binance (Demo) in futures isolated markets, with Strategy SampleStrategy. / 运行配置 3x100 USDT，交易所 Binance（模拟），futures isolated 市场，使用策略 SampleStrategy。',
    );

    expect(resolveLocaleText('trade.usingMarketOrder', 'bilingual')).toBe(
      'using a Market order / 使用市价订单',
    );
    expect(resolveLocaleText('trade.usingLimitOrder', 'bilingual')).toBe(
      'using a Limit order / 使用限价订单',
    );
    expect(resolveLocaleText('trade.usingMarketOrder', 'bilingual')).not.toContain('Market /');
    expect(resolveLocaleText('trade.usingLimitOrder', 'bilingual')).not.toContain('Limit /');
  });

  it('formats trade confirmation prompts as complete bilingual sentences', () => {
    const exitPrompt = formatLocaleText(
      resolveLocaleText('trade.confirmExitTrade', 'bilingual'),
      {
        tradeId: 42,
        pair: 'BTC/USDT',
      },
    );
    const exitWithOrderPrompt = formatLocaleText(
      resolveLocaleText('trade.confirmExitTradeUsingOrder', 'bilingual'),
      {
        tradeId: 42,
        pair: 'BTC/USDT',
        orderType: 'market',
      },
    );

    expect(exitPrompt.split(' / ')).toHaveLength(2);
    expect(exitWithOrderPrompt.split(' / ')).toHaveLength(2);
    expect(exitWithOrderPrompt).toContain('market');
    expect(exitPrompt).not.toContain('Pair /');
    expect(exitWithOrderPrompt).not.toContain('Pair /');
    expect(exitWithOrderPrompt).not.toContain('Market /');
    expect(exitWithOrderPrompt).not.toContain('Limit /');
  });

  it('resolves final bilingual UI and toast labels', () => {
    expect(resolveLocaleText('common.editThis', 'en')).toBe('Edit this {item}.');
    expect(resolveLocaleText('common.duplicateThis', 'en')).toBe('Duplicate this {item}.');
    expect(resolveLocaleText('common.deleteThis', 'en')).toBe('Delete this {item}.');
    expect(resolveLocaleText('common.addNew', 'en')).toBe('Add new {item}.');
    expect(resolveLocaleText('common.saveThis', 'en')).toBe('Save this {item}.');
    expect(resolveLocaleText('trade.customDataForTrade', 'en')).toBe(
      'Custom data for trade {tradeId}',
    );
    expect(resolveLocaleText('trade.deleteTradeSuccess', 'en')).toBe(
      'Deleted Trade {tradeId}',
    );
    expect(resolveLocaleText('trade.cancelOpenOrderError', 'en')).toBe(
      'Failed to cancel open order {tradeId}',
    );
    expect(resolveLocaleText('common.supported', 'en')).toBe('Supported');
    expect(resolveLocaleText('common.unsupported', 'en')).toBe('Unsupported');
  });

  it('resolves remaining FreqUI-authored toast templates', () => {
    expect(resolveLocaleText('bot.deleteLockSuccess', 'en')).toBe('Deleted Lock {lockId}.');
    expect(resolveLocaleText('bot.deleteLockError', 'en')).toBe('Failed to delete lock {lockId}');
    expect(resolveLocaleText('bot.historyTimeout', 'en')).toBe('Timeout exceeded');
    expect(resolveLocaleText('bot.historyFetchError', 'en')).toBe('Error fetching history');
    expect(resolveLocaleText('bot.backgroundJobStatusError', 'en')).toBe(
      'Failed to get background job status',
    );
    expect(resolveLocaleText('bot.backgroundJobsCleared', 'en')).toBe(
      'All non-running background jobs cleared',
    );
    expect(resolveLocaleText('bot.backgroundJobsClearError', 'en')).toBe(
      'Failed to clear background jobs',
    );
    expect(resolveLocaleText('bot.startBotError', 'en')).toBe('Error starting bot.');
    expect(resolveLocaleText('bot.addBlacklistPairError', 'en')).toBe(
      'Error while adding pair {pair} to Blacklist: {message}',
    );
    expect(resolveLocaleText('bot.addBlacklistSuccess', 'en')).toBe('Pair {pairs} added.');
    expect(resolveLocaleText('bot.addBlacklistError', 'en')).toBe(
      'Error occurred while adding pairs to Blacklist: {message}',
    );
    expect(resolveLocaleText('bot.removeBlacklistPairError', 'en')).toBe(
      'Error while removing pair {pair} from Blacklist: {message}',
    );
    expect(resolveLocaleText('bot.removeBlacklistSuccess', 'en')).toBe('Pair {pairs} removed.');
    expect(resolveLocaleText('bot.removeBlacklistError', 'en')).toBe(
      'Error occurred while removing pairs from Blacklist: {message}',
    );
    expect(resolveLocaleText('bot.backtestFailed', 'en')).toBe(
      'Backtest failed: {message}.',
    );
    expect(resolveLocaleText('bot.websocketException', 'en')).toBe('WSException: {message}');
    expect(
      formatLocaleText(resolveLocaleText('bot.addBlacklistPairError', 'bilingual'), {
        pair: 'BTC/USDT',
        message: 'backend error_msg',
      }),
    ).toContain('backend error_msg');
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
