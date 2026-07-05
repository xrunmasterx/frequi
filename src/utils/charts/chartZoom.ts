// Circle icon with handles - for slightly bigger data-zoom slider.
const handleIcon =
  'path://M18.1 10.7V9.3c-.3-4.9-4.4-8.8-9.4-8.8-5 0-9.1 3.9-9.4 8.8v1.3c.3 4.9 4.4 8.8 9.4 8.8C13.7 19.5 17.8 15.6 18.1 10.7zM5.6 13.3V6.7H7v6.6H5.6zM10.4 13.3V6.7h1.4v6.6H10.4z';

export const dataZoomPartial = {
  show: true,
  type: 'slider',
  handleIcon,
  handleSize: '80%',
};

export const echartsGridDefault = {
  left: '55',
  right: '30',
  bottom: 80,
};

type DataZoomRange = {
  dataZoomIndex: number;
  start?: number;
  end?: number;
  startValue?: number;
  endValue?: number;
};

type DataZoomWindow = {
  start?: number;
  end?: number;
  startValue?: number;
  endValue?: number;
};

type ChartZoomInstance = {
  getOption?: () => unknown;
  dispatchAction?: (action: { type: 'dataZoom' } & DataZoomRange) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createAxisIndexes(axisCount: number): number[] {
  return Array.from({ length: Math.max(0, axisCount) }, (_, index) => index);
}

export function buildLinkedDataZoomOptions(
  xAxisIndex: number[],
  range?: DataZoomWindow,
) {
  const insideZoom = {
    type: 'inside',
    xAxisIndex: [...xAxisIndex],
    ...(range ?? {}),
  };
  const sliderZoom = {
    xAxisIndex: [...xAxisIndex],
    bottom: 10,
    ...(range ?? {}),
    ...dataZoomPartial,
  };

  return [insideZoom, sliderZoom];
}

export function buildInitialTimeDataZoomRange(
  rows: number[][],
  dateColumn: number,
  visibleCandleCount: number,
): DataZoomWindow | undefined {
  if (dateColumn < 0 || rows.length === 0) {
    return undefined;
  }

  let endValue: number | undefined;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = rows[index]?.[dateColumn];
    if (isFiniteNumber(value)) {
      endValue = value;
      break;
    }
  }
  const visibleRows = Math.max(1, Math.floor(visibleCandleCount));
  const startIndex = Math.max(0, rows.length - visibleRows);
  const startValue = rows.slice(startIndex).find((row) => isFiniteNumber(row[dateColumn]))?.[
    dateColumn
  ];

  if (!isFiniteNumber(startValue) || !isFiniteNumber(endValue)) {
    return undefined;
  }

  return { startValue, endValue };
}

export function captureDataZoomRange(chart: ChartZoomInstance | null | undefined): DataZoomRange[] | undefined {
  const option = chart?.getOption?.();
  const dataZoom = isRecord(option) ? option.dataZoom : undefined;
  if (!Array.isArray(dataZoom)) {
    return undefined;
  }

  const ranges: DataZoomRange[] = [];
  dataZoom.forEach((item, dataZoomIndex) => {
    if (!isRecord(item)) {
      return;
    }

    if (isFiniteNumber(item.startValue) && isFiniteNumber(item.endValue)) {
      ranges.push({
        dataZoomIndex,
        startValue: item.startValue,
        endValue: item.endValue,
      });
      return;
    }

    if (isFiniteNumber(item.start) && isFiniteNumber(item.end)) {
      ranges.push({
        dataZoomIndex,
        start: item.start,
        end: item.end,
      });
      return;
    }
  });
  if (ranges.length === 0) {
    return undefined;
  }

  return ranges;
}

export function restoreDataZoomRange(
  chart: ChartZoomInstance | null | undefined,
  ranges: DataZoomRange[] | undefined,
) {
  if (!ranges) {
    return;
  }

  ranges.forEach((range) => {
    chart?.dispatchAction?.({
      type: 'dataZoom',
      ...range,
    });
  });
}
