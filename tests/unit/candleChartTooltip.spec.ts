import type { EChartsOption } from 'echarts';
import { createPinia, setActivePinia } from 'pinia';
import { shallowRef } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';

import { useCandleChartTooltip } from '@/composables/useCandleChartTooltip';

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
});
