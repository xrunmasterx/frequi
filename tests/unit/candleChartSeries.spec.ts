import { describe, expect, it } from 'vitest';

import type { ChartResponseMeta } from '@/types';
import {
  generateAreaCandleSeries,
  generateCandleSeries,
} from '@/utils/charts/candleChartSeries';

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
