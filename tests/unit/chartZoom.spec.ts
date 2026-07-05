import { describe, expect, it, vi } from 'vitest';

import {
  buildInitialTimeDataZoomRange,
  buildLinkedDataZoomOptions,
  captureDataZoomRange,
  createAxisIndexes,
  restoreDataZoomRange,
} from '@/utils/charts/chartZoom';

describe('chart zoom utilities', () => {
  it('captures and restores absolute time zoom ranges before percentage ranges', () => {
    const dispatchAction = vi.fn();
    const chart = {
      getOption: () => ({
        dataZoom: [
          {
            start: 42,
            end: 73,
            startValue: 1_782_000_000_000,
            endValue: 1_782_003_600_000,
          },
          {
            start: 45,
            end: 78,
          },
        ],
      }),
      dispatchAction,
    };

    const range = captureDataZoomRange(chart);
    restoreDataZoomRange(chart, range);

    expect(range).toEqual([
      { dataZoomIndex: 0, startValue: 1_782_000_000_000, endValue: 1_782_003_600_000 },
      { dataZoomIndex: 1, start: 45, end: 78 },
    ]);
    expect(dispatchAction).toHaveBeenNthCalledWith(1, {
      type: 'dataZoom',
      dataZoomIndex: 0,
      startValue: 1_782_000_000_000,
      endValue: 1_782_003_600_000,
    });
    expect(dispatchAction).toHaveBeenNthCalledWith(2, {
      type: 'dataZoom',
      dataZoomIndex: 1,
      start: 45,
      end: 78,
    });
  });

  it('does not dispatch when no zoom range is available', () => {
    const chart = {
      getOption: () => ({ dataZoom: [{}] }),
      dispatchAction: vi.fn(),
    };

    restoreDataZoomRange(chart, captureDataZoomRange(chart));

    expect(chart.dispatchAction).not.toHaveBeenCalled();
  });

  it('builds linked data zoom controls for every x axis once', () => {
    const xAxisIndex = createAxisIndexes(5);

    const zoomOptions = buildLinkedDataZoomOptions(xAxisIndex, {
      startValue: 1_782_000_000_000,
      endValue: 1_782_003_600_000,
    });

    expect(xAxisIndex).toEqual([0, 1, 2, 3, 4]);
    expect(zoomOptions).toHaveLength(2);
    expect(zoomOptions[0]).toMatchObject({
      type: 'inside',
      xAxisIndex: [0, 1, 2, 3, 4],
      startValue: 1_782_000_000_000,
      endValue: 1_782_003_600_000,
    });
    expect(zoomOptions[1]).toMatchObject({
      type: 'slider',
      xAxisIndex: [0, 1, 2, 3, 4],
      startValue: 1_782_000_000_000,
      endValue: 1_782_003_600_000,
    });
    expect(zoomOptions[0]?.xAxisIndex).not.toBe(xAxisIndex);
    expect(zoomOptions[1]?.xAxisIndex).not.toBe(xAxisIndex);
  });

  it('builds the initial zoom window from candle timestamps', () => {
    const rows = [
      [1_782_000_000_000, 100],
      [1_782_000_060_000, 101],
      [1_782_000_120_000, 102],
      [1_782_000_180_000, 103],
      [1_782_000_240_000, 104],
    ];

    expect(buildInitialTimeDataZoomRange(rows, 0, 3)).toEqual({
      startValue: 1_782_000_120_000,
      endValue: 1_782_000_240_000,
    });
  });
});
