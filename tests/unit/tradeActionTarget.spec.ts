import { describe, expect, it } from 'vitest';

import { resolveLocaleText } from '@/composables/useAppI18n';
import type { LocaleKey } from '@/locales/keys';
import { formatTradeActionTarget } from '@/utils/tradeActionTarget';

const t = (key: LocaleKey) => resolveLocaleText(key, 'en');

describe('formatTradeActionTarget', () => {
  it.each([
    [true, 'DRY-RUN'],
    [false, 'LIVE'],
    [undefined, 'UNKNOWN ENVIRONMENT'],
  ])('formats target identity for dry_run=%s', (dryRun, marker) => {
    const text = formatTradeActionTarget(
      {
        botId: 'bot-b',
        uiBotName: 'Beta',
        botState: { dry_run: dryRun, exchange: 'okx', trading_mode: 'futures' },
      },
      t,
    );

    expect(text).toContain('Beta');
    expect(text).toContain('bot-b');
    expect(text).toContain('okx');
    expect(text).toContain('futures');
    expect(text).toContain(marker);
  });

  it('labels missing endpoint details as unknown', () => {
    const text = formatTradeActionTarget({ botId: 'bot-b', uiBotName: 'Beta', botState: {} }, t);

    expect(text).toContain('Unknown · Unknown · UNKNOWN ENVIRONMENT');
  });
});
