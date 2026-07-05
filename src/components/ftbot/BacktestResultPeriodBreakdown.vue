<script setup lang="ts">
import type { PeriodicBreakdown } from '@/types';
import type { TableColumn } from '@nuxt/ui';

const props = defineProps<{
  periodicBreakdown: PeriodicBreakdown;
}>();

const { t } = useAppI18n();

const periodicBreakdownSelections = computed(() => {
  const res = [
    { value: 'day', label: t('bot.days') },
    { value: 'week', label: t('bot.weeks') },
    { value: 'month', label: t('bot.months') },
  ];
  if (props.periodicBreakdown.year) {
    res.push({ value: 'year', label: t('webserver.backtest.years') });
  }
  if (props.periodicBreakdown.weekday) {
    res.push({ value: 'weekday', label: t('webserver.backtest.weekday') });
  }

  return res;
});

const periodicBreakdownPeriod = ref<string>('month');

type PeriodRow = {
  date: string;
  trades?: number;
  profit_abs?: number;
  profit_factor?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  loses?: number;
};

const columns = computed<TableColumn<PeriodRow>[]>(() => [
  { accessorKey: 'date', header: t('webserver.backtest.date') },
  { accessorKey: 'trades', header: t('bot.trades') },
  { accessorKey: 'profit_abs', header: t('webserver.backtest.totalProfit') },
  { accessorKey: 'profit_factor', header: t('webserver.backtest.profitFactor') },
  { accessorKey: 'wins', header: t('webserver.backtest.wins') },
  { accessorKey: 'draws', header: t('webserver.backtest.draws') },
  { accessorKey: 'losses', header: t('webserver.backtest.losses') },
  { id: 'win_rate', header: t('webserver.backtest.winRate') },
]);
</script>

<template>
  <USegmentedControl
    v-model="periodicBreakdownPeriod"
    :items="periodicBreakdownSelections"
    value-key="value"
    size="md"
    class="m-2"
  ></USegmentedControl>
  <UTable :data="periodicBreakdown[periodicBreakdownPeriod]" :columns="columns">
    <template #trades-cell="{ row }">
      {{ row.original.trades ?? 'N/A' }}
    </template>
    <template #profit_abs-cell="{ row }">
      {{ formatNumber(row.original.profit_abs, 2) }}
    </template>
    <template #profit_factor-cell="{ row }">
      {{ formatPrice(row.original.profit_factor ?? null, 2) }}
    </template>
    <template #losses-cell="{ row }">
      {{ row.original.loses ?? row.original.losses ?? 'N/A' }}
    </template>
    <template #win_rate-cell="{ row }">
      {{
        formatPercent(
          row.original.wins! /
            (row.original.wins! +
              row.original.draws! +
              (row.original.loses ?? row.original.losses ?? 0)),
          2,
        )
      }}
    </template>
  </UTable>
</template>
