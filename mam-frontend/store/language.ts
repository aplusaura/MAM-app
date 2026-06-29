import { create } from "zustand";

export type Locale = "en" | "ar";

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("mam_locale") as Locale) || "en";
}

export const useLanguageStore = create<LanguageState>((set) => ({
  locale: getStoredLocale(),
  setLocale: (locale) => {
    localStorage.setItem("mam_locale", locale);
    set({ locale });
  },
}));
