import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTradeChartStore } from '@/stores/tradeChart';

describe('useTradeChartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('uses default trade chart state', () => {
    const store = useTradeChartStore();

    expect(store.selectedTimeframe).toBe('');
    expect(store.useStrategyOverlay).toBe(true);
  });

  it("resets the selected timeframe to the bot's timeframe", () => {
    const store = useTradeChartStore();

    store.resetForBot('1h');

    expect(store.selectedTimeframe).toBe('1h');
  });

  it('resets the selected timeframe to empty when the bot timeframe is empty', () => {
    const store = useTradeChartStore();

    store.resetForBot('');

    expect(store.selectedTimeframe).toBe('');
  });

  it('resets strategy overlay visibility when resetting for a bot', () => {
    const store = useTradeChartStore();
    store.useStrategyOverlay = false;

    store.resetForBot('1h');

    expect(store.useStrategyOverlay).toBe(true);
  });
});
