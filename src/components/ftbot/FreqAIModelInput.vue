<script setup lang="ts">
import type { BacktestFreqAIInput } from '@/types';

const freqAI = defineModel<BacktestFreqAIInput>({ required: true });
const { t } = useAppI18n();
</script>

<template>
  <div class="flex justify-end items-center">
    <span class="me-2">{{ t('webserver.backtest.enableFreqAI') }}</span>
    <InfoBox :hint="t('webserver.backtest.enableFreqAIHint')" />
  </div>
  <BaseCheckbox id="enable-freqai" v-model="freqAI.enabled"></BaseCheckbox>

  <template v-if="freqAI.enabled">
    <label for="freqai-identifier">{{ t('webserver.backtest.freqAIIdentifier') }}</label>
    <UInput
      id="freqai-identifier"
      v-model="freqAI.identifier"
      :placeholder="t('webserver.backtest.useConfigDefault')"
    ></UInput>
  </template>
  <template v-if="freqAI.enabled">
    <label for="freqai-model">{{ t('webserver.backtest.freqAIModel') }}</label>
    <FreqaiModelSelect id="freqai-model" v-model="freqAI.model"></FreqaiModelSelect>
  </template>
</template>
