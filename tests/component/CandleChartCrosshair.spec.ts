import { mount } from '@vue/test-utils';
import type { EChartsOption } from 'echarts';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CandleChart from '@/components/charts/CandleChart.vue';
import { ChartType, type PairHistory, type PlotConfig } from '@/types';

const { dispatchActionCalls, setOptionCalls } = vi.hoisted(() => ({
  dispatchActionCalls: [] as Array<Record<string, unknown>>,
  setOptionCalls: [] as EChartsOption[],
}));

vi.mock('vue-echarts', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'ECharts',
      setup(_, { attrs, expose }) {
        expose({
          setOption(option: EChartsOption) {
            setOptionCalls.push(option);
          },
          dispatchAction(action: Record<string, unknown>) {
            dispatchActionCalls.push(action);
          },
          containPixel(finder: Record<string, unknown>) {
            return Number(finder.gridIndex) === 0;
          },
          convertFromPixel(finder: Record<string, unknown>, value: number | number[]) {
            if (finder.xAxisIndex === 0) {
              return Date.UTC(2026, 6, 5, 12, 1, 0);
            }
            if (finder.seriesIndex === 0 && Array.isArray(value)) {
              return [Date.UTC(2026, 6, 5, 12, 1, 0), 105];
            }
            return undefined;
          },
          convertToPixel() {
            return 200;
          },
          chart: {
            getModel() {
              return {
                getComponent(_mainType: string, index?: number) {
                  const gridIndex = Number(index ?? 0);
                  return {
                    coordinateSystem: {
                      getRect() {
                        return {
                          x: 20,
                          y: 30 + gridIndex * 100,
                          width: 360,
                          height: 80,
                        };
                      },
                    },
                  };
                },
              };
            },
          },
        });

        return () =>
          h('div', {
            class: 'echarts-stub',
            onMousemove: () => {
              const onZrMousemove = (attrs as Record<string, unknown>)['onZr:mousemove'];
              if (typeof onZrMousemove === 'function') {
                onZrMousemove({ offsetX: 125, offsetY: 80 });
              }
            },
          });
      },
    }),
  };
});

function buildDataset(): PairHistory {
  const start = Date.UTC(2026, 6, 5, 12, 0, 0);

  return {
    strategy: 'TestStrategy',
    pair: 'BTC/USDT',
    timeframe: '1m',
    timeframe_ms: 60_000,
    columns: ['__date_ts', 'open', 'high', 'low', 'close', 'volume', 'rsi'],
    all_columns: ['__date_ts', 'open', 'high', 'low', 'close', 'volume', 'rsi'],
    annotations: [],
    data: [
      [start, 100, 104, 99, 103, 10, 45],
      [start + 60_000, 103, 106, 101, 105, 11, 55],
      [start + 120_000, 105, 107, 102, 104, 12, 52],
    ],
    length: 3,
    buy_signals: 0,
    sell_signals: 0,
    enter_long_signals: 0,
    exit_long_signals: 0,
    enter_short_signals: 0,
    exit_short_signals: 0,
    last_analyzed: start + 120_000,
    data_start_ts: start,
    data_start: '2026-07-05 12:00:00+00:00',
    data_stop: '2026-07-05 12:02:00+00:00',
    data_stop_ts: start + 120_000,
  };
}

function buildPlotConfig(): PlotConfig {
  return {
    main_plot: {},
    subplots: {
      RSI: {
        rsi: {
          type: ChartType.line,
          color: '#a855f7',
        },
      },
    },
  };
}

describe('CandleChart crosshair axis options', () => {
  beforeEach(() => {
    dispatchActionCalls.length = 0;
    setOptionCalls.length = 0;
    setActivePinia(createPinia());
  });

  it('enables the price pointer only on the main candle y-axis', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    mount(CandleChart, {
      props: {
        trades: [],
        dataset: buildDataset(),
        heikinAshi: false,
        showMarkArea: false,
        useUTC: false,
        plotConfig: buildPlotConfig(),
        theme: 'dark',
        colorUp: '#14b8a6',
        colorDown: '#ef4444',
        labelSide: 'right',
        startCandleCount: 40,
      },
      global: {
        plugins: [pinia],
      },
    });

    await nextTick();

    const chartOption = setOptionCalls.find(
      (option) => Array.isArray(option.yAxis) && option.yAxis.length >= 3,
    );
    expect(chartOption).toBeDefined();

    const yAxis = chartOption!.yAxis as Array<Record<string, unknown>>;
    expect(yAxis[0].axisPointer).toMatchObject({
      show: true,
      type: 'line',
      snap: false,
      triggerTooltip: false,
      label: {
        show: true,
      },
    });
    expect(yAxis[1].axisPointer).toEqual({ show: false });
    expect(yAxis[2].axisPointer).toEqual({ show: false });
  });

  it('keeps native vertical axis pointers available for tooltip while visually hidden', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    mount(CandleChart, {
      props: {
        trades: [],
        dataset: buildDataset(),
        heikinAshi: false,
        showMarkArea: false,
        useUTC: false,
        plotConfig: buildPlotConfig(),
        theme: 'dark',
        colorUp: '#14b8a6',
        colorDown: '#ef4444',
        labelSide: 'right',
        startCandleCount: 40,
      },
      global: {
        plugins: [pinia],
      },
    });

    await nextTick();

    const chartOption = setOptionCalls.find(
      (option) => Array.isArray(option.xAxis) && option.xAxis.length >= 3,
    );
    expect(chartOption).toBeDefined();

    const xAxis = chartOption!.xAxis as Array<Record<string, unknown>>;
    for (const axis of xAxis) {
      expect(axis.axisPointer).toMatchObject({
        show: true,
        lineStyle: {
          opacity: 0,
          width: 0,
        },
      });
    }

    expect(chartOption!.tooltip).toMatchObject({
      axisPointer: {
        type: 'line',
        axis: 'x',
        snap: false,
        lineStyle: {
          opacity: 0,
          width: 0,
        },
      },
    });
  });

  it('does not send a graphic-only setOption during initial chart render', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    mount(CandleChart, {
      props: {
        trades: [],
        dataset: buildDataset(),
        heikinAshi: false,
        showMarkArea: false,
        useUTC: false,
        plotConfig: buildPlotConfig(),
        theme: 'dark',
        colorUp: '#14b8a6',
        colorDown: '#ef4444',
        labelSide: 'right',
        startCandleCount: 40,
      },
      global: {
        plugins: [pinia],
      },
    });

    await nextTick();

    expect(
      setOptionCalls.some(
        (option) => 'graphic' in option && !('series' in option) && !('xAxis' in option),
      ),
    ).toBe(false);

    const chartOption = setOptionCalls.find(
      (option) => Array.isArray(option.xAxis) && option.xAxis.length >= 3,
    );
    expect(chartOption?.graphic).toBeUndefined();
  });

  it('shows tooltip by the selected candle data index instead of a raw mouse pixel', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(CandleChart, {
      props: {
        trades: [],
        dataset: buildDataset(),
        heikinAshi: false,
        showMarkArea: false,
        useUTC: false,
        plotConfig: buildPlotConfig(),
        theme: 'dark',
        colorUp: '#14b8a6',
        colorDown: '#ef4444',
        labelSide: 'right',
        startCandleCount: 40,
      },
      global: {
        plugins: [pinia],
      },
    });

    await nextTick();
    await wrapper.find('.echarts-stub').trigger('mousemove');

    expect(dispatchActionCalls).toContainEqual({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex: 1,
    });
  });
});
