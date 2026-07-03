export const useTradeChartStore = defineStore('tradeChart', () => {
  const selectedTimeframe = ref('');
  const useStrategyOverlay = ref(true);

  function resetForBot(botTimeframe: string) {
    selectedTimeframe.value = botTimeframe || '';
    useStrategyOverlay.value = true;
  }

  return {
    selectedTimeframe,
    useStrategyOverlay,
    resetForBot,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTradeChartStore, import.meta.hot));
}
