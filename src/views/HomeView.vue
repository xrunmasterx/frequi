<script setup lang="ts">
const { t } = useAppI18n();
const settingsStore = useSettingsStore();

const showEnglishWelcome = computed(() => settingsStore.localeMode !== 'zh-CN');
const showChineseWelcome = computed(() => settingsStore.localeMode !== 'en');
</script>

<template>
  <div class="mt-5">
    <div class="flex justify-center">
      <BotList class="max-w-xl" />
    </div>
    <USeparator class="my-5" />
    <AppIcon class="my-5 sm:w-80 sm:h-80 w-64 h-64" />

    <h1 class="font-bold text-2xl sm:text-4xl mb-4 transition-all">
      <span v-if="showEnglishWelcome">
        {{ resolveLocaleText('home.welcomeLead', 'en') }}
        <AppText class="text-2xl! sm:text-4xl!" />
      </span>
      <span v-if="showEnglishWelcome && showChineseWelcome"> / </span>
      <span v-if="showChineseWelcome">
        {{ resolveLocaleText('home.welcomeLead', 'zh-CN') }}
        <AppText class="text-2xl! sm:text-4xl!" />
      </span>
    </h1>
    <div>{{ t('home.controlBotDescription') }}</div>
    <USeparator class="my-5" />
    <p class="mb-2">
      {{ t('home.helpBeforeDocumentation') }}
      <a
        class="text-primary underline cursor-pointer"
        href="https://www.freqtrade.io/en/latest/"
        target="_blank"
      >
        {{ t('home.documentationLink') }}
      </a>
      .
    </p>

    <p class="mb-5">{{ t('home.haveFun') }} - <i>{{ t('home.wishes') }}</i></p>
  </div>
</template>
