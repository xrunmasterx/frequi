import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useResearchStore } from '@/stores/research';
import type {
  ResearchBacktestResult,
  ResearchBotProfile,
  ResearchChartResponse,
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
): ResearchInstrument {
  return {
    key,
    market: 'a_share',
    venue: 'SSE',
    symbol,
    currency: 'CNY',
    asset_type: 'stock',
    display_name: displayName,
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

function mountResearchView(pinia: ReturnType<typeof createPinia>) {
  return mount(ResearchView, {
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
          props: ['disabled', 'icon'],
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
}

describe('ResearchView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(wrapper.find('[data-test="refresh-chart"]').exists()).toBe(true);
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
    expect(store.loadChart).toHaveBeenCalledWith({
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      limit: 1000,
      timerange: null,
      adjustment: 'raw',
      watch_indicators: { ma: [5, 20] },
    });
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
    });
    expect(store.loadChart).not.toHaveBeenCalledWith(
      expect.objectContaining({ instrument: '600519.SH' }),
    );
  });

  it('clears stale chart and backtest data when instrument changes', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.instruments = [instrument(), instrument('000001.SZ', '000001', 'Ping An Bank')];
    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    await flushPromises();

    await wrapper.find('[data-test="instrument-select"]').setValue('000001.SZ');

    expect(store.selectedInstrument).toBe('000001.SZ');
    expect(store.chartData).toBeNull();
    expect(store.backtestResult).toBeNull();
  });

  it('clears stale chart and backtest data when timeframe or adjustment changes', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    await wrapper.find('[data-test="timeframe-select"]').setValue('1h');

    expect(store.chartData).toBeNull();
    expect(store.backtestResult).toBeNull();

    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    await wrapper.find('[data-test="adjustment-select"]').setValue('qfq');

    expect(store.chartData).toBeNull();
    expect(store.backtestResult).toBeNull();
  });

  it('clears stale chart and backtest data when SMA changes', async () => {
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    await wrapper.find('[data-test="sma-fast"]').setValue('8');
    expect(store.chartData).toBeNull();
    expect(store.backtestResult).toBeNull();

    store.chartData = chartResponse();
    store.backtestResult = backtestResult();
    await wrapper.find('[data-test="sma-slow"]').setValue('30');
    expect(store.chartData).toBeNull();
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
    const { pinia, store } = installResearchStore();
    const wrapper = mountResearchView(pinia);
    await flushPromises();

    store.selectedInstrument = 'OLD.INVALID';
    store.loadChart.mockClear();
    store.runBacktest.mockClear();
    await flushPromises();

    expect(wrapper.find<HTMLButtonElement>('[data-test="refresh-chart"]').element.disabled).toBe(
      true,
    );
    expect(wrapper.find<HTMLButtonElement>('[data-test="run-backtest"]').element.disabled).toBe(
      true,
    );
    await wrapper.find('[data-test="refresh-chart"]').trigger('click');
    await wrapper.find('[data-test="run-backtest"]').trigger('click');

    expect(store.loadChart).not.toHaveBeenCalled();
    expect(store.runBacktest).not.toHaveBeenCalled();
  });
});
