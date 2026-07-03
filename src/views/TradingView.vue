<script setup lang="ts">
import type { GridItemData } from '@/types';
import type { TabsItem } from '@nuxt/ui';

const botStore = useBotStore();
const layoutStore = useLayoutStore();
const settingsStore = useSettingsStore();
const tradeChartStore = useTradeChartStore();
const { t } = useAppI18n();
const currentBreakpoint = ref('');
const tradeChartTimeframeBaseOptions = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '2w',
  '1M',
  '1y',
];

const breakpointChanged = (newBreakpoint: string) => {
  // console.log('breakpoint:', newBreakpoint);
  currentBreakpoint.value = newBreakpoint;
};
const isResizableLayout = computed(() =>
  ['', 'sm', 'md', 'lg', 'xl'].includes(currentBreakpoint.value),
);
const isLayoutLocked = computed(() => {
  return layoutStore.layoutLocked || !isResizableLayout.value;
});
const gridLayoutData = computed((): GridItemData[] => {
  if (isResizableLayout.value) {
    return layoutStore.tradingLayout;
  }
  return [...layoutStore.getTradingLayoutSm];
});

const gridLayoutMultiPane = computed(() => {
  return findGridLayout(gridLayoutData.value, TradeLayout.multiPane);
});

const gridLayoutOpenTrades = computed(() => {
  return findGridLayout(gridLayoutData.value, TradeLayout.openTrades);
});

const gridLayoutTradeHistory = computed(() => {
  return findGridLayout(gridLayoutData.value, TradeLayout.tradeHistory);
});

const gridLayoutTradeDetail = computed(() => {
  return findGridLayout(gridLayoutData.value, TradeLayout.tradeDetail);
});

const gridLayoutChartView = computed(() => {
  return findGridLayout(gridLayoutData.value, TradeLayout.chartView);
});

const responsiveGridLayouts = computed(() => {
  return {
    sm: layoutStore.getTradingLayoutSm,
  };
});

const tradeChartTimeframe = computed({
  get() {
    return tradeChartStore.selectedTimeframe || botStore.activeBot.timeframe;
  },
  set(value: string) {
    tradeChartStore.selectedTimeframe = value;
  },
});

const useChartCandles = computed(() => botStore.activeBot.botFeatures.chartCandles);

const tradeChartTimeframeOptions = computed(() => {
  const nonCanonicalTimeframes = [tradeChartTimeframe.value, botStore.activeBot.timeframe].filter(
    (timeframe): timeframe is string =>
      !!timeframe && !tradeChartTimeframeBaseOptions.includes(timeframe),
  );

  return [...new Set([...nonCanonicalTimeframes, ...tradeChartTimeframeBaseOptions])];
});

const tradeChartDataset = computed(() => {
  const [pair] = botStore.activeBot.plotMultiPairs;
  if (!pair) {
    return undefined;
  }
  return botStore.activeBot.chartCandleData[`${pair}__${tradeChartTimeframe.value}`]?.data;
});

const tradeChartPlotConfig = computed(() => tradeChartDataset.value?.plot_config);

const tradeChartWarningText = computed(() => tradeChartDataset.value?.warnings?.join(' ') ?? '');

const tradeChartStatusText = computed(() => {
  if (!useChartCandles.value) {
    return '';
  }

  const dataset = tradeChartDataset.value;
  const chartTimeframe = dataset?.chart_timeframe || tradeChartTimeframe.value;
  const strategyName = dataset?.strategy || botStore.activeBot.botState.strategy || '';
  const strategyTimeframe =
    dataset?.strategy_timeframe || dataset?.overlay?.strategy_timeframe || '';
  const strategyOverlay = [strategyName, strategyTimeframe].filter(Boolean).join(' ');

  if (!strategyOverlay) {
    return chartTimeframe;
  }

  return formatLocaleText(t('trade.chartStatus'), {
    chartTimeframe,
    strategy: strategyOverlay,
    strategyTimeframe: '',
  }).trim();
});

