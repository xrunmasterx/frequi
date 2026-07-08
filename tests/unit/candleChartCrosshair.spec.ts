import { describe, expect, it } from 'vitest';

import {
  CROSSHAIR_GRAPHIC_IDS,
  buildCrosshairGraphics,
  findNearestCandleIndex,
  getTimeValueAtPixel,
  getTimeAxisGridProjections,
  getXAxisPixel,
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

  it('converts pointer pixels through the requested x axis', () => {
    const chart = {
      convertFromPixel(finder: Record<string, unknown>, value: number) {
        return Number(finder.xAxisIndex) * 1_000 + value;
      },
      convertToPixel(finder: Record<string, unknown>, value: number) {
        return Number(finder.xAxisIndex) * 10 + value;
      },
    };

    expect(getTimeValueAtPixel(chart, 2, 100)).toBe(2100);
    expect(getXAxisPixel(chart, 3, 50)).toBe(80);
  });

  it('projects the selected timestamp into each grid x axis independently', () => {
    const rects = [
      { x: 10, y: 20, width: 300, height: 200 },
      { x: 12, y: 240, width: 296, height: 80 },
    ];
    const chart = {
      convertToPixel(finder: Record<string, unknown>, value: number) {
        return Number(finder.xAxisIndex) * 5 + value;
      },
      chart: {
        getModel() {
          return {
            getComponent(_mainType: string, index = 0) {
              return {
                coordinateSystem: {
                  getRect() {
                    return rects[index];
                  },
                },
              };
            },
          };
        },
      },
    };

    expect(getTimeAxisGridProjections(chart, 2, 100)).toEqual([
      { gridIndex: 0, x: 100, rect: rects[0] },
      { gridIndex: 1, x: 105, rect: rects[1] },
    ]);
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
