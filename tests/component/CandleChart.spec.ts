import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CandleChart from '@/components/charts/CandleChart.vue';
import type { ChartResponseMeta, PairHistory, PlotConfig } from '@/types';

const setOptionMock = vi.hoisted(() => vi.fn());
const dispatchActionMock = vi.hoisted(() => vi.fn());

vi.mock('vue-echarts', () => ({
  default: defineComponent({
    name: 'ECharts',
    setup(_, { expose }) {
      expose({
        setOption: setOptionMock,
        dispatchAction: dispatchActionMock,
      });
      return () => h('div');
    },
  }),
}));

function chartMeta(label: string): ChartResponseMeta {
  return {
    schema_version: 1,
    window: {
      requested_count: 100,
      returned_count: 100,
      warmup_count: 30,
      last_candle_complete: true,
    },
    layers: [
      {
        id: 'watch.indicators',
        source: 'watch',
        status: 'ok',
        label: 'Watch Indicators',
        series: [
          {
            column: 'watch_rsi14',
            label,
            source: 'watch',
            kind: 'line',
            panel: 'RSI',
            visible: true,
            coverage: {
              valid_points: 100,
              total_points: 100,
            },
            provisional: false,
          },
        ],
        warnings: [],
      },
    ],
    warnings: [],
  };
}

function chartDataset(label: string): PairHistory & { meta: ChartResponseMeta } {
  return {
    strategy: 'TestStrategy',
    pair: 'BTC/USDT:USDT',
    timeframe: '1m',
    timeframe_ms: 60000,
    columns: ['__date_ts', 'open', 'high', 'low', 'close', 'volume', 'watch_rsi14'],
    all_columns: ['__date_ts', 'open', 'high', 'low', 'close', 'volume', 'watch_rsi14'],
    data: [[1782698400000, 100, 110, 90, 105, 1000, 44]],
    annotations: [],
    length: 1,
    buy_signals: 0,
    sell_signals: 0,
    last_analyzed: 0,
    data_start_ts: 1782698400000,
    data_start: '2026-06-29 02:00:00+00:00',
    data_stop: '2026-06-29 02:00:00+00:00',
    data_stop_ts: 1782698400000,
    meta: chartMeta(label),
  };
}

function plotConfig(): PlotConfig {
  return {
    main_plot: {
      watch_rsi14: { type: 'line' },
    },
    subplots: {},
  };
}

function latestLegendData(): string[] {
  const lastCall = setOptionMock.mock.calls.at(-1);
  const option = lastCall?.[0] as { legend?: { data?: string[] } } | undefined;
  return option?.legend?.data ?? [];
}

function aShareTradingSessionDataset(): PairHistory & { meta: ChartResponseMeta } {
  return {
    strategy: '',
    pair: '688017.SH',
    timeframe: '1m',
    timeframe_ms: 60000,
    columns: ['__date_ts', 'open', 'high', 'low', 'close', 'volume'],
    all_columns: ['__date_ts', 'open', 'high', 'low', 'close', 'volume'],
    data: [
      [Date.UTC(2026, 6, 8, 2, 29), 400, 401, 399, 400.5, 1000],
      [Date.UTC(2026, 6, 8, 3, 16), 401, 402, 400, 401.5, 1100],
      [Date.UTC(2026, 6, 8, 5, 0), 402, 403, 401, 402.5, 1200],
    ],
    annotations: [],
    length: 3,
    buy_signals: 0,
    sell_signals: 0,
    last_analyzed: 0,
    data_start_ts: Date.UTC(2026, 6, 8, 2, 29),
    data_start: '2026-07-08 02:29:00+00:00',
    data_stop: '2026-07-08 05:00:00+00:00',
    data_stop_ts: Date.UTC(2026, 6, 8, 5, 0),
    meta: {
      schema_version: 1,
      window: {
        requested_count: 3,
        returned_count: 3,
        warmup_count: 0,
        last_candle_complete: true,
      },
      axis: {
        mode: 'trading_session',
        source_column: '__date_ts',
        display_column: '__display_x',
        timezone: 'Asia/Shanghai',
      },
      layers: [],
      warnings: [],
    },
  };
}

