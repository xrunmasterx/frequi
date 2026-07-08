<script setup lang="ts">
import type { PlotConfig, ResearchChartPayload } from '@/types';

const researchStore = useResearchStore();
const settingsStore = useSettingsStore();
const colorStore = useColorStore();
const { t } = useAppI18n();

const timeframe = ref('1d');
const adjustment = ref<NonNullable<ResearchChartPayload['adjustment']>>('raw');
const initialCash = ref(100000);
const smaFast = ref(5);
const smaSlow = ref(20);
const selectedFeatureDataset = ref('');
const selectedEventDataset = ref('');
const selectedDocumentDataset = ref('');

const plotConfig = computed<PlotConfig>(
  () => researchStore.chartData?.plot_config ?? { main_plot: {}, subplots: {} },
);

const botOptions = computed(() =>
  researchStore.bots.map((bot) => ({
    label: bot.label,
    value: bot.id,
  })),
);

const instrumentOptions = computed(() =>
  researchStore.instruments.map((instrument) => ({
    label: instrument.display_name
      ? `${instrument.display_name} (${instrument.symbol})`
      : instrument.symbol,
    value: instrument.key,
  })),
);

const selectedResearchInstrument = computed(() =>
  researchStore.instruments.find(
    (instrument) => instrument.key === researchStore.selectedInstrument,
  ),
);

const selectedAvailableTimeframes = computed(() => {
  const availableTimeframes = selectedResearchInstrument.value?.available_timeframes ?? [];
  return availableTimeframes.length > 0 ? availableTimeframes : ['1d'];
});

const timeframeOptions = computed(() =>
  selectedAvailableTimeframes.value.map((availableTimeframe) => ({
    label: availableTimeframe,
    value: availableTimeframe,
  })),
);

const adjustmentOptions = computed(() => [
  { label: t('research.adjustmentRaw'), value: 'raw' },
  { label: t('research.adjustmentQfq'), value: 'qfq' },
  { label: t('research.adjustmentHfq'), value: 'hfq' },
]);

function getDatasetOptions(kind: 'feature' | 'event' | 'document') {
  return [
    { label: 'None', value: '' },
    ...researchStore.datasets
      .filter((dataset) => dataset.kind === kind && dataset.available)
      .map((dataset) => ({
        label: dataset.dataset_id,
        value: dataset.dataset_id,
      })),
  ];
}

const featureDatasetOptions = computed(() => getDatasetOptions('feature'));
const eventDatasetOptions = computed(() => getDatasetOptions('event'));
const documentDatasetOptions = computed(() => getDatasetOptions('document'));

const hasSelection = computed(
  () =>
    Boolean(researchStore.selectedBotId) &&
    researchStore.instruments.some(
      (instrument) => instrument.key === researchStore.selectedInstrument,
    ),
);

const chartRefreshKey = computed(() =>
  [
    researchStore.selectedBotId,
    researchStore.selectedInstrument,
    timeframe.value,
    adjustment.value,
    selectedFeatureDataset.value,
    selectedEventDataset.value,
    selectedDocumentDataset.value,
    Number(smaFast.value),
    Number(smaSlow.value),
  ].join('|'),
);

const chartCredibilityText = computed(() => {
  const chartData = researchStore.chartData;
  if (!chartData) {
    return '';
  }

  const segments = [
    `${t('research.dataCoverage')}: ${chartData.data_start || '-'} -> ${
      chartData.data_stop || '-'
    }`,
    `${t('research.adjustment')}: ${adjustment.value}`,
  ];
  if (chartData.warnings.length > 0) {
    segments.push(`${t('research.warnings')}: ${chartData.warnings.join(' | ')}`);
  }

  return segments.join(' | ');
});

function clearResearchResults() {
  researchStore.chartData = null;
  researchStore.backtestResult = null;
}

function clearBacktestResult() {
  researchStore.backtestResult = null;
}

function clearSideLayerSelections() {
  selectedFeatureDataset.value = '';
  selectedEventDataset.value = '';
  selectedDocumentDataset.value = '';
}

function ensureSelectedInstrument() {
  if (
    researchStore.instruments.some(
      (instrument) => instrument.key === researchStore.selectedInstrument,
    )
  ) {
    return;
  }

  researchStore.selectedInstrument = researchStore.instruments[0]?.key ?? '';
}

function ensureValidTimeframe() {
  if (selectedAvailableTimeframes.value.includes(timeframe.value)) {
    return;
  }

  timeframe.value = selectedAvailableTimeframes.value[0] ?? '1d';
}

async function handleBotChange(nextBotId: string) {
  const botId = String(nextBotId);
  if (botId === researchStore.selectedBotId) {
    return;
  }

  researchStore.selectedBotId = botId;
  researchStore.selectedInstrument = '';
  clearSideLayerSelections();
  clearResearchResults();

  await researchStore.loadInstruments();
  ensureSelectedInstrument();
  ensureValidTimeframe();
  await researchStore.loadDatasets();
  await refreshChart();
}

