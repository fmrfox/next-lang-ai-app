import { Flashcard } from "@/core/entities/Flashcard";
import { FlashcardRepository } from "@/core/interfaces/repositories/FlashcardRepository";
import { AIFlashcardGenerationService, FlashcardProgressService } from "@/core/services";
import { getSelectionFlashcardPrompt, SupportedLanguage } from "@/lib/extension-prompts";
import { EXTENSION_CATEGORY } from "@/lib/extension-category";

export const MAX_SELECTION_LENGTH = 300;
export const MAX_CONTEXT_LENGTH = 600;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_FLASHCARDS = 20;
const MAX_FIELD_LENGTH = 500;

const clip = (value: string) => value.trim().slice(0, MAX_FIELD_LENGTH);

export interface GenerateFlashcardFromSelectionParams {
  userId: string;
  text: string;
  context?: string;
  learningLanguage: SupportedLanguage;
  nativeLanguage: SupportedLanguage;
  level: "easy" | "advanced";
}

export type GenerateFlashcardFromSelectionResult =
  | { success: true; duplicate: boolean; flashcard: Flashcard }
  | {
      success: false;
      code: "invalid_input" | "rate_limited" | "generation_failed";
      error: string;
    };

/** Collapse whitespace and strip quotes/punctuation that commonly sneak into a selection. */
export function normalizeSelection(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'„“”‘’«»()[\]{}.,;:!?…\-–—\s]+/, "")
    .replace(/["'„“”‘’«»()[\]{}.,;:…\-–—\s]+$/, "")
    .trim();
}

export class GenerateFlashcardFromSelectionUseCase {
  constructor(
    private flashcardRepository: FlashcardRepository,
    private aiGenerationService: AIFlashcardGenerationService,
    private progressService: FlashcardProgressService
  ) {}

  async execute(
    params: GenerateFlashcardFromSelectionParams
  ): Promise<GenerateFlashcardFromSelectionResult> {
    const { userId, learningLanguage, nativeLanguage, level } = params;
    // App convention: sourceLanguage = native language, targetLanguage = learned language.
    const sourceLanguage = nativeLanguage;
    const targetLanguage = learningLanguage;
    const text = normalizeSelection(params.text);
    const context = params.context?.replace(/\s+/g, " ").trim().slice(0, MAX_CONTEXT_LENGTH);

    if (!text || text.length > MAX_SELECTION_LENGTH) {
      return { success: false, code: "invalid_input", error: "Selection is empty or too long" };
    }
    if (sourceLanguage === targetLanguage) {
      return { success: false, code: "invalid_input", error: "Languages must differ" };
    }

    // Cheap duplicate check before spending an AI call.
    const existing = await this.flashcardRepository.findUserFlashcardByTerm(
      userId,
      text,
      sourceLanguage,
      targetLanguage
    );
    if (existing) return { success: true, duplicate: true, flashcard: existing };

    const recent = await this.flashcardRepository.countUserFlashcardsCreatedSince(
      userId,
      new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
    );
    if (recent >= RATE_LIMIT_MAX_FLASHCARDS) {
      return { success: false, code: "rate_limited", error: "Too many flashcards, try again in a minute" };
    }

    let generated;
    try {
      const prompt = getSelectionFlashcardPrompt({
        selection: text,
        context: context || undefined,
        learningLanguage,
        nativeLanguage,
        level,
      });
      [generated] = await this.aiGenerationService.generateFlashcardsWithAI(prompt, 2);
    } catch (error) {
      console.error("Extension flashcard generation error:", error);
    }

    if (!generated?.translate_text.trim() || !generated.origin_text.trim()) {
      return { success: false, code: "generation_failed", error: "Could not generate flashcard" };
    }

    // The AI may normalise the text (e.g. to the dictionary form) — check duplicates again.
    if (generated.translate_text.toLowerCase() !== text.toLowerCase()) {
      const existingNormalized = await this.flashcardRepository.findUserFlashcardByTerm(
        userId,
        generated.translate_text,
        sourceLanguage,
        targetLanguage
      );
      if (existingNormalized) {
        return { success: true, duplicate: true, flashcard: existingNormalized };
      }
    }

    const flashcard = await this.flashcardRepository.createFlashcard({
      origin_text: clip(generated.origin_text),
      translate_text: clip(generated.translate_text),
      example_using: clip(generated.example_using),
      translate_example: clip(generated.translate_example),
      // Permanent, pinned category; the UI shows a localized name for it.
      category: EXTENSION_CATEGORY,
      translate_category: EXTENSION_CATEGORY,
      sourceLanguage,
      targetLanguage,
      difficultyLevel: level,
      userId,
    });
    await this.progressService.createProgressRecord(flashcard.id, userId);

    return { success: true, duplicate: false, flashcard };
  }
}