function aShareTradingSessionDatasetWithDisplayColumn(): PairHistory & { meta: ChartResponseMeta } {
  return {
    strategy: '',
    pair: '688017.SH',
    timeframe: '1m',
    timeframe_ms: 60000,
    columns: ['__date_ts', 'open', 'high', 'low', 'close', 'volume', '__display_x'],
    all_columns: ['__date_ts', 'open', 'high', 'low', 'close', 'volume', '__display_x'],
    data: [
      [Date.UTC(2026, 6, 8, 2, 29), 400, 401, 399, 400.5, 1000, 0],
      [Date.UTC(2026, 6, 8, 3, 16), 401, 402, 400, 401.5, 1100, 1],
      [Date.UTC(2026, 6, 8, 5, 0), 402, 403, 401, 402.5, 1200, 2],
    ],
    annotations: [],
    length: 3,
    buy_signals: 0,
    sell_signals: 0,
    last_analyzed: 0,
    data_start_ts: Date.UTC(2026, 6, 8, 2, 29),
    data_start: '2026-07-08 02:29:00+00:00',
    data_stop: '2026-07-08 05:00:00+00:00',
    data_stop_ts: Date.UTC(2026, 6, 8, 5, 0),
    meta: {
      schema_version: 1,
      window: {
        requested_count: 3,
        returned_count: 3,
        warmup_count: 0,
        last_candle_complete: true,
      },
      axis: {
        mode: 'trading_session',
        source_column: '__date_ts',
        display_column: '__display_x',
        timezone: 'Asia/Shanghai',
      },
      layers: [],
      warnings: [],
    },
  };
}

function aShareTradingSessionDatasetWithCustomSourceColumn(): PairHistory & {
  meta: ChartResponseMeta;
} {
  return {
    strategy: '',
    pair: '688017.SH',
    timeframe: '1m',
    timeframe_ms: 60000,
    columns: ['source_ts', 'open', 'high', 'low', 'close', 'volume', '__display_x'],
    all_columns: ['source_ts', 'open', 'high', 'low', 'close', 'volume', '__display_x'],
    data: [
      [Date.UTC(2026, 6, 8, 2, 29), 400, 401, 399, 400.5, 1000, 0],
      [Date.UTC(2026, 6, 8, 3, 16), 401, 402, 400, 401.5, 1100, 1],
      [Date.UTC(2026, 6, 8, 5, 0), 402, 403, 401, 402.5, 1200, 2],
    ],
    annotations: [],
    length: 3,
    buy_signals: 0,
    sell_signals: 0,
    last_analyzed: 0,
    data_start_ts: Date.UTC(2026, 6, 8, 2, 29),
    data_start: '2026-07-08 02:29:00+00:00',
    data_stop: '2026-07-08 05:00:00+00:00',
    data_stop_ts: Date.UTC(2026, 6, 8, 5, 0),
    meta: {
      schema_version: 1,
      window: {
        requested_count: 3,
        returned_count: 3,
        warmup_count: 0,
        last_candle_complete: true,
      },
      axis: {
        mode: 'trading_session',
        source_column: 'source_ts',
        display_column: '__display_x',
        timezone: 'Asia/Shanghai',
      },
      layers: [],
      warnings: [],
    },
  };
}

