import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { computed, defineComponent, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLiveChartDataset } from '@/composables/useLiveChartDataset';
import { useBotStore } from '@/stores/ftbotwrapper';
import { useTradeChartStore } from '@/stores/tradeChart';
import { LoadingStatus } from '@/types';

function installBotStore() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const getChartCandles = vi.fn();
  const botStore = useBotStore();
  botStore.selectedBot = 'test-bot';
  botStore.botStores = {
    'test-bot': {
      botFeatures: { chartCandles: true },
      botState: { strategy: 'VolatilitySystem' },
      timeframe: '1h',
      plotMultiPairs: ['BTC/USDT:USDT'],
      chartCandleData: {
        'BTC/USDT:USDT__1h': {
          pair: 'BTC/USDT:USDT',
          timeframe: '1h',
          data: {
            strategy: 'VolatilitySystem',
            pair: 'BTC/USDT:USDT',
            timeframe: '1h',
            timeframe_ms: 3600000,
            chart_timeframe: '1h',
            strategy_timeframe: '1h',
            candle_mode: 'live',
            columns: ['date', 'open', 'high', 'low', 'close', 'volume'],
            all_columns: ['date', 'open', 'high', 'low', 'close', 'volume'],
            data: [],
            length: 0,
            buy_signals: 0,
            sell_signals: 0,
            enter_long_signals: 0,
            exit_long_signals: 0,
            enter_short_signals: 0,
            exit_short_signals: 0,
            plot_config: {
              main_plot: { watch_ma20: {} },
              subplots: { MACD: { watch_macd: {} } },
            },
            warnings: ['Strategy overlay unavailable'],
            overlay: { strategy_timeframe: '1h', alignment: 'direct', columns: [] },
            last_candle_complete: false,
          },
        },
      },
      chartCandleDataStatus: LoadingStatus.success,
      allTrades: [],
      getChartCandles,
    },
  } as never;

  return { botStore, getChartCandles };
}

const wrappers: VueWrapper[] = [];

function mountLiveChart(defaultTimeframe = '1h', active = true) {
  let liveChart: ReturnType<typeof useLiveChartDataset> | undefined;
  const wrapper = mount(
    defineComponent({
      setup() {
        liveChart = useLiveChartDataset({
          active: ref(active),
          defaultTimeframe: computed(() => defaultTimeframe),
        });
        return {};
      },
      template: '<div />',
    }),
  );
  wrappers.push(wrapper);

  if (!liveChart) {
    throw new Error('Live chart composable did not initialize');
  }

  return { wrapper, liveChart };
}

describe('useLiveChartDataset', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the bot timeframe when no live chart timeframe is selected', () => {
    const { botStore } = installBotStore();
    botStore.botStores['test-bot']!.timeframe = '5m';
    const tradeChartStore = useTradeChartStore();
    tradeChartStore.selectedTimeframe = '';

    const { liveChart } = mountLiveChart('5m');

    expect(liveChart.timeframe.value).toBe('5m');
  });

  it('writes timeframe changes into the trade chart store', () => {
    installBotStore();
    const tradeChartStore = useTradeChartStore();

    const { liveChart } = mountLiveChart('1h');

    liveChart.timeframe.value = '15m';

    expect(tradeChartStore.selectedTimeframe).toBe('15m');
    expect(liveChart.timeframe.value).toBe('15m');
  });

  it('derives dataset props from chartCandleData', () => {
    installBotStore();

    const { liveChart } = mountLiveChart('1h');

    expect(liveChart.chartDataSource.value['BTC/USDT:USDT__1h']).toBeDefined();
    expect(liveChart.chartDataStatus.value).toBe(LoadingStatus.success);
    expect(liveChart.plotConfig.value?.main_plot).toHaveProperty('watch_ma20');
    expect(liveChart.warningText.value).toBe('Strategy overlay unavailable');
    expect(liveChart.statusText.value).toContain('1h');
    expect(liveChart.statusText.value).toContain('VolatilitySystem');
  });

  it('refreshes chart candles with live mode and strategy overlay', () => {
    const { getChartCandles } = installBotStore();
    const tradeChartStore = useTradeChartStore();
    tradeChartStore.useStrategyOverlay = true;

    const { liveChart } = mountLiveChart('1h');

    liveChart.refresh('BTC/USDT:USDT');

    expect(getChartCandles).toHaveBeenCalledWith({
      pair: 'BTC/USDT:USDT',
      timeframe: '1h',
      include_strategy_overlay: true,
      candle_mode: 'live',
    });
  });

  it('does not call chart candles when the feature is unavailable', () => {
    const { botStore, getChartCandles } = installBotStore();
    botStore.botStores['test-bot']!.botFeatures = { chartCandles: false } as never;

    const { liveChart } = mountLiveChart('1h');

    liveChart.refresh('BTC/USDT:USDT');

    expect(getChartCandles).not.toHaveBeenCalled();
  });

  it('schedules automatic refresh by timeframe while active', async () => {
    const { getChartCandles } = installBotStore();

    mountLiveChart('1m');
    await nextTick();
    getChartCandles.mockClear();

    vi.advanceTimersByTime(9_999);

    expect(getChartCandles).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(getChartCandles).toHaveBeenCalledTimes(1);
    expect(getChartCandles).toHaveBeenCalledWith({
      pair: 'BTC/USDT:USDT',
      timeframe: '1m',
      include_strategy_overlay: true,
      candle_mode: 'live',
    });
  });

  it('does not schedule refresh while inactive', async () => {
    const { getChartCandles } = installBotStore();

    mountLiveChart('1m', false);
    await nextTick();

    vi.advanceTimersByTime(10_000);

    expect(getChartCandles).not.toHaveBeenCalled();
  });
});
