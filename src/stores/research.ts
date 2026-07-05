import type {
  ResearchBacktestPayload,
  ResearchBacktestResult,
  ResearchBotsResponse,
  ResearchChartPayload,
  ResearchChartResponse,
  ResearchInstrumentsResponse,
  ResearchBotProfile,
  ResearchInstrument,
} from '@/types';
import type { AxiosInstance } from 'axios';
import { useBotStore } from './ftbotwrapper';

type ResearchApi = Pick<AxiosInstance, 'get' | 'post'>;

function getResearchApi(): ResearchApi {
  const api = useBotStore().activeBot?.api;
  if (!api) {
    throw new Error('Research requests require an active bot API client.');
  }
  return api;
}

export const useResearchStore = defineStore('research', () => {
  const bots = shallowRef<ResearchBotProfile[]>([]);
  const instruments = shallowRef<ResearchInstrument[]>([]);
  const selectedBotId = ref('');
  const selectedInstrument = ref('');
  const chartData = shallowRef<ResearchChartResponse | null>(null);
  const backtestResult = shallowRef<ResearchBacktestResult | null>(null);

  async function loadBots() {
    const { data } = await getResearchApi().get<ResearchBotsResponse>('/research/bots');
    bots.value = data.bots;
    if (!selectedBotId.value) {
      selectedBotId.value = data.bots[0]?.id ?? '';
    }
    return data.bots;
  }

  async function loadInstruments() {
    const { data } = await getResearchApi().get<ResearchInstrumentsResponse>(
      '/research/instruments',
      {
        params: { bot_id: selectedBotId.value },
      },
    );
    instruments.value = data.instruments;
    if (!selectedInstrument.value) {
      selectedInstrument.value = data.instruments[0]?.key ?? '';
    }
    return data.instruments;
  }

  async function loadChart(payload: ResearchChartPayload) {
    const { data } = await getResearchApi().post<ResearchChartResponse>(
      '/research/chart_candles',
      payload,
    );
    chartData.value = data;
    return data;
  }

  async function runBacktest(payload: ResearchBacktestPayload) {
    const { data } = await getResearchApi().post<ResearchBacktestResult>(
      '/research/backtest',
      payload,
    );
    backtestResult.value = data;
    return data;
  }

  return {
    bots,
    instruments,
    selectedBotId,
    selectedInstrument,
    chartData,
    backtestResult,
    loadBots,
    loadInstruments,
    loadChart,
    runBacktest,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useResearchStore, import.meta.hot));
}
