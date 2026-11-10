"use server";

import { auth } from "@/lib/auth";
import {
  getGenerateFlashcardsUseCase,
  getDeleteCategoryUseCase,
  getUserLanguagesUseCase,
  getImportGuestFlashcardsUseCase,
  getHandleGuestFlashcardGenerationUseCase,
  getFlashcardRepository,
} from "@/lib/container";
import { GenerateFlashcardsParams } from "@/core/useCases/flashcards/GenerateFlashcards";
import { isDemoMode } from "@/lib/demo-helpers";
import { EXTENSION_CATEGORY, isExtensionCategory } from "@/lib/extension-category";
import { 
  ImportableFlashcard, 
  FlashcardGenerationResponse, 
  GenerateFlashcardsActionParams
} from "@/types/flashcard";

export async function generateFlashcardsAction(
  params: GenerateFlashcardsActionParams
) {
  try {
    // Check if in demo mode - if so, don't save to database
    if (await isDemoMode()) {
      return {
        success: false,
        error: "Demo mode: Please sign in to generate and save flashcards",
      };
    }

    const { count, message, level, sourceLanguage, targetLanguage } = params;
    const { userId, user } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Authentication required: User is not signed in",
      };
    }

    const generateParams: GenerateFlashcardsParams = {
      count,
      message,
      level,
      userId,
      userEmail: user?.email || "",
      sourceLanguage,
      targetLanguage,
    };

    const result = await getGenerateFlashcardsUseCase().execute(generateParams);

    return result;
  } catch (error) {
    console.error("Flashcard generation error:", error);
    return {
      success: false,
      error: `Flashcard generation failed: ${
        error instanceof Error ? error.message : "Unknown error occurred"
      }`,
    };
  }
}

export async function deleteCategoryAction(category: string) {
  try {
    // Check if in demo mode - if so, don't delete from database
    if (await isDemoMode()) {
      return {
        success: false,
        error: "Demo mode: Please sign in to delete categories",
      };
    }

    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Authentication required: User is not signed in",
      };
    }

    const result = await getDeleteCategoryUseCase().execute({ userId, category });

    return result;
  } catch (error) {
    console.error("Category deletion error:", error);
    return {
      success: false,
      error: `Category deletion failed: ${
        error instanceof Error ? error.message : "Unknown error occurred"
      }`,
    };
  }
}

export async function getUserLanguagesAction() {
  try {
    // Check if in demo mode - if so, return mock data
    if (await isDemoMode()) {
      return {
        success: true,
        languages: ["en", "es", "de"], // Mock languages for demo
      };
    }

    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Authentication required: User is not signed in",
        languages: [],
      };
    }

    const result = await getUserLanguagesUseCase().execute({ userId });

    return result;
  } catch (error) {
    console.error("Get user languages error:", error);
    return {
      success: false,
      error: `Failed to get languages: ${
        error instanceof Error ? error.message : "Unknown error occurred"
      }`,
      languages: [],
    };
  }
}

export async function importGuestFlashcardsAction(
  flashcards: ImportableFlashcard[]
) {
  const { userId, user } = await auth();

  if (!userId || !user) {
    return {
      success: false,
      error: "User not authenticated",
    };
  }

  try {
    const result = await getImportGuestFlashcardsUseCase().execute({
      userId,
      userEmail: user.email || "",
      flashcards,
    });

    return result;
  } catch (error) {
    console.error("Error importing guest flashcards:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error during import",
    };
  }
}

export async function handleGuestFlashcardGeneration(data: {
  count: number;
  message: string;
  level: string;
  sourceLanguage: string;
  targetLanguage: string;
  existingFlashcards?: Array<{origin_text: string, translate_text: string}>;
  recaptchaToken?: string;
}): Promise<FlashcardGenerationResponse> {
  try {
    const result = await getHandleGuestFlashcardGenerationUseCase().execute(data);
    
    // Add redirect for successful generation
    if (result.success) {
      return {
        ...result,
        redirect: "/guest-flashcard",
      };
    }
    
    return result;
  } catch (error) {
    console.error("Guest flashcard generation error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during flashcard generation",
    };
  }
}

