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

function botProfile(): ResearchBotProfile {
  return {
    id: 'a-share-research',
    label: 'A Share Research',
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

function instrument(): ResearchInstrument {
  return {
    key: '600519.SH',
    market: 'a_share',
    venue: 'SSE',
    symbol: '600519',
    currency: 'CNY',
    asset_type: 'stock',
    display_name: 'Kweichow Moutai',
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
    store.bots = [botProfile()];
    store.selectedBotId = 'a-share-research';
    return store.bots;
  });
  store.loadInstruments = vi.fn(async () => {
    store.instruments = [instrument()];
    store.selectedInstrument = '600519.SH';
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
        CandleChart: {
          name: 'CandleChart',
          props: ['dataset', 'trades', 'plotConfig'],
          template: '<div data-test="candle-chart" />',
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
    expect(wrapper.text()).not.toContain('Force Entry');
    expect(wrapper.text()).not.toContain('Force Exit');
    expect(wrapper.text()).not.toContain('Start Trading');
    expect(wrapper.text()).not.toContain('Stop Trading');
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
});
