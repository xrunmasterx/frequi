import { describe, expect, it } from 'vitest';

import {
  getTradeChartRefreshIntervalMs,
  normalizeTradeChartRefreshTimeframe,
  runDedupedChartRefresh,
} from '@/utils/tradeChartRefresh';

describe('trade chart refresh utilities', () => {
  it.each([
    ['1m', 10_000],
    ['3m', 30_000],
    ['5m', 60_000],
    ['15m', 60_000],
    ['30m', 60_000],
    ['1h', 180_000],
    ['60m', 180_000],
    ['2h', 300_000],
    ['4h', 300_000],
    ['6h', 600_000],
    ['8h', 600_000],
    ['12h', 600_000],
    ['1d', 900_000],
    ['3d', 900_000],
    ['1w', 900_000],
    ['2w', 900_000],
    ['1M', 900_000],
    ['1y', 900_000],
    ['unknown', 60_000],
  ])('maps %s to %i ms', (timeframe, expected) => {
    expect(getTradeChartRefreshIntervalMs(timeframe)).toBe(expected);
  });

  it('normalizes minute-style one hour timeframe to the shared 1h cadence key', () => {
    expect(normalizeTradeChartRefreshTimeframe('60m')).toBe('1h');
    expect(normalizeTradeChartRefreshTimeframe('1m')).toBe('1m');
    expect(normalizeTradeChartRefreshTimeframe('unknown')).toBe('unknown');
  });

  it('skips a duplicate refresh while the same chart request is in flight', async () => {
    const inFlight = new Set<string>();
    let calls = 0;
    let finishRefresh: (() => void) | undefined;

    const firstRefresh = runDedupedChartRefresh(inFlight, 'BTC/USDT__1m__live', async () => {
      calls += 1;
      await new Promise<void>((resolve) => {
        finishRefresh = resolve;
      });
    });
    const duplicateRefresh = runDedupedChartRefresh(inFlight, 'BTC/USDT__1m__live', async () => {
      calls += 1;
    });

    await expect(duplicateRefresh).resolves.toBe(false);
    expect(calls).toBe(1);

    finishRefresh?.();
    await expect(firstRefresh).resolves.toBe(true);
    expect(inFlight.has('BTC/USDT__1m__live')).toBe(false);
  });
});
