import en, { type TranslationKey } from "./en";
import ar from "./ar";
import type { Locale } from "@/store/language";

const translations: Record<Locale, Record<string, string>> = { en, ar };

export type { TranslationKey };

export function getTranslation(locale: Locale) {
  const dict = translations[locale] ?? translations.en;
  return function t(key: TranslationKey, fallback?: string): string {
    return dict[key] ?? fallback ?? en[key] ?? key;
  };
}

export function isRTL(locale: Locale): boolean {
  return locale === "ar";
}
