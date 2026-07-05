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
  display_name?: string | null;
}

export interface ResearchInstrumentsResponse {
  instruments: ResearchInstrument[];
}

export interface ResearchChartPayload {
  bot_id: string;
  instrument: string;
  timeframe: string;
  limit?: number;
  timerange?: string | null;
  adjustment?: string | null;
  watch_indicators?: ChartIndicatorPayload;
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

export interface ResearchBacktestResult {
  instrument: string;
  strategy: string;
  capability: string;
  trades: Record<string, unknown>[];
  equity_curve: Record<string, unknown>[];
  metrics: Record<string, unknown>;
  signals: Record<string, unknown>[];
  warnings: string[];
}

export type ResearchChartResponse = ChartCandlesResponse;
