<script setup lang="ts">
import { type TradeCustomDataProps } from '@/components/ftbot/TradeCustomData.vue';
defineProps<TradeCustomDataProps>();
defineEmits<{
  close: [value: boolean];
}>();
const { t } = useAppI18n();
</script>

<template>
  <UModal
    :title="formatLocaleText(t('trade.customDataForTrade'), { tradeId })"
    description=""
  >
    <template #body>
      <TradeCustomData :trade-id="tradeId" />
    </template>
  </UModal>
</template>
