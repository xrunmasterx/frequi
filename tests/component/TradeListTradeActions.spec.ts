import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, markRaw } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TradeList from '@/components/ftbot/TradeList.vue';
import { useBotStore, type BotSubStore } from '@/stores/ftbotwrapper';
import type { Trade } from '@/types';

const forceEntryDialog = vi.fn();
const forceExitDialog = vi.fn();
const confirm = vi.fn();

vi.mock('@/composables/useForceTrade', () => ({
  useForceTrade: () => ({ forceEntryDialog, forceExitDialog }),
}));
vi.mock('@/composables/useConfirmBox', () => ({
  useConfirmBox: () => ({ confirm }),
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const TradeActionsPopoverStub = defineComponent({
  name: 'TradeActionsPopoverStub',
  props: ['trade', 'enableForceEntry', 'botFeatures'],
  emits: ['force-exit', 'force-exit-partial', 'force-entry', 'delete-trade', 'cancel-open-order'],
  template: `
    <div>
      <button data-test="full-exit" @click="$emit('force-exit', trade)" />
      <button data-test="partial-exit" @click="$emit('force-exit-partial', trade)" />
      <button data-test="increase-position" @click="$emit('force-entry', trade)" />
      <button data-test="delete-trade" @click="$emit('delete-trade', trade)" />
      <button data-test="cancel-open-order" @click="$emit('cancel-open-order', trade)" />
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
        botId: 'bot-a',
        uiBotName: 'Alpha',
        botState: {
          force_entry_enable: false,
          dry_run: true,
          exchange: 'binance',
          trading_mode: 'spot',
        },
        botFeatures: botAFeatures,
        stakeCurrencyDecimals: 2,
      } as unknown as BotSubStore,
      'bot-b': {
        botId: 'bot-b',
        uiBotName: 'Beta',
        botState: {
          force_entry_enable: true,
          dry_run: false,
          exchange: 'okx',
          trading_mode: 'futures',
        },
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

  it.each(['full-exit', 'delete-trade', 'cancel-open-order'])(
    'shows the row bot target when confirming %s',
    async (hook) => {
      confirm.mockResolvedValue(false);
      const wrapper = mountTradeList();

      await wrapper.get(`[data-test="${hook}"]`).trigger('click');

      const targetContext = confirm.mock.calls.at(-1)?.[0].targetContext;
      expect(targetContext).toContain('Beta (bot-b)');
      expect(targetContext).toContain('okx');
      expect(targetContext).toContain('futures');
      expect(targetContext).toContain('LIVE');
      expect(targetContext).not.toContain('Alpha');
    },
  );
});
