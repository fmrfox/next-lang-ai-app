import { FlashcardRepository } from "@/core/interfaces/repositories/FlashcardRepository";
import { isExtensionCategory } from "@/lib/extension-category";

export interface DeleteCategoryParams {
  userId: string;
  category: string;
}

export interface DeleteCategoryResult {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

export class DeleteCategoryUseCase {
  constructor(private flashcardRepository: FlashcardRepository) {}

  async execute(params: DeleteCategoryParams): Promise<DeleteCategoryResult> {
    try {
      const { userId, category } = params;

      if (!userId) {
        return {
          success: false,
          error: "Authentication required: User is not signed in",
        };
      }

      if (isExtensionCategory(category)) {
        return {
          success: false,
          error: "This category is permanent and cannot be deleted",
        };
      }

      const deletedCount = await this.flashcardRepository.deleteFlashcardsByCategory(
        userId,
        category
      );

      return {
        success: true,
        deletedCount,
      };
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
} 