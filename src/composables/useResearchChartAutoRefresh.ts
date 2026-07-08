import type { ComputedRef, Ref } from 'vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { getTradeChartRefreshIntervalMs } from '@/utils/tradeChartRefresh';

export type ResearchChartAutoRefreshStatus = 'active' | 'paused' | 'refreshing';

export interface UseResearchChartAutoRefreshOptions {
  active: Ref<boolean> | ComputedRef<boolean>;
  timeframe: Ref<string> | ComputedRef<string>;
  canRefresh: Ref<boolean> | ComputedRef<boolean>;
  isLoading: Ref<boolean> | ComputedRef<boolean>;
  refreshChart: () => Promise<void> | void;
  refreshKey?: Ref<string> | ComputedRef<string>;
}

export interface UseResearchChartAutoRefreshResult {
  autoRefreshEnabled: ComputedRef<boolean>;
  refreshIntervalMs: ComputedRef<number>;
  refreshStatus: ComputedRef<ResearchChartAutoRefreshStatus>;
  refreshLabel: ComputedRef<string>;
}

function formatRefreshIntervalMs(intervalMs: number): string {
  return `${Math.round(intervalMs / 1000)}s`;
}

export function useResearchChartAutoRefresh(
  options: UseResearchChartAutoRefreshOptions,
): UseResearchChartAutoRefreshResult {
  const isVisible = ref(document.visibilityState !== 'hidden');
  const refreshKey = computed(() => options.refreshKey?.value ?? '');
  const autoRefreshEnabled = computed(() => options.active.value && options.canRefresh.value);
  const refreshIntervalMs = computed(() => getTradeChartRefreshIntervalMs(options.timeframe.value));
  const refreshStatus = computed<ResearchChartAutoRefreshStatus>(() => {
    if (!autoRefreshEnabled.value || !isVisible.value) {
      return 'paused';
    }

    if (options.isLoading.value) {
      return 'refreshing';
    }

    return 'active';
  });
  const refreshLabel = computed(() => {
    if (refreshStatus.value === 'paused') {
      return 'Paused';
    }

    if (refreshStatus.value === 'refreshing') {
      return 'Refreshing';
    }

    return `Auto ${formatRefreshIntervalMs(refreshIntervalMs.value)}`;
  });

  let refreshTimer: number | undefined;
  let isDisposed = false;
  let hasPendingRefresh = false;

  function clearRefreshTimer() {
    if (refreshTimer === undefined) {
      return;
    }

    window.clearTimeout(refreshTimer);
    refreshTimer = undefined;
  }

  async function runRefreshNow() {
    if (!autoRefreshEnabled.value || !isVisible.value) {
      hasPendingRefresh = false;
      return;
    }

    if (options.isLoading.value) {
      hasPendingRefresh = true;
      return;
    }

    hasPendingRefresh = false;
    try {
      await options.refreshChart();
    } catch {
      // Chart request failures are surfaced by the research store.
    }
  }

  function scheduleRefresh() {
    clearRefreshTimer();

    if (isDisposed || !autoRefreshEnabled.value || !isVisible.value) {
      return;
    }

    refreshTimer = window.setTimeout(() => {
      void runRefreshNow().finally(() => {
        scheduleRefresh();
      });
    }, refreshIntervalMs.value);
  }

  function handleVisibilityChange() {
    isVisible.value = document.visibilityState !== 'hidden';

    if (!isVisible.value) {
      clearRefreshTimer();
      return;
    }

    void runRefreshNow().finally(() => {
      scheduleRefresh();
    });
  }

  watch(
    () => [options.active.value, options.canRefresh.value, options.timeframe.value, refreshKey.value],
    () => {
      void runRefreshNow().finally(() => {
        scheduleRefresh();
      });
    },
  );

  watch(
    () => options.isLoading.value,
    (isLoading) => {
      if (isLoading || !hasPendingRefresh) {
        return;
      }

      void runRefreshNow().finally(() => {
        scheduleRefresh();
      });
    },
  );

  onMounted(() => {
    isDisposed = false;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    scheduleRefresh();
  });

  onUnmounted(() => {
    isDisposed = true;
    clearRefreshTimer();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return {
    autoRefreshEnabled,
    refreshIntervalMs,
    refreshStatus,
    refreshLabel,
  };
}