describe('CandleChart.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setOptionMock.mockClear();
    dispatchActionMock.mockClear();
  });

  it('rebuilds dynamic legend labels when metadata labels change for the same indicator column', async () => {
    const wrapper = mount(CandleChart, {
      props: {
        trades: [],
        dataset: chartDataset('RSI Label A'),
        heikinAshi: false,
        showMarkArea: false,
        useUTC: true,
        plotConfig: plotConfig(),
        theme: 'dark',
        colorUp: '#00ff00',
        colorDown: '#ff0000',
        labelSide: 'right',
        startCandleCount: 250,
      },
    });

    await nextTick();
    expect(latestLegendData()).toContain('RSI Label A');

    await wrapper.setProps({
      dataset: chartDataset('RSI Label B'),
    });
    await nextTick();

    const legendData = latestLegendData();
    expect(legendData).toContain('RSI Label B');
    expect(legendData).not.toContain('RSI Label A');
  });

  it('uses a sequential display x axis for A-share trading-session chart metadata', async () => {
    mount(CandleChart, {
      props: {
        trades: [],
        dataset: aShareTradingSessionDataset(),
        heikinAshi: false,
        showMarkArea: false,
        useUTC: true,
        plotConfig: { main_plot: {}, subplots: {} },
        theme: 'dark',
        colorUp: '#00ff00',
        colorDown: '#ff0000',
        labelSide: 'right',
        startCandleCount: 250,
      },
    });

    await nextTick();

    const option = setOptionMock.mock.calls.at(-1)?.[0] as {
      dataset?: { source?: number[][] };
      xAxis?: Array<{ type?: string; min?: number; max?: number }>;
      series?: Array<{ encode?: { x?: number } }>;
    };

    expect(option.dataset?.source?.map((row) => row[0]).slice(0, 3)).toEqual(
      aShareTradingSessionDataset().data.map((row) => row[0]),
    );
    expect(option.dataset?.source?.map((row) => row[6]).slice(0, 3)).toEqual([0, 1, 2]);
    expect(option.xAxis?.[0]?.type).toBe('value');
    expect(option.xAxis?.[0]?.min).toBe(0);
    expect(option.xAxis?.[0]?.max).toBe(7);
    expect(option.series?.[0]?.encode?.x).toBe(6);
    expect(option.series?.[1]?.encode?.x).toBe(6);
  });

  it('reuses an existing backend display column for A-share trading-session metadata', async () => {
    mount(CandleChart, {
      props: {
        trades: [],
        dataset: aShareTradingSessionDatasetWithDisplayColumn(),
        heikinAshi: false,
        showMarkArea: false,
        useUTC: true,
        plotConfig: { main_plot: {}, subplots: {} },
        theme: 'dark',
        colorUp: '#00ff00',
        colorDown: '#ff0000',
        labelSide: 'right',
        startCandleCount: 250,
      },
    });

    await nextTick();

    const option = setOptionMock.mock.calls.at(-1)?.[0] as {
      dataset?: { source?: number[][] };
      xAxis?: Array<{ type?: string; min?: number; max?: number }>;
      series?: Array<{ encode?: { x?: number } }>;
    };

    expect(option.dataset?.source?.map((row) => row.length).slice(0, 3)).toEqual([7, 7, 7]);
    expect(option.dataset?.source?.map((row) => row[0]).slice(0, 3)).toEqual(
      aShareTradingSessionDatasetWithDisplayColumn().data.map((row) => row[0]),
    );
    expect(option.dataset?.source?.map((row) => row[6]).slice(0, 3)).toEqual([0, 1, 2]);
    expect(option.xAxis?.[0]?.type).toBe('value');
    expect(option.xAxis?.[0]?.min).toBe(0);
    expect(option.xAxis?.[0]?.max).toBe(7);
    expect(option.series?.[0]?.encode?.x).toBe(6);
    expect(option.series?.[1]?.encode?.x).toBe(6);
  });

  it('uses the metadata source column for trading-session timestamps', async () => {
    mount(CandleChart, {
      props: {
        trades: [],
        dataset: aShareTradingSessionDatasetWithCustomSourceColumn(),
        heikinAshi: false,
        showMarkArea: false,
        useUTC: true,
        plotConfig: { main_plot: {}, subplots: {} },
        theme: 'dark',
        colorUp: '#00ff00',
        colorDown: '#ff0000',
        labelSide: 'right',
        startCandleCount: 250,
      },
    });

    await nextTick();

    const option = setOptionMock.mock.calls.at(-1)?.[0] as {
      dataset?: { source?: number[][] };
      xAxis?: Array<{ type?: string; min?: number; max?: number }>;
      series?: Array<{ encode?: { x?: number } }>;
    };

    expect(option.dataset?.source?.map((row) => row[0]).slice(0, 3)).toEqual(
      aShareTradingSessionDatasetWithCustomSourceColumn().data.map((row) => row[0]),
    );
    expect(option.dataset?.source?.map((row) => row[6]).slice(0, 3)).toEqual([0, 1, 2]);
    expect(option.xAxis?.[0]?.type).toBe('value');
    expect(option.xAxis?.[0]?.min).toBe(0);
    expect(option.xAxis?.[0]?.max).toBe(7);
    expect(option.series?.[0]?.encode?.x).toBe(6);
    expect(option.series?.[1]?.encode?.x).toBe(6);
  });
});
