import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBotSubStore } from '@/stores/ftbot';
import { useSettingsStore } from '@/stores/settings';
import { useTradeChartStore } from '@/stores/tradeChart';
import { RunModes } from '@/types';
import type { ChartCandlesResponse } from '@/types';
import { FtWsMessageTypes } from '@/types/wsMessageTypes';

const apiPost = vi.hoisted(() => vi.fn());
const apiGet = vi.hoisted(() => vi.fn());
const apiClient = vi.hoisted(() => ({
  post: apiPost,
  get: apiGet,
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

const websocketMock = vi.hoisted(() => {
  let onMessage: ((ws: WebSocket, event: MessageEvent<string>) => void) | undefined;

  return {
    getOnMessage: () => onMessage,
    reset: () => {
      onMessage = undefined;
    },
    useWebSocket: vi.fn((_url, options) => {
      onMessage = options?.onMessage;
      return {
        send: vi.fn(),
        status: { value: 'OPEN' },
        data: { value: null },
        close: vi.fn(),
        open: vi.fn(),
      };
    }),
  };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => apiClient),
    isAxiosError: vi.fn(() => false),
    post: vi.fn(),
    request: vi.fn(),
  },
}));

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>();
  return {
    ...actual,
    useWebSocket: websocketMock.useWebSocket,
  };
});

vi.mock('@/composables/loginInfo', async (importOriginal) => {
  const { ref } = await import('vue');
  const actual = await importOriginal<typeof import('@/composables/loginInfo')>();
  return {
    ...actual,
    useLoginInfo: () => ({
      updateBot: vi.fn(),
      getLoginInfo: vi.fn(),
      autoRefresh: ref(false),
      accessToken: ref('test-token'),
      logout: vi.fn(),
      login: vi.fn(),
      refreshToken: vi.fn(),
      baseUrl: ref('/api/v1'),
      baseWsUrl: ref('ws://localhost/api/v1'),
    }),
  };
});

function chartCandlesResponse(): ChartCandlesResponse {
  return {
    strategy: 'TestStrategy',
    pair: 'BTC/USDT:USDT',
    timeframe: '1m',
    timeframe_ms: 60000,
    chart_timeframe: '1m',
    strategy_timeframe: '1h',
    columns: ['date', 'open', 'high', 'low', 'close', 'volume'],
    all_columns: ['date', 'open', 'high', 'low', 'close', 'volume'],
    data: [],
    annotations: [],
    length: 0,
    buy_signals: 0,
    sell_signals: 0,
    enter_long_signals: 0,
    exit_long_signals: 0,
    enter_short_signals: 0,
    exit_short_signals: 0,
    last_analyzed: 0,
    data_start_ts: 0,
    data_start: '',
    data_stop: '',
    data_stop_ts: 0,
    overlay: null,
    plot_config: { main_plot: {}, subplots: {} },
    warnings: [],
    candle_mode: 'live',
    last_candle_complete: false,
  };
}

describe('ftbot chart candles websocket refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    websocketMock.reset();
    websocketMock.useWebSocket.mockClear();
    apiPost.mockReset();
    apiGet.mockReset();
    apiPost.mockResolvedValue({ data: chartCandlesResponse() });
  });

  it('requests live chart candles when a new candle arrives for the active trade chart', async () => {
    const bot = createBotSubStore('test-bot', 'Test Bot');
    bot.botStatusAvailable = true;
    bot.botState = {
      api_version: 2.5,
      runmode: RunModes.DRY_RUN,
      timeframe: '1h',
    } as never;
    bot.plotMultiPairs = ['BTC/USDT:USDT'];

    const settingsStore = useSettingsStore();
    settingsStore.chartDataCandleCount = 1600;
    settingsStore.chartDefaultCandleCount = 350;

    const tradeChartStore = useTradeChartStore();
    tradeChartStore.isTradeChartActive = true;
    tradeChartStore.activeBotId = 'test-bot';
    tradeChartStore.selectedTimeframe = '1m';
    tradeChartStore.useStrategyOverlay = true;

    bot.startWebSocket();

    const onMessage = websocketMock.getOnMessage();
    expect(onMessage).toBeDefined();

    onMessage?.({} as WebSocket, {
      data: JSON.stringify({
        type: FtWsMessageTypes.newCandle,
        data: ['BTC/USDT:USDT', '1h', 'spot'],
      }),
    } as MessageEvent<string>);
    await flushPromises();

    expect(apiPost).toHaveBeenCalledWith('/chart_candles', {
      pair: 'BTC/USDT:USDT',
      timeframe: '1m',
      limit: 1600,
      display_count: 350,
      include_strategy_overlay: true,
      candle_mode: 'live',
    });
  });

  it('does not dedupe chart candle requests with different response shaping fields', async () => {
    const bot = createBotSubStore('test-bot', 'Test Bot');
    let resolveFirstRequest: ((value: { data: ChartCandlesResponse }) => void) | undefined;
    const firstRequest = new Promise<{ data: ChartCandlesResponse }>((resolve) => {
      resolveFirstRequest = resolve;
    });
    apiPost
      .mockImplementationOnce(() => firstRequest)
      .mockResolvedValueOnce({ data: chartCandlesResponse() });

    const pendingRefresh = bot.getChartCandles({
      pair: 'BTC/USDT:USDT',
      timeframe: '1m',
      limit: 1000,
      display_count: 250,
      include_strategy_overlay: true,
      candle_mode: 'live',
    });
    await flushPromises();

    await bot.getChartCandles({
      pair: 'BTC/USDT:USDT',
      timeframe: '1m',
      limit: 1500,
      display_count: 300,
      include_strategy_overlay: true,
      candle_mode: 'live',
    });

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      '/chart_candles',
      expect.objectContaining({
        limit: 1500,
        display_count: 300,
      }),
    );

    resolveFirstRequest?.({ data: chartCandlesResponse() });
    await pendingRefresh;
  });
});