function refreshOHLCV(pair: string, columns: string[] = []) {
  if (botStore.activeBot.botFeatures.chartCandles) {
    const timeframe = tradeChartTimeframe.value;
    if (!pair || !timeframe) {
      return;
    }

    botStore.activeBot.getChartCandles({
      pair,
      timeframe,
      include_strategy_overlay: tradeChartStore.useStrategyOverlay,
    });
    return;
  }

  botStore.activeBot.getPairCandles({
    pair,
    timeframe: botStore.activeBot.timeframe,
    columns,
  });
}

watch(
  () => botStore.selectedBot,
  () => {
    tradeChartStore.resetForBot(botStore.activeBot.timeframe);
  },
  { immediate: true },
);

watch(
  () => tradeChartTimeframe.value,
  () => {
    if (!botStore.activeBot.botFeatures.chartCandles) {
      return;
    }

    for (const pair of botStore.activeBot.plotMultiPairs) {
      refreshOHLCV(pair);
    }
  },
);

const tradingTabItems = computed<TabsItem[]>(() => {
  const showText = settingsStore.multiPaneButtonsShowText;
  return [
    {
      slot: 'pairs',
      value: 'pairs',
      label: showText ? t('trade.pairsCombined') : undefined,
      icon: 'i-mdi-view-list',
    },
    {
      slot: 'general',
      value: 'general',
      label: showText ? t('trade.general') : undefined,
      icon: 'i-mdi-information',
    },
    {
      slot: 'performance',
      value: 'performance',
      label: showText ? t('trade.performance') : undefined,
      icon: 'i-mdi-chart-line',
    },
    {
      slot: 'balance',
      value: 'balance',
      label: showText ? t('trade.balance') : undefined,
      icon: 'i-mdi-bank',
    },
    {
      slot: 'time-breakdown',
      value: 'time-breakdown',
      label: showText ? t('trade.timeBreakdown') : undefined,
      icon: 'i-mdi-folder-clock',
    },
    {
      slot: 'pairlist',
      value: 'pairlist',
      label: showText ? t('trade.pairlist') : undefined,
      icon: 'i-mdi-format-list-group',
    },
    {
      slot: 'pair-locks',
      value: 'pair-locks',
      label: showText ? t('trade.pairLocks') : undefined,
      icon: 'i-mdi-lock-alert',
    },
  ];
});
</script>

