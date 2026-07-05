import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useResearchStore } from '@/stores/research';
import type {
  ResearchBacktestPayload,
  ResearchBacktestResult,
  ResearchBotProfile,
  ResearchChartPayload,
  ResearchChartResponse,
  ResearchInstrument,
} from '@/types';

const axiosCreate = vi.hoisted(() => vi.fn(() => ({ get: vi.fn(), post: vi.fn() })));

vi.mock('axios', () => ({
  default: {
    create: axiosCreate,
  },
}));

function botProfile(): ResearchBotProfile {
  return {
    id: 'a-share-research',
    label: 'A Share Research',
    market: 'a_share',
    capabilities: {
      chart: true,
      indicators: true,
      backtest: true,
      live_trade: false,
      account: false,
      orders: false,
    },
  };
}

function instrument(): ResearchInstrument {
  return {
    key: 'a_share:SSE:600519',
    market: 'a_share',
    venue: 'SSE',
    symbol: '600519',
    currency: 'CNY',
    asset_type: 'stock',
    display_name: 'Kweichow Moutai',
  };
}

function chartResponse(): ResearchChartResponse {
  return {
    strategy: 'ResearchStrategy',
    pair: 'a_share:SSE:600519',
    timeframe: '1d',
    timeframe_ms: 86400000,
    chart_timeframe: '1d',
    columns: ['date', 'open', 'high', 'low', 'close', 'volume'],
    data: [[1, 10, 12, 9, 11, 1000]],
    annotations: [],
    length: 1,
    buy_signals: 0,
    sell_signals: 0,
    last_analyzed: 0,
    data_start_ts: 0,
    data_start: '',
    data_stop: '',
    data_stop_ts: 0,
    plot_config: { main_plot: {}, subplots: {} },
    warnings: [],
    candle_mode: 'closed',
    last_candle_complete: true,
  };
}

describe('research store', () => {
  const api = {
    get: vi.fn(),
    post: vi.fn(),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api.get.mockReset();
    api.post.mockReset();
  });

  it('stores bots and preserves disabled live trading capability', async () => {
    api.get.mockResolvedValue({ data: [botProfile()] });
    const store = useResearchStore();
    store.api = api as never;

    await store.loadBots();

    expect(api.get).toHaveBeenCalledWith('/research/bots');
    expect(store.bots).toEqual([botProfile()]);
    expect(store.bots[0]?.capabilities.live_trade).toBe(false);
    expect(store.selectedBotId).toBe('a-share-research');
  });

  it('loads instruments for the selected bot and defaults selected instrument', async () => {
    api.get.mockResolvedValue({ data: [instrument()] });
    const store = useResearchStore();
    store.api = api as never;
    store.selectedBotId = 'a-share-research';

    await store.loadInstruments();

    expect(api.get).toHaveBeenCalledWith('/research/instruments', {
      params: { bot_id: 'a-share-research' },
    });
    expect(store.instruments).toEqual([instrument()]);
    expect(store.selectedInstrument).toBe('a_share:SSE:600519');
  });

  it('stores chart data from chart candles endpoint', async () => {
    const payload: ResearchChartPayload = {
      bot_id: 'a-share-research',
      instrument: 'a_share:SSE:600519',
      timeframe: '1d',
      limit: 120,
    };
    const response = chartResponse();
    api.post.mockResolvedValue({ data: response });
    const store = useResearchStore();
    store.api = api as never;

    await store.loadChart(payload);

    expect(api.post).toHaveBeenCalledWith('/research/chart_candles', payload);
    expect(store.chartData).toEqual(response);
  });

  it('stores backtest result from backtest endpoint', async () => {
    const payload: ResearchBacktestPayload = {
      bot_id: 'a-share-research',
      instrument: 'a_share:SSE:600519',
      timeframe: '1d',
      initial_cash: 100000,
      strategy: { type: 'sma_cross', fast: 5, slow: 20 },
    };
    const result: ResearchBacktestResult = {
      trades: [{ id: 1 }],
      equity_curve: [{ date: '2026-01-01', equity: 100000 }],
      metrics: { total_return: 0.12 },
      signals: [{ date: '2026-01-02', side: 'buy' }],
      warnings: [],
    };
    api.post.mockResolvedValue({ data: result });
    const store = useResearchStore();
    store.api = api as never;

    await store.runBacktest(payload);

    expect(api.post).toHaveBeenCalledWith('/research/backtest', payload);
    expect(store.backtestResult).toEqual(result);
  });
});
