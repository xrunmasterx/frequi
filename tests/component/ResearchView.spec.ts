import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useResearchStore } from '@/stores/research';
import type {
  ResearchBacktestResult,
  ResearchBotProfile,
  ResearchChartResponse,
  ResearchDatasetDescriptor,
  ResearchInstrument,
} from '@/types';
import ResearchView from '@/views/ResearchView.vue';

function botProfile(id = 'a-share-research', label = 'A Share Research'): ResearchBotProfile {
  return {
    id,
    label,
    market: 'a_share',
    capabilities: {
      chart: true,
      indicators: true,
      backtest: true,
      live_trade: false,
      account: false,
      orders: false,
    },
  };
}

function instrument(
  key = '600519.SH',
  symbol = '600519',
  displayName = 'Kweichow Moutai',
  availableTimeframes = ['1d', '1h'],
): ResearchInstrument {
  return {
    key,
    market: 'a_share',
    venue: 'SSE',
    symbol,
    currency: 'CNY',
    asset_type: 'stock',
    available_timeframes: availableTimeframes,
    display_name: displayName,
  };
}

function datasetDescriptor(
  datasetId: string,
  kind: ResearchDatasetDescriptor['kind'],
): ResearchDatasetDescriptor {
  return {
    dataset_id: datasetId,
    kind,
    market: 'a_share',
    scope: 'instrument',
    storage_format: kind === 'feature' ? 'csv' : 'jsonl',
    timeframe: '1d',
    available: true,
    start: '2026-07-07',
    stop: '2026-07-07',
    provider: 'eastmoney',
    provider_version: '1.1',
    manifest_run_id: 'task-8-test',
    warnings: [],
  };
}

function chartResponse(): ResearchChartResponse {
  return {
    strategy: 'ResearchStrategy',
    pair: '600519.SH',
    timeframe: '1d',
    timeframe_ms: 86400000,
    chart_timeframe: '1d',
    columns: ['date', 'open', 'high', 'low', 'close', 'volume'],
    data: [[1, 10, 12, 9, 11, 1000]],
    annotations: [],
    length: 1,
    buy_signals: 0,
    sell_signals: 0,
    last_analyzed: 0,
    data_start_ts: 0,
    data_start: '',
    data_stop: '',
    data_stop_ts: 0,
    plot_config: { main_plot: {}, subplots: {} },
    warnings: [],
    candle_mode: 'closed',
    last_candle_complete: true,
  };
}

function backtestResult(): ResearchBacktestResult {
  return {
    instrument: '600519.SH',
    strategy: 'sma_cross',
    capability: { kind: 'research_backtest', execution: 'none' },
    trades: [],
    equity_curve: [],
    metrics: {
      return_ratio: 0.12,
      final_equity: 112000,
      trade_count: 3,
    },
    signals: [],
    warnings: [],
  };
}

function installResearchStore() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useResearchStore();

  store.loadBots = vi.fn(async () => {
    store.bots = [botProfile(), botProfile('second-research', 'Second Research')];
    store.selectedBotId = 'a-share-research';
    return store.bots;
  });
  store.loadInstruments = vi.fn(async () => {
    if (store.selectedBotId === 'second-research') {
      store.instruments = [instrument('000001.SZ', '000001', 'Ping An Bank')];
    } else {
      store.instruments = [instrument()];
    }
    store.selectedInstrument = store.instruments[0]?.key ?? '';
    return store.instruments;
  });
  store.loadDatasets = vi.fn(async () => {
    store.datasets = [
      datasetDescriptor('fund_flow_daily', 'feature'),
      datasetDescriptor('limit_pool', 'event'),
      datasetDescriptor('announcements', 'document'),
    ];
    return store.datasets;
  });
  store.loadChart = vi.fn(async () => {
    store.chartData = chartResponse();
    return store.chartData;
  });
  store.runBacktest = vi.fn(async () => {
    store.backtestResult = backtestResult();
    return store.backtestResult;
  });

  return { pinia, store };
}

const mountedWrappers: ReturnType<typeof mountResearchView>[] = [];

