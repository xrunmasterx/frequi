import { describe, expect, it } from 'vitest';

import {
  CROSSHAIR_GRAPHIC_IDS,
  buildCrosshairGraphics,
  findNearestCandleIndex,
} from '@/utils/charts/candleChartCrosshair';

describe('candle chart crosshair utilities', () => {
  const rows = [
    [1_782_000_000_000, 100],
    [1_782_000_060_000, 101],
    [1_782_000_120_000, 102],
  ];

  it('snaps to the nearest candle timestamp', () => {
    expect(findNearestCandleIndex(rows, 0, 1_782_000_071_000)).toBe(1);
    expect(findNearestCandleIndex(rows, 0, 1_782_000_101_000)).toBe(2);
  });

  it('clamps pointer timestamps outside the dataset', () => {
    expect(findNearestCandleIndex(rows, 0, 1_781_999_000_000)).toBe(0);
    expect(findNearestCandleIndex(rows, 0, 1_782_001_000_000)).toBe(2);
  });

  it('returns undefined when no valid timestamp can be selected', () => {
    expect(findNearestCandleIndex([], 0, 1_782_000_000_000)).toBeUndefined();
    expect(findNearestCandleIndex(rows, -1, 1_782_000_000_000)).toBeUndefined();
    expect(findNearestCandleIndex([[undefined, 100]], 0, 1_782_000_000_000)).toBeUndefined();
  });

  it('removes the price guide when the pointer leaves the main price grid', () => {
    const graphics = buildCrosshairGraphics({
      x: 200,
      verticalRect: { x: 10, y: 20, width: 400, height: 300 },
    }) as Array<Record<string, unknown>>;

    expect(graphics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: CROSSHAIR_GRAPHIC_IDS[0],
          type: 'line',
        }),
        expect.objectContaining({
          id: CROSSHAIR_GRAPHIC_IDS[1],
          $action: 'remove',
        }),
        expect.objectContaining({
          id: CROSSHAIR_GRAPHIC_IDS[2],
          $action: 'remove',
        }),
      ]),
    );
  });
});
