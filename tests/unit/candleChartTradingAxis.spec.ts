import { describe, expect, it } from 'vitest';

import type { ChartResponseMeta } from '@/types';
import {
  TRADING_SESSION_DISPLAY_COLUMN,
  buildTradingSessionAxisDataset,
  getChartAxisMode,
  getTimestampForDisplayValue,
} from '@/utils/charts/candleChartTradingAxis';

describe('candle chart trading-session axis utilities', () => {
  it('defaults to the native time axis when metadata is absent', () => {
    expect(getChartAxisMode(null)).toBe('time');
    expect(getChartAxisMode(undefined)).toBe('time');
  });

  it('enables trading-session axis only when metadata requests it', () => {
    expect(
      getChartAxisMode({
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
          display_column: TRADING_SESSION_DISPLAY_COLUMN,
          timezone: 'Asia/Shanghai',
        },
        layers: [],
        warnings: [],
      } satisfies ChartResponseMeta),
    ).toBe('trading_session');
  });

  it('appends a sequential display column without changing real timestamps', () => {
    const columns = ['__date_ts', 'open', 'high', 'low', 'close', 'volume'];
    const rows = [
      [Date.UTC(2026, 6, 8, 2, 29), 400, 401, 399, 400.5, 1000],
      [Date.UTC(2026, 6, 8, 3, 16), 401, 402, 400, 401.5, 1100],
      [Date.UTC(2026, 6, 8, 5, 0), 402, 403, 401, 402.5, 1200],
    ];

    const result = buildTradingSessionAxisDataset(columns, rows, 0);

    expect(result.columns).toEqual([
      '__date_ts',
      'open',
      'high',
      'low',
      'close',
      'volume',
      TRADING_SESSION_DISPLAY_COLUMN,
    ]);
    expect(result.timestampColumn).toBe(0);
    expect(result.displayColumn).toBe(6);
    expect(result.rows.map((row) => row[0])).toEqual(rows.map((row) => row[0]));
    expect(result.rows.map((row) => row[6])).toEqual([0, 1, 2]);
    expect(getTimestampForDisplayValue(result, 1)).toBe(rows[1]?.[0]);
  });

  it('reuses an existing display column without appending a duplicate', () => {
    const columns = ['__date_ts', 'open', TRADING_SESSION_DISPLAY_COLUMN];
    const rows = [
      [1_783_470_540_000, 10, 100],
      [1_783_473_360_000, 11, 101],
    ];

    const result = buildTradingSessionAxisDataset(columns, rows, 0);

    expect(result.columns).toEqual(columns);
    expect(result.columns).not.toEqual([
      '__date_ts',
      'open',
      TRADING_SESSION_DISPLAY_COLUMN,
      TRADING_SESSION_DISPLAY_COLUMN,
    ]);
    expect(result.displayColumn).toBe(2);
    expect(result.rows).toEqual(rows);
    expect(result.rows).not.toBe(rows);
    expect(result.rows[0]).toEqual(rows[0]);
    expect(result.rows[0]).not.toBe(rows[0]);
    expect(getTimestampForDisplayValue(result, 100)).toBe(rows[0]?.[0]);
    expect(getTimestampForDisplayValue(result, 101)).toBe(rows[1]?.[0]);
  });

  it('returns undefined for display values that belong to scroll padding rows', () => {
    const result = buildTradingSessionAxisDataset(['__date_ts', 'open'], [[1000, 10]], 0);

    expect(getTimestampForDisplayValue(result, 99)).toBeUndefined();
  });
});