function mountResearchView(pinia: ReturnType<typeof createPinia>) {
  const wrapper = mount(ResearchView, {
    global: {
      plugins: [pinia],
      stubs: {
        Button: {
          props: ['disabled', 'icon'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" type="button" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        CandleChart: {
          name: 'CandleChart',
          props: ['dataset', 'trades', 'plotConfig'],
          template: '<div data-test="candle-chart" />',
        },
        Input: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Select: {
          props: ['modelValue', 'items'],
          emits: ['update:modelValue'],
          template:
            '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
        },
        UButton: {
          props: ['disabled', 'icon', 'loading'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" type="button" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        UInput: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        USelect: {
          props: ['modelValue', 'items'],
          emits: ['update:modelValue'],
          template:
            '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
        },
      },
    },
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

describe('ResearchView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const wrapper of mountedWrappers.splice(0)) {
      wrapper.unmount();
    }
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders research controls and no trading actions', async () => {
    const { pinia } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    expect(wrapper.text()).toContain('Research');
    expect(wrapper.text()).toContain('Instrument');
    expect(wrapper.text()).toContain('Run backtest');
    expect(wrapper.find('[data-test="bot-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="instrument-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="timeframe-select"]').exists()).toBe(true);
    expect(wrapper.find<HTMLSelectElement>('[data-test="timeframe-select"]').element.value).toBe(
      '1d',
    );
    expect(wrapper.find('[data-test="adjustment-select"]').exists()).toBe(true);
    expect(wrapper.find<HTMLSelectElement>('[data-test="adjustment-select"]').element.value).toBe(
      'raw',
    );
    expect(wrapper.find('[data-test="refresh-chart"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="research-auto-refresh-status"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="feature-dataset-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="event-dataset-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="document-dataset-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="sma-fast"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="sma-slow"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="initial-cash"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="run-backtest"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Force Entry');
    expect(wrapper.text()).not.toContain('Force Exit');
    expect(wrapper.text()).not.toContain('Start Trading');
    expect(wrapper.text()).not.toContain('Stop Trading');
    expect(wrapper.text()).not.toContain('Orders');
    expect(wrapper.text()).not.toContain('Account');
    expect(wrapper.text()).not.toContain('Cancel open order');
    expect(wrapper.text()).not.toContain('Forceexit');
  });

  it('loads bots and instruments on mount and requests a chart', async () => {
    const { pinia, store } = installResearchStore();
    mountResearchView(pinia);
    await flushPromises();

    expect(store.loadBots).toHaveBeenCalledOnce();
    expect(store.loadInstruments).toHaveBeenCalledOnce();
    expect(store.loadDatasets).toHaveBeenCalledOnce();
    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      limit: 1000,
      timerange: null,
      adjustment: 'raw',
      watch_indicators: { ma: [5, 20] },
      side_layers: null,
    });
  });

  it('sends selected side-data layers only with automatic chart refresh payloads', async () => {
    vi.useFakeTimers();
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.loadChart.mockClear();
    await wrapper.find('[data-test="feature-dataset-select"]').setValue('fund_flow_daily');
    await wrapper.find('[data-test="event-dataset-select"]').setValue('limit_pool');
    await wrapper.find('[data-test="document-dataset-select"]').setValue('announcements');
    await flushPromises();
    vi.advanceTimersByTime(900_000);
    await flushPromises();

    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      limit: 1000,
      timerange: null,
      adjustment: 'raw',
      watch_indicators: { ma: [5, 20] },
      side_layers: {
        features: ['fund_flow_daily'],
        events: ['limit_pool'],
        documents: ['announcements'],
      },
    });

    await wrapper.find('[data-test="run-backtest"]').trigger('click');

    expect(store.runBacktest).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      initial_cash: 100000,
      strategy: {
        type: 'sma_cross',
        fast: 5,
        slow: 20,
      },
    });
  });

  it('auto-refreshes the chart by the selected research timeframe', async () => {
    vi.useFakeTimers();
    const { pinia, store } = installResearchStore();
    store.loadInstruments = vi.fn(async () => {
      store.instruments = [
        instrument('688017.SH', '688017', 'Green Harmonics', ['1m', '60m']),
      ];
      store.selectedInstrument = '688017.SH';
      return store.instruments;
    });

    const wrapper = mountResearchView(pinia);
    await flushPromises();

    expect(wrapper.find<HTMLSelectElement>('[data-test="timeframe-select"]').element.value).toBe(
      '1m',
    );
    expect(wrapper.find('[data-test="research-auto-refresh-status"]').text()).toBe('Auto 10s');

    store.loadChart.mockClear();
    store.runBacktest.mockClear();

    vi.advanceTimersByTime(9_999);
    await flushPromises();
    expect(store.loadChart).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushPromises();

    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '688017.SH',
      timeframe: '1m',
      limit: 1000,
      timerange: null,
      adjustment: 'raw',
      watch_indicators: { ma: [5, 20] },
      side_layers: null,
    });
    expect(store.runBacktest).not.toHaveBeenCalled();
  });

  it('shows the 1h cadence label when research timeframe is 60m', async () => {
    const { pinia, store } = installResearchStore();
    store.loadInstruments = vi.fn(async () => {
      store.instruments = [
        instrument('688017.SH', '688017', 'Green Harmonics', ['1m', '60m']),
      ];
      store.selectedInstrument = '688017.SH';
      return store.instruments;
    });
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    await wrapper.find('[data-test="timeframe-select"]').setValue('60m');
    await flushPromises();

    expect(wrapper.find('[data-test="research-auto-refresh-status"]').text()).toBe('Auto 180s');
  });

  it('runs an SMA cross backtest for the selected research context', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    await wrapper.find('[data-test="run-backtest"]').trigger('click');

    expect(store.runBacktest).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      initial_cash: 100000,
      strategy: {
        type: 'sma_cross',
        fast: 5,
        slow: 20,
      },
    });
  });

  it('clears stale context and uses a valid instrument when switching bot', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    const loadStates: Array<{
      chartData: ResearchChartResponse | null;
      backtestResult: ResearchBacktestResult | null;
      selectedInstrument: string;
    }> = [];
    store.loadChart.mockClear();
    store.loadInstruments = vi.fn(async () => {
      loadStates.push({
        chartData: store.chartData,
        backtestResult: store.backtestResult,
        selectedInstrument: store.selectedInstrument,
      });
      store.instruments = [instrument('000001.SZ', '000001', 'Ping An Bank')];
      store.selectedInstrument = '';
      return store.instruments;
    });

    await wrapper.find('[data-test="bot-select"]').setValue('second-research');
    await flushPromises();

    expect(store.loadInstruments).toHaveBeenCalledOnce();
    expect(store.loadDatasets).toHaveBeenCalledTimes(2);
    expect(loadStates).toEqual([
      {
        chartData: null,
        backtestResult: null,
        selectedInstrument: '',
      },
    ]);
    expect(store.selectedBotId).toBe('second-research');
    expect(store.selectedInstrument).toBe('000001.SZ');
    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'second-research',
      instrument: '000001.SZ',
      timeframe: '1d',
      limit: 1000,
      timerange: null,
      adjustment: 'raw',
      watch_indicators: { ma: [5, 20] },
      side_layers: null,
    });
    expect(store.loadChart).not.toHaveBeenCalledWith(
      expect.objectContaining({ instrument: '600519.SH' }),
    );
  });

  it('automatically refreshes chart data when instrument changes', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.instruments = [instrument(), instrument('000001.SZ', '000001', 'Ping An Bank')];
    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    await flushPromises();
    store.loadChart.mockClear();

    await wrapper.find('[data-test="instrument-select"]').setValue('000001.SZ');
    await flushPromises();

    expect(store.selectedInstrument).toBe('000001.SZ');
    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '000001.SZ',
      timeframe: '1d',
      limit: 1000,
      timerange: null,
      adjustment: 'raw',
      watch_indicators: { ma: [5, 20] },
      side_layers: null,
    });
    expect(store.backtestResult).toBeNull();
  });

  it('automatically refreshes chart data when timeframe or adjustment changes', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    store.loadChart.mockClear();
    await wrapper.find('[data-test="timeframe-select"]').setValue('1h');
    await flushPromises();

    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1h',
      limit: 1000,
      timerange: null,
      adjustment: 'raw',
      watch_indicators: { ma: [5, 20] },
      side_layers: null,
    });
    expect(store.backtestResult).toBeNull();

    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    store.loadChart.mockClear();
    await wrapper.find('[data-test="adjustment-select"]').setValue('qfq');
    await flushPromises();

    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1h',
      limit: 1000,
      timerange: null,
      adjustment: 'qfq',
      watch_indicators: { ma: [5, 20] },
      side_layers: null,
    });
    expect(store.backtestResult).toBeNull();
  });

  it('automatically refreshes chart data when SMA changes', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    store.loadChart.mockClear();
    await wrapper.find('[data-test="sma-fast"]').setValue('8');
    await flushPromises();
    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      limit: 1000,
      timerange: null,
      adjustment: 'raw',
      watch_indicators: { ma: [8, 20] },
      side_layers: null,
    });
    expect(store.backtestResult).toBeNull();

    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    store.loadChart.mockClear();
    await wrapper.find('[data-test="sma-slow"]').setValue('30');
    await flushPromises();
    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      limit: 1000,
      timerange: null,
      adjustment: 'raw',
      watch_indicators: { ma: [8, 30] },
      side_layers: null,
    });
    expect(store.backtestResult).toBeNull();
  });

  it('clears stale backtest data but keeps chart data when initial cash changes', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    const chartData = chartResponse();
    store.chartData = chartData;
    store.backtestResult = backtestResult();
    await wrapper.find('[data-test="initial-cash"]').setValue('200000');

    expect(store.chartData).toBe(chartData);
    expect(store.backtestResult).toBeNull();
  });

  it('does not refresh or backtest when selected instrument is invalid', async () => {
    vi.useFakeTimers();
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.selectedInstrument = 'OLD.INVALID';
    store.loadChart.mockClear();
    store.runBacktest.mockClear();
    await flushPromises();

    expect(wrapper.find<HTMLButtonElement>('[data-test="run-backtest"]').element.disabled).toBe(
      true,
    );
    vi.advanceTimersByTime(900_000);
    await flushPromises();
    await wrapper.find('[data-test="run-backtest"]').trigger('click');

    expect(store.loadChart).not.toHaveBeenCalled();
    expect(store.runBacktest).not.toHaveBeenCalled();
  });

  it('disables chart and backtest actions while their requests are loading', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.chartRequestState.loading = true;
    store.backtestRequestState.loading = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.find<HTMLButtonElement>('[data-test="run-backtest"]').element.disabled).toBe(
      true,
    );
    expect(wrapper.find('[data-test="research-auto-refresh-status"]').text()).toBe('Refreshing');
  });

  it('renders chart and backtest request errors', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.chartRequestState.error = 'Chart adjustment is not implemented.';
    store.backtestRequestState.error = 'Backtest request failed.';
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="research-chart-error"]').text()).toBe(
      'Chart adjustment is not implemented.',
    );
    expect(wrapper.find('[data-test="research-backtest-error"]').text()).toBe(
      'Backtest request failed.',
    );
  });

  it('catches refresh chart request failures and renders the store error', async () => {
    vi.useFakeTimers();
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.chartRequestState.error = null;
    store.loadChart = vi.fn(async () => {
      store.chartRequestState.error = 'Chart request failed.';
      throw new Error('Chart request failed.');
    });

    vi.advanceTimersByTime(900_000);
    await flushPromises();

    expect(wrapper.find('[data-test="research-chart-error"]').text()).toBe(
      'Chart request failed.',
    );
  });

  it('shows only the selected instrument timeframes', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.instruments = [
      instrument('600519.SH', '600519', 'Kweichow Moutai', ['1d', '1h']),
      instrument('000001.SZ', '000001', 'Ping An Bank', ['5m']),
    ];
    store.selectedInstrument = '000001.SZ';
    await flushPromises();

    const options = wrapper
      .find('[data-test="timeframe-select"]')
      .findAll('option')
      .map((option) => option.text());

    expect(options).toEqual(['5m']);
    expect(wrapper.find<HTMLSelectElement>('[data-test="timeframe-select"]').element.value).toBe(
      '5m',
    );
  });
});
