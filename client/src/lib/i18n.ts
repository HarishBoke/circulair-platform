/**
 * i18n — Lightweight static language system (no external dependency).
 * Keeps the same API surface (SUPPORTED_LANGUAGES, detectLanguage)
 * so LanguageSelector and other consumers work without changes.
 */

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
] as const;

export function detectLanguage(): string {
  const stored = localStorage.getItem("app_lang");
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored;
  const browser = navigator.language?.split("-")[0];
  if (browser && SUPPORTED_LANGUAGES.some((l) => l.code === browser)) return browser;
  return "en";
}

let currentLang = "en";
try { currentLang = detectLanguage(); } catch { /* SSR safe */ }

export function getCurrentLanguage() { return currentLang; }
export function setLanguage(code: string) {
  currentLang = code;
  localStorage.setItem("app_lang", code);
}
