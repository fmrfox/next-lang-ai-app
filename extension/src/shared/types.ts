import type { Language, Level } from "./config";

/** Flashcard as returned by the Languito extension API. `term` is in the learned language. */
export interface Flashcard {
  id: number;
  term: string;
  translation: string;
  example: string;
  exampleTranslation: string;
  learningLanguage: Language;
  nativeLanguage: Language;
}

export interface Settings {
  /** Language of the pages the user reads / is learning. */
  learningLanguage: Language;
  /** Language the user speaks; translations go here. */
  nativeLanguage: Language;
  level: Level;
}

export interface HistoryItem {
  flashcard: Flashcard;
  pageUrl?: string;
  createdAt: number;
}

export interface Connection {
  token: string;
  email: string | null;
}
