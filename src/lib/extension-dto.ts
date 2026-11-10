import { Flashcard } from "@/core/entities/Flashcard";

/**
 * Flashcard shape returned to the browser extension, named by meaning rather than by the
 * DB columns: `term` is the learned-language side shown on the front of the card.
 */
export function toExtensionFlashcard(flashcard: Flashcard) {
  return {
    id: flashcard.id,
    term: flashcard.translate_text,
    translation: flashcard.origin_text,
    example: flashcard.translate_example,
    exampleTranslation: flashcard.example_using,
    learningLanguage: flashcard.targetLanguage,
    nativeLanguage: flashcard.sourceLanguage,
  };
}
