/**
 * i18n Configuration
 *
 * Initialises i18next with bundled translation files.
 * Language detection: localStorage → browser language → fallback "en".
 * Import this file once in main.tsx to activate translations.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@shared/i18n/en.json";
import de from "@shared/i18n/de.json";
import fr from "@shared/i18n/fr.json";
import zh from "@shared/i18n/zh.json";
import hi from "@shared/i18n/hi.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
] as const;

// Detect language from localStorage or browser
function detectLanguage(): string {
  const stored = localStorage.getItem("i18nextLng");
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored;
  const browser = navigator.language?.split("-")[0];
  if (browser && SUPPORTED_LANGUAGES.some((l) => l.code === browser)) return browser;
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
    zh: { translation: zh },
    hi: { translation: hi },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
