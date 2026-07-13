import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useResearchStore } from '@/stores/research';
import type {
  ResearchBacktestPayload,
  ResearchBacktestResult,
  ResearchBotProfile,
  ResearchChartPayload,
  ResearchChartResponse,
  ResearchDatasetDescriptor,
  ResearchInstrument,
} from '@/types';

const authenticatedApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));
const axiosCreate = vi.hoisted(() => vi.fn(() => ({ get: vi.fn(), post: vi.fn() })));
const botStoreState = vi.hoisted(() => ({
  activeBot: undefined as { api: unknown } | undefined,
}));
const useBotStore = vi.hoisted(() =>
  vi.fn(() => ({
    activeBot: botStoreState.activeBot,
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
    available_timeframes: ['1d', '1h'],
    display_name: 'Kweichow Moutai',
  };
}

function secondInstrument(): ResearchInstrument {
  return {
    key: '000001.SZ',
    market: 'a_share',
    venue: 'SZSE',
    symbol: '000001',
    currency: 'CNY',
    asset_type: 'stock',
    available_timeframes: ['1d', '5m'],
    display_name: 'Ping An Bank',
  };
}

function datasetDescriptor(
  datasetId: string,
  kind: ResearchDatasetDescriptor['kind'],
): ResearchDatasetDescriptor {
  return {
    dataset_id: datasetId,
    kind,
    market: 'a_share',
    scope: 'instrument',
    storage_format: kind === 'feature' ? 'csv' : 'jsonl',
    timeframe: '1d',
    available: true,
    start: '2026-07-07',
    stop: '2026-07-07',
    provider: 'eastmoney',
    provider_version: '1.1',
    manifest_run_id: 'task-8-test',
    warnings: [],
  };
}

function chartResponse(pair = '600519.SH'): ResearchChartResponse {
  return {
    strategy: 'ResearchStrategy',
    pair,
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe('research store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    botStoreState.activeBot = { api: authenticatedApi };
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

  it('loads side-data datasets for the selected bot and instrument', async () => {
    const datasets = [
      datasetDescriptor('fund_flow_daily', 'feature'),
      datasetDescriptor('limit_pool', 'event'),
    ];
    authenticatedApi.get.mockResolvedValue({ data: { datasets } });
    const store = useResearchStore();
    store.selectedBotId = 'a-share-research';
    store.selectedInstrument = '600519.SH';

    await store.loadDatasets();

    expect(authenticatedApi.get).toHaveBeenCalledWith('/research/datasets', {
      params: { bot_id: 'a-share-research', instrument: '600519.SH' },
    });
    expect(store.datasets).toEqual(datasets);
  });

  it('does not let stale dataset responses overwrite the latest selected bot datasets', async () => {
    const firstRequest = deferred<{ data: { datasets: ResearchDatasetDescriptor[] } }>();
    const secondRequest = deferred<{ data: { datasets: ResearchDatasetDescriptor[] } }>();
    authenticatedApi.get
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const store = useResearchStore();
    store.selectedBotId = 'a-share-research';
    store.selectedInstrument = '600519.SH';

    const first = store.loadDatasets();
    await Promise.resolve();
    store.selectedBotId = 'second-research';
    store.selectedInstrument = '000001.SZ';
    const second = store.loadDatasets();
    await Promise.resolve();

    expect(authenticatedApi.get).toHaveBeenCalledTimes(2);
    expect(authenticatedApi.get).toHaveBeenNthCalledWith(1, '/research/datasets', {
      params: { bot_id: 'a-share-research', instrument: '600519.SH' },
    });
    expect(authenticatedApi.get).toHaveBeenNthCalledWith(2, '/research/datasets', {
      params: { bot_id: 'second-research', instrument: '000001.SZ' },
    });

    const staleDatasets = [datasetDescriptor('fund_flow_daily', 'feature')];
    firstRequest.resolve({ data: { datasets: staleDatasets } });
    await expect(first).resolves.toEqual(staleDatasets);
    expect(store.datasets).toEqual([]);
    expect(store.datasetsRequestState.loading).toBe(true);

    const latestDatasets = [datasetDescriptor('announcements', 'document')];
    secondRequest.resolve({ data: { datasets: latestDatasets } });
    await expect(second).resolves.toEqual(latestDatasets);
    expect(store.datasets).toEqual(latestDatasets);
    expect(store.datasetsRequestState.loading).toBe(false);
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

  it('does not let stale instrument responses overwrite the latest selected bot instruments', async () => {
    const firstRequest = deferred<{ data: { instruments: ResearchInstrument[] } }>();
    const secondRequest = deferred<{ data: { instruments: ResearchInstrument[] } }>();
    authenticatedApi.get
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const store = useResearchStore();
    store.selectedBotId = 'a-share-research';

    const first = store.loadInstruments();
    await Promise.resolve();
    store.selectedBotId = 'second-research';
    const second = store.loadInstruments();
    await Promise.resolve();

    expect(authenticatedApi.get).toHaveBeenCalledTimes(2);
    expect(authenticatedApi.get).toHaveBeenNthCalledWith(1, '/research/instruments', {
      params: { bot_id: 'a-share-research' },
    });
    expect(authenticatedApi.get).toHaveBeenNthCalledWith(2, '/research/instruments', {
      params: { bot_id: 'second-research' },
    });

    firstRequest.resolve({ data: { instruments: [instrument()] } });
    await expect(first).resolves.toEqual([instrument()]);
    expect(store.instruments).toEqual([]);
    expect(store.selectedInstrument).toBe('');
    expect(store.instrumentsRequestState.loading).toBe(true);

    secondRequest.resolve({ data: { instruments: [secondInstrument()] } });
    await expect(second).resolves.toEqual([secondInstrument()]);
    expect(store.instruments).toEqual([secondInstrument()]);
    expect(store.selectedInstrument).toBe('000001.SZ');
    expect(store.instrumentsRequestState.loading).toBe(false);
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

  it('tracks chart loading and clears it after success', async () => {
    const payload: ResearchChartPayload = {
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
    };
    const response = chartResponse();
    const chartRequest = deferred<{ data: ResearchChartResponse }>();
    authenticatedApi.post.mockReturnValue(chartRequest.promise);
    const store = useResearchStore();

    const result = store.loadChart(payload);

    expect(store.chartRequestState.loading).toBe(true);
    expect(store.chartRequestState.error).toBeNull();
    chartRequest.resolve({ data: response });
    await expect(result).resolves.toEqual(response);
    expect(store.chartRequestState.loading).toBe(false);
    expect(store.chartRequestState.error).toBeNull();
  });

  it('stores structured chart errors and rethrows the request failure', async () => {
    const payload: ResearchChartPayload = {
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      adjustment: 'qfq',
    };
    const error = {
      response: {
        data: {
          detail: {
            message: 'qfq adjustment is not implemented.',
          },
        },
      },
    };
    authenticatedApi.post.mockRejectedValue(error);
    const store = useResearchStore();

    await expect(store.loadChart(payload)).rejects.toBe(error);

    expect(store.chartRequestState.loading).toBe(false);
    expect(store.chartRequestState.error).toBe('qfq adjustment is not implemented.');
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

  it('does not send a duplicate backtest request while one is loading', async () => {
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
      trades: [],
      equity_curve: [],
      metrics: { return_ratio: 0.12 },
      signals: [],
      warnings: [],
    };
    const backtestRequest = deferred<{ data: ResearchBacktestResult }>();
    authenticatedApi.post.mockReturnValue(backtestRequest.promise);
    const store = useResearchStore();

    const first = store.runBacktest(payload);
    const second = store.runBacktest(payload);
    await Promise.resolve();

    expect(authenticatedApi.post).toHaveBeenCalledOnce();
    expect(authenticatedApi.post).toHaveBeenCalledWith('/research/backtest', payload);
    expect(store.backtestRequestState.loading).toBe(true);
    backtestRequest.resolve({ data: result });
    await expect(first).resolves.toEqual(result);
    await expect(second).resolves.toEqual(result);
    expect(store.backtestRequestState.loading).toBe(false);
  });

  it('does not let stale chart responses overwrite the latest payload result', async () => {
    const firstPayload: ResearchChartPayload = {
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
    };
    const secondPayload: ResearchChartPayload = {
      bot_id: 'a-share-research',
      instrument: '000001.SZ',
      timeframe: '1d',
    };
    const firstResponse = chartResponse('600519.SH');
    const secondResponse = chartResponse('000001.SZ');
    const firstRequest = deferred<{ data: ResearchChartResponse }>();
    const secondRequest = deferred<{ data: ResearchChartResponse }>();
    authenticatedApi.post
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const store = useResearchStore();

    const first = store.loadChart(firstPayload);
    await Promise.resolve();
    const second = store.loadChart(secondPayload);
    await Promise.resolve();

    expect(authenticatedApi.post).toHaveBeenCalledTimes(2);
    firstRequest.resolve({ data: firstResponse });
    await expect(first).resolves.toEqual(firstResponse);
    expect(store.chartData).toBeNull();
    expect(store.chartRequestState.loading).toBe(true);

    secondRequest.resolve({ data: secondResponse });
    await expect(second).resolves.toEqual(secondResponse);
    expect(store.chartData).toEqual(secondResponse);
    expect(store.chartRequestState.loading).toBe(false);
  });

  it('does not let stale backtest responses overwrite the latest payload result', async () => {
    const firstPayload: ResearchBacktestPayload = {
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
      initial_cash: 100000,
      strategy: { type: 'sma_cross', fast: 5, slow: 20 },
    };
    const secondPayload: ResearchBacktestPayload = {
      ...firstPayload,
      initial_cash: 200000,
    };
    const firstResult: ResearchBacktestResult = {
      instrument: '600519.SH',
      strategy: 'sma_cross',
      capability: { kind: 'research_backtest', execution: 'none' },
      trades: [],
      equity_curve: [],
      metrics: { final_equity: 100000 },
      signals: [],
      warnings: [],
    };
    const secondResult: ResearchBacktestResult = {
      ...firstResult,
      metrics: { final_equity: 200000 },
    };
    const firstRequest = deferred<{ data: ResearchBacktestResult }>();
    const secondRequest = deferred<{ data: ResearchBacktestResult }>();
    authenticatedApi.post
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const store = useResearchStore();

    const first = store.runBacktest(firstPayload);
    await Promise.resolve();
    const second = store.runBacktest(secondPayload);
    await Promise.resolve();

    expect(authenticatedApi.post).toHaveBeenCalledTimes(2);
    firstRequest.resolve({ data: firstResult });
    await expect(first).resolves.toEqual(firstResult);
    expect(store.backtestResult).toBeNull();
    expect(store.backtestRequestState.loading).toBe(true);

    secondRequest.resolve({ data: secondResult });
    await expect(second).resolves.toEqual(secondResult);
    expect(store.backtestResult).toEqual(secondResult);
    expect(store.backtestRequestState.loading).toBe(false);
  });

  it('handles missing active API client failures through the request state lifecycle', async () => {
    botStoreState.activeBot = undefined;
    const store = useResearchStore();
    const payload: ResearchChartPayload = {
      bot_id: 'a-share-research',
      instrument: '600519.SH',
      timeframe: '1d',
    };

    const request = store.loadChart(payload);

    expect(store.chartRequestState.loading).toBe(true);
    await expect(request).rejects.toThrow('Research requests require an active bot API client.');
    expect(store.chartRequestState.loading).toBe(false);
    expect(store.chartRequestState.error).toBe('Research request failed.');

    botStoreState.activeBot = { api: authenticatedApi };
    const response = chartResponse();
    authenticatedApi.post.mockResolvedValue({ data: response });
    await expect(store.loadChart(payload)).resolves.toEqual(response);
    expect(authenticatedApi.post).toHaveBeenCalledOnce();
  });
});