<template>
  <GridLayout
    class="h-full w-full"
    style="padding: 1px"
    :row-height="50"
    :layout="gridLayoutData"
    :vertical-compact="false"
    :margin="[1, 1]"
    :responsive-layouts="responsiveGridLayouts"
    :is-resizable="!isLayoutLocked"
    :is-draggable="!isLayoutLocked"
    :responsive="true"
    :cols="{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }"
    :col-num="12"
    @update:breakpoint="breakpointChanged"
  >
    <template #default="{ gridItemProps }">
      <GridItem
        v-if="gridLayoutMultiPane.h !== 0"
        v-bind="gridItemProps"
        :i="gridLayoutMultiPane.i"
        :x="gridLayoutMultiPane.x"
        :y="gridLayoutMultiPane.y"
        :w="gridLayoutMultiPane.w"
        :h="gridLayoutMultiPane.h"
        drag-allow-from=".drag-header"
      >
        <DraggableContainer :header="t('trade.multiPane')">
          <div class="mt-1 flex justify-center">
            <BotControls class="mt-1 mb-2" />
          </div>
          <UTabs color="neutral" :items="tradingTabItems" variant="link" default-value="pairs">
            <template #pairs>
              <PairSummary
                :pairlist="botStore.activeBot.whitelist"
                :current-locks="botStore.activeBot.activeLocks"
                :trades="botStore.activeBot.openTrades"
              />
            </template>
            <template #general>
              <BotStatus />
            </template>
            <template #performance>
              <BotPerformance />
            </template>
            <template #balance>
              <BotBalance />
            </template>
            <template #time-breakdown>
              <PeriodBreakdown />
            </template>
            <template #pairlist>
              <PairListLive />
            </template>
            <template #pair-locks>
              <PairLockList />
            </template>
          </UTabs>
        </DraggableContainer>
      </GridItem>
      <GridItem
        v-if="gridLayoutOpenTrades.h !== 0"
        v-bind="gridItemProps"
        :i="gridLayoutOpenTrades.i"
        :x="gridLayoutOpenTrades.x"
        :y="gridLayoutOpenTrades.y"
        :w="gridLayoutOpenTrades.w"
        :h="gridLayoutOpenTrades.h"
        drag-allow-from=".drag-header"
      >
        <DraggableContainer :header="t('trade.openTrades')">
          <TradeList
            class="open-trades"
            :trades="botStore.activeBot.openTrades"
            :title="t('trade.openTradesTitle')"
            :active-trades="true"
            :empty-text="t('trade.openTradesEmpty')"
          />
        </DraggableContainer>
      </GridItem>
      <GridItem
        v-if="gridLayoutTradeHistory.h !== 0"
        v-bind="gridItemProps"
        :i="gridLayoutTradeHistory.i"
        :x="gridLayoutTradeHistory.x"
        :y="gridLayoutTradeHistory.y"
        :w="gridLayoutTradeHistory.w"
        :h="gridLayoutTradeHistory.h"
        drag-allow-from=".drag-header"
      >
        <DraggableContainer :header="t('trade.closedTrades')">
          <TradeList
            class="trade-history"
            :trades="botStore.activeBot.closedTrades"
            :title="t('trade.tradeHistory')"
            :show-filter="true"
            :empty-text="t('trade.tradeHistoryEmpty')"
          />
        </DraggableContainer>
      </GridItem>
      <GridItem
        v-if="
          botStore.activeBot.detailTradeId &&
          botStore.activeBot.tradeDetail &&
          gridLayoutTradeDetail.h !== 0
        "
        v-bind="gridItemProps"
        :i="gridLayoutTradeDetail.i"
        :x="gridLayoutTradeDetail.x"
        :y="gridLayoutTradeDetail.y"
        :w="gridLayoutTradeDetail.w"
        :h="gridLayoutTradeDetail.h"
        :min-h="4"
        drag-allow-from=".drag-header"
      >
        <DraggableContainer :header="t('trade.tradeDetail')">
          <TradeDetail
            :trade="botStore.activeBot.tradeDetail"
            :stake-currency="botStore.activeBot.stakeCurrency"
          />
        </DraggableContainer>
      </GridItem>
      <GridItem
        v-if="gridLayoutTradeDetail.h !== 0"
        v-bind="gridItemProps"
        :i="gridLayoutChartView.i"
        :x="gridLayoutChartView.x"
        :y="gridLayoutChartView.y"
        :w="gridLayoutChartView.w"
        :h="gridLayoutChartView.h"
        :min-h="6"
        drag-allow-from=".drag-header"
      >
        <DraggableContainer :header="t('trade.chart')">
          <CandleChartContainer
            :available-pairs="botStore.activeBot.whitelist"
            :historic-view="!!false"
            :timeframe="tradeChartTimeframe"
            :trades="botStore.activeBot.allTrades"
            :chart-data-source="useChartCandles ? botStore.activeBot.chartCandleData : undefined"
            :chart-data-status="
              useChartCandles ? botStore.activeBot.chartCandleDataStatus : undefined
            "
            :plot-config-override="useChartCandles ? tradeChartPlotConfig : undefined"
            :chart-status-text="useChartCandles ? tradeChartStatusText : undefined"
            :chart-warning-text="useChartCandles ? tradeChartWarningText : undefined"
            @refresh-data="refreshOHLCV"
          >
            <template #timeframe-select>
              <div v-if="useChartCandles" class="flex items-center gap-1">
                <span class="text-sm text-nowrap">{{ t('trade.chartTimeframe') }}</span>
                <USelect
                  v-model="tradeChartTimeframe"
                  :title="t('trade.chartTimeframe')"
                  :items="tradeChartTimeframeOptions"
                  size="sm"
                  class="w-24"
                />
              </div>
            </template>
          </CandleChartContainer>
        </DraggableContainer>
      </GridItem>
    </template>
  </GridLayout>
</template>