export async function generateMoreFlashcardsAction(params: {
  category: string;
  existingTerms: string[];
  count: number;
  sourceLanguage: string;
  targetLanguage: string;
  difficultyLevel: string;
}) {
  try {
    // Check if in demo mode - if so, don't save to database
    if (await isDemoMode()) {
      return {
        success: false,
        error: "Demo mode: Please sign in to generate more flashcards",
      };
    }

    if (isExtensionCategory(params.category)) {
      return {
        success: false,
        error: "Flashcards in this category are added from the browser extension",
      };
    }

    const { userId, user } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Authentication required: User is not signed in",
      };
    }

    const {
      category,
      existingTerms,
      count,
      sourceLanguage,
      targetLanguage,
      difficultyLevel,
    } = params;

    // Prepare existing flashcards data for duplicate prevention
    const existingFlashcards = [
      // Add terms from existingTerms parameter (may come from frontend)
      ...existingTerms.map(term => ({
        origin_text: term,
        translate_text: term // Placeholder, will be filtered out by AI
      }))
    ];

    // Step 3: Use the enhanced generation with retry mechanism
    const message = `Generate more flashcards for the existing category "${category}". Focus on expanding vocabulary in this topic area with diverse, unique terms.`;

    const result = await getGenerateFlashcardsUseCase().generateMoreFlashcards({
      count,
      message,
      level: difficultyLevel,
      userId,
      userEmail: user?.email || "",
      sourceLanguage,
      targetLanguage, 
      category,
      existingFlashcards,
    });

    return result;
  } catch (error) {
    console.error("Additional flashcards generation error:", error);
    return {
      success: false,
      error: `Additional flashcards generation failed: ${
        error instanceof Error ? error.message : "Unknown error occurred"
      }`,
    };
  }
}

export async function generateMoreGuestFlashcardsAction(params: {
  category: string;
  existingTerms: string[];
  count: number;
  sourceLanguage: string;
  targetLanguage: string;
  difficultyLevel: string;
}): Promise<FlashcardGenerationResponse> {
  try {
    const {
      category,
      existingTerms,
      count,
      sourceLanguage,
      targetLanguage,
      difficultyLevel,
    } = params;

    // Step 1: Create comprehensive list of existing terms to prevent duplicates
    const existingFlashcards = existingTerms.map(term => ({
      origin_text: term,
      translate_text: term // Placeholder, exact matching will be done by AI
    }));

    // Step 2: Try up to 3 times to generate unique flashcards
    const maxAttempts = 3;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const message = `Generate more flashcards for the existing category "${category}". Focus on expanding vocabulary in this topic area with diverse, unique terms.`;
      
      try {
        const result = await handleGuestFlashcardGeneration({
          count,
          message,
          level: difficultyLevel,
          sourceLanguage,
          targetLanguage,
          existingFlashcards,
          recaptchaToken: undefined, // No recaptcha needed for generateMore
        });

        if (result.success && result.flashcards) {
          // Step 3: Validate and filter duplicates
          const uniqueFlashcards = result.flashcards.filter(card => 
            !existingTerms.some(term => 
              term.toLowerCase() === card.origin_text.toLowerCase() ||
              term.toLowerCase() === card.translate_text.toLowerCase()
            )
          );

          if (uniqueFlashcards.length > 0) {
            // Step 4: Ensure all flashcards have the correct category
            const flashcardsWithCategory = uniqueFlashcards.map((card) => ({
              ...card,
              category: category, // Force the exact category name
            }));

            return {
              success: true,
              flashcards: flashcardsWithCategory,
            };
          } else if (attempt < maxAttempts) {
            console.log(`Guest attempt ${attempt}: All generated flashcards were duplicates, retrying...`);
            lastError = `Wszystkie wygenerowane fiszki były duplikatami (próba ${attempt}/${maxAttempts})`;
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
        } else if (attempt < maxAttempts) {
          lastError = result.error || "Nieznany błąd podczas generowania";
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
      } catch (error) {
        console.error(`Guest generate more flashcards attempt ${attempt} error:`, error);
        lastError = error instanceof Error ? error.message : "Nieznany błąd";
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    return {
      success: false,
      error: `Nie udało się wygenerować unikalnych fiszek po ${maxAttempts} próbach. Ostatni błąd: ${lastError}`,
    };

  } catch (error) {
    console.error("Additional guest flashcards generation error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during guest flashcard generation",
    };
  }
}

/** Deletes a single flashcard. Only cards from the extension category can be deleted one by one. */
export async function deleteExtensionFlashcardAction(flashcardId: number) {
  try {
    // Server actions are public endpoints — never trust the argument's type.
    if (!Number.isSafeInteger(flashcardId) || flashcardId <= 0) {
      return { success: false, error: "Invalid flashcard id" };
    }

    if (await isDemoMode()) {
      return { success: false, error: "Demo mode: Please sign in to delete flashcards" };
    }

    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required: User is not signed in" };
    }

    const deleted = await getFlashcardRepository().deleteUserFlashcardInCategory(
      userId,
      flashcardId,
      EXTENSION_CATEGORY
    );

    return deleted
      ? { success: true }
      : { success: false, error: "Flashcard not found" };
  } catch (error) {
    console.error("Delete flashcard error:", error);
    return { success: false, error: "Failed to delete flashcard" };
  }
}
