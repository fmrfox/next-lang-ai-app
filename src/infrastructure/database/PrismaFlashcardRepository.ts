import { PrismaClient } from "@prisma/client";
import { Flashcard } from "@/core/entities/Flashcard";
import { FlashcardRepository } from "@/core/interfaces/repositories/FlashcardRepository";
import { prisma } from "@/lib/prisma"; // Use secure configured client
import { CategoryProgress } from "@/types/progress";
import { Decimal } from "@prisma/client/runtime/library";

export class PrismaFlashcardRepository implements FlashcardRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma; // Use imported secure client instead of new instance
  }

  async getFlashcardsByUserId(userId: string): Promise<Flashcard[]> {
    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        userId
      }
    });

    // Handle legacy records without translate_category
    return flashcards.map(flashcard => ({
      ...flashcard,
      translate_category: flashcard.translate_category || flashcard.category
    } as Flashcard));
  }

  async createFlashcard(flashcard: Omit<Flashcard, "id">): Promise<Flashcard> {
    const { 
      origin_text, 
      translate_text, 
      example_using, 
      translate_example, 
      category, 
      translate_category,
      userId, 
      sourceLanguage, 
      targetLanguage, 
      difficultyLevel 
    } = flashcard;

    return await this.prisma.flashcard.create({
      data: {
        origin_text,
        translate_text,
        example_using,
        translate_example,
        category,
        translate_category,
        userId,
        sourceLanguage,
        targetLanguage,
        difficultyLevel
      }
    }) as Flashcard;
  }
  
  async findUserFlashcardByTerm(
    userId: string,
    term: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Flashcard | null> {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: {
        userId,
        sourceLanguage,
        targetLanguage,
        translate_text: { equals: term, mode: "insensitive" },
      },
    });

    if (!flashcard) return null;

    return {
      ...flashcard,
      translate_category: flashcard.translate_category || flashcard.category,
    } as Flashcard;
  }

  async deleteUserFlashcardInCategory(
    userId: string,
    flashcardId: number,
    category: string
  ): Promise<boolean> {
    const { count } = await this.prisma.flashcard.deleteMany({
      where: { id: flashcardId, userId, category },
    });
    return count > 0;
  }

  async countUserFlashcardsCreatedSince(userId: string, since: Date): Promise<number> {
    return this.prisma.flashcard.count({
      where: { userId, createdAt: { gte: since } },
    });
  }

  async deleteFlashcardsByCategory(userId: string, category: string): Promise<number> {
    try {
      const result = await this.prisma.flashcard.deleteMany({
        where: {
          userId,
          category
        }
      });
      
      return result.count;
    } catch (error) {
      console.error("Category deletion database error:", error);
      return 0;
    }
  }
  
  async getUserTargetLanguages(userId: string): Promise<string[]> {
    try {
      const languages = await this.prisma.flashcard.findMany({
        where: { userId },
        select: { targetLanguage: true },
        distinct: ['targetLanguage']
      });
      
      return languages.map(lang => lang.targetLanguage);
    } catch (error) {
      console.error("Get user languages database error:", error);
      return [];
    }
  }
  
  async getUserFlashcardStats(userId: string): Promise<{
    totalFlashcards: number;
    masteredFlashcards: number;
    inProgressFlashcards: number;
    untouchedFlashcards: number;
    categories: CategoryProgress[];
  }> {
    try {
      // 1. Get overall flashcard counts with different levels
      type StatsResult = {
        total: bigint;
        mastered: bigint;
        in_progress: bigint;
        untouched: bigint;
      }[];

      const overallStats = await this.prisma.$queryRaw<StatsResult>`
        SELECT
          COUNT(f.id) as total,
          COUNT(CASE WHEN p."masteryLevel" >= 4 THEN 1 END) as mastered,
          COUNT(CASE WHEN p."masteryLevel" BETWEEN 1 AND 3 THEN 1 END) as in_progress,
          COUNT(CASE WHEN p."masteryLevel" IS NULL OR p."masteryLevel" = 0 THEN 1 END) as untouched
        FROM "Flashcard" f
        LEFT JOIN "Progress" p ON f.id = p."flashcardId" AND p."userId" = ${userId}
        WHERE f."userId" = ${userId}
      `;

      // 2. Get statistics for each category
      type CategoryStatsResult = {
        category: string;
        total: bigint;
        mastered: bigint;
        in_progress: bigint;
        untouched: bigint;
        avg_mastery: number | Decimal | null; // Handles different types returned by SQL
      }[];

      const categoryStats = await this.prisma.$queryRaw<CategoryStatsResult>`
        SELECT
          f.category,
          COUNT(f.id) as total,
          COUNT(CASE WHEN p."masteryLevel" >= 4 THEN 1 END) as mastered,
          COUNT(CASE WHEN p."masteryLevel" BETWEEN 1 AND 3 THEN 1 END) as in_progress,
          COUNT(CASE WHEN p."masteryLevel" IS NULL OR p."masteryLevel" = 0 THEN 1 END) as untouched,
          COALESCE(AVG(CAST(p."masteryLevel" AS FLOAT)), 0) as avg_mastery
        FROM "Flashcard" f
        LEFT JOIN "Progress" p ON f.id = p."flashcardId" AND p."userId" = ${userId}
        WHERE f."userId" = ${userId}
        GROUP BY f.category
        ORDER BY f.category
      `;

      // 3. Format output data - convert all values to native JS types
      const categories: CategoryProgress[] = categoryStats.map(cat => {
        // Ensure avg_mastery is always a number
        let avgMastery: number;
        if (typeof cat.avg_mastery === 'number') {
          avgMastery = cat.avg_mastery;
        } else if (cat.avg_mastery === null) {
          avgMastery = 0;
        } else {
          // Handle different types that may appear (e.g., Decimal)
          avgMastery = Number(cat.avg_mastery.toString());
        }

        return {
          name: cat.category,
          total: Number(cat.total),
          mastered: Number(cat.mastered),
          inProgress: Number(cat.in_progress),
          untouched: Number(cat.untouched),
          averageMasteryLevel: avgMastery
        };
      });

      return {
        totalFlashcards: Number(overallStats[0]?.total || 0),
        masteredFlashcards: Number(overallStats[0]?.mastered || 0),
        inProgressFlashcards: Number(overallStats[0]?.in_progress || 0),
        untouchedFlashcards: Number(overallStats[0]?.untouched || 0),
        categories
      };
    } catch (error) {
      console.error("Error fetching flashcard stats:", error);
      // Return default data in case of error
      return {
        totalFlashcards: 0,
        masteredFlashcards: 0,
        inProgressFlashcards: 0,
        untouchedFlashcards: 0,
        categories: []
      };
    }
  }
} 