import { describe, expect, it } from 'vitest';

import type { ChartResponseMeta } from '@/types';
import {
  getSeriesCoverageReason,
  getSeriesMetaByColumn,
  getSeriesSourceLabel,
  getSeriesTooltipGroup,
} from '@/utils/charts/chartSeriesMeta';

function chartMeta(): ChartResponseMeta {
  return {
    schema_version: 1,
    window: {
      requested_count: 50,
      returned_count: 50,
      warmup_count: 30,
      last_candle_complete: true,
    },
    layers: [
      {
        id: 'strategy.overlay',
        source: 'strategy',
        status: 'partial',
        label: 'Strategy Output',
        timeframe: '1h',
        alignment: 'forward_fill',
        series: [
          {
            column: 'strategy_1h_rsi',
            label: 'RSI - Strategy Output - TestStrategy',
            source: 'strategy',
            kind: 'line',
            panel: 'RSI',
            timeframe: '1h',
            visible: true,
            coverage: {
              valid_points: 42,
              total_points: 50,
              reason: 'partial coverage',
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
        timeframe: '1m',
        alignment: 'direct',
        series: [
          {
            column: 'watch_rsi14',
            label: 'RSI(14) - Watch',
            source: 'watch',
            kind: 'line',
            panel: 'RSI',
            timeframe: '1m',
            visible: true,
            coverage: {
              valid_points: 50,
              total_points: 50,
              reason: null,
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

describe('chart series metadata helpers', () => {
  it('looks up series metadata by dataframe column', () => {
    expect(getSeriesMetaByColumn(chartMeta(), 'watch_rsi14')?.label).toBe('RSI(14) - Watch');
  });

  it('returns metadata labels and falls back to the column name without metadata', () => {
    expect(getSeriesSourceLabel(chartMeta(), 'strategy_1h_rsi')).toBe(
      'RSI - Strategy Output - TestStrategy',
    );
    expect(getSeriesSourceLabel(undefined, 'watch_rsi14')).toBe('watch_rsi14');
    expect(getSeriesSourceLabel(chartMeta(), 'unknown_column')).toBe('unknown_column');
  });

  it('uses the source layer label as tooltip group and falls back to Other', () => {
    expect(getSeriesTooltipGroup(chartMeta(), 'strategy_1h_rsi')).toBe('Strategy Output');
    expect(getSeriesTooltipGroup(chartMeta(), 'watch_rsi14')).toBe('Watch Indicators');
    expect(getSeriesTooltipGroup(undefined, 'watch_rsi14')).toBe('Other');
    expect(getSeriesTooltipGroup(chartMeta(), 'unknown_column')).toBe('Other');
  });

  it('returns coverage reasons when metadata provides them', () => {
    expect(getSeriesCoverageReason(chartMeta(), 'strategy_1h_rsi')).toBe('partial coverage');
    expect(getSeriesCoverageReason(chartMeta(), 'watch_rsi14')).toBeUndefined();
    expect(getSeriesCoverageReason(undefined, 'strategy_1h_rsi')).toBeUndefined();
  });
});
