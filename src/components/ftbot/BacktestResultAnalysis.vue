<script setup lang="ts">
import type { StrategyBacktestResult } from '@/types';

const props = defineProps<{
  backtestResult: StrategyBacktestResult;
}>();

const { t } = useAppI18n();

const backtestResultStats = computed(() => {
  const tmp = generateBacktestMetricRows(props.backtestResult);
  return formatObjectForTable({ value: tmp }, 'metric');
});

const backtestResultSettings = computed(() => {
  // Transpose Result into readable format
  const tmp = generateBacktestSettingRows(props.backtestResult);

  return formatObjectForTable({ value: tmp }, 'setting');
});

const settingsColumns = computed(() => [
  { accessorKey: 'setting', header: t('webserver.backtest.setting') },
  { accessorKey: 'value', header: t('common.value') },
]);

const metricColumns = computed(() => [
  { accessorKey: 'metric', header: t('common.metric') },
  { accessorKey: 'value', header: t('common.value') },
]);
</script>

<template>
  <div class="px-0 w-full">
    <div class="flex justify-center">
      <h3 class="font-bold text-2xl mb-2">
        {{
          formatLocaleText(t('webserver.backtest.resultFor'), {
            strategy: backtestResult.strategy_name,
          })
        }}
      </h3>
    </div>

    <div class="flex flex-col text-start ms-0 me-2 gap-2">
      <div class="flex flex-col xl:flex-row">
        <div class="px-0 px-xl-0 pe-xl-1 grow">
          <DraggableContainer :header="t('webserver.backtest.strategySettings')">
            <UTable :data="backtestResultSettings" :columns="settingsColumns" />
          </DraggableContainer>
        </div>
        <div class="px-0 xl:px-0 pt-2 xl:pt-0 xl:ps-1 grow">
          <DraggableContainer :header="t('webserver.backtest.metrics')">
            <UTable :data="backtestResultStats" :columns="metricColumns" />
          </DraggableContainer>
        </div>
      </div>
      <BacktestResultTablePer
        :title="t('webserver.backtest.resultsPerEnterTag')"
        :results="backtestResult.results_per_enter_tag"
        :stake-currency="backtestResult.stake_currency"
        :key-header="t('webserver.backtest.enterTag')"
        :stake-currency-decimals="backtestResult.stake_currency_decimals"
      />

      <BacktestResultTablePer
        :title="t('webserver.backtest.resultsPerExitReason')"
        :results="backtestResult.exit_reason_summary ?? []"
        :stake-currency="backtestResult.stake_currency"
        :key-header="t('webserver.backtest.exitReason')"
        :stake-currency-decimals="backtestResult.stake_currency_decimals"
      />

      <BacktestResultTablePer
        v-if="backtestResult.mix_tag_stats"
        :title="t('webserver.backtest.resultsMixedTag')"
        :results="backtestResult.mix_tag_stats ?? []"
        :stake-currency="backtestResult.stake_currency"
        :key-headers="[t('webserver.backtest.enterTag'), t('webserver.backtest.exitTag')]"
        :stake-currency-decimals="backtestResult.stake_currency_decimals"
      />

      <BacktestResultTablePer
        :title="t('webserver.backtest.resultsPerPair')"
        :results="backtestResult.results_per_pair"
        :stake-currency="backtestResult.stake_currency"
        :key-header="t('common.pair')"
        :stake-currency-decimals="backtestResult.stake_currency_decimals"
      />
      <DraggableContainer
        v-if="backtestResult.periodic_breakdown"
        :header="t('webserver.backtest.periodicBreakdown')"
      >
        <BacktestResultPeriodBreakdown :periodic-breakdown="backtestResult.periodic_breakdown">
        </BacktestResultPeriodBreakdown>
      </DraggableContainer>

      <DraggableContainer :header="t('webserver.backtest.singleTrades')">
        <TradeList
          :trades="backtestResult.trades"
          :show-filter="true"
          :stake-currency="backtestResult.stake_currency"
        />
      </DraggableContainer>
    </div>
  </div>
</template>
