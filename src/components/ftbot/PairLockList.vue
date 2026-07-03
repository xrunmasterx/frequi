<script setup lang="ts">
import type { Lock } from '@/types';
import type { TableColumn } from '@nuxt/ui';

const botStore = useBotStore();
const { t } = useAppI18n();

const columns = computed<TableColumn<Lock>[]>(() => [
  { accessorKey: 'pair', header: t('common.pair') },
  { accessorKey: 'lock_end_timestamp', header: t('bot.until') },
  { accessorKey: 'reason', header: t('bot.reason') },
  { id: 'actions', header: t('common.actions') },
]);

function removePairLock(item: Lock) {
  console.log(item);
  if (item.id !== undefined) {
    botStore.activeBot.deleteLock(item.id);
  } else {
    showAlert(t('bot.deleteLockUnsupported'));
  }
}
</script>

<template>
  <div>
    <div class="mb-2">
      <label class="me-auto text-xl">{{ t('bot.pairLocks') }}</label>
      <UButton
        class="float-end"
        color="neutral"
        icon="mdi:refresh"
        @click="botStore.activeBot.getLocks"
      />
    </div>
    <UTable
      :data="botStore.activeBot.activeLocks"
      :columns="columns"
      :ui="{
        td: 'whitespace-normal',
      }"
    >
      <template #lock_end_timestamp-cell="{ row }">
        {{ timestampms(row.original.lock_end_timestamp) }}
      </template>
      <template #actions-cell="{ row }">
        <UButton
          class="btn-xs ms-1"
          size="sm"
          color="neutral"
          :title="t('bot.deleteLock')"
          icon="mdi:delete"
          @click="removePairLock(row.original)"
        />
      </template>
    </UTable>
  </div>
</template>
