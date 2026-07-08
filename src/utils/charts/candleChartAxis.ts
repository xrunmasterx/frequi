export type TimeAxisDomain = {
  min: number;
  max: number;
};

export const REAL_TIMESTAMP_LOWER_BOUND_MS = Date.UTC(2000, 0, 1);

export function createCrosshairLineStyle() {
  return {
    color: '#cccccc',
    opacity: 1,
    type: 'dashed',
    width: 1,
  } as const;
}

export function createLinkedTimeAxisPointer() {
  return {
    show: true,
    label: { show: false },
    lineStyle: {
      ...createCrosshairLineStyle(),
      opacity: 0,
      width: 0,
    },
    snap: false,
  } as const;
}

export type AxisPointerLabelFormatter = (params: { value: unknown }) => string;

export function createMainPriceAxisPointer(labelFormatter: AxisPointerLabelFormatter) {
  return {
    show: true,
    type: 'line',
    snap: false,
    triggerTooltip: false,
    lineStyle: createCrosshairLineStyle(),
    label: {
      show: true,
      formatter: labelFormatter,
      backgroundColor: '#111827',
      borderColor: '#cccccc',
      borderWidth: 1,
      color: '#ffffff',
      padding: [3, 5] as number[],
      margin: 4,
    },
  } as const;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isLikelyMillisecondTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= REAL_TIMESTAMP_LOWER_BOUND_MS;
}

export function getTimeAxisDomain(
  rows: number[][],
  dateColumn: number,
): TimeAxisDomain | undefined {
  if (dateColumn < 0) {
    return undefined;
  }

  const min = rows.find((row) => isFiniteNumber(row[dateColumn]))?.[dateColumn];
  let max: number | undefined;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = rows[index]?.[dateColumn];
    if (isFiniteNumber(value)) {
      max = value;
      break;
    }
  }
  if (!isFiniteNumber(min) || !isFiniteNumber(max)) {
    return undefined;
  }

  return { min, max };
}

export function getAxisDomain(
  rows: number[][],
  axisColumn: number,
): TimeAxisDomain | undefined {
  return getTimeAxisDomain(rows, axisColumn);
}

export function withTimeAxisDomain<const TAxis extends Record<string, unknown>>(
  axis: TAxis,
  domain: TimeAxisDomain | undefined,
): TAxis | (TAxis & TimeAxisDomain) {
  if (!domain) {
    return axis;
  }

  return {
    ...axis,
    min: domain.min,
    max: domain.max,
  };
}

export function withLinkedTimeAxisMapping<const TAxis extends Record<string, unknown>>(
  axis: TAxis,
  domain: TimeAxisDomain | undefined,
) {
  const boundaryGap: [number, number] = [0, 0];

  return withTimeAxisDomain(
    {
      ...axis,
      boundaryGap,
      containShape: false,
    },
    domain,
  );
}

export function withLinkedValueAxisMapping<const TAxis extends Record<string, unknown>>(
  axis: TAxis,
  domain: TimeAxisDomain | undefined,
  formatter?: (value: unknown) => string,
) {
  const existingAxisLabel =
    axis.axisLabel && typeof axis.axisLabel === 'object' && !Array.isArray(axis.axisLabel)
      ? axis.axisLabel
      : {};

  return withTimeAxisDomain(
    {
      ...axis,
      boundaryGap: [0, 0] as [number, number],
      containShape: false,
      minInterval: 1,
      maxInterval: 1,
      ...(formatter
        ? {
            axisLabel: {
              ...existingAxisLabel,
              formatter,
              hideOverlap: true,
            },
          }
        : {}),
    },
    domain,
  );
}
