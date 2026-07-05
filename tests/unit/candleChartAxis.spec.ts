import { describe, expect, it } from 'vitest';

import {
  createLinkedTimeAxisPointer,
  createMainPriceAxisPointer,
  getTimeAxisDomain,
  withLinkedTimeAxisMapping,
} from '@/utils/charts/candleChartAxis';
import * as echarts from 'echarts';

describe('candle chart axis utilities', () => {
  it('derives one shared time domain from the chart dataset', () => {
    const rows = [
      [1_782_000_000_000, 62_100],
      [1_782_000_060_000, null],
      [undefined, 62_150],
      [1_782_000_120_000, 62_180],
    ];

    expect(getTimeAxisDomain(rows, 0)).toEqual({
      min: 1_782_000_000_000,
      max: 1_782_000_120_000,
    });
  });

  it('leaves axis options untouched when the dataset has no valid timestamp', () => {
    expect(getTimeAxisDomain([[undefined, 62_100]], 0)).toBeUndefined();
  });

  it('keeps native time-axis pointer active for tooltip data but visually hidden', () => {
    const axisPointer = createLinkedTimeAxisPointer();

    expect(axisPointer).toEqual({
      show: true,
      label: { show: false },
      lineStyle: {
        color: '#cccccc',
        opacity: 0,
        type: 'dashed',
        width: 0,
      },
      snap: false,
    });
  });

  it('builds a visible main price axis pointer without driving tooltip lookup', () => {
    const formatter = (params: { value: unknown }) => `price:${params.value}`;
    const axisPointer = createMainPriceAxisPointer(formatter);

    expect(axisPointer).toEqual({
      show: true,
      type: 'line',
      snap: false,
      triggerTooltip: false,
      lineStyle: {
        color: '#cccccc',
        opacity: 1,
        type: 'dashed',
        width: 1,
      },
      label: {
        show: true,
        formatter,
        backgroundColor: '#111827',
        borderColor: '#cccccc',
        borderWidth: 1,
        color: '#ffffff',
        padding: [3, 5],
        margin: 4,
      },
    });
  });

  it('builds linked time axes from the same time domain', () => {
    const domain = { min: 1_782_000_000_000, max: 1_782_000_120_000 };

    expect(withLinkedTimeAxisMapping({ type: 'time', gridIndex: 2 }, domain)).toEqual({
      type: 'time',
      gridIndex: 2,
      boundaryGap: [0, 0],
      containShape: false,
      min: domain.min,
      max: domain.max,
    });
  });

  it('maps candlestick and indicator time axes to the same pixel for the same timestamp', () => {
    const minuteMs = 60_000;
    const start = Date.UTC(2026, 6, 4, 20, 0, 0);
    const rows = Array.from({ length: 30 }, (_, index) => [
      start + index * minuteMs,
      100 + index,
      101 + index,
      99 + index,
      102 + index,
      index,
    ]);
    const domain = getTimeAxisDomain(rows, 0);
    const chart = echarts.init(null, null, {
      renderer: 'svg',
      ssr: true,
      width: 800,
      height: 600,
    });

    try {
      chart.setOption({
        dataset: { source: rows },
        grid: [
          { left: 55, right: 30, top: 20, height: 350 },
          { left: 55, right: 30, top: 400, height: 80 },
        ],
        xAxis: [
          withLinkedTimeAxisMapping({ type: 'time' }, domain),
          withLinkedTimeAxisMapping({ type: 'time', gridIndex: 1 }, domain),
        ],
        yAxis: [{ scale: true }, { scale: true, gridIndex: 1 }],
        series: [
          {
            type: 'candlestick',
            barWidth: '80%',
            encode: { x: 0, y: [1, 2, 3, 4] },
          },
          {
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 1,
            showSymbol: false,
            encode: { x: 0, y: 5 },
          },
        ],
      });

      const targetTimestamp = start + 18 * minuteMs;
      const mainPixel = chart.convertToPixel({ xAxisIndex: 0 }, targetTimestamp);
      const indicatorPixel = chart.convertToPixel({ xAxisIndex: 1 }, targetTimestamp);

      expect(Number.isFinite(mainPixel)).toBe(true);
      expect(Number.isFinite(indicatorPixel)).toBe(true);
      expect(mainPixel).toBe(indicatorPixel);
    } finally {
      chart.dispose();
    }
  });
});
