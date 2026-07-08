import type { ChartResponseMeta } from '@/types';

export const TRADING_SESSION_DISPLAY_COLUMN = '__display_x';

export type CandleChartAxisMode = 'time' | 'trading_session';

export type TradingSessionAxisDataset = {
  columns: string[];
  rows: number[][];
  timestampColumn: number;
  displayColumn: number;
  timestampByDisplayValue: Map<number, number>;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function getChartAxisMode(meta: ChartResponseMeta | null | undefined): CandleChartAxisMode {
  return meta?.axis?.mode === 'trading_session' ? 'trading_session' : 'time';
}

export function buildTradingSessionAxisDataset(
  columns: string[],
  rows: number[][],
  timestampColumn: number,
  displayColumnName = TRADING_SESSION_DISPLAY_COLUMN,
): TradingSessionAxisDataset {
  const existingDisplayColumn = columns.indexOf(displayColumnName);
  const displayColumn = existingDisplayColumn >= 0 ? existingDisplayColumn : columns.length;
  const timestampByDisplayValue = new Map<number, number>();
  const displayRows = rows.map((row, index) => {
    const nextRow = row.slice();
    if (existingDisplayColumn < 0) {
      nextRow[displayColumn] = index;
    }

    const timestamp = Number(nextRow[timestampColumn]);
    const displayValue = Number(nextRow[displayColumn]);
    if (isFiniteNumber(timestamp) && isFiniteNumber(displayValue)) {
      timestampByDisplayValue.set(displayValue, timestamp);
    }

    return nextRow;
  });

  return {
    columns: existingDisplayColumn >= 0 ? columns.slice() : [...columns, displayColumnName],
    rows: displayRows,
    timestampColumn,
    displayColumn,
    timestampByDisplayValue,
  };
}

export function getTimestampForDisplayValue(
  axisDataset: TradingSessionAxisDataset,
  displayValue: unknown,
): number | undefined {
  const roundedValue = Math.round(Number(displayValue));
  if (!Number.isFinite(roundedValue)) {
    return undefined;
  }

  return axisDataset.timestampByDisplayValue.get(roundedValue);
}
