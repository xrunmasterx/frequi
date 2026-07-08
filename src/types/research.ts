import type { ChartCandlesResponse, ChartIndicatorPayload } from './candleTypes';

export type ResearchMarket = 'a_share' | 'hk_stock' | 'us_stock';

export interface ResearchCapabilities {
  chart: boolean;
  indicators: boolean;
  backtest: boolean;
  live_trade: boolean;
  account: boolean;
  orders: boolean;
}

export interface ResearchBotProfile {
  id: string;
  label: string;
  market: ResearchMarket;
  capabilities: ResearchCapabilities;
}

export interface ResearchBotsResponse {
  bots: ResearchBotProfile[];
}

export interface ResearchInstrument {
  key: string;
  market: ResearchMarket;
  venue: string;
  symbol: string;
  currency: string;
  asset_type: string;
  available_timeframes: string[];
  display_name?: string | null;
}

export interface ResearchInstrumentsResponse {
  instruments: ResearchInstrument[];
}

export type ResearchSideDataKind = 'feature' | 'event' | 'document';

export interface ResearchDatasetDescriptor {
  dataset_id: string;
  kind: ResearchSideDataKind;
  market: ResearchMarket;
  scope: 'instrument' | 'market' | 'sector';
  storage_format: 'csv' | 'jsonl';
  timeframe?: string | null;
  available: boolean;
  start?: string | null;
  stop?: string | null;
  provider?: string | null;
  provider_version?: string | null;
  manifest_run_id?: string | null;
  warnings: string[];
}

export interface ResearchDatasetsResponse {
  datasets: ResearchDatasetDescriptor[];
}

export interface ResearchSideLayersPayload {
  features?: string[];
  events?: string[];
  documents?: string[];
}

export interface ResearchRequestState {
  loading: boolean;
  error: string | null;
}

export interface ResearchChartPayload {
  bot_id: string;
  instrument: string;
  timeframe: string;
  limit?: number;
  timerange?: string | null;
  adjustment?: 'raw' | 'qfq' | 'hfq';
  watch_indicators?: ChartIndicatorPayload;
  side_layers?: ResearchSideLayersPayload | null;
}

export interface ResearchBacktestPayload {
  bot_id: string;
  instrument: string;
  timeframe: string;
  timerange?: string | null;
  initial_cash?: number;
  strategy?: {
    type: 'sma_cross';
    fast: number;
    slow: number;
  };
}

export interface ResearchBacktestCapability {
  kind: 'research_backtest';
  execution: 'none';
}

export interface ResearchBacktestResult {
  instrument: string;
  strategy: string;
  capability: ResearchBacktestCapability;
  trades: Record<string, unknown>[];
  equity_curve: Record<string, unknown>[];
  metrics: Record<string, unknown>;
  signals: Record<string, unknown>[];
  warnings: string[];
}

export type ResearchChartResponse = ChartCandlesResponse;
