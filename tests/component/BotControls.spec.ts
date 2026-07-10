import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BotControls from '@/components/ftbot/BotControls.vue';
import { useBotStore, type BotSubStore } from '@/stores/ftbotwrapper';

const confirm = vi.fn();
const forceEntryDialog = vi.fn();

vi.mock('@/composables/useConfirmBox', () => ({
  useConfirmBox: () => ({ confirm }),
}));
vi.mock('@/composables/useForceTrade', () => ({
  useForceTrade: () => ({ forceEntryDialog }),
}));

const ButtonStub = defineComponent({
  inheritAttrs: false,
  props: { disabled: Boolean },
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot/></button>',
});

const stopBotA = vi.fn();
const stopBotB = vi.fn();
const stopBuyA = vi.fn();
const stopBuyB = vi.fn();
const reloadConfigA = vi.fn();
const reloadConfigB = vi.fn();
const forceSellMulti = vi.fn();

describe('BotControls confirmation targets', () => {
  let botStore: ReturnType<typeof useBotStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    botStore = useBotStore();
    botStore.selectedBot = 'bot-a';
    botStore.botStores = {
      'bot-a': {
        botId: 'bot-a',
        uiBotName: 'Alpha',
        botState: {
          state: 'running',
          force_entry_enable: true,
          dry_run: true,
          exchange: 'binance',
          trading_mode: 'spot',
        },
        isTrading: true,
        selectedPair: 'BTC/USDT',
        stopBot: stopBotA,
        stopBuy: stopBuyA,
        reloadConfig: reloadConfigA,
      } as unknown as BotSubStore,
      'bot-b': {
        botId: 'bot-b',
        uiBotName: 'Beta',
        botState: {
          state: 'running',
          force_entry_enable: true,
          dry_run: false,
          exchange: 'okx',
          trading_mode: 'futures',
        },
        isTrading: true,
        selectedPair: 'ETH/USDT',
        stopBot: stopBotB,
        stopBuy: stopBuyB,
        reloadConfig: reloadConfigB,
      } as unknown as BotSubStore,
    };
    botStore.forceSellMulti = forceSellMulti;
  });

  function mountControls() {
    return mount(BotControls, {
      global: { stubs: { UButton: ButtonStub, Button: ButtonStub } },
    });
  }

  it.each([
    ['stop-bot', stopBotA, stopBotB],
    ['stop-entering', stopBuyA, stopBuyB],
    ['reload-config', reloadConfigA, reloadConfigB],
  ])('freezes the bot for %s while confirmation is pending', async (hook, callA, callB) => {
    let resolveConfirm!: (value: boolean) => void;
    confirm.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const wrapper = mountControls();

    await wrapper.get(`[data-test="${hook}"]`).trigger('click');
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ targetContext: expect.stringContaining('Alpha (bot-a)') }),
    );

    botStore.selectedBot = 'bot-b';
    resolveConfirm(true);
    await flushPromises();

    expect(callA).toHaveBeenCalledOnce();
    expect(callB).not.toHaveBeenCalled();
  });

  it('freezes the bot id for force exit all while confirmation is pending', async () => {
    let resolveConfirm!: (value: boolean) => void;
    confirm.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const wrapper = mountControls();

    await wrapper.get('[data-test="force-exit-all"]').trigger('click');
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ targetContext: expect.stringContaining('Alpha (bot-a)') }),
    );

    botStore.selectedBot = 'bot-b';
    resolveConfirm(true);
    await flushPromises();

    expect(forceSellMulti).toHaveBeenCalledWith({ botId: 'bot-a', tradeid: 'all' });
  });

  it('opens force entry with the bot id captured at the click', async () => {
    forceEntryDialog.mockImplementation(async () => {
      botStore.selectedBot = 'bot-b';
    });
    const wrapper = mountControls();

    await wrapper.get('[data-test="force-entry"]').trigger('click');

    expect(forceEntryDialog).toHaveBeenCalledWith({ botId: 'bot-a', pair: 'BTC/USDT' });
  });
});
