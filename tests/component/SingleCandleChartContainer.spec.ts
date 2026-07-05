import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import SingleCandleChartContainer from '@/components/charts/SingleCandleChartContainer.vue';
import { useBotStore } from '@/stores/ftbotwrapper';
import { LoadingStatus } from '@/types';

describe('SingleCandleChartContainer.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows zero-valued short exit signal counts', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const botStore = useBotStore();
    botStore.selectedBot = 'test-bot';
    botStore.botStores = {
      'test-bot': {
        historyTakesLonger: false,
      },
    } as never;

    const wrapper = mount(SingleCandleChartContainer, {
      props: {
        availablePairs: ['BTC/USDT:USDT'],
        timeframe: '1h',
        pair: 'BTC/USDT:USDT',
        chartDataStatus: LoadingStatus.success,
        chartDataSource: {
          'BTC/USDT:USDT__1h': {
            data: {
              strategy: 'VolatilitySystem',
              pair: 'BTC/USDT:USDT',
              timeframe: '1h',
              timeframe_ms: 3600000,
              columns: [],
              all_columns: [],
              data: [],
              length: 0,
              buy_signals: 0,
              sell_signals: 7,
              enter_long_signals: 0,
              exit_long_signals: 7,
              enter_short_signals: 7,
              exit_short_signals: 0,
            },
          },
        },
      },
      global: {
        plugins: [pinia],
        stubs: {
          CandleChart: true,
          UProgress: true,
        },
      },
    });

    expect(wrapper.text()).toContain('Short exits');
    expect(wrapper.text()).toContain('0');
  });
});
