import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import CandleChartContainer from '@/components/charts/CandleChartContainer.vue';
import { useBotStore } from '@/stores/ftbotwrapper';

describe('CandleChartContainer historicView boundary', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('forwards the historicView prop to SingleCandleChartContainer', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const botStore = useBotStore();
    botStore.selectedBot = 'test-bot';
    botStore.botStores = {
      'test-bot': {
        isWebserverMode: true,
        selectedPair: 'BTC/USDT',
        plotMultiPairs: ['BTC/USDT'],
        history: {},
        candleData: {},
      },
    } as never;

    const wrapper = mount(CandleChartContainer, {
      props: {
        availablePairs: ['BTC/USDT'],
        timeframe: '1h',
        historicView: false,
      },
      global: {
        plugins: [pinia],
        stubs: {
          BaseStringMultiSelectMenu: true,
          USelectMenu: true,
          UButton: true,
          Button: true,
          UIcon: true,
          Icon: true,
          BaseCheckbox: true,
          PlotConfigSelect: true,
          DraggableModal: true,
          PlotConfigurator: true,
          SingleCandleChartContainer: {
            props: ['historicView'],
            template: '<div data-test="single">{{ String(historicView) }}</div>',
          },
        },
      },
    });

    expect(wrapper.find('[data-test="single"]').text()).toBe('false');
  });
});
