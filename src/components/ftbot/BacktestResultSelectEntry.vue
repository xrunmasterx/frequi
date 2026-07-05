<script setup lang="ts">
import type { BacktestResultInMemory } from '@/types';

withDefaults(
  defineProps<{
    backtestResult: BacktestResultInMemory;
    selectedBacktestResultKey?: string;
    canUseModify?: boolean;
  }>(),
  {
    selectedBacktestResultKey: '',
    canUseModify: false,
  },
);

const { t } = useAppI18n();
</script>

<template>
  <div class="flex flex-col me-2 text-start">
    <div class="font-bold">
      {{ backtestResult.metadata.strategyName }} - {{ backtestResult.strategy.timeframe }}
    </div>
    <div class="text-sm font-normal">
      {{ t('webserver.backtest.tradeCount') }}: {{ backtestResult.strategy.total_trades }} -
      {{ t('webserver.backtest.profit') }}:
      {{ formatPercent(backtestResult.strategy.profit_total) }}
    </div>
    <div v-if="canUseModify" class="text-sm font-normal" style="white-space: pre-wrap">
      {{ backtestResult.metadata.notes }}
    </div>
  </div>
</template>
