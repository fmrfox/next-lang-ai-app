import { appLocale, HISTORY_LIMIT, SUPPORTED_LANGUAGES, type Language } from "./config";
import type { Connection, HistoryItem, Settings } from "./types";

interface StorageShape {
  connection?: Connection;
  settings?: Settings;
  history?: HistoryItem[];
}

async function get<K extends keyof StorageShape>(key: K): Promise<StorageShape[K]> {
  const result = await chrome.storage.local.get(key);
  return result[key] as StorageShape[K];
}

const isLanguage = (value: unknown): value is Language =>
  (SUPPORTED_LANGUAGES as readonly unknown[]).includes(value);

function defaultSettings(): Settings {
  // Most users read pages in English and translate into the language of their browser UI.
  const ui = appLocale();
  return { learningLanguage: "en", nativeLanguage: ui === "en" ? "pl" : ui, level: "easy" };
}

/** Accepts current settings and the 1.0 shape ({ sourceLanguage = learned, targetLanguage = native }). */
function normalizeSettings(raw: unknown): Partial<Settings> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const learning = r.learningLanguage ?? r.sourceLanguage;
  const native = r.nativeLanguage ?? r.targetLanguage;
  return {
    ...(isLanguage(learning) && { learningLanguage: learning }),
    ...(isLanguage(native) && { nativeLanguage: native }),
    ...((r.level === "easy" || r.level === "advanced") && { level: r.level }),
  };
}

export const storage = {
  getConnection: () => get("connection"),
  setConnection: (connection: Connection) => chrome.storage.local.set({ connection }),
  clearConnection: () => chrome.storage.local.remove("connection"),

  async getSettings(): Promise<Settings> {
    return { ...defaultSettings(), ...normalizeSettings(await get("settings")) };
  },
  setSettings: (settings: Settings) => chrome.storage.local.set({ settings }),

  async getHistory(): Promise<HistoryItem[]> {
    // Drop entries saved in the old (1.0) format.
    return ((await get("history")) ?? []).filter((item) => typeof item.flashcard?.term === "string");
  },
  async addToHistory(item: HistoryItem): Promise<void> {
    const history = await storage.getHistory();
    const next = [item, ...history.filter((h) => h.flashcard.id !== item.flashcard.id)];
    await chrome.storage.local.set({ history: next.slice(0, HISTORY_LIMIT) });
  },

  /** Removes keys left by older versions (1.0 category generator). */
  removeLegacyKeys: () => chrome.storage.local.remove("categoryJob"),
};
