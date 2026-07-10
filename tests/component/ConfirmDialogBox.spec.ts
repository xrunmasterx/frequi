import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';

import ConfirmDialogBox, {
  type ConfirmDialogBoxProps,
} from '@/components/general/ConfirmDialogBox.vue';

const ModalStub = defineComponent({
  template: '<section><slot name="body"/><slot name="footer"/></section>',
});

function mountDialog(props: ConfirmDialogBoxProps) {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(ConfirmDialogBox, {
    props,
    global: { plugins: [pinia], stubs: { UModal: ModalStub, Modal: ModalStub } },
  });
}

describe('ConfirmDialogBox', () => {
  it('renders target context separately from the action message', () => {
    const wrapper = mountDialog({
      title: 'Force exit',
      targetContext: 'Target bot: Beta (bot-b) · okx · futures · LIVE',
      message: 'Really exit trade 7?',
    });

    expect(wrapper.get('[data-test="trade-action-target"]').text()).toContain('Beta (bot-b)');
    expect(wrapper.get('[data-test="trade-action-message"]').text()).toBe(
      'Really exit trade 7?',
    );
  });

  it('omits empty target context without changing the action message', () => {
    const wrapper = mountDialog({ title: 'Reload', message: 'Reload config?' });

    expect(wrapper.find('[data-test="trade-action-target"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="trade-action-message"]').text()).toBe('Reload config?');
  });
});
