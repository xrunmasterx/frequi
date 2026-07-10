<script setup lang="ts">
import { formatTradeActionTarget } from '@/utils/tradeActionTarget';

const botStore = useBotStore();
const { confirm } = useConfirmBox();
const { t } = useAppI18n();

const { forceEntryDialog } = useForceTrade();

const isRunning = computed((): boolean => {
  return botStore.activeBot.botState?.state === 'running';
});

async function handleStopBot() {
  const targetBot = botStore.activeBot;
  const result = await confirm({
    title: t('trade.stopBot'),
    message: t('trade.stopBotMessage'),
    targetContext: formatTradeActionTarget(targetBot, t),
  });
  if (result) {
    targetBot.stopBot();
  }
}

async function handleStopBuy() {
  const targetBot = botStore.activeBot;
  if (
    await confirm({
      title: t('trade.pauseStopEntering'),
      message: t('trade.pauseStopEnteringMessage'),
      targetContext: formatTradeActionTarget(targetBot, t),
    })
  ) {
    targetBot.stopBuy();
  }
}

async function handleReloadConfig() {
  const targetBot = botStore.activeBot;
  if (
    await confirm({
      title: t('trade.reloadConfig'),
      message: t('trade.reloadConfigMessage'),
      targetContext: formatTradeActionTarget(targetBot, t),
    })
  ) {
    targetBot.reloadConfig();
  }
}

async function handleForceExit() {
  const targetBot = botStore.activeBot;
  if (
    await confirm({
      title: t('trade.forceExitAll'),
      message: t('trade.forceExitAllMessage'),
      targetContext: formatTradeActionTarget(targetBot, t),
    })
  ) {
    await botStore.forceSellMulti({ botId: targetBot.botId, tradeid: 'all' });
  }
}

async function handleForceEntry() {
  const targetBot = botStore.activeBot;
  await forceEntryDialog({
    botId: targetBot.botId,
    pair: targetBot.selectedPair,
  });
}
</script>

<template>
  <div class="flex flex-row gap-1">
    <UButton
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading || isRunning"
      :title="t('trade.startTrading')"
      icon="mdi:play"
      @click="botStore.activeBot.startBot()"
    />
    <UButton
      data-test="stop-bot"
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading || !isRunning"
      :title="t('trade.stopTrading')"
      icon="mdi:stop"
      @click="handleStopBot()"
    />
    <UButton
      data-test="stop-entering"
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading || !isRunning"
      :title="t('trade.pauseTrading')"
      icon="mdi:pause"
      @click="handleStopBuy()"
    />
    <UButton
      data-test="reload-config"
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading"
      :title="t('trade.reloadConfigTitle')"
      icon="mdi:reload"
      @click="handleReloadConfig()"
    />
    <UButton
      data-test="force-exit-all"
      color="neutral"
      size="xl"
      :disabled="!botStore.activeBot.isTrading"
      :title="t('trade.forceExitAllTitle')"
      icon="mdi:close-box-multiple"
      @click="handleForceExit()"
    />
    <UButton
      data-test="force-entry"
      v-if="botStore.activeBot.botState && botStore.activeBot.botState.force_entry_enable"
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading || !isRunning"
      :title="t('trade.forceEnterTitle')"
      icon="mdi:plus-box-multiple-outline"
      @click="handleForceEntry"
    />
    <UButton
      v-if="botStore.activeBot.isWebserverMode && false"
      size="xl"
      color="neutral"
      :disabled="botStore.activeBot.isTrading"
      :title="t('trade.startTradingMode')"
      icon="mdi:play"
      @click="botStore.activeBot.startTrade()"
    />
  </div>
</template>
