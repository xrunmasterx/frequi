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
});
