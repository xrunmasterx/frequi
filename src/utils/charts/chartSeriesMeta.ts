import type { ChartResponseMeta, ChartSeriesMeta } from '@/types/candleTypes';

export function getSeriesMetaByColumn(
  meta: ChartResponseMeta | null | undefined,
  column: string,
): ChartSeriesMeta | undefined {
  for (const layer of meta?.layers ?? []) {
    const seriesMeta = layer.series.find((series) => series.column === column);
    if (seriesMeta) {
      return seriesMeta;
    }
  }
  return undefined;
}

export function getSeriesSourceLabel(
  meta: ChartResponseMeta | null | undefined,
  column: string,
): string {
  return getSeriesMetaByColumn(meta, column)?.label ?? column;
}

export function getSeriesTooltipGroup(
  meta: ChartResponseMeta | null | undefined,
  column: string,
): string {
  for (const layer of meta?.layers ?? []) {
    if (layer.series.some((series) => series.column === column)) {
      return layer.label;
    }
  }
  return 'Other';
}

export function getSeriesCoverageReason(
  meta: ChartResponseMeta | null | undefined,
  column: string,
): string | undefined {
  return getSeriesMetaByColumn(meta, column)?.coverage.reason ?? undefined;
}
