import type {
  ResearchBacktestPayload,
  ResearchBacktestResult,
  ResearchBotsResponse,
  ResearchChartPayload,
  ResearchChartResponse,
  ResearchDatasetDescriptor,
  ResearchDatasetsResponse,
  ResearchInstrumentsResponse,
  ResearchBotProfile,
  ResearchInstrument,
  ResearchRequestState,
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

function createRequestState(): ResearchRequestState {
  return reactive({
    loading: false,
    error: null,
  });
}

function extractResearchErrorMessage(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }

  if (
    detail &&
    typeof detail === 'object' &&
    typeof (detail as { message?: unknown }).message === 'string'
  ) {
    return (detail as { message: string }).message;
  }

  return 'Research request failed.';
}

function serializeResearchPayload(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(serializeResearchPayload).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${serializeResearchPayload(record[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function startResearchRequest<T>(
  requestState: ResearchRequestState,
  setActiveRequest: (request: Promise<T> | null) => void,
  requestFactory: () => Promise<T>,
): Promise<T> {
  requestState.loading = true;
  requestState.error = null;

  const request = Promise.resolve()
    .then(requestFactory)
    .catch((error: unknown) => {
      requestState.error = extractResearchErrorMessage(error);
      throw error;
    })
    .finally(() => {
      requestState.loading = false;
      setActiveRequest(null);
    });
  setActiveRequest(request);
  return request;
}

interface KeyedRequestTracker<T> {
  requests: Map<string, Promise<T>>;
  latestKey: string | null;
}

function startKeyedResearchRequest<T>(
  requestState: ResearchRequestState,
  tracker: KeyedRequestTracker<T>,
  key: string,
  requestFactory: () => Promise<T>,
  commitResult: (result: T) => void,
): Promise<T> {
  const existingRequest = tracker.requests.get(key);
  if (existingRequest) {
    tracker.latestKey = key;
    requestState.loading = true;
    requestState.error = null;
    return existingRequest;
  }

  tracker.latestKey = key;
  requestState.loading = true;
  requestState.error = null;

  const request = Promise.resolve()
    .then(requestFactory)
    .then((result) => {
      if (tracker.latestKey === key && tracker.requests.get(key) === request) {
        commitResult(result);
      }
      return result;
    })
    .catch((error: unknown) => {
      if (tracker.latestKey === key && tracker.requests.get(key) === request) {
        requestState.error = extractResearchErrorMessage(error);
      }
      throw error;
    })
    .finally(() => {
      if (tracker.requests.get(key) === request) {
        tracker.requests.delete(key);
      }
      if (tracker.latestKey === key) {
        tracker.latestKey = null;
        requestState.loading = false;
      }
    });
  tracker.requests.set(key, request);
  return request;
}

export const useResearchStore = defineStore('research', () => {
  const bots = shallowRef<ResearchBotProfile[]>([]);
  const instruments = shallowRef<ResearchInstrument[]>([]);
  const selectedBotId = ref('');
  const selectedInstrument = ref('');
  const datasets = shallowRef<ResearchDatasetDescriptor[]>([]);
  const chartData = shallowRef<ResearchChartResponse | null>(null);
  const backtestResult = shallowRef<ResearchBacktestResult | null>(null);
  const botsRequestState = createRequestState();
  const instrumentsRequestState = createRequestState();
  const datasetsRequestState = createRequestState();
  const chartRequestState = createRequestState();
  const backtestRequestState = createRequestState();

  let botsRequest: Promise<ResearchBotProfile[]> | null = null;
  const instrumentsRequestTracker: KeyedRequestTracker<ResearchInstrument[]> = {
    requests: new Map(),
    latestKey: null,
  };
  const datasetsRequestTracker: KeyedRequestTracker<ResearchDatasetDescriptor[]> = {
    requests: new Map(),
    latestKey: null,
  };
  const chartRequestTracker: KeyedRequestTracker<ResearchChartResponse> = {
    requests: new Map(),
    latestKey: null,
  };
  const backtestRequestTracker: KeyedRequestTracker<ResearchBacktestResult> = {
    requests: new Map(),
    latestKey: null,
  };

  async function loadBots() {
    if (botsRequestState.loading && botsRequest) {
      return botsRequest;
    }

    return startResearchRequest(
      botsRequestState,
      (request) => {
        botsRequest = request;
      },
      async () => {
        const { data } = await getResearchApi().get<ResearchBotsResponse>('/research/bots');
        bots.value = data.bots;
        if (!selectedBotId.value) {
          selectedBotId.value = data.bots[0]?.id ?? '';
        }
        return data.bots;
      },
    );
  }

  async function loadInstruments() {
    const requestBotId = selectedBotId.value;

    return startKeyedResearchRequest(
      instrumentsRequestState,
      instrumentsRequestTracker,
      requestBotId,
      async () => {
        const { data } = await getResearchApi().get<ResearchInstrumentsResponse>(
          '/research/instruments',
          {
            params: { bot_id: requestBotId },
          },
        );
        return data.instruments;
      },
      (data) => {
        if (selectedBotId.value !== requestBotId) {
          return;
        }
        instruments.value = data;
        if (!selectedInstrument.value) {
          selectedInstrument.value = data[0]?.key ?? '';
        }
      },
    );
  }

  async function loadDatasets(instrument?: string) {
    const requestBotId = selectedBotId.value;
    const requestInstrument = instrument ?? selectedInstrument.value;
    const requestKey = serializeResearchPayload({
      bot_id: requestBotId,
      instrument: requestInstrument || null,
    });

    return startKeyedResearchRequest(
      datasetsRequestState,
      datasetsRequestTracker,
      requestKey,
      async () => {
        const { data } = await getResearchApi().get<ResearchDatasetsResponse>(
          '/research/datasets',
          {
            params: {
              bot_id: requestBotId,
              instrument: requestInstrument || undefined,
            },
          },
        );
        return data.datasets;
      },
      (data) => {
        if (
          selectedBotId.value !== requestBotId ||
          (requestInstrument && selectedInstrument.value !== requestInstrument)
        ) {
          return;
        }
        datasets.value = data;
      },
    );
  }

  async function loadChart(payload: ResearchChartPayload) {
    const requestKey = serializeResearchPayload(payload);

    return startKeyedResearchRequest(
      chartRequestState,
      chartRequestTracker,
      requestKey,
      async () => {
        const { data } = await getResearchApi().post<ResearchChartResponse>(
          '/research/chart_candles',
          payload,
        );
        return data;
      },
      (data) => {
        chartData.value = data;
      },
    );
  }

  async function runBacktest(payload: ResearchBacktestPayload) {
    const requestKey = serializeResearchPayload(payload);

    return startKeyedResearchRequest(
      backtestRequestState,
      backtestRequestTracker,
      requestKey,
      async () => {
        const { data } = await getResearchApi().post<ResearchBacktestResult>(
          '/research/backtest',
          payload,
        );
        return data;
      },
      (data) => {
        backtestResult.value = data;
      },
    );
  }

  return {
    bots,
    instruments,
    datasets,
    selectedBotId,
    selectedInstrument,
    chartData,
    backtestResult,
    botsRequestState,
    instrumentsRequestState,
    datasetsRequestState,
    chartRequestState,
    backtestRequestState,
    loadBots,
    loadInstruments,
    loadDatasets,
    loadChart,
    runBacktest,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useResearchStore, import.meta.hot));
}
