import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ForceEntryForm from '@/components/ftbot/ForceEntryForm.vue';
import ForceExitForm from '@/components/ftbot/ForceExitForm.vue';
import { useBotStore, type BotSubStore } from '@/stores/ftbotwrapper';
import type { Trade } from '@/types';

const forceEntryA = vi.fn();
const forceEntryB = vi.fn();
const forceExitA = vi.fn();
const forceExitB = vi.fn();

const ModalStub = defineComponent({
  template: '<section><slot name="body"/><slot name="footer"/></section>',
});
const FormFieldStub = defineComponent({
  props: ['label', 'description'],
  template: '<label>{{ label }}<slot/></label>',
});
const ButtonStub = defineComponent({
  inheritAttrs: false,
  props: { disabled: Boolean },
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot/></button>',
});
const SegmentedControlStub = defineComponent({
  name: 'USegmentedControl',
  props: ['modelValue', 'items'],
  template: '<div class="segmented">{{ modelValue }}</div>',
});

const globalOptions = {
  stubs: {
    UModal: ModalStub,
    Modal: ModalStub,
    UFormField: FormFieldStub,
    FormField: FormFieldStub,
    UButton: ButtonStub,
    Button: ButtonStub,
    USegmentedControl: SegmentedControlStub,
    SegmentedControl: SegmentedControlStub,
    UInput: true,
    Input: true,
    UInputNumber: true,
    InputNumber: true,
    USlider: true,
    Slider: true,
    UAlert: defineComponent({
      inheritAttrs: false,
      props: ['title'],
      template: '<div v-bind="$attrs">{{ title }}</div>',
    }),
    Alert: defineComponent({
      inheritAttrs: false,
      props: ['title'],
      template: '<div v-bind="$attrs">{{ title }}</div>',
    }),
  },
};

const trade = {
  botId: 'bot-b',
  trade_id: 42,
  pair: 'ETH/USDT',
  amount: 2,
  current_rate: 100,
  base_currency: 'ETH',
  quote_currency: 'USDT',
} as Trade;

describe('force trade forms', () => {
  let botStore: ReturnType<typeof useBotStore>;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    botStore = useBotStore();
    botStore.selectedBot = 'bot-a';
    botStore.botStores = {
      'bot-a': {
        botId: 'bot-a',
        forceentry: forceEntryA,
        forceexit: forceExitA,
        botFeatures: {
          forceExitWithPrice: false,
          forceEnterShort: false,
          forceEntryTag: false,
        },
        shortAllowed: false,
        stakeCurrency: 'USDC',
        botState: { order_types: { force_entry: 'market', force_exit: 'market' } },
      } as unknown as BotSubStore,
      'bot-b': {
        botId: 'bot-b',
        forceentry: forceEntryB,
        forceexit: forceExitB,
        botFeatures: {
          forceExitWithPrice: true,
          forceEnterShort: true,
          forceEntryTag: true,
        },
        shortAllowed: true,
        stakeCurrency: 'USDT',
        botState: { order_types: { force_entry: 'limit', force_exit: 'limit' } },
      } as unknown as BotSubStore,
    };
  });

  function mountForceEntryForm(props: {
    botId: string;
    pair?: string;
    positionIncrease?: boolean;
  }) {
    return mount(ForceEntryForm, { props, global: globalOptions });
  }

  function mountForceExitForm(props: {
    botId: string;
    trade: Trade;
    stakeCurrencyDecimals: number;
  }) {
    return mount(ForceExitForm, { props, global: globalOptions });
  }

  it('submits a partial exit to the prop bot after activeBot changes', async () => {
    vi.spyOn(HTMLFormElement.prototype, 'checkValidity').mockReturnValue(true);
    const wrapper = mountForceExitForm({ botId: 'bot-b', trade, stakeCurrencyDecimals: 6 });

    botStore.selectedBot = 'bot-a';
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(forceExitA).not.toHaveBeenCalled();
    expect(forceExitB).toHaveBeenCalledWith(
      expect.objectContaining({ tradeid: String(trade.trade_id), ordertype: 'limit' }),
    );
  });

  it('submits a position increase to the prop bot after activeBot changes', async () => {
    vi.spyOn(HTMLFormElement.prototype, 'checkValidity').mockReturnValue(true);
    const wrapper = mountForceEntryForm({
      botId: 'bot-b',
      pair: 'ETH/USDT',
      positionIncrease: true,
    });

    botStore.selectedBot = 'bot-a';
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(forceEntryA).not.toHaveBeenCalled();
    expect(forceEntryB).toHaveBeenCalledWith(
      expect.objectContaining({ pair: 'ETH/USDT', ordertype: 'limit' }),
    );
  });

  it('uses the pinned entry bot capabilities, currency, and default order type', () => {
    const wrapper = mountForceEntryForm({ botId: 'bot-b', pair: 'ETH/USDT' });

    expect(wrapper.text()).toContain('Order direction');
    expect(wrapper.text()).toContain('USDT');
    expect(wrapper.findAllComponents(SegmentedControlStub).at(-1)?.props('modelValue')).toBe(
      'limit',
    );
  });

  it('uses the pinned exit bot price capability and default order type', () => {
    const wrapper = mountForceExitForm({ botId: 'bot-b', trade, stakeCurrencyDecimals: 6 });

    expect(wrapper.text()).toContain('Price [optional]');
    expect(wrapper.getComponent(SegmentedControlStub).props('modelValue')).toBe('limit');
  });

  it('disables submission when the pinned target disappears', async () => {
    const wrapper = mountForceEntryForm({ botId: 'bot-b', pair: 'ETH/USDT' });
    delete botStore.botStores['bot-b'];
    await nextTick();

    expect(wrapper.get('[data-test="target-unavailable"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-test="submit-force-entry"]').attributes('disabled')).toBeDefined();
  });
});
