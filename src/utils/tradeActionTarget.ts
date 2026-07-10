import { formatLocaleText } from '@/composables/useAppI18n';
import type { LocaleKey } from '@/locales/keys';
import type { BotState } from '@/types';

interface TradeActionTargetSource {
  botId: string;
  uiBotName: string;
  botState: Partial<Pick<BotState, 'dry_run' | 'exchange' | 'trading_mode'>>;
}

type Translate = (key: LocaleKey) => string;

export function formatTradeActionTarget(bot: TradeActionTargetSource, t: Translate): string {
  const key =
    bot.botState.dry_run === true
      ? 'trade.actionTargetDryRun'
      : bot.botState.dry_run === false
        ? 'trade.actionTargetLive'
        : 'trade.actionTargetUnknown';

  return formatLocaleText(t(key), {
    botName: bot.uiBotName,
    botId: bot.botId,
    exchange: bot.botState.exchange || t('common.unknown'),
    tradingMode: bot.botState.trading_mode || t('common.unknown'),
  });
}
