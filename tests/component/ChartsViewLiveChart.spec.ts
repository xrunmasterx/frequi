import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChartsView from '@/views/ChartsView.vue';
import { useBotStore } from '@/stores/ftbotwrapper';
import { LoadingStatus, RunModes } from '@/types';

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
  warningText: computed(() => 'live warning'),
  statusText: computed(() => '1h VolatilitySystem'),
  refresh,
  refreshAll: vi.fn(),
};

function installBot({ webserverMode = false, chartCandles = true } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const botStore = useBotStore();
  const getPairHistory = vi.fn();
  const getPairCandles = vi.fn();

  botStore.selectedBot = 'test-bot';
  botStore.botStores = {
    'test-bot': {
      isWebserverMode: webserverMode,
      botFeatures: { chartCandles, chartLiveData: true },
      botState: {
        exchange: 'okx',
        trading_mode: webserverMode ? 'spot' : 'futures',
        runmode: webserverMode ? RunModes.WEBSERVER : RunModes.DRY_RUN,
      },
      timeframe: '1h',
      whitelist: ['BTC/USDT:USDT'],
      pairlist: ['BTC/USDT:USDT'],
      pairlistWithTimeframe: [['BTC/USDT:USDT', '1h']],
      plotMultiPairs: ['BTC/USDT:USDT'],
      allTrades: [],
      history: {},
      candleData: {},
      getAvailablePairs: vi.fn(),
      getWhitelist: vi.fn(),
      getMarkets: vi.fn().mockResolvedValue({ markets: {} }),
      getPairHistory,
      getPairCandles,
    },
  } as never;

  return { pinia, botStore, getPairHistory, getPairCandles };
}

describe('ChartsView live chart mode', () => {
  beforeEach(() => {
    refresh.mockClear();
    useLiveChartDatasetMock.mockReturnValue(liveChart);
  });

  it('uses shared live chart props in trading mode', () => {
    const { pinia } = installBot({ webserverMode: false, chartCandles: true });

    const wrapper = mount(ChartsView, {
      global: {
        plugins: [pinia],
        stubs: {
          UCard: { template: '<div><slot /></div>' },
          UCollapsible: true,
          BaseCheckbox: true,
          StrategySelect: true,
          TimeframeSelect: true,
          TimeRangeSelect: true,
          ExchangeSelect: true,
          InfoBox: true,
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
              'historicView',
            ],
            template: '<div data-test="chart">{{ chartStatusText }} {{ chartWarningText }}</div>',
          },
        },
      },
    });

    const chart = wrapper.findComponent({ name: 'CandleChartContainer' });

    expect(chart.props('historicView')).toBe(false);
    expect(chart.props('timeframe')).toBe('1h');
    expect(chart.props('chartDataSource')).toEqual(liveChart.chartDataSource.value);
    expect(chart.props('chartDataStatus')).toBe(LoadingStatus.success);
    expect(chart.props('plotConfigOverride')).toEqual(liveChart.plotConfig.value);
    expect(chart.props('chartStatusText')).toBe('1h VolatilitySystem');
    expect(chart.props('chartWarningText')).toBe('live warning');
  });

  it('keeps the historical path in webserver mode', async () => {
    const { pinia, getPairHistory } = installBot({ webserverMode: true, chartCandles: true });

    const wrapper = mount(ChartsView, {
      global: {
        plugins: [pinia],
        stubs: {
          UCard: { template: '<div><slot /></div>' },
          UCollapsible: true,
          BaseCheckbox: true,
          StrategySelect: true,
          TimeframeSelect: true,
          TimeRangeSelect: true,
          ExchangeSelect: true,
          InfoBox: true,
          CandleChartContainer: {
            emits: ['refreshData'],
            template:
              '<button data-test="refresh" @click="$emit(\'refreshData\', \'BTC/USDT:USDT\', [])" />',
          },
        },
      },
    });

    await wrapper.find('[data-test="refresh"]').trigger('click');

    expect(getPairHistory).toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('falls back to pair candles when chart candles are disabled outside webserver mode', () => {
    const { pinia, getPairCandles } = installBot({ webserverMode: false, chartCandles: false });

    const wrapper = mount(ChartsView, {
      global: {
        plugins: [pinia],
        stubs: {
          UCard: { template: '<div><slot /></div>' },
          UCollapsible: true,
          BaseCheckbox: true,
          StrategySelect: true,
          TimeframeSelect: true,
          TimeRangeSelect: true,
          ExchangeSelect: true,
          InfoBox: true,
          USelect: true,
          CandleChartContainer: {
            name: 'CandleChartContainer',
            emits: ['refreshData'],
            template: '<div />',
          },
        },
      },
    });

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
