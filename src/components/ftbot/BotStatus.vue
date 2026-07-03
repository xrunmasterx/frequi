<script setup lang="ts">
const botStore = useBotStore();
const { t } = useAppI18n();

const marketModeSummary = computed(() => {
  const state = botStore.activeBot.botState;
  if (!state) return '';

  const tradingMode = `${state.trading_mode || 'spot'}${
    state.trading_mode !== 'spot' && state.margin_mode ? ` ${state.margin_mode}` : ''
  }`;

  return formatLocaleText(t('bot.marketModeSummary'), {
    maxOpenTrades: state.max_open_trades,
    stakeAmount: state.stake_amount,
    stakeCurrency: state.stake_currency,
    exchange: state.exchange,
    demo: state.demo_trading ? ` (${t('bot.demo')})` : '',
    tradingMode,
    strategy: state.strategy,
  });
});

const profitSummary = computed(() => {
  const profit = botStore.activeBot.profit;
  if (!profit) return '';

  return formatLocaleText(t('bot.profitSummary'), {
    avgProfit: formatPercent(profit.profit_all_ratio_mean),
    sumProfit: formatPercent(profit.profit_all_ratio_sum),
    tradeCount: profit.trade_count,
    avgDuration: profit.avg_duration,
    bestPair: profit.best_pair,
  });
});
</script>

<template>
  <div v-if="botStore.activeBot.botState" class="p-4">
    <p class="mb-4">
      {{ t('bot.runningFreqtrade') }} <strong>{{ botStore.activeBot.version }}</strong>
    </p>
    <p class="mb-4">
      {{ marketModeSummary }}
    </p>
    <p v-if="'stoploss_on_exchange' in botStore.activeBot.botState" class="mb-4">
      {{ t('bot.stoplossOnExchangeIs') }}
      <strong>{{
        botStore.activeBot.botState.stoploss_on_exchange ? t('common.enabled') : t('common.disabled')
      }}</strong
      >.
    </p>
    <p class="mb-4">
      {{ t('bot.currently') }} <strong>{{ botStore.activeBot.botState.state }}</strong
      >,
      <strong>{{ t('bot.forceEntry') }}: {{ botStore.activeBot.botState.force_entry_enable }}</strong>
    </p>
    <p>
      <strong>{{ botStore.activeBot.botState.dry_run ? t('bot.dryRun') : t('common.live') }}</strong>
    </p>
    <USeparator class="my-2" />
    <p class="mb-4" v-if="botStore.activeBot.profit">
      {{ profitSummary }}
    </p>
    <p v-if="botStore.activeBot.profit?.first_trade_timestamp" class="mb-4">
      <span v-if="botStore.activeBot.profit.bot_start_timestamp" class="block">
        {{ t('bot.botStartDate') }}:
        <strong>
          <DateTimeTZ :date="botStore.activeBot.profit.bot_start_timestamp" show-timezone />
        </strong>
      </span>
      <span class="block">
        {{ t('bot.firstTradeOpened') }}:
        <strong>
          <DateTimeTZ :date="botStore.activeBot.profit.first_trade_timestamp" show-timezone />
        </strong>
      </span>
      <span class="block">
        {{ t('bot.lastTradeOpened') }}:
        <strong>
          <DateTimeTZ :date="botStore.activeBot.profit.latest_trade_timestamp" show-timezone />
        </strong>
      </span>
    </p>
    <p>
      <span v-if="botStore.activeBot.profit?.profit_factor" class="block">
        {{ t('bot.profitFactor') }}:
        {{ formatNumber(botStore.activeBot.profit?.profit_factor, 2) }}
      </span>
      <span v-if="botStore.activeBot.profit?.trading_volume" class="block mb-4">
        {{ t('bot.tradingVolume') }}:
        {{
          formatPriceCurrency(
            botStore.activeBot.profit.trading_volume,
            botStore.activeBot.botState.stake_currency,
            botStore.activeBot.botState.stake_currency_decimals ?? 3,
          )
        }}
      </span>
    </p>
    <BaseCollapsible v-if="botStore.activeBot.strategy?.params" :title="t('bot.strategyParameters')">
      <StrategyParameters :strategy="botStore.activeBot.strategy" class="m-3" />
    </BaseCollapsible>
    <USeparator class="my-5" />
    <BotProfit
      class="mx-1"
      v-if="botStore.activeBot.profitAll"
      :profit-all="botStore.activeBot.profitAll"
      :stake-currency="botStore.activeBot.botState.stake_currency ?? 'USDT'"
      :stake-currency-decimals="botStore.activeBot.botState.stake_currency_decimals ?? 3"
    />
  </div>
</template>
