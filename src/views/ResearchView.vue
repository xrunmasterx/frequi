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

const timeframeOptions = [
  { label: '1d', value: '1d' },
  { label: '1h', value: '1h' },
  { label: '30m', value: '30m' },
  { label: '15m', value: '15m' },
  { label: '5m', value: '5m' },
];

const adjustmentOptions = computed(() => [
  { label: t('research.adjustmentRaw'), value: 'raw' },
  { label: t('research.adjustmentQfq'), value: 'qfq' },
  { label: t('research.adjustmentHfq'), value: 'hfq' },
]);

const hasSelection = computed(
  () =>
    Boolean(researchStore.selectedBotId) &&
    researchStore.instruments.some(
      (instrument) => instrument.key === researchStore.selectedInstrument,
    ),
);

function clearResearchResults() {
  researchStore.chartData = null;
  researchStore.backtestResult = null;
}

function clearBacktestResult() {
  researchStore.backtestResult = null;
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

async function handleBotChange(nextBotId: string) {
  const botId = String(nextBotId);
  if (botId === researchStore.selectedBotId) {
    return;
  }

  researchStore.selectedBotId = botId;
  researchStore.selectedInstrument = '';
  clearResearchResults();

  await researchStore.loadInstruments();
  ensureSelectedInstrument();
  await refreshChart();
}

function handleInstrumentChange(nextInstrument: string) {
  const instrument = String(nextInstrument);
  if (instrument === researchStore.selectedInstrument) {
    return;
  }

  researchStore.selectedInstrument = instrument;
  clearResearchResults();
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

async function refreshChart() {
  if (!hasSelection.value) {
    return;
  }

  await researchStore.loadChart({
    bot_id: researchStore.selectedBotId,
    instrument: researchStore.selectedInstrument,
    timeframe: timeframe.value,
    limit: settingsStore.chartDataCandleCount,
    timerange: null,
    adjustment: adjustment.value,
    watch_indicators: { ma: [Number(smaFast.value), Number(smaSlow.value)] },
  });
}

async function runBacktest() {
  if (!hasSelection.value) {
    return;
  }

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
  await refreshChart();
});
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
        <div class="flex items-end">
          <UButton
            icon="i-mdi-refresh"
            :disabled="!hasSelection"
            class="w-full justify-center"
            data-test="refresh-chart"
            @click="refreshChart"
          >
            {{ t('research.refreshChart') }}
          </UButton>
        </div>
      </div>
    </section>

    <section class="min-h-0 flex-1 border-b border-neutral-300 pb-3 dark:border-neutral-700">
      <div class="mb-2 flex items-center justify-between gap-2">
        <span class="text-base font-semibold">{{ t('research.chart') }}</span>
        <span class="text-sm text-neutral-500">{{ researchStore.selectedInstrument }}</span>
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
            :disabled="!hasSelection"
            class="w-full justify-center"
            data-test="run-backtest"
            @click="runBacktest"
          >
            {{ t('research.runBacktest') }}
          </UButton>
        </div>
      </div>

      <div class="border border-neutral-300 p-3 dark:border-neutral-700">
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
