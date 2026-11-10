import { Flashcard } from "@/core/entities/Flashcard";
import { CategoryProgress } from "@/types/progress";

export interface FlashcardRepository {
  getFlashcardsByUserId(userId: string): Promise<Flashcard[]>;
  createFlashcard(flashcard: Omit<Flashcard, "id">): Promise<Flashcard>;
  deleteFlashcardsByCategory(userId: string, category: string): Promise<number>;
  getUserTargetLanguages(userId: string): Promise<string[]>;
  /** Finds a card by its term in the learned language (translate_text), case-insensitive. */
  findUserFlashcardByTerm(
    userId: string,
    term: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Flashcard | null>;
  /** Deletes one of the user's cards from the given category. Returns false if nothing matched. */
  deleteUserFlashcardInCategory(userId: string, flashcardId: number, category: string): Promise<boolean>;
  countUserFlashcardsCreatedSince(userId: string, since: Date): Promise<number>;
  getUserFlashcardStats(userId: string): Promise<{
    totalFlashcards: number;
    masteredFlashcards: number;
    inProgressFlashcards: number;
    untouchedFlashcards: number;
    categories: CategoryProgress[];
  }>;
} 