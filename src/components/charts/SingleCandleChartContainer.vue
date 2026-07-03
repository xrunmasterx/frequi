<script setup lang="ts">
import type {
  ChartSliderPosition,
  PairHistory,
  PairHistoryLocal,
  PlotConfig,
  Trade,
} from '@/types';
import { LoadingStatus } from '@/types';

const props = withDefaults(
  defineProps<{
    trades?: Trade[];
    availablePairs: string[];
    timeframe: string;
    historicView?: boolean;
    pair?: string;
    sliderPosition?: ChartSliderPosition;
    isSinglePairView?: boolean;
    chartDataSource?: PairHistoryLocal;
    chartDataStatus?: LoadingStatus;
    plotConfigOverride?: PlotConfig;
    chartWarningText?: string;
  }>(),
  {
    trades: () => [],
    historicView: false,
    pair: '',
    sliderPosition: undefined,
    isSinglePairView: true,
    chartDataSource: undefined,
    chartDataStatus: undefined,
    plotConfigOverride: undefined,
    chartWarningText: undefined,
  },
);

const emit = defineEmits<{
  refreshData: [pair: string, columns: string[]];
}>();

const settingsStore = useSettingsStore();
const colorStore = useColorStore();
const botStore = useBotStore();
const plotStore = usePlotConfigStore();
const { t } = useAppI18n();

const dataset = computed((): PairHistory | undefined => {
  if (props.chartDataSource) {
    return props.chartDataSource[`${props.pair}__${props.timeframe}`]?.data;
  }
  if (props.historicView) {
    return botStore.activeBot.history[`${props.pair}__${props.timeframe}`]?.data;
  }
  return botStore.activeBot.candleData[`${props.pair}__${props.timeframe}`]?.data;
});

const datasetColumns = computed(() =>
  dataset.value ? (dataset.value.all_columns ?? dataset.value.columns) : [],
);
const datasetLoadedColumns = computed(() =>
  dataset.value ? (dataset.value.columns ?? dataset.value.all_columns) : [],
);

const hasDataset = computed(() => dataset.value && dataset.value.data.length > 0);
const isLoadingDataset = computed((): boolean => {
  if (props.chartDataStatus !== undefined) {
    return props.chartDataStatus === LoadingStatus.loading;
  }

  if (props.historicView) {
    return botStore.activeBot.historyStatus === LoadingStatus.loading;
  }

  return botStore.activeBot.candleDataStatus === LoadingStatus.loading;
});
const noDatasetText = computed((): string => {
  const status =
    props.chartDataStatus ??
    (props.historicView ? botStore.activeBot.historyStatus : botStore.activeBot.candleDataStatus);

  switch (status) {
    case LoadingStatus.not_loaded:
      return t('chart.notLoadedYet');
    case LoadingStatus.loading:
      return t('common.loading');
    case LoadingStatus.success:
      return t('chart.noDataAvailable');
    case LoadingStatus.error:
      return t('chart.failedToLoadData');
    default:
      return t('common.unknown');
  }
});

function refresh() {
  if (props.chartDataSource) {
    return;
  }

  emit('refreshData', props.pair, plotStore.usedColumns);
}

function refreshIfNecessary() {
  if (props.chartDataSource) {
    return;
  }

  if (!hasDataset.value) {
    refresh();
  }
}

function assignFirstPair() {
  const [firstPair] = props.availablePairs;
  if (firstPair) {
    //props.pair = firstPair;
  }
}

watch(
  () => props.availablePairs,
  () => {
    if (!props.availablePairs.find((p) => p === props.pair)) {
      assignFirstPair();
      refresh();
    }
  },
);

watch(
  () => plotStore.plotConfig,
  () => {
    if (props.chartDataSource) {
      return;
    }

    // Trigger reload if the used columns are not loaded yet but would be available.
    const hasAllColumns = plotStore.usedColumns.some(
      (c) => datasetColumns.value.includes(c) && !datasetLoadedColumns.value.includes(c),
    );

    if (settingsStore.useReducedPairCalls && hasAllColumns) {
      refresh();
    }
  },
);

watch(
  () => props.timeframe,
  () => {
    refreshIfNecessary();
  },
);
</script>

<template>
  <div
    class="flex-fill w-full flex-col align-items-stretch flex"
    :class="{
      'h-full': isSinglePairView,
      'h-150 border border-r border-b border-neutral-300 dark:border-neutral-700':
        !isSinglePairView,
    }"
  >
    <div class="flex me-0 w-full items-center justify-between">
      <div class="ms-1 md:ms-2 flex flex-wrap md:flex-nowrap items-center gap-1">
        <div class="flex flex-col md:flex-row md:gap-2">
          <div class="flex flex-row flex-wrap gap-2">
            <small v-if="dataset" class="text-sm text-nowrap" :title="t('chart.longEntries')"
              >{{ t('chart.longEntries') }}:
              {{ dataset.enter_long_signals || dataset.buy_signals }}</small
            >
            <small v-if="dataset" class="text-sm text-nowrap" :title="t('chart.longExit')"
              >{{ t('chart.longExit') }}:
              {{ dataset.exit_long_signals || dataset.sell_signals }}</small
            >
          </div>
          <div class="flex flex-row flex-wrap gap-2">
            <small v-if="dataset && dataset.enter_short_signals" class="text-sm text-nowrap"
              >{{ t('chart.shortEntries') }}: {{ dataset.enter_short_signals }}</small
            >
            <small v-if="dataset && dataset.exit_short_signals" class="text-sm text-nowrap"
              >{{ t('chart.shortExits') }}: {{ dataset.exit_short_signals }}</small
            >
          </div>
        </div>
      </div>
      <div>
        {{ pair || t('chart.pairFallback') }}
      </div>
      <div class="w-4 h-4">
        <UProgress v-if="isLoadingDataset" stroke-width="4" small :label="t('common.loading')" />
      </div>
    </div>
    <small v-if="chartWarningText" class="mx-2 mt-1 text-sm text-amber-700 dark:text-amber-300">
      {{ chartWarningText }}
    </small>
    <div class="h-full flex">
      <div class="min-w-0 w-full flex-1">
        <CandleChart
          v-if="hasDataset && dataset"
          :dataset="dataset"
          :trades="trades"
          :plot-config="plotConfigOverride ?? plotStore.plotConfig"
          :heikin-ashi="settingsStore.useHeikinAshiCandles"
          :show-mark-area="settingsStore.showMarkArea"
          :use-u-t-c="settingsStore.timezone === 'UTC'"
          :theme="settingsStore.chartTheme"
          :slider-position="sliderPosition"
          :color-up="colorStore.colorUp"
          :color-down="colorStore.colorDown"
          :start-candle-count="settingsStore.chartDefaultCandleCount"
          :label-side="settingsStore.chartLabelSide"
        />
        <div v-else class="m-auto">
          <UProgress v-if="isLoadingDataset" class="m-5 w-5 h-5" :label="t('common.loading')" />
          <div v-else class="text-lg">
            {{ noDatasetText }}
          </div>
          <p v-if="botStore.activeBot.historyTakesLonger">
            {{ t('chart.historyTakesLonger') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