async function handleInstrumentChange(nextInstrument: string) {
  const instrument = String(nextInstrument);
  if (instrument === researchStore.selectedInstrument) {
    return;
  }

  researchStore.selectedInstrument = instrument;
  clearSideLayerSelections();
  clearResearchResults();
  await researchStore.loadDatasets(instrument);
}

function handleTimeframeChange(nextTimeframe: string) {
  const nextValue = String(nextTimeframe);
  if (nextValue === timeframe.value) {
    return;
  }

  timeframe.value = nextValue;
  clearResearchResults();
}

function isAdjustment(value: string): value is NonNullable<ResearchChartPayload['adjustment']> {
  return value === 'raw' || value === 'qfq' || value === 'hfq';
}

function handleAdjustmentChange(nextAdjustment: string) {
  if (!isAdjustment(nextAdjustment)) {
    return;
  }

  const nextValue = nextAdjustment;
  if (nextValue === adjustment.value) {
    return;
  }

  adjustment.value = nextValue;
  clearResearchResults();
}

function handleSmaFastChange(nextFast: number | string) {
  smaFast.value = Number(nextFast);
  clearResearchResults();
}

function handleSmaSlowChange(nextSlow: number | string) {
  smaSlow.value = Number(nextSlow);
  clearResearchResults();
}

function handleInitialCashChange(nextInitialCash: number | string) {
  initialCash.value = Number(nextInitialCash);
  clearBacktestResult();
}

function selectedDatasetList(datasetId: string): string[] {
  return datasetId ? [datasetId] : [];
}

function buildSelectedSideLayers(): ResearchChartPayload['side_layers'] {
  const sideLayers = {
    features: selectedDatasetList(selectedFeatureDataset.value),
    events: selectedDatasetList(selectedEventDataset.value),
    documents: selectedDatasetList(selectedDocumentDataset.value),
  };

  return sideLayers.features.length > 0 ||
    sideLayers.events.length > 0 ||
    sideLayers.documents.length > 0
    ? sideLayers
    : null;
}

async function refreshChart() {
  if (!hasSelection.value) {
    return;
  }

  try {
    await researchStore.loadChart({
      bot_id: researchStore.selectedBotId,
      instrument: researchStore.selectedInstrument,
      timeframe: timeframe.value,
      limit: settingsStore.chartDataCandleCount,
      timerange: null,
      adjustment: adjustment.value,
      watch_indicators: { ma: [Number(smaFast.value), Number(smaSlow.value)] },
      side_layers: buildSelectedSideLayers(),
    });
  } catch {
    // Store request state owns user-visible research errors.
  }
}

const researchAutoRefresh = useResearchChartAutoRefresh({
  active: computed(() => true),
  timeframe,
  canRefresh: hasSelection,
  isLoading: computed(() => researchStore.chartRequestState.loading),
  refreshKey: chartRefreshKey,
  refreshChart,
});

async function runBacktest() {
  if (!hasSelection.value) {
    return;
  }

  try {
    await researchStore.runBacktest({
      bot_id: researchStore.selectedBotId,
      instrument: researchStore.selectedInstrument,
      timeframe: timeframe.value,
      initial_cash: Number(initialCash.value),
      strategy: {
        type: 'sma_cross',
        fast: Number(smaFast.value),
        slow: Number(smaSlow.value),
      },
    });
  } catch {
    // Store request state owns user-visible research errors.
  }
}

function formatNumber(value: unknown, digits = 2): string {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue.toFixed(digits) : '-';
}

const returnRatio = computed(() => {
  const value = Number(researchStore.backtestResult?.metrics.return_ratio);
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '-';
});

const finalEquity = computed(() =>
  formatNumber(researchStore.backtestResult?.metrics.final_equity),
);

const tradeCount = computed(() =>
  formatNumber(researchStore.backtestResult?.metrics.trade_count, 0),
);

onMounted(async () => {
  await researchStore.loadBots();
  await researchStore.loadInstruments();
  ensureSelectedInstrument();
  ensureValidTimeframe();
  await researchStore.loadDatasets();
  await refreshChart();
});

