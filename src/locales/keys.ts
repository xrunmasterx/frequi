import type { en } from './en';

export type LocaleMode = 'bilingual' | 'zh-CN' | 'en';

type WidenStringLeaves<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends object
      ? WidenStringLeaves<T[K]>
      : T[K];
};

export type LocaleMessages = WidenStringLeaves<typeof en>;

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafPaths<T[K]>}`;
}[keyof T & string];

export type LocaleKey = LeafPaths<LocaleMessages>;
export type PartialLocaleMessages = DeepPartial<LocaleMessages>;
