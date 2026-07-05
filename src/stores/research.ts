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
import axios from 'axios';

type ResearchApi = Pick<AxiosInstance, 'get' | 'post'>;

export const useResearchStore = defineStore('research', () => {
  const api = shallowRef<ResearchApi>(axios.create({ baseURL: '/api/v1' }));
  const bots = shallowRef<ResearchBotProfile[]>([]);
  const instruments = shallowRef<ResearchInstrument[]>([]);
  const selectedBotId = ref('');
  const selectedInstrument = ref('');
  const chartData = shallowRef<ResearchChartResponse | null>(null);
  const backtestResult = shallowRef<ResearchBacktestResult | null>(null);

  async function loadBots() {
    const { data } = await api.value.get<ResearchBotsResponse>('/research/bots');
    bots.value = data.bots;
    if (!selectedBotId.value) {
      selectedBotId.value = data.bots[0]?.id ?? '';
    }
    return data.bots;
  }

  async function loadInstruments() {
    const { data } = await api.value.get<ResearchInstrumentsResponse>('/research/instruments', {
      params: { bot_id: selectedBotId.value },
    });
    instruments.value = data.instruments;
    if (!selectedInstrument.value) {
      selectedInstrument.value = data.instruments[0]?.key ?? '';
    }
    return data.instruments;
  }

  async function loadChart(payload: ResearchChartPayload) {
    const { data } = await api.value.post<ResearchChartResponse>(
      '/research/chart_candles',
      payload,
    );
    chartData.value = data;
    return data;
  }

  async function runBacktest(payload: ResearchBacktestPayload) {
    const { data } = await api.value.post<ResearchBacktestResult>('/research/backtest', payload);
    backtestResult.value = data;
    return data;
  }

  return {
    api,
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