watch(selectedAvailableTimeframes, ensureValidTimeframe);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-2 md:p-3">
    <section class="border-b border-neutral-300 pb-3 dark:border-neutral-700">
      <div class="mb-2 flex items-center gap-2">
        <span class="text-lg font-semibold">{{ t('research.title') }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 md:grid-cols-6">
        <label class="flex flex-col gap-1 text-sm">
          <span>{{ t('research.bot') }}</span>
          <USelect
            :model-value="researchStore.selectedBotId"
            :items="botOptions"
            class="w-full"
            data-test="bot-select"
            @update:model-value="handleBotChange"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm md:col-span-2">
          <span>{{ t('research.instrument') }}</span>
          <USelect
            :model-value="researchStore.selectedInstrument"
            :items="instrumentOptions"
            class="w-full"
            data-test="instrument-select"
            @update:model-value="handleInstrumentChange"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>{{ t('research.timeframe') }}</span>
          <USelect
            :model-value="timeframe"
            :items="timeframeOptions"
            class="w-full"
            data-test="timeframe-select"
            @update:model-value="handleTimeframeChange"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>{{ t('research.adjustment') }}</span>
          <USelect
            :model-value="adjustment"
            :items="adjustmentOptions"
            class="w-full"
            data-test="adjustment-select"
            @update:model-value="handleAdjustmentChange"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>Feature data</span>
          <USelect
            v-model="selectedFeatureDataset"
            :items="featureDatasetOptions"
            class="w-full"
            data-test="feature-dataset-select"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>Event data</span>
          <USelect
            v-model="selectedEventDataset"
            :items="eventDatasetOptions"
            class="w-full"
            data-test="event-dataset-select"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>Document data</span>
          <USelect
            v-model="selectedDocumentDataset"
            :items="documentDatasetOptions"
            class="w-full"
            data-test="document-dataset-select"
          />
        </label>
        <div class="flex items-end">
          <span
            class="min-h-9 w-full content-center text-center text-xs text-neutral-500 dark:text-neutral-400"
            data-test="research-auto-refresh-status"
          >
            {{ researchAutoRefresh.refreshLabel }}
          </span>
        </div>
      </div>
    </section>

    <section class="min-h-0 flex-1 border-b border-neutral-300 pb-3 dark:border-neutral-700">
      <div class="mb-2 flex items-center justify-between gap-2">
        <span class="text-base font-semibold">{{ t('research.chart') }}</span>
        <span class="text-sm text-neutral-500">{{ researchStore.selectedInstrument }}</span>
      </div>
      <div
        v-if="researchStore.chartRequestState.error"
        class="mb-2 text-sm text-red-600 dark:text-red-400"
        data-test="research-chart-error"
      >
        {{ researchStore.chartRequestState.error }}
      </div>
      <div
        v-if="researchStore.chartData"
        class="mb-2 text-xs text-neutral-500"
        data-test="research-chart-credibility"
      >
        {{ chartCredibilityText }}
      </div>
      <div class="h-[48vh] min-h-80">
        <CandleChart
          v-if="researchStore.chartData"
          :dataset="researchStore.chartData"
          :trades="[]"
          :plot-config="plotConfig"
          :heikin-ashi="settingsStore.useHeikinAshiCandles"
          :show-mark-area="settingsStore.showMarkArea"
          :use-u-t-c="settingsStore.timezone === 'UTC'"
          :theme="settingsStore.chartTheme"
          :color-up="colorStore.colorUp"
          :color-down="colorStore.colorDown"
          :label-side="settingsStore.chartLabelSide"
          :start-candle-count="settingsStore.chartDefaultCandleCount"
        />
        <div v-else class="flex h-full items-center justify-center text-neutral-500">
          {{ t('research.noChartData') }}
        </div>
      </div>
    </section>

    <section class="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
        <label class="flex flex-col gap-1 text-sm">
          <span>{{ t('research.smaFast') }}</span>
          <UInput
            :model-value="smaFast"
            type="number"
            min="1"
            data-test="sma-fast"
            @update:model-value="handleSmaFastChange"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>{{ t('research.smaSlow') }}</span>
          <UInput
            :model-value="smaSlow"
            type="number"
            min="1"
            data-test="sma-slow"
            @update:model-value="handleSmaSlowChange"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>{{ t('research.initialCash') }}</span>
          <UInput
            :model-value="initialCash"
            type="number"
            min="0"
            data-test="initial-cash"
            @update:model-value="handleInitialCashChange"
          />
        </label>
        <div class="flex items-end">
          <UButton
            icon="i-mdi-chart-timeline-variant"
            :disabled="!hasSelection || researchStore.backtestRequestState.loading"
            :loading="researchStore.backtestRequestState.loading"
            class="w-full justify-center"
            data-test="run-backtest"
            @click="runBacktest"
          >
            {{ t('research.runBacktest') }}
          </UButton>
        </div>
      </div>

      <div class="border border-neutral-300 p-3 dark:border-neutral-700">
        <div
          v-if="researchStore.backtestRequestState.error"
          class="mb-2 text-sm text-red-600 dark:text-red-400"
          data-test="research-backtest-error"
        >
          {{ researchStore.backtestRequestState.error }}
        </div>
        <div class="mb-2 text-sm font-semibold">{{ t('research.backtestSummary') }}</div>
        <div class="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div class="text-neutral-500">{{ t('research.returnRatio') }}</div>
            <div class="font-mono">{{ returnRatio }}</div>
          </div>
          <div>
            <div class="text-neutral-500">{{ t('research.finalEquity') }}</div>
            <div class="font-mono">{{ finalEquity }}</div>
          </div>
          <div>
            <div class="text-neutral-500">{{ t('research.tradeCount') }}</div>
            <div class="font-mono">{{ tradeCount }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
