import type { ComputedRef, Ref } from 'vue';
import { computed, onMounted, onUnmounted, watch } from 'vue';
import type { PlotConfig } from '@/types';
import { formatLocaleText, useAppI18n } from '@/composables/useAppI18n';
import { useBotStore } from '@/stores/ftbotwrapper';
import { useTradeChartStore } from '@/stores/tradeChart';
import { getTradeChartRefreshIntervalMs } from '@/utils/tradeChartRefresh';

const LIVE_CHART_TIMEFRAME_BASE_OPTIONS = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '2w',
  '1M',
  '1y',
];

interface UseLiveChartDatasetOptions {
  active: Ref<boolean> | ComputedRef<boolean>;
  defaultTimeframe: Ref<string> | ComputedRef<string>;
}

export function useLiveChartDataset(options: UseLiveChartDatasetOptions) {
  const botStore = useBotStore();
  const tradeChartStore = useTradeChartStore();
  const settingsStore = useSettingsStore();
  const { t } = useAppI18n();
  let refreshTimer: number | undefined;

  const useChartCandles = computed(() => !!botStore.activeBot?.botFeatures?.chartCandles);

  const timeframe = computed({
    get() {
      return tradeChartStore.selectedTimeframe || options.defaultTimeframe.value;
    },
    set(value: string) {
      tradeChartStore.selectedTimeframe = value;
    },
  });

  const timeframeOptions = computed(() => {
    const nonCanonicalTimeframes = [timeframe.value, options.defaultTimeframe.value].filter(
      (tf): tf is string => !!tf && !LIVE_CHART_TIMEFRAME_BASE_OPTIONS.includes(tf),
    );

    return [...new Set([...nonCanonicalTimeframes, ...LIVE_CHART_TIMEFRAME_BASE_OPTIONS])];
  });

  const dataset = computed(() => {
    const [pair] = botStore.activeBot?.plotMultiPairs ?? [];
    if (!pair || !timeframe.value) {
      return undefined;
    }

    return botStore.activeBot?.chartCandleData[`${pair}__${timeframe.value}`]?.data;
  });

  const chartDataSource = computed(() => botStore.activeBot?.chartCandleData ?? {});
  const chartDataStatus = computed(() => botStore.activeBot?.chartCandleDataStatus);
  const plotConfig = computed<PlotConfig | undefined>(() => dataset.value?.plot_config);
  const warningText = computed(() => dataset.value?.warnings?.join(' ') ?? '');

  const statusText = computed(() => {
    const currentDataset = dataset.value;
    const chartTimeframe = currentDataset?.chart_timeframe || timeframe.value;
    const strategyName = currentDataset?.strategy || botStore.activeBot?.botState?.strategy || '';
    const strategyTimeframe =
      currentDataset?.strategy_timeframe || currentDataset?.overlay?.strategy_timeframe || '';
    const strategyOverlay = [strategyName, strategyTimeframe].filter(Boolean).join(' ');

    if (!strategyOverlay) {
      return chartTimeframe;
    }

    return formatLocaleText(t('trade.chartStatus'), {
      chartTimeframe,
      strategy: strategyOverlay,
      strategyTimeframe: '',
    }).trim();
  });

  function refresh(pair: string) {
    const activeBot = botStore.activeBot;
    if (!useChartCandles.value || !activeBot || !pair || !timeframe.value) {
      return;
    }

    activeBot.getChartCandles({
      pair,
      timeframe: timeframe.value,
      limit: settingsStore.chartDataCandleCount,
      display_count: settingsStore.chartDefaultCandleCount,
      include_strategy_overlay: tradeChartStore.useStrategyOverlay,
      candle_mode: 'live',
    });
  }

  function refreshAll() {
    const activeBot = botStore.activeBot;
    if (!useChartCandles.value || !activeBot) {
      return;
    }

    for (const pair of activeBot.plotMultiPairs) {
      refresh(pair);
    }
  }

  function clearRefreshTimer() {
    if (refreshTimer !== undefined) {
      window.clearTimeout(refreshTimer);
      refreshTimer = undefined;
    }
  }

  function scheduleRefresh() {
    clearRefreshTimer();

    const activeBot = botStore.activeBot;
    if (
      !options.active.value ||
      !useChartCandles.value ||
      !timeframe.value ||
      !activeBot ||
      activeBot.plotMultiPairs.length === 0
    ) {
      return;
    }

    refreshTimer = window.setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
        refreshAll();
      }
      scheduleRefresh();
    }, getTradeChartRefreshIntervalMs(timeframe.value));
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      clearRefreshTimer();
      return;
    }

    if (options.active.value) {
      refreshAll();
      scheduleRefresh();
    }
  }

  watch(
    () => botStore.selectedBot,
    () => {
      tradeChartStore.resetForBot(options.defaultTimeframe.value);
      tradeChartStore.activeBotId = botStore.selectedBot;
      tradeChartStore.isTradeChartActive = options.active.value;
    },
    { immediate: true },
  );

  watch(
    () => timeframe.value,
    () => {
      if (options.active.value) {
        refreshAll();
      }
    },
  );

  watch(
    () => [
      options.active.value,
      botStore.selectedBot,
      timeframe.value,
      botStore.activeBot?.plotMultiPairs?.join('|') ?? '',
      useChartCandles.value,
      tradeChartStore.useStrategyOverlay,
    ],
    () => {
      tradeChartStore.isTradeChartActive = options.active.value;
      scheduleRefresh();
    },
  );

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    scheduleRefresh();
  });

  onUnmounted(() => {
    clearRefreshTimer();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (tradeChartStore.activeBotId === botStore.selectedBot) {
      tradeChartStore.activeBotId = '';
      tradeChartStore.isTradeChartActive = false;
    }
  });

  return {
    timeframe,
    timeframeOptions,
    chartDataSource,
    chartDataStatus,
    plotConfig,
    warningText,
    statusText,
    refresh,
    refreshAll,
  };
}
