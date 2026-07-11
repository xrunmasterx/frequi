import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBotStore } from '@/stores/ftbotwrapper';
import type { BotSubStore } from '@/stores/ftbotwrapper';

describe('ftbot wrapper force-action routing', () => {
  const forceEntryA = vi.fn();
  const forceEntryB = vi.fn();
  const forceExitA = vi.fn();
  const forceExitB = vi.fn();
  const deleteTradeA = vi.fn();
  const deleteTradeB = vi.fn();
  const cancelOpenOrderA = vi.fn();
  const cancelOpenOrderB = vi.fn();
  const reloadTradeA = vi.fn();
  const reloadTradeB = vi.fn();

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  function createStore() {
    const botStore = useBotStore();
    botStore.selectedBot = 'bot-a';
    botStore.botStores = {
      'bot-a': {
        forceentry: forceEntryA,
        forceexit: forceExitA,
        deleteTrade: deleteTradeA,
        cancelOpenOrder: cancelOpenOrderA,
        reloadTrade: reloadTradeA,
      } as unknown as BotSubStore,
      'bot-b': {
        forceentry: forceEntryB,
        forceexit: forceExitB,
        deleteTrade: deleteTradeB,
        cancelOpenOrder: cancelOpenOrderB,
        reloadTrade: reloadTradeB,
      } as unknown as BotSubStore,
    };
    return botStore;
  }

  it('routes force exit to the payload bot and strips botId', async () => {
    const botStore = createStore();

    await botStore.forceSellMulti({
      botId: 'bot-b',
      tradeid: '7',
      ordertype: 'market',
    });

    expect(forceExitA).not.toHaveBeenCalled();
    expect(forceExitB).toHaveBeenCalledWith({
      tradeid: '7',
      ordertype: 'market',
    });
  });

  it('routes force entry to the payload bot and strips botId', async () => {
    const botStore = createStore();

    await botStore.forceEntryMulti({
      botId: 'bot-b',
      pair: 'ETH/USDT',
      stakeamount: 20,
    });

    expect(forceEntryA).not.toHaveBeenCalled();
    expect(forceEntryB).toHaveBeenCalledWith({
      pair: 'ETH/USDT',
      stakeamount: 20,
    });
  });

  it('fails closed when the target bot no longer exists', async () => {
    const botStore = createStore();

    await expect(
      botStore.forceEntryMulti({ botId: 'missing-bot', pair: 'ETH/USDT' }),
    ).rejects.toThrow('Unknown bot target: missing-bot');

    expect(forceEntryA).not.toHaveBeenCalled();
    expect(forceEntryB).not.toHaveBeenCalled();
  });

  it('rejects delete when the explicit target bot no longer exists', async () => {
    const botStore = createStore();

    delete botStore.botStores['bot-b'];

    await expect(
      botStore.deleteTradeMulti({ botId: 'bot-b', tradeid: '7' }),
    ).rejects.toThrow('Unknown bot target: bot-b');
    expect(deleteTradeA).not.toHaveBeenCalled();
    expect(deleteTradeB).not.toHaveBeenCalled();
  });

  it('rejects cancel when the explicit target bot no longer exists', async () => {
    const botStore = createStore();

    delete botStore.botStores['bot-b'];

    await expect(
      botStore.cancelOpenOrderMulti({ botId: 'bot-b', tradeid: '7' }),
    ).rejects.toThrow('Unknown bot target: bot-b');
    expect(cancelOpenOrderA).not.toHaveBeenCalled();
    expect(cancelOpenOrderB).not.toHaveBeenCalled();
  });

  it('rejects reload when the explicit target bot no longer exists', async () => {
    const botStore = createStore();

    delete botStore.botStores['bot-b'];

    await expect(
      botStore.reloadTradeMulti({ botId: 'bot-b', tradeid: '7' }),
    ).rejects.toThrow('Unknown bot target: bot-b');
    expect(reloadTradeA).not.toHaveBeenCalled();
    expect(reloadTradeB).not.toHaveBeenCalled();
  });
});
