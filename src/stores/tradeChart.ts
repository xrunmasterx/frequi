export const useTradeChartStore = defineStore('tradeChart', () => {
  const selectedTimeframe = ref('');
  const useStrategyOverlay = ref(true);
  const isTradeChartActive = ref(false);
  const activeBotId = ref('');

  function resetForBot(botTimeframe: string) {
    selectedTimeframe.value = botTimeframe || '';
    useStrategyOverlay.value = true;
  }

  return {
    selectedTimeframe,
    useStrategyOverlay,
    isTradeChartActive,
    activeBotId,
    resetForBot,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTradeChartStore, import.meta.hot));
}
