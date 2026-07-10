import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, markRaw } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TradeList from '@/components/ftbot/TradeList.vue';
import { useBotStore, type BotSubStore } from '@/stores/ftbotwrapper';
import type { Trade } from '@/types';

const forceEntryDialog = vi.fn();
const forceExitDialog = vi.fn();

vi.mock('@/composables/useForceTrade', () => ({
  useForceTrade: () => ({ forceEntryDialog, forceExitDialog }),
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const TradeActionsPopoverStub = defineComponent({
  name: 'TradeActionsPopoverStub',
  props: ['trade', 'enableForceEntry', 'botFeatures'],
  emits: ['force-exit-partial', 'force-entry'],
  template: `
    <div>
      <button data-test="partial-exit" @click="$emit('force-exit-partial', trade)" />
      <button data-test="increase-position" @click="$emit('force-entry', trade)" />
    </div>
  `,
});

const UTableStub = defineComponent({
  props: ['data'],
  template: '<div><slot name="actions-cell" :row="{ original: data[0], index: 0 }" /></div>',
});

const trade = {
  botId: 'bot-b',
  botName: 'B',
  trade_id: 42,
  pair: 'ETH/USDT',
} as Trade;

describe('TradeList row force actions', () => {
  const botAFeatures = markRaw({ forceEnterShort: false });
  const botBFeatures = markRaw({ forceEnterShort: true });

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    const botStore = useBotStore();
    botStore.selectedBot = 'bot-a';
    botStore.botStores = {
      'bot-a': {
        botState: { force_entry_enable: false },
        botFeatures: botAFeatures,
        stakeCurrencyDecimals: 2,
      } as unknown as BotSubStore,
      'bot-b': {
        botState: { force_entry_enable: true },
        botFeatures: botBFeatures,
        stakeCurrencyDecimals: 6,
      } as unknown as BotSubStore,
    };
  });

  function mountTradeList() {
    return mount(TradeList, {
      props: { trades: [trade], activeTrades: true, multiBotView: true },
      global: {
        stubs: {
          UTable: UTableStub,
          Table: UTableStub,
          TradeActionsPopover: TradeActionsPopoverStub,
          TradeProfit: true,
          DateTimeTZ: true,
        },
        mocks: {
          $router: { push: vi.fn() },
        },
      },
    });
  }

  it('passes the row bot to partial exit and position increase dialogs', async () => {
    const wrapper = mountTradeList();

    await wrapper.get('[data-test="partial-exit"]').trigger('click');
    expect(forceExitDialog).toHaveBeenCalledWith({
      botId: 'bot-b',
      trade,
      stakeCurrencyDecimals: 6,
    });

    await wrapper.get('[data-test="increase-position"]').trigger('click');
    expect(forceEntryDialog).toHaveBeenCalledWith({
      botId: 'bot-b',
      pair: trade.pair,
      positionIncrease: true,
    });
  });

  it('uses row-bot capabilities for the row action menu', () => {
    const wrapper = mountTradeList();

    const actions = wrapper.getComponent(TradeActionsPopoverStub);
    expect(actions.props('enableForceEntry')).toBe(true);
    expect(actions.props('botFeatures')).toBe(botBFeatures);
  });
});
