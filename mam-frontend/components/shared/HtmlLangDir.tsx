"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/store/language";
import { isRTL } from "@/lib/i18n";

export function HtmlLangDir() {
  const { locale } = useLanguageStore();

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = isRTL(locale) ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
