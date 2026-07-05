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

const authenticatedApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));
const axiosCreate = vi.hoisted(() => vi.fn(() => ({ get: vi.fn(), post: vi.fn() })));
const useBotStore = vi.hoisted(() =>
  vi.fn(() => ({
    activeBot: {
      api: authenticatedApi,
    },
  })),
);

vi.mock('axios', () => ({
  default: {
    create: axiosCreate,
  },
}));

vi.mock('@/stores/ftbotwrapper', () => ({
  useBotStore,
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
    key: '600519.SH',
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
    pair: '600519.SH',
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
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    authenticatedApi.get.mockReset();
    authenticatedApi.post.mockReset();
  });

  it('uses the active bot authenticated API client instead of creating a bare axios client', async () => {
    authenticatedApi.get.mockResolvedValue({ data: { bots: [botProfile()] } });
    const store = useResearchStore();

    await store.loadBots();

    expect(axiosCreate).not.toHaveBeenCalled();
    expect(authenticatedApi.get).toHaveBeenCalledWith('/research/bots');
  });

  it('stores bots and preserves disabled live trading capability', async () => {
    authenticatedApi.get.mockResolvedValue({ data: { bots: [botProfile()] } });
    const store = useResearchStore();

    await store.loadBots();

    expect(authenticatedApi.get).toHaveBeenCalledWith('/research/bots');
    expect(store.bots).toEqual([botProfile()]);
    expect(store.bots[0]?.capabilities.live_trade).toBe(false);
    expect(store.selectedBotId).toBe('a-share-research');
  });

  it('does not replace an existing selected bot when loading bots', async () => {
    authenticatedApi.get.mockResolvedValue({ data: { bots: [botProfile()] } });
    const store = useResearchStore();
    store.selectedBotId = 'existing-bot';

    await store.loadBots();

    expect(store.bots).toEqual([botProfile()]);
    expect(store.selectedBotId).toBe('existing-bot');
  });

  it('loads instruments for the selected bot and defaults selected instrument', async () => {
    authenticatedApi.get.mockResolvedValue({ data: { instruments: [instrument()] } });
    const store = useResearchStore();
    store.selectedBotId = 'a-share-research';

    await store.loadInstruments();

    expect(authenticatedApi.get).toHaveBeenCalledWith('/research/instruments', {
      params: { bot_id: 'a-share-research' },
    });
    expect(store.instruments).toEqual([instrument()]);
    expect(store.selectedInstrument).toBe('600519.SH');
  });

  it('does not replace an existing selected instrument when loading instruments', async () => {
    authenticatedApi.get.mockResolvedValue({ data: { instruments: [instrument()] } });
    const store = useResearchStore();
    store.selectedBotId = 'a-share-research';
    store.selectedInstrument = 'a_share:SZSE:000001';

    await store.loadInstruments();

    expect(store.instruments).toEqual([instrument()]);
    expect(store.selectedInstrument).toBe('a_share:SZSE:000001');
  });

  it('stores chart data from chart candles endpoint', async () => {
    const payload: ResearchChartPayload = {
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      limit: 120,
      timerange: null,
      adjustment: 'qfq',
      watch_indicators: { ma: [5, 20] },
    };
    const response = chartResponse();
    authenticatedApi.post.mockResolvedValue({ data: response });
    const store = useResearchStore();

    await store.loadChart(payload);

    expect(authenticatedApi.post).toHaveBeenCalledWith('/research/chart_candles', payload);
    expect(store.chartData).toEqual(response);
  });

  it('stores backtest result from backtest endpoint', async () => {
    const payload: ResearchBacktestPayload = {
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      initial_cash: 100000,
      strategy: { type: 'sma_cross', fast: 5, slow: 20 },
    };
    const result: ResearchBacktestResult = {
      instrument: '600519.SH',
      strategy: 'sma_cross',
      capability: { kind: 'research_backtest', execution: 'none' },
      trades: [{ id: 1 }],
      equity_curve: [{ date: '2026-01-01', equity: 100000 }],
      metrics: { total_return: 0.12 },
      signals: [{ date: '2026-01-02', side: 'buy' }],
      warnings: [],
    };
    authenticatedApi.post.mockResolvedValue({ data: result });
    const store = useResearchStore();

    await store.runBacktest(payload);

    expect(authenticatedApi.post).toHaveBeenCalledWith('/research/backtest', payload);
    expect(store.backtestResult).toEqual(result);
  });
});
