/**
 * Reserved, permanent category for flashcards created from the browser extension
 * (single words/phrases selected on web pages). Stored as-is in Flashcard.category;
 * the UI shows a localized name (Extension.categoryName) instead of this key.
 * Safe to import from client components.
 */
export const EXTENSION_CATEGORY = "__languito_extension__";

export const isExtensionCategory = (category: string | null | undefined): boolean =>
  category === EXTENSION_CATEGORY;
