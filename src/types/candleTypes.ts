import type { ExchangeSelectPayload } from './types';
import type { PlotConfig } from './plot';

export interface AvailablePairPayload {
  timeframe?: string;
  stake_currency?: string;
}

export type PairIntervalTuple = [string, string, string];

export interface AvailablePairResult {
  pairs: string[];
  /**
   * List of lists, as [pair, timeframe, candletype]
   */
  pair_interval: PairIntervalTuple[];
  length: number;
}

export interface PairCandlePayload {
  pair: string;
  timeframe: string;
  limit?: number;
  columns?: string[];
}

export interface ChartMacdIndicatorPayload {
  fast: number;
  slow: number;
  signal: number;
}

export interface ChartSupertrendIndicatorPayload {
  period: number;
  multiplier: number;
}

export interface ChartQqeModIndicatorPayload {
  rsi_length: number;
  rsi_smoothing: number;
  qqe_factor: number;
  bollinger_length: number;
  bollinger_multiplier: number;
  secondary_rsi_length: number;
  secondary_rsi_smoothing: number;
  secondary_qqe_factor: number;
  threshold: number;
  source: string;
}

export interface ChartIndicatorPayload {
  ma?: number[];
  rsi?: number[];
  macd?: ChartMacdIndicatorPayload[];
  supertrend?: ChartSupertrendIndicatorPayload[];
  qqe_mod?: ChartQqeModIndicatorPayload[];
}

export interface ChartCandlesPayload {
  pair: string;
  timeframe: string;
  limit?: number;
  display_count?: number;
  watch_indicators?: ChartIndicatorPayload;
  include_strategy_overlay?: boolean;
  candle_mode?: 'closed' | 'live';
}

export interface PairHistoryPayload extends ExchangeSelectPayload {
  pair: string;
  timeframe: string;
  timerange: string;
  strategy: string;
  freqaimodel?: string;
  columns?: string[];
  live_mode?: boolean;
}

export interface _MarkArea {
  start?: string;
  end?: string;
  y_start?: number;
  y_end?: number;
  color?: string;
  label?: string;
  z_index?: number;
}

export interface MarkArea extends _MarkArea {
  type: 'area';
}

export interface MarkLine extends _MarkArea {
  type: 'line';
  width?: number;
  line_style?: 'solid' | 'dashed' | 'dotted';
}

export interface MarkPoint {
  type: 'point';
  x: string;
  y: number;
  size?: number;
  shape?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'pin' | 'arrow' | 'none';
  rotate: number;
  color?: string;
  label?: string;
  z_index?: number;
}

export type MarkAnnotation = MarkArea | MarkLine | MarkPoint;

export interface PairHistory {
  strategy: string;
  pair: string;
  timeframe: string;
  timeframe_ms: number;
  columns: string[];
  /** All columns - available starting with api 2.35
   * Contains all columns - columns may be filtered to the ones available.
   */
  all_columns?: string[];
  /** Actual data */
  data: number[][];
  annotations: MarkAnnotation[];

  length: number;
  /** Number of buy signals in this response */
  buy_signals: number;
  /** Number of sell signals in this response */
  sell_signals: number;

  /** Number of long entry signals in this response */
  enter_long_signals?: number;
  /** Number of long exit signals in this response */
  exit_long_signals?: number;
  /** Number of short entry signals in this response */
  enter_short_signals?: number;
  /** Number of short exit signals in this response */
  exit_short_signals?: number;

  last_analyzed: number;
  /** Data start date in as millisecond timestamp */
  data_start_ts: number;
  /** Data start date in in the format YYYY-MM-DD HH24:MI:SS+00:00 */
  data_start: string;
  /** End date in in the format YYYY-MM-DD HH24:MI:SS+00:00 */
  data_stop: string;
  /** Data end date in as millisecond timestamp */
  data_stop_ts: number;
}

export interface ChartOverlayMeta {
  strategy_timeframe: string;
  alignment: 'direct' | 'forward_fill' | 'hidden' | 'unavailable';
  columns: string[];
  hidden: boolean;
  warning?: string | null;
}

export type ChartLayerSource =
  | 'market'
  | 'watch'
  | 'strategy'
  | 'execution'
  | 'decision_snapshot'
  | 'recomputed';

export interface ChartSeriesCoverage {
  first_valid?: string | null;
  last_valid?: string | null;
  valid_points: number;
  total_points: number;
  warmup_until?: string | null;
  reason?: string | null;
}

export interface ChartSeriesMeta {
  column: string;
  label: string;
  source: ChartLayerSource;
  kind: string;
  panel: string;
  timeframe?: string | null;
  visible: boolean;
  coverage: ChartSeriesCoverage;
  provisional: boolean;
}

export interface ChartLayerMeta {
  id: string;
  source: ChartLayerSource;
  status: 'ok' | 'partial' | 'hidden' | 'unavailable' | 'stale' | 'provisional';
  label: string;
  timeframe?: string | null;
  alignment?: string | null;
  series: ChartSeriesMeta[];
  warnings: string[];
}

export interface ChartWindowMeta {
  requested_count: number;
  returned_count: number;
  warmup_count: number;
  display_default_count?: number | null;
  data_start?: string | null;
  data_stop?: string | null;
  last_candle_complete: boolean;
}

export interface ChartResponseMeta {
  schema_version: number;
  window: ChartWindowMeta;
  layers: ChartLayerMeta[];
  warnings: string[];
}

export interface ChartCandlesResponse extends PairHistory {
  chart_timeframe: string;
  strategy_timeframe?: string | null;
  overlay?: ChartOverlayMeta | null;
  meta?: ChartResponseMeta | null;
  plot_config: PlotConfig;
  warnings: string[];
  candle_mode: 'closed' | 'live';
  last_candle_complete: boolean;
}

export type PairHistoryLocal<TData extends PairHistory = PairHistory> = Record<
  string,
  {
    pair: string;
    timeframe: string;
    timerange?: string;
    data: TData;
  }
>;
