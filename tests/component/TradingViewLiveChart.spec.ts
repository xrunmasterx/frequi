import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { computed, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TradingView from '@/views/TradingView.vue';
import { useBotStore } from '@/stores/ftbotwrapper';
import { LoadingStatus } from '@/types';

const useLiveChartDatasetMock = vi.hoisted(() => vi.fn());

vi.mock('@/composables/useLiveChartDataset', () => ({
  useLiveChartDataset: useLiveChartDatasetMock,
}));

const refresh = vi.fn();
const liveChart = {
  timeframe: ref('1h'),
  timeframeOptions: computed(() => ['1m', '15m', '1h']),
  chartDataSource: computed(() => ({ 'BTC/USDT:USDT__1h': { data: { plot_config: {} } } })),
  chartDataStatus: computed(() => LoadingStatus.success),
  plotConfig: computed(() => ({ main_plot: { watch_ma20: {} }, subplots: {} })),
  warningText: computed(() => 'warning text'),
  statusText: computed(() => '1h VolatilitySystem'),
  refresh,
  refreshAll: vi.fn(),
};

let wrapper: VueWrapper | undefined;

function installTradingBot(chartCandles = true) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const getPairCandles = vi.fn();
  const botStore = useBotStore();
  botStore.selectedBot = 'test-bot';
  botStore.botStores = {
    'test-bot': {
      botFeatures: { chartCandles },
      timeframe: '1h',
      whitelist: ['BTC/USDT:USDT'],
      plotMultiPairs: ['BTC/USDT:USDT'],
      chartCandleData: {},
      chartCandleDataStatus: LoadingStatus.not_loaded,
      allTrades: [],
      openTrades: [],
      closedTrades: [],
      activeLocks: [],
      detailTradeId: null,
      tradeDetail: undefined,
      stakeCurrency: 'USDT',
      botState: { strategy: 'VolatilitySystem' },
      getPairCandles,
    },
  } as never;

  return { pinia, getPairCandles };
}

function mountTradingView(pinia: ReturnType<typeof createPinia>) {
  wrapper = mount(TradingView, {
    global: {
      plugins: [pinia],
      stubs: {
        GridLayout: { template: '<div><slot :gridItemProps="{}" /></div>' },
        GridItem: { template: '<div><slot /></div>' },
        DraggableContainer: { template: '<section><slot /></section>' },
        UTabs: true,
        PairSummary: true,
        BotControls: true,
        BotStatus: true,
        BotPerformance: true,
        BotBalance: true,
        PeriodBreakdown: true,
        PairListLive: true,
        PairLockList: true,
        TradeList: true,
        TradeDetail: true,
        USelect: true,
        CandleChartContainer: {
          name: 'CandleChartContainer',
          props: [
            'chartDataSource',
            'chartDataStatus',
            'plotConfigOverride',
            'chartStatusText',
            'chartWarningText',
            'timeframe',
          ],
          template: '<div data-test="chart">{{ chartStatusText }} {{ chartWarningText }}</div>',
        },
      },
    },
  });

  return wrapper;
}

describe('TradingView live chart', () => {
  beforeEach(() => {
    refresh.mockClear();
    useLiveChartDatasetMock.mockReturnValue(liveChart);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it('passes shared live chart props to CandleChartContainer', () => {
    const { pinia } = installTradingBot();
    const wrapper = mountTradingView(pinia);

    const chart = wrapper.findComponent({ name: 'CandleChartContainer' });

    expect(chart.props('timeframe')).toBe('1h');
    expect(chart.props('chartDataSource')).toEqual(liveChart.chartDataSource.value);
    expect(chart.props('chartDataStatus')).toBe(LoadingStatus.success);
    expect(chart.props('plotConfigOverride')).toEqual(liveChart.plotConfig.value);
    expect(chart.props('chartStatusText')).toBe('1h VolatilitySystem');
    expect(chart.props('chartWarningText')).toBe('warning text');
  });

  it('refreshes through the shared live chart when chart candles are enabled', () => {
    const { getPairCandles, pinia } = installTradingBot();
    const wrapper = mountTradingView(pinia);
    const chart = wrapper.findComponent({ name: 'CandleChartContainer' });

    chart.vm.$emit('refreshData', 'BTC/USDT:USDT', ['open', 'close']);

    expect(refresh).toHaveBeenCalledWith('BTC/USDT:USDT');
    expect(getPairCandles).not.toHaveBeenCalled();
  });

  it('falls back to pair candles refresh when chart candles are disabled', () => {
    const { getPairCandles, pinia } = installTradingBot(false);
    const wrapper = mountTradingView(pinia);
    const chart = wrapper.findComponent({ name: 'CandleChartContainer' });

    chart.vm.$emit('refreshData', 'BTC/USDT:USDT', ['open', 'close']);

    expect(getPairCandles).toHaveBeenCalledWith({
      pair: 'BTC/USDT:USDT',
      timeframe: '1h',
      columns: ['open', 'close'],
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
