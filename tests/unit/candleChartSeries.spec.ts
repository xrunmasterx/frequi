import { describe, expect, it } from 'vitest';

import type { ChartResponseMeta } from '@/types';
import { ChartType } from '@/types';
import {
  generateAreaCandleSeries,
  generateCandleSeries,
} from '@/utils/charts/candleChartSeries';
import * as echarts from 'echarts';

function chartMeta(): ChartResponseMeta {
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
}

describe('candle chart series metadata labels', () => {
  it('uses metadata labels for watch indicator series when metadata is available', () => {
    const series = generateCandleSeries(0, 5, 'watch_rsi14', { type: 'line' }, 0, chartMeta());

    expect(series.name).toBe('RSI(14) - Watch');
  });

  it('keeps the existing watch indicator label fallback without metadata', () => {
    const series = generateCandleSeries(0, 5, 'watch_rsi14', { type: 'line' });

    expect(series.name).toBe('RSI 14');
  });

  it('keeps the existing label fallback when metadata does not describe the column', () => {
    const series = generateCandleSeries(0, 5, 'watch_ma20', { type: 'line' }, 0, chartMeta());

    expect(series.name).toBe('MA20');
  });

  it('uses metadata labels for area fill series when metadata is available', () => {
    const series = generateAreaCandleSeries(
      0,
      5,
      'watch_rsi14',
      { type: 'line', color: '#fff' },
      0,
      chartMeta(),
    );

    expect(series.name).toBe('RSI(14) - Watch');
  });
});

describe('candle chart series bar alignment', () => {
  it('centers every candle-time bar series on the same timestamp', () => {
    const minuteMs = 60_000;
    const start = Date.UTC(2026, 6, 5, 12, 0, 0);
    const rows = Array.from({ length: 8 }, (_, index) => [
      start + index * minuteMs,
      -10 - index,
      -11 - index,
      -12 - index,
    ]);
    const targetIndex = 5;
    const targetTimestamp = rows[targetIndex]![0]!;
    const chart = echarts.init(null, null, {
      renderer: 'svg',
      ssr: true,
      width: 900,
      height: 400,
    });

    try {
      chart.setOption({
        dataset: { source: rows },
        animation: false,
        grid: [{ left: 50, right: 30, top: 20, height: 260 }],
        xAxis: [
          {
            type: 'time',
            boundaryGap: [0, 0],
            min: rows[0]![0],
            max: rows[rows.length - 1]![0] + minuteMs * 5,
          },
        ],
        yAxis: [{ type: 'value', scale: true }],
        series: [
          generateCandleSeries(0, 1, 'watch_qqe_mod_hist', { type: ChartType.bar }, 0),
          generateCandleSeries(0, 2, 'watch_qqe_mod_up', { type: ChartType.bar }, 0),
          generateCandleSeries(0, 3, 'watch_qqe_mod_down', { type: ChartType.bar }, 0),
        ],
      });

      const axisPixel = Number(chart.convertToPixel({ xAxisIndex: 0 }, targetTimestamp));
      const centers = [0, 1, 2].map((seriesIndex) => {
        const layout = chart
          .getModel()
          .getSeriesByIndex(seriesIndex)
          .getData()
          .getItemLayout(targetIndex) as { x: number; width: number };
        return layout.x + layout.width / 2;
      });

      expect(Number.isFinite(axisPixel)).toBe(true);
      centers.forEach((center) => {
        expect(center).toBeCloseTo(axisPixel, 5);
      });
    } finally {
      chart.dispose();
    }
  });
});
