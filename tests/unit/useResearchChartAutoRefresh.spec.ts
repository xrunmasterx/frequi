import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { computed, defineComponent, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useResearchChartAutoRefresh } from '@/composables/useResearchChartAutoRefresh';

type VisibilityValue = DocumentVisibilityState;

function setDocumentVisibility(value: VisibilityValue) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => value,
  });
}

function dispatchVisibility(value: VisibilityValue) {
  setDocumentVisibility(value);
  document.dispatchEvent(new Event('visibilitychange'));
}

function mountAutoRefresh(options: {
  active?: ReturnType<typeof ref<boolean>>;
  timeframe?: ReturnType<typeof ref<string>>;
  canRefresh?: ReturnType<typeof ref<boolean>>;
  isLoading?: ReturnType<typeof ref<boolean>>;
  refreshKey?: ReturnType<typeof ref<string>>;
  refreshChart?: ReturnType<typeof vi.fn>;
} = {}) {
  const active = options.active ?? ref(true);
  const timeframe = options.timeframe ?? ref('1m');
  const canRefresh = options.canRefresh ?? ref(true);
  const isLoading = options.isLoading ?? ref(false);
  const refreshKey = options.refreshKey ?? ref('initial');
  const refreshChart = options.refreshChart ?? vi.fn(async () => undefined);
  let autoRefresh: ReturnType<typeof useResearchChartAutoRefresh> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        autoRefresh = useResearchChartAutoRefresh({
          active: computed(() => active.value),
          timeframe: computed(() => timeframe.value),
          canRefresh: computed(() => canRefresh.value),
          isLoading: computed(() => isLoading.value),
          refreshKey: computed(() => refreshKey.value),
          refreshChart,
        });
        return {};
      },
      template: '<div />',
    }),
  );

  if (!autoRefresh) {
    throw new Error('Research auto-refresh composable did not initialize');
  }

  return {
    active,
    timeframe,
    canRefresh,
    isLoading,
    refreshKey,
    refreshChart,
    autoRefresh,
    wrapper,
  };
}

describe('useResearchChartAutoRefresh', () => {
  const wrappers: VueWrapper[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    setDocumentVisibility('visible');
  });

  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) {
      wrapper.unmount();
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    setDocumentVisibility('visible');
  });

  function track(wrapper: VueWrapper) {
    wrappers.push(wrapper);
  }

  it('exposes active status and interval label from the selected timeframe', () => {
    const { autoRefresh, wrapper } = mountAutoRefresh({ timeframe: ref('1m') });
    track(wrapper);

    expect(autoRefresh.autoRefreshEnabled.value).toBe(true);
    expect(autoRefresh.refreshIntervalMs.value).toBe(10_000);
    expect(autoRefresh.refreshStatus.value).toBe('active');
    expect(autoRefresh.refreshLabel.value).toBe('Auto 10s');
  });

  it('uses the 1h cadence for research 60m timeframe', () => {
    const { autoRefresh, wrapper } = mountAutoRefresh({ timeframe: ref('60m') });
    track(wrapper);

    expect(autoRefresh.refreshIntervalMs.value).toBe(180_000);
    expect(autoRefresh.refreshLabel.value).toBe('Auto 180s');
  });

  it('calls refreshChart after the selected timeframe interval', async () => {
    const { refreshChart, wrapper } = mountAutoRefresh({ timeframe: ref('1m') });
    track(wrapper);
    await nextTick();

    vi.advanceTimersByTime(9_999);
    expect(refreshChart).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(refreshChart).toHaveBeenCalledTimes(1);
  });

  it('skips a scheduled tick while a chart request is loading', async () => {
    const isLoading = ref(true);
    const { refreshChart, autoRefresh, wrapper } = mountAutoRefresh({ isLoading });
    track(wrapper);
    await nextTick();

    expect(autoRefresh.refreshStatus.value).toBe('refreshing');

    vi.advanceTimersByTime(10_000);
    await Promise.resolve();

    expect(refreshChart).not.toHaveBeenCalled();
  });

  it('does not schedule while canRefresh is false', async () => {
    const canRefresh = ref(false);
    const { refreshChart, autoRefresh, wrapper } = mountAutoRefresh({ canRefresh });
    track(wrapper);
    await nextTick();

    expect(autoRefresh.autoRefreshEnabled.value).toBe(false);
    expect(autoRefresh.refreshStatus.value).toBe('paused');

    vi.advanceTimersByTime(10_000);

    expect(refreshChart).not.toHaveBeenCalled();
  });

  it('stops while hidden and refreshes immediately when visible again', async () => {
    const { refreshChart, autoRefresh, wrapper } = mountAutoRefresh();
    track(wrapper);
    await nextTick();

    dispatchVisibility('hidden');
    expect(autoRefresh.refreshStatus.value).toBe('paused');

    vi.advanceTimersByTime(10_000);
    expect(refreshChart).not.toHaveBeenCalled();

    dispatchVisibility('visible');
    await Promise.resolve();

    expect(refreshChart).toHaveBeenCalledTimes(1);
    expect(autoRefresh.refreshStatus.value).toBe('active');
  });

  it('resets the next scheduled tick when the refresh key changes', async () => {
    const refreshKey = ref('600519.SH|1m|raw|5|20');
    const { refreshChart, wrapper } = mountAutoRefresh({ refreshKey });
    track(wrapper);
    await nextTick();

    vi.advanceTimersByTime(9_000);
    refreshKey.value = '600519.SH|1m|qfq|5|20';
    await nextTick();
    vi.advanceTimersByTime(9_000);

    expect(refreshChart).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    await Promise.resolve();

    expect(refreshChart).toHaveBeenCalledTimes(1);
  });

  it('clears the scheduled timer on unmount', async () => {
    const { refreshChart, wrapper } = mountAutoRefresh();
    await nextTick();

    wrapper.unmount();
    vi.advanceTimersByTime(10_000);

    expect(refreshChart).not.toHaveBeenCalled();
  });
});
