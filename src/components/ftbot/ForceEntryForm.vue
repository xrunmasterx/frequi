<script setup lang="ts">
import type { MultiForceEnterPayload } from '@/types';
import { formatTradeActionTarget } from '@/utils/tradeActionTarget';
import { OrderSides } from '@/types';

export interface ForceEntryFormProps {
  botId: string;
  pair?: string;
  positionIncrease?: boolean;
}

const props = withDefaults(defineProps<ForceEntryFormProps>(), {
  pair: '',
  positionIncrease: false,
});

const emit = defineEmits<{
  close: [value: boolean];
}>();

const botStore = useBotStore();
const { t } = useAppI18n();
const targetBot = computed(() => botStore.botStores[props.botId]);
const targetUnavailable = computed(() => !targetBot.value);
const targetContext = computed(() =>
  targetBot.value ? formatTradeActionTarget(targetBot.value, t) : undefined,
);

const form = ref<HTMLFormElement>();
const selectedPair = ref('');
const price = ref<number | undefined>(undefined);
const stakeAmount = ref<number | undefined>(undefined);
const leverage = ref<number | undefined>(undefined);

const ordertype = ref('');
const orderSide = ref<OrderSides>(OrderSides.long);
const enterTag = ref('force_entry');

const orderTypeOptions = computed(() => [
  { value: 'market', text: 'market' },
  { value: 'limit', text: 'limit' },
]);
const orderSideOptions = computed(() => [
  { value: 'long', text: 'long' },
  { value: 'short', text: 'short' },
]);

function checkFormValidity() {
  const valid = form.value?.checkValidity();

  return valid;
}

async function handleEntry() {
  // Exit when the form isn't valid
  if (!checkFormValidity() || !targetBot.value) {
    return;
  }

  // call forceentry
  const payload: MultiForceEnterPayload = { botId: props.botId, pair: selectedPair.value };
  if (price.value) {
    payload.price = Number(price.value);
  }
  if (ordertype.value) {
    payload.ordertype = ordertype.value;
  }
  if (stakeAmount.value) {
    payload.stakeamount = stakeAmount.value;
  }
  if (targetBot.value.botFeatures.forceEnterShort && targetBot.value.shortAllowed) {
    payload.side = orderSide.value;
  }
  if (targetBot.value.botFeatures.forceEntryTag && enterTag.value) {
    payload.entry_tag = enterTag.value;
  }

  if (leverage.value) {
    payload.leverage = leverage.value;
  }
  await botStore.forceEntryMulti(payload);
  emit('close', true);
}

function resetForm() {
  selectedPair.value = props.pair;
  price.value = undefined;
  stakeAmount.value = undefined;
  ordertype.value =
    targetBot.value?.botState?.order_types?.forcebuy ||
    targetBot.value?.botState?.order_types?.force_entry ||
    targetBot.value?.botState?.order_types?.buy ||
    targetBot.value?.botState?.order_types?.entry ||
    'limit';
}

resetForm();
</script>

<template>
  <UModal
    :title="
      positionIncrease
        ? `${t('trade.increasePositionFor')} ${pair}`
        : t('trade.forceEntryModalTitle')
    "
    :description="
      positionIncrease
        ? t('trade.increasePositionDescription')
        : t('trade.forceEntryModalDescription')
    "
  >
    <template #body>
      <div
        v-if="targetContext"
        data-test="trade-action-target"
        class="mb-3 font-medium"
      >
        {{ targetContext }}
      </div>
      <UAlert
        v-if="targetUnavailable"
        data-test="target-unavailable"
        color="error"
        :title="t('trade.targetBotUnavailable')"
      />
      <form ref="form" class="space-y-4" @submit.prevent="handleEntry">
        <UFormField
          v-if="targetBot?.botFeatures.forceEnterShort && targetBot.shortAllowed"
          :label="t('trade.orderDirection')"
        >
          <USegmentedControl
            v-model="orderSide"
            :items="orderSideOptions"
            label-key="text"
            value-key="value"
            size="sm"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('common.pair')" required>
          <UInput
            v-model="selectedPair"
            :disabled="positionIncrease"
            required
            class="w-full"
            @keydown.enter="handleEntry"
            @focus="($event.target as HTMLInputElement).select()"
          />
        </UFormField>

        <UFormField :label="t('trade.priceOptional')">
          <UInputNumber
            v-model="price"
            show-buttons
            :min="0"
            :stepSnapping="false"
            :format-options="{
              maximumFractionDigits: 8,
            }"
            :step="0.1"
            class="w-full"
            @keydown.enter="handleEntry"
          />
        </UFormField>

        <UFormField
          :label="
            formatLocaleText(t('trade.stakeAmountOptional'), {
              currency: targetBot?.stakeCurrency ?? '',
            })
          "
        >
          <UInputNumber
            v-model="stakeAmount"
            show-buttons
            :min="0"
            :stepSnapping="false"
            :step="['USDC', 'USDT'].includes(targetBot?.stakeCurrency ?? '') ? 10 : 1"
            class="w-full"
            :format-options="{
              maximumFractionDigits: 5,
            }"
          />
        </UFormField>

        <UFormField
          v-if="targetBot?.botFeatures.forceEnterShort && targetBot.shortAllowed"
          :label="t('trade.leverageOptional')"
        >
          <UInputNumber
            id="leverage-input"
            v-model="leverage"
            show-buttons
            :min="1"
            :step="1"
            :max-fraction-digits="1"
            class="w-full"
            @keydown.enter="handleEntry"
          />
        </UFormField>

        <UFormField :label="t('trade.orderType')">
          <USegmentedControl
            v-model="ordertype"
            :items="orderTypeOptions"
            label-key="text"
            value-key="value"
            size="sm"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="targetBot?.botFeatures.forceEntryTag"
          :label="t('trade.customEntryTagOptional')"
        >
          <UInput id="enterTag-input" v-model="enterTag" class="w-full" />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <div class="ms-auto flex justify-end gap-2">
        <UButton color="neutral" @click="$emit('close', false)" icon="mdi:close">
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          data-test="submit-force-entry"
          :disabled="targetUnavailable"
          @click="handleEntry"
          icon="mdi:check"
        >
          {{ t('trade.enterPosition') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
