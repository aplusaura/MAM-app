import { useLanguageStore } from "@/store/language";
import { getTranslation, isRTL, type TranslationKey } from "@/lib/i18n";

export function useTranslation() {
  const { locale, setLocale } = useLanguageStore();
  const t = getTranslation(locale);
  const rtl = isRTL(locale);
  const dir = rtl ? "rtl" as const : "ltr" as const;
  return { t, locale, setLocale, rtl, dir };
}

export type { TranslationKey };
