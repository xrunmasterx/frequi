import type { EChartsOption } from 'echarts';

export type CandleChartCrosshairSelection = {
  dataIndex: number;
  timestamp: number;
};

export type GridRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ChartLike = {
  convertFromPixel?: (
    finder: Record<string, unknown>,
    value: number | number[],
  ) => number | number[];
  convertToPixel?: (finder: Record<string, unknown>, value: number | number[]) => number | number[];
  containPixel?: (finder: Record<string, unknown>, value: number[]) => boolean;
  chart?: unknown;
};

type EChartsModelHost = {
  getModel?: () => {
    getComponent?: (
      mainType: string,
      index?: number,
    ) =>
      | {
          coordinateSystem?: {
            getRect?: () => unknown;
          };
        }
      | undefined;
  };
};

const CROSSHAIR_VERTICAL_ID = 'candle-chart-crosshair-vertical';
const CROSSHAIR_HORIZONTAL_ID = 'candle-chart-crosshair-horizontal';
const CROSSHAIR_PRICE_LABEL_ID = 'candle-chart-crosshair-price-label';

export const CROSSHAIR_GRAPHIC_IDS = [
  CROSSHAIR_VERTICAL_ID,
  CROSSHAIR_HORIZONTAL_ID,
  CROSSHAIR_PRICE_LABEL_ID,
] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readPixelNumber(value: unknown): number | undefined {
  const pixel = Array.isArray(value) ? value[0] : value;
  const numberValue = Number(pixel);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function readDataValue(value: unknown): number | undefined {
  const dataValue = Array.isArray(value) ? value[0] : value;
  const numberValue = Number(dataValue);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function isGridRect(value: unknown): value is GridRect {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const rect = value as Record<string, unknown>;
  return (
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height)
  );
}

export function findNearestCandleIndex(
  rows: unknown[][],
  dateColumn: number,
  timestamp: number,
): number | undefined {
  if (dateColumn < 0 || !Number.isFinite(timestamp)) {
    return undefined;
  }

  const validRows = rows
    .map((row, index) => ({ index, timestamp: Number(row?.[dateColumn]) }))
    .filter((row): row is { index: number; timestamp: number } => Number.isFinite(row.timestamp));

  if (validRows.length === 0) {
    return undefined;
  }

  let low = 0;
  let high = validRows.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midTimestamp = validRows[mid]!.timestamp;
    if (midTimestamp === timestamp) {
      return validRows[mid]!.index;
    }
    if (midTimestamp < timestamp) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (low <= 0) {
    return validRows[0]!.index;
  }
  if (low >= validRows.length) {
    return validRows[validRows.length - 1]!.index;
  }

  const previous = validRows[low - 1]!;
  const next = validRows[low]!;
  return timestamp - previous.timestamp <= next.timestamp - timestamp ? previous.index : next.index;
}

export function getTimeValueAtPixel(chart: ChartLike, x: number): number | undefined {
  return readDataValue(chart.convertFromPixel?.({ xAxisIndex: 0 }, x));
}

export function getXAxisPixel(chart: ChartLike, timestamp: number): number | undefined {
  return readPixelNumber(chart.convertToPixel?.({ xAxisIndex: 0 }, timestamp));
}

export function getMainGridPriceAtPixel(
  chart: ChartLike,
  x: number,
  y: number,
): number | undefined {
  const value = chart.convertFromPixel?.({ seriesIndex: 0 }, [x, y]);
  const price = Array.isArray(value) ? Number(value[1]) : undefined;
  return Number.isFinite(price) ? price : undefined;
}

export function containsGrid(chart: ChartLike, gridIndex: number, x: number, y: number): boolean {
  return chart.containPixel?.({ gridIndex }, [x, y]) === true;
}

export function containsAnyGrid(
  chart: ChartLike,
  gridCount: number,
  x: number,
  y: number,
): boolean {
  for (let gridIndex = 0; gridIndex < gridCount; gridIndex += 1) {
    if (containsGrid(chart, gridIndex, x, y)) {
      return true;
    }
  }
  return false;
}

export function getGridRect(chart: ChartLike, gridIndex: number): GridRect | undefined {
  const grid = (chart.chart as EChartsModelHost | undefined)
    ?.getModel?.()
    .getComponent?.('grid', gridIndex);
  const rect = grid?.coordinateSystem?.getRect?.();
  return isGridRect(rect) ? rect : undefined;
}

export function getGridUnionRect(chart: ChartLike, gridCount: number): GridRect | undefined {
  const rects = Array.from({ length: gridCount }, (_, index) => getGridRect(chart, index)).filter(
    (rect): rect is GridRect => rect !== undefined,
  );
  if (rects.length === 0) {
    return undefined;
  }

  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function buildCrosshairGraphics(options: {
  x: number;
  verticalRect: GridRect;
  horizontal?: {
    y: number;
    rect: GridRect;
    label: string;
    labelSide: 'left' | 'right';
  };
}): EChartsOption['graphic'] {
  const graphics: Record<string, unknown>[] = [
    {
      id: CROSSHAIR_VERTICAL_ID,
      type: 'line',
      silent: true,
      z: 100,
      shape: {
        x1: options.x,
        y1: options.verticalRect.y,
        x2: options.x,
        y2: options.verticalRect.y + options.verticalRect.height,
      },
      style: {
        stroke: '#cccccc',
        lineDash: [4, 4],
        lineWidth: 1,
        opacity: 1,
      },
    },
  ];

  if (options.horizontal) {
    const { rect, y, label, labelSide } = options.horizontal;
    const labelOnRight = labelSide === 'right';
    graphics.push(
      {
        id: CROSSHAIR_HORIZONTAL_ID,
        type: 'line',
        silent: true,
        z: 100,
        shape: {
          x1: rect.x,
          y1: y,
          x2: rect.x + rect.width,
          y2: y,
        },
        style: {
          stroke: '#cccccc',
          lineDash: [4, 4],
          lineWidth: 1,
          opacity: 1,
        },
      },
      {
        id: CROSSHAIR_PRICE_LABEL_ID,
        type: 'text',
        silent: true,
        z: 101,
        x: labelOnRight ? rect.x + rect.width + 4 : rect.x - 4,
        y,
        style: {
          text: label,
          fill: '#ffffff',
          font: '12px sans-serif',
          align: labelOnRight ? 'left' : 'right',
          verticalAlign: 'middle',
          backgroundColor: '#111827',
          borderColor: '#cccccc',
          borderWidth: 1,
          padding: [3, 5],
        },
      },
    );
  } else {
    graphics.push(
      {
        id: CROSSHAIR_HORIZONTAL_ID,
        $action: 'remove',
      },
      {
        id: CROSSHAIR_PRICE_LABEL_ID,
        $action: 'remove',
      },
    );
  }

  return graphics as EChartsOption['graphic'];
}

export function buildRemoveCrosshairGraphics(): EChartsOption['graphic'] {
  return CROSSHAIR_GRAPHIC_IDS.map((id) => ({
    id,
    $action: 'remove',
  })) as EChartsOption['graphic'];
}
