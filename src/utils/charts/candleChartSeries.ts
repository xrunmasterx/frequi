import type { IndicatorConfig } from '@/types';
import { ChartType } from '@/types';
import type { ChartResponseMeta } from '@/types/candleTypes';
import { getSeriesSourceLabel } from '@/utils/charts/chartSeriesMeta';
import type { BarSeriesOption, LineSeriesOption, ScatterSeriesOption } from 'echarts';

export type SupportedSeriesTypes = (LineSeriesOption | BarSeriesOption | ScatterSeriesOption) & {
  seriesColumn?: string;
};

const CANDLE_TIME_BAR_ALIGNMENT = {
  barGap: '-100%',
  barCategoryGap: '20%',
} as const;

export function isIndicatorVisible(value: IndicatorConfig): boolean {
  return value.hidden !== true;
}

export function formatIndicatorLabel(key: string, meta?: ChartResponseMeta | null): string {
  if (meta) {
    const metadataLabel = getSeriesSourceLabel(meta, key);
    if (metadataLabel !== key) {
      return metadataLabel;
    }
  }

  const maMatch = /^watch_ma(\d+)$/.exec(key);
  if (maMatch) {
    return `MA${maMatch[1]}`;
  }

  const rsiMatch = /^watch_rsi(\d+)$/.exec(key);
  if (rsiMatch) {
    return `RSI ${rsiMatch[1]}`;
  }

  if (key === 'watch_macd' || /^watch_macd_\d+_\d+_\d+$/.test(key)) {
    return 'MACD';
  }
  if (key === 'watch_macdsignal' || /^watch_macdsignal_\d+_\d+_\d+$/.test(key)) {
    return 'Signal';
  }
  if (key === 'watch_macdhist' || /^watch_macdhist_\d+_\d+_\d+$/.test(key)) {
    return 'Histogram';
  }

  const supertrendMatch = /^watch_supertrend_(up|down)(?:_(\d+)_(\d+(?:_\d+)?))?$/.exec(key);
  if (supertrendMatch) {
    const direction = supertrendMatch[1] === 'up' ? 'Up' : 'Down';
    const period = supertrendMatch[2];
    const multiplier = supertrendMatch[3]?.replace('_', '.');
    const suffix = period && multiplier ? ` ${period}/${multiplier}` : '';
    return `Supertrend ${direction}${suffix}`;
  }

  return key;
}

export function generateCandleSeries(
  colDate: number,
  col: number,
  key: string,
  value: IndicatorConfig,
  axis = 0,
  meta?: ChartResponseMeta | null,
): SupportedSeriesTypes {
  const sp: SupportedSeriesTypes = {
    name: formatIndicatorLabel(key, meta),
    type: value.type || 'line',
    seriesColumn: key,
    xAxisIndex: axis,
    yAxisIndex: axis,
    itemStyle: {
      color: value.color || randomColor(),
    },
    encode: {
      x: colDate,
      y: col,
    },
    showSymbol: false,
  };
  if (value.type === ChartType.scatter) {
    sp['symbolSize'] = value.scatterSymbolSize ?? 3;
    sp['emphasis'] = {
      disabled: true,
    };
  }
  if (value.type === ChartType.bar) {
    Object.assign(sp, CANDLE_TIME_BAR_ALIGNMENT);
  }
  return sp;
}

export function generateAreaCandleSeries(
  colDate: number,
  fillCol: number,
  key: string,
  value: IndicatorConfig,
  axis = 0,
  meta?: ChartResponseMeta | null,
): SupportedSeriesTypes {
  const fillValue: IndicatorConfig = {
    // color: value.color;
    type: ChartType.line,
  };
  const areaSeries = generateCandleSeries(
    colDate,
    fillCol,
    key,
    fillValue,
    axis,
    meta,
  ) as LineSeriesOption;

  const areaOptions: LineSeriesOption = {
    stack: key,
    stackStrategy: 'all',
    lineStyle: {
      opacity: 0,
    },
    showSymbol: false,
    areaStyle: {
      color: value.color,
      opacity: 0.1,
    },
    tooltip: {
      show: false, // hide value on tooltip
    },
  };

  Object.assign(areaSeries, areaOptions);

  return areaSeries;
}
