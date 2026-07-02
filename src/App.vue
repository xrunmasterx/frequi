<script setup lang="ts">
import { en, zh_cn } from '@nuxt/ui/locale';

const settingsStore = useSettingsStore();
const colorStore = useColorStore();

const uiLocale = computed(() => (settingsStore.localeMode === 'en' ? en : zh_cn));

onMounted(() => {
  setTimezone(settingsStore.timezone);
  colorStore.updateProfitLossColor();
});
watch(
  () => settingsStore.timezone,
  (tz) => {
    console.log('timezone changed', tz);
    setTimezone(tz);
  },
);
</script>

<template>
  <UApp :locale="uiLocale">
    <div id="app" class="flex flex-col h-dvh" :style="colorStore.cssVars">
      <NavBar />
      <BodyLayout class="grow overflow-auto" />
      <NavFooter />
    </div>
  </UApp>
</template>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}

/* * {
  outline: 1px solid #f00 !important;
} */
</style>
