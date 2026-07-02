<script setup lang="ts">
export interface ConfirmDialogBoxProps {
  title: string;
  description?: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
}
const props = defineProps<ConfirmDialogBoxProps>();
const { t } = useAppI18n();
const modalDescription = computed(() => props.description ?? t('confirm.description'));
const cancelLabel = computed(() => props.cancelText ?? t('confirm.cancel'));
const confirmLabel = computed(() => props.confirmText ?? t('confirm.ok'));
defineEmits<{
  close: [value: boolean];
}>();
</script>

<template>
  <UModal :title="props.title" :ui="{ footer: 'justify-end' }" :description="modalDescription">
    <template #body>
      <div class="whitespace-pre-wrap">
        {{ props.message }}
      </div>
    </template>
    <template #footer>
      <UButton
        class="min-w-30"
        :label="cancelLabel"
        variant="outline"
        color="neutral"
        icon="mdi:close"
        @click="$emit('close', false)"
      />
      <UButton
        class="min-w-30"
        :label="confirmLabel"
        icon="mdi:check"
        autofocus
        @click="$emit('close', true)"
      />
    </template>
  </UModal>
</template>
