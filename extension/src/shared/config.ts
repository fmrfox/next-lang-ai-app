import { relatedOrigins } from "./origins";

/** Origin used for API calls and links. */
export const LANGUITO_ORIGIN = new URL(import.meta.env.VITE_LANGUITO_URL).origin;
/** All origins the site is served on (e.g. with and without www) — trusted for the connect flow. */
export const LANGUITO_ORIGINS = relatedOrigins(LANGUITO_ORIGIN);

export const SUPPORTED_LANGUAGES = ["en", "pl", "es", "it"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export type Level = "easy" | "advanced";

export const MAX_SELECTION_LENGTH = 300;
/** Must match EXTENSION_CATEGORY in the web app (src/lib/extension-category.ts). */
export const EXTENSION_CATEGORY = "__languito_extension__";
export const MAX_CONTEXT_LENGTH = 600;
export const HISTORY_LIMIT = 30;

/** Locale used in Languito URLs, derived from the browser UI language. */
export function appLocale(): Language {
  const ui = chrome.i18n.getUILanguage().slice(0, 2).toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(ui) ? (ui as Language) : "en";
}

export function appUrl(path: string): string {
  return `${LANGUITO_ORIGIN}/${appLocale()}${path}`;
}

export const CONNECT_URL = () => appUrl("/extension/connect");
/** Opens the pinned extension category in the web app. */
export const FLASHCARDS_URL = () =>
  appUrl(`/flashcards?category=${encodeURIComponent(EXTENSION_CATEGORY)}`);
