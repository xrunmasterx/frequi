import { en } from '@/locales/en';
import { zhCN } from '@/locales/zh-CN';
import type { LocaleKey, LocaleMessages, LocaleMode, PartialLocaleMessages } from '@/locales/keys';

interface ResolveLocaleTextOptions {
  enMessages?: LocaleMessages;
  zhMessages?: PartialLocaleMessages;
}

function readPath(messages: PartialLocaleMessages, key: LocaleKey): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>(
      (current, segment) =>
        current && typeof current === 'object'
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      messages,
    );

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function resolveLocaleText(
  key: LocaleKey,
  mode: LocaleMode,
  options: ResolveLocaleTextOptions = {},
): string {
  const enMessages = options.enMessages ?? en;
  const zhMessages = options.zhMessages ?? zhCN;
  const enText = readPath(enMessages, key);
  const zhText = readPath(zhMessages, key);

  if (!enText) {
    return '';
  }

  if (mode === 'en') {
    return enText;
  }

  if (mode === 'zh-CN') {
    return zhText ?? enText;
  }

  return zhText ? `${enText} / ${zhText}` : enText;
}
