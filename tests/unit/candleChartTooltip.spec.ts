import type { EChartsOption } from 'echarts';
import { createPinia, setActivePinia } from 'pinia';
import { shallowRef } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';

import { useCandleChartTooltip } from '@/composables/useCandleChartTooltip';
import type { ChartResponseMeta } from '@/types';

describe('useCandleChartTooltip', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function renderTooltip(params: unknown[]) {
    const chartOptions = shallowRef<EChartsOption>({
      series: [
        {
          name: 'Candles / K 线',
          type: 'candlestick',
          yAxisIndex: 0,
          encode: {
            y: [1, 4, 3, 2],
          },
        },
        {
          name: 'Entry / 入场',
          type: 'scatter',
          yAxisIndex: 0,
          encode: {
            tooltip: [6, 7],
          },
          tooltip: {
            valueFormatter: (value) => {
              if (!Array.isArray(value) || !value[0]) {
                return '';
              }
              return `Long entries / 做多入场 ${value[1] ? `(${value[1]})` : ''}`;
            },
          },
        },
        {
          name: 'Exit / 出场',
          type: 'scatter',
          yAxisIndex: 0,
          encode: {
            tooltip: [8, 9],
          },
          tooltip: {
            valueFormatter: (value) => {
              if (!Array.isArray(value) || !value[0]) {
                return '';
              }
              return `Long exit / 做多出场 ${value[1] ? `(${value[1]})` : ''}`;
            },
          },
        },
      ],
    });

    return useCandleChartTooltip(chartOptions).formatCandleTooltip(params as never);
  }

  it('renders bilingual OHLC candle labels', () => {
    const html = renderTooltip([
      {
        componentType: 'series',
        seriesIndex: 0,
        seriesName: 'Candles / K 线',
        seriesType: 'candlestick',
        axisValueLabel: '2026-06-29 02:00:00',
        marker: '<span></span>',
        encode: {
          y: [1, 4, 3, 2],
        },
        value: [1782698400000, 1567.66, 1578.54, 1549.19, 1575.71],
      },
    ]);

    expect(html).toContain('Candles /');
    expect(html).toContain('Open /');
    expect(html).toContain('Highest /');
    expect(html).toContain('Lowest /');
    expect(html).toContain('Close /');
    expect(html).not.toContain('>open<');
    expect(html).not.toContain('>highest<');
    expect(html).not.toContain('>lowest<');
    expect(html).not.toContain('>close<');
  });

  it('formats category axis timestamp values before rendering the tooltip title', () => {
    const html = renderTooltip([
      {
        componentType: 'series',
        seriesIndex: 0,
        seriesName: 'Candles',
        seriesType: 'candlestick',
        axisValue: 1782698400000,
        axisValueLabel: '1782698400000',
        marker: '<span></span>',
        encode: {
          y: [1, 4, 3, 2],
        },
        value: [1782698400000, 1567.66, 1578.54, 1549.19, 1575.71],
      },
    ]);

    expect(html).toMatch(/2026-06-\d{2}/);
    expect(html).not.toContain('1782698400000');
  });

  it('does not render empty entry or exit signal rows', () => {
    const html = renderTooltip([
      {
        componentType: 'series',
        seriesIndex: 0,
        seriesName: 'Candles / K 线',
        seriesType: 'candlestick',
        axisValueLabel: '2026-06-29 02:00:00',
        marker: '<span></span>',
        encode: {
          y: [1, 4, 3, 2],
        },
        value: [1782698400000, 1567.66, 1578.54, 1549.19, 1575.71],
      },
      {
        componentType: 'series',
        seriesIndex: 1,
        seriesName: 'Entry / 入场',
        seriesType: 'scatter',
        marker: '<span></span>',
        value: [1782698400000, null, null, null, null, null, null, null, null, null],
      },
      {
        componentType: 'series',
        seriesIndex: 2,
        seriesName: 'Exit / 出场',
        seriesType: 'scatter',
        marker: '<span></span>',
        value: [1782698400000, null, null, null, null, null, null, null, null, null],
      },
    ]);

    expect(html).not.toContain('Entry /');
    expect(html).not.toContain('Exit /');
  });

  it('renders values from the active crosshair row instead of stale tooltip params', () => {
    const selectedTimestamp = 1_782_698_460_000;
    const chartOptions = shallowRef<EChartsOption>({
      dataset: {
        source: [
          [1_782_698_400_000, 100, 108, 90, 105],
          [selectedTimestamp, 200, 208, 190, 205],
        ],
      },
      series: [
        {
          name: 'Candles',
          type: 'candlestick',
          yAxisIndex: 0,
          encode: {
            y: [1, 4, 3, 2],
          },
        },
      ],
    });
    const selectedCrosshair = shallowRef({
      dataIndex: 1,
      timestamp: selectedTimestamp,
    });

    const html = useCandleChartTooltip(chartOptions, selectedCrosshair).formatCandleTooltip([
      {
        componentType: 'series',
        seriesIndex: 0,
        seriesName: 'Candles',
        seriesType: 'candlestick',
        axisValue: 1_782_698_400_000,
        axisValueLabel: '1782698400000',
        marker: '<span></span>',
        encode: {
          y: [1, 4, 3, 2],
        },
        value: [1_782_698_400_000, 100, 108, 90, 105],
      },
    ] as never);

    expect(html).toContain('200');
    expect(html).toContain('208');
    expect(html).toContain('190');
    expect(html).toContain('205');
    expect(html).not.toContain('100');
    expect(html).not.toContain('105');
  });

  it('groups metadata-backed series by source layer label', () => {
    const meta: ChartResponseMeta = {
      schema_version: 1,
      window: {
        requested_count: 100,
        returned_count: 100,
        warmup_count: 30,
        last_candle_complete: true,
      },
      layers: [
        {
          id: 'strategy.overlay',
          source: 'strategy',
          status: 'ok',
          label: 'Strategy Output',
          series: [
            {
              column: 'strategy_1h_rsi',
              label: 'RSI - Strategy Output - TestStrategy',
              source: 'strategy',
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
        {
          id: 'watch.indicators',
          source: 'watch',
          status: 'ok',
          label: 'Watch Indicators',
          series: [
            {
              column: 'watch_rsi14',
              label: 'RSI(14) - Watch',
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
    const chartOptions = shallowRef<EChartsOption>({
      dataset: {
        source: [],
        meta,
      },
      series: [
        {
          name: 'Candles',
          type: 'candlestick',
          yAxisIndex: 0,
          encode: {
            y: [1, 4, 3, 2],
          },
        },
        {
          name: 'strategy_1h_rsi',
          type: 'line',
          yAxisIndex: 2,
          encode: {
            y: 5,
          },
        },
        {
          name: 'watch_rsi14',
          type: 'line',
          yAxisIndex: 2,
          encode: {
            y: 6,
          },
        },
      ],
      yAxis: [{}, {}, { name: 'RSI' }],
    } as EChartsOption);

    const html = useCandleChartTooltip(chartOptions).formatCandleTooltip([
      {
        componentType: 'series',
        seriesIndex: 0,
        seriesName: 'Candles',
        seriesType: 'candlestick',
        axisValue: 1_782_698_400_000,
        axisValueLabel: '1782698400000',
        marker: '<span></span>',
        encode: {
          y: [1, 4, 3, 2],
        },
        value: [1_782_698_400_000, 100, 108, 90, 105, 61, 44],
      },
      {
        componentType: 'series',
        seriesIndex: 1,
        seriesName: 'strategy_1h_rsi',
        seriesType: 'line',
        marker: '<span></span>',
        encode: {
          y: [5],
        },
        value: [1_782_698_400_000, 100, 108, 90, 105, 61, 44],
      },
      {
        componentType: 'series',
        seriesIndex: 2,
        seriesName: 'watch_rsi14',
        seriesType: 'line',
        marker: '<span></span>',
        encode: {
          y: [6],
        },
        value: [1_782_698_400_000, 100, 108, 90, 105, 61, 44],
      },
    ] as never);

    expect(html.indexOf('Candle')).toBeLessThan(html.indexOf('Strategy Output'));
    expect(html.indexOf('Strategy Output')).toBeLessThan(html.indexOf('Watch Indicators'));
    expect(html).toContain('RSI - Strategy Output - TestStrategy');
    expect(html).toContain('RSI(14) - Watch');
  });

  it('keeps legacy tooltip label and y-axis group when metadata misses a series column', () => {
    const meta: ChartResponseMeta = {
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
          series: [],
          warnings: [],
        },
      ],
      warnings: [],
    };
    const chartOptions = shallowRef<EChartsOption>({
      dataset: {
        source: [],
        meta,
      },
      series: [
        {
          name: 'MA20',
          type: 'line',
          seriesColumn: 'watch_ma20',
          yAxisIndex: 2,
          encode: {
            y: 5,
          },
        },
      ],
      yAxis: [{}, {}, { name: 'Moving Average' }],
    } as EChartsOption);

    const html = useCandleChartTooltip(chartOptions).formatCandleTooltip([
      {
        componentType: 'series',
        seriesIndex: 0,
        seriesName: 'MA20',
        seriesType: 'line',
        marker: '<span></span>',
        encode: {
          y: [5],
        },
        value: [1_782_698_400_000, 100, 108, 90, 105, 123],
      },
    ] as never);

    expect(html).toContain('Moving Average');
    expect(html).toContain('MA20');
    expect(html).not.toContain('Watch Indicators');
    expect(html).not.toContain('watch_ma20');
  });

  it('uses explicitly provided metadata when chart options do not carry metadata', () => {
    const meta: ChartResponseMeta = {
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
              label: 'RSI(14) - Watch',
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
    const chartOptions = shallowRef<EChartsOption>({
      series: [
        {
          name: 'RSI 14',
          type: 'line',
          seriesColumn: 'watch_rsi14',
          yAxisIndex: 2,
          encode: {
            y: 5,
          },
        },
      ],
      yAxis: [{}, {}, { name: 'RSI' }],
    } as EChartsOption);

    const html = useCandleChartTooltip(chartOptions, undefined, meta).formatCandleTooltip([
      {
        componentType: 'series',
        seriesIndex: 0,
        seriesName: 'RSI 14',
        seriesType: 'line',
        marker: '<span></span>',
        encode: {
          y: [5],
        },
        value: [1_782_698_400_000, 100, 108, 90, 105, 44],
      },
    ] as never);

    expect(html).toContain('Watch Indicators');
    expect(html).toContain('RSI(14) - Watch');
    expect(html).not.toContain('RSI 14');
  });
});
