<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    allowEdit?: boolean;
    editableName?: string;
  }>(),
  {
    allowEdit: false,
  },
);
const plotStore = usePlotConfigStore();
const { t } = useAppI18n();
</script>

<template>
  <EditValue
    v-model="plotStore.plotConfigName"
    :allow-edit="props.allowEdit"
    :allow-add="props.allowEdit"
    :allow-duplicate="props.allowEdit"
    :editable-name="props.editableName ?? t('plot.editName')"
    @rename="plotStore.renamePlotConfig"
    @delete="plotStore.deletePlotConfig"
    @new="plotStore.newPlotConfig"
    @duplicate="plotStore.duplicatePlotConfig"
  >
    <USelect
      id="plotConfigSelect"
      v-model="plotStore.plotConfigName"
      :items="plotStore.availablePlotConfigNames"
      class="w-full text-left"
      @update:model-value="plotStore.plotConfigChanged"
    >
    </USelect>
  </EditValue>
</template>
