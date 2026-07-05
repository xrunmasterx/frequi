import type { LocaleKey } from '@/locales/keys';

interface PairTemplate {
  descriptionKey: LocaleKey;
  pairs: string[];
}

const pairTemplates = ref<PairTemplate[]>([
  {
    descriptionKey: 'webserver.download.allUsdtPairs',
    pairs: ['.*/USDT'],
  },
  {
    descriptionKey: 'webserver.download.allUsdtFuturesPairs',
    pairs: ['.*/USDT:USDT'],
  },
]);

export function usePairTemplates() {
  return {
    pairTemplates: computed(() => pairTemplates.value.map((x, idx) => ({ ...x, idx }))),
  };
}
