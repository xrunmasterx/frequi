import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, markRaw, nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TradeList from '@/components/ftbot/TradeList.vue';
import { useBotStore, type BotSubStore } from '@/stores/ftbotwrapper';
import type { Trade } from '@/types';

const forceEntryDialog = vi.fn();
const forceExitDialog = vi.fn();
const confirm = vi.fn();
const forceSellMulti = vi.fn();
const deleteTradeMulti = vi.fn();
const cancelOpenOrderMulti = vi.fn();
const reloadTradeMulti = vi.fn();
const { showAlert } = vi.hoisted(() => ({ showAlert: vi.fn() }));
const deleteTradeA = vi.fn();
const deleteTradeB = vi.fn();
const cancelOpenOrderA = vi.fn();
const cancelOpenOrderB = vi.fn();
const reloadTradeA = vi.fn();
const reloadTradeB = vi.fn();

vi.mock('@/composables/useForceTrade', () => ({
  useForceTrade: () => ({ forceEntryDialog, forceExitDialog }),
}));
vi.mock('@/composables/useConfirmBox', () => ({
  useConfirmBox: () => ({ confirm }),
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/utils/alerts', () => ({ showAlert }));

const TradeActionsPopoverStub = defineComponent({
  name: 'TradeActionsPopoverStub',
  props: ['trade', 'enableForceEntry', 'botFeatures'],
  emits: [
    'force-exit',
    'force-exit-partial',
    'force-entry',
    'delete-trade',
    'cancel-open-order',
    'reload-trade',
  ],
  template: `
    <div>
      <button data-test="full-exit" @click="$emit('force-exit', trade)" />
      <button data-test="partial-exit" @click="$emit('force-exit-partial', trade)" />
      <button data-test="increase-position" @click="$emit('force-entry', trade)" />
      <button data-test="delete-trade" @click="$emit('delete-trade', trade)" />
      <button data-test="cancel-open-order" @click="$emit('cancel-open-order', trade)" />
      <button data-test="reload-trade" @click="$emit('reload-trade', trade)" />
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
  const logoutA = vi.fn();
  const logoutB = vi.fn();
  const disposeA = vi.fn();
  const disposeB = vi.fn();
  let botStore: ReturnType<typeof useBotStore>;
  let deleteTradeDispatch: ReturnType<typeof useBotStore>['deleteTradeMulti'];
  let cancelOpenOrderDispatch: ReturnType<typeof useBotStore>['cancelOpenOrderMulti'];
  let reloadTradeDispatch: ReturnType<typeof useBotStore>['reloadTradeMulti'];

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    botStore = useBotStore();
    botStore.selectedBot = 'bot-a';
    botStore.availableBots = {
      'bot-a': { botId: 'bot-a', botName: 'Alpha', botUrl: 'http://bot-a', sortId: 0 },
      'bot-b': { botId: 'bot-b', botName: 'Beta', botUrl: 'http://bot-b', sortId: 1 },
    };
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
        deleteTrade: deleteTradeA,
        cancelOpenOrder: cancelOpenOrderA,
        reloadTrade: reloadTradeA,
        logout: logoutA,
        $dispose: disposeA,
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
        deleteTrade: deleteTradeB,
        cancelOpenOrder: cancelOpenOrderB,
        reloadTrade: reloadTradeB,
        logout: logoutB,
        $dispose: disposeB,
      } as unknown as BotSubStore,
    };
    deleteTradeDispatch = botStore.deleteTradeMulti;
    cancelOpenOrderDispatch = botStore.cancelOpenOrderMulti;
    reloadTradeDispatch = botStore.reloadTradeMulti;
    botStore.forceSellMulti = forceSellMulti;
    botStore.deleteTradeMulti = deleteTradeMulti;
    botStore.cancelOpenOrderMulti = cancelOpenOrderMulti;
    botStore.reloadTradeMulti = reloadTradeMulti;
    forceSellMulti.mockResolvedValue(undefined);
    deleteTradeMulti.mockResolvedValue(undefined);
    cancelOpenOrderMulti.mockResolvedValue(undefined);
    reloadTradeMulti.mockResolvedValue(undefined);
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

  it.each([
    ['full-exit', forceSellMulti],
    ['delete-trade', deleteTradeMulti],
    ['cancel-open-order', cancelOpenOrderMulti],
  ])(
    'keeps the row bot target while confirming %s',
    async (hook, executeAction) => {
      let resolveConfirm!: (value: boolean) => void;
      confirm.mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            resolveConfirm = resolve;
          }),
      );
      botStore.selectedBot = 'bot-b';
      const wrapper = mountTradeList();

      await wrapper.get(`[data-test="${hook}"]`).trigger('click');

      const targetContext = confirm.mock.calls.at(-1)?.[0].targetContext;
      expect(targetContext).toContain('Beta (bot-b)');
      expect(targetContext).toContain('okx');
      expect(targetContext).toContain('futures');
      expect(targetContext).toContain('LIVE');
      expect(targetContext).not.toContain('Alpha');

      botStore.selectedBot = 'bot-a';
      resolveConfirm(true);
      await flushPromises();

      expect(executeAction).toHaveBeenCalledWith({
        botId: 'bot-b',
        tradeid: String(trade.trade_id),
      });
      expect(executeAction).not.toHaveBeenCalledWith(
        expect.objectContaining({ botId: 'bot-a' }),
      );
    },
  );

  it.each([
    ['delete-trade', 'deleteTradeMulti', deleteTradeA, deleteTradeB],
    ['cancel-open-order', 'cancelOpenOrderMulti', cancelOpenOrderA, cancelOpenOrderB],
  ] as const)(
    'shows one unavailable-target error when bot B disappears during %s confirmation',
    async (hook, actionName, apiCallA, apiCallB) => {
      let resolveConfirm!: (value: boolean) => void;
      confirm.mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            resolveConfirm = resolve;
          }),
      );
      botStore[actionName] =
        actionName === 'deleteTradeMulti' ? deleteTradeDispatch : cancelOpenOrderDispatch;
      const wrapper = mountTradeList();

      await wrapper.get(`[data-test="${hook}"]`).trigger('click');
      botStore.removeBot('bot-b');
      await nextTick();
      expect(wrapper.findComponent(TradeActionsPopoverStub).exists()).toBe(false);
      resolveConfirm(true);
      await flushPromises();

      expect(apiCallA).not.toHaveBeenCalled();
      expect(apiCallB).not.toHaveBeenCalled();
      expect(showAlert).toHaveBeenCalledOnce();
      expect(showAlert).toHaveBeenCalledWith(
        'The selected target bot is no longer available. The action was blocked. / ' +
          '目标机器人已不可用，本次操作已被阻止。',
        'error',
      );
    },
  );

  it('shows one unavailable-target error when bot B disappears before reload dispatch', async () => {
    botStore.reloadTradeMulti = vi.fn(async (payload) => {
      botStore.removeBot('bot-b');
      return reloadTradeDispatch(payload);
    });
    const wrapper = mountTradeList();

    await wrapper.get('[data-test="reload-trade"]').trigger('click');
    await flushPromises();

    expect(reloadTradeA).not.toHaveBeenCalled();
    expect(reloadTradeB).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledOnce();
    expect(showAlert).toHaveBeenCalledWith(
      'The selected target bot is no longer available. The action was blocked. / ' +
        '目标机器人已不可用，本次操作已被阻止。',
      'error',
    );
  });
});
