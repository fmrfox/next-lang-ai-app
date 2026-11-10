import type { Language } from "./config";

export const t = (key: string, substitutions?: string | string[]) =>
  chrome.i18n.getMessage(key, substitutions) || key;

const LANGUAGE_KEYS: Record<Language, string> = {
  en: "langEn",
  pl: "langPl",
  es: "langEs",
  it: "langIt",
};

export const languageName = (lang: Language) => t(LANGUAGE_KEYS[lang]);
