"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { FlashCard } from "@/lib/flashcard.schema";
import { updateFlashcardProgressAction } from "@/app/actions/progress-actions";
import { useToast } from "@/components/ui/use-toast";
import { Flashcard } from "@/core/entities/Flashcard";
import { ErrorMessage } from "@/shared/ui/error-message";
import { SuccessStarAnimation } from "@/components/success-star-animation";
import { useDemoMode, updateDemoProgress } from "@/hooks/useDemoMode";

interface MultipleChoiceAnswersProps {
  card: FlashCard | Flashcard;
  isFlipped: boolean;
  onAnswer: (isCorrect: boolean) => void;
  otherFlashcards: (FlashCard | Flashcard)[];
  isGuestMode?: boolean;
}

export function MultipleChoiceAnswers({
  card,
  isFlipped,
  onAnswer,
  otherFlashcards,
  isGuestMode = false,
}: MultipleChoiceAnswersProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessStar, setShowSuccessStar] = useState(false);
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const correctAnswer = isFlipped ? card.translate_text : card.origin_text;

  useEffect(() => {
    setSelectedOption(null);
    setShowResults(false);
    setErrorMessage(null);

    const answerField = isFlipped ? "translate_text" : "origin_text";
    const currentCategory = card.category;

    // Distractors must be in the same languages (the extension category may mix language pairs).
    const sameLanguagePair = otherFlashcards.filter(
      (otherCard) =>
        otherCard.sourceLanguage === card.sourceLanguage &&
        otherCard.targetLanguage === card.targetLanguage
    );

    const sameCategory = sameLanguagePair.filter(
      (otherCard) => otherCard.category === currentCategory
    );

    const wrongAnswersPool = sameCategory
      .filter((otherCard) => otherCard[answerField] !== correctAnswer)
      .map((otherCard) => otherCard[answerField])
      .sort(() => Math.random() - 0.5);

    const wrongAnswers = wrongAnswersPool.slice(0, 3);

    if (wrongAnswers.length < 3) {
      const otherCategoriesAnswers = sameLanguagePair
        .filter((otherCard) => otherCard.category !== currentCategory)
        .filter((otherCard) => otherCard[answerField] !== correctAnswer)
        .map((otherCard) => otherCard[answerField])
        .sort(() => Math.random() - 0.5)
        .slice(0, 3 - wrongAnswers.length);

      wrongAnswers.push(...otherCategoriesAnswers);
    }

    const allOptions = [correctAnswer, ...wrongAnswers].sort(
      () => Math.random() - 0.5
    );

    setOptions(allOptions);
  }, [correctAnswer, otherFlashcards, isFlipped, card]);

  const handleSelectOption = async (option: string) => {
    if (showResults) return;

    setSelectedOption(option);
    setShowResults(true);
    setErrorMessage(null);

    const isCorrect = option === correctAnswer;

    if (isCorrect) {
      setShowSuccessStar(true);
    }

    onAnswer(isCorrect);

    if (isGuestMode) return;

    const flashcardId =
      "id" in card
        ? typeof card.id === "number"
          ? card.id
          : typeof card.id === "string"
          ? parseInt(card.id, 10)
          : null
        : null;

    if (flashcardId) {
      try {
        // If in demo mode, save to localStorage instead of server
        if (isDemoMode) {
          updateDemoProgress(flashcardId, card.category, isCorrect);
          // No need to show success message for demo mode
          return;
        }

        // Normal mode - save to server
        const result = await updateFlashcardProgressAction({
          flashcardId,
          isCorrect,
        });

        if (!result.success) {
          setErrorMessage("Wystąpił błąd podczas zapisywania postępu");
          toast({
            variant: "destructive",
            title: "Błąd aktualizacji postępu",
            description:
              result.error ||
              "Failed to save progress, but you can continue learning",
          });
        }
      } catch (error) {
        console.error("Progress update error:", error);
        const errorMessage =
          error instanceof Error
            ? `Progress update failed: ${error.message}`
            : "An unexpected error occurred while saving progress";

        setErrorMessage(errorMessage);
        toast({
          variant: "destructive",
          title: "Progress Update Error",
          description:
            "Connection issue detected, but you can continue learning",
        });
      }
    } else {
      setErrorMessage(
        "Nie można zaktualizować postępu - fiszka nie ma prawidłowego ID"
      );
    }
  };

  const letters = ["A", "B", "C", "D"];

  const getFontSizeClass = (textLength: number) => {
    if (textLength > 60) return "text-xs";
    if (textLength > 40) return "text-sm";
    return "text-sm sm:text-base";
  };

  const containerHeightClass = useMemo(() => {
    if (!options.length) return "min-h-[60px] sm:min-h-[60px]";

    const maxLength = Math.max(...options.map((option) => option.length));

    if (maxLength < 15) return "min-h-[50px] sm:min-h-[50px]";
    if (maxLength < 30) return "min-h-[60px] sm:min-h-[60px]";
    if (maxLength < 50) return "min-h-[70px] sm:min-h-[70px]";
    return "min-h-[80px] sm:min-h-[90px]";
  }, [options]);

  return (
    <div className="w-full mx-auto relative">
      <ErrorMessage
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />

      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <SuccessStarAnimation
          isVisible={showSuccessStar}
          onAnimationComplete={() => {
            setShowSuccessStar(false);
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {options.map((option, index) => {
          const isCorrect = option === correctAnswer;
          const isSelected = option === selectedOption;
          const fontSizeClass = getFontSizeClass(option.length);

          let gradientClass = "";
          const buttonClasses = `w-full ${containerHeightClass} py-2 sm:py-2.5 px-3 sm:px-4 text-left rounded-lg transition-colors duration-300 flex items-center`;

          if (showResults) {
            if (isCorrect) {
              gradientClass =
                "from-emerald-800/40 to-emerald-600/40 border-l-4 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
            } else if (isSelected) {
              gradientClass =
                "from-red-900/40 to-red-800/40 border-l-4 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
            } else {
              gradientClass =
                "from-gray-900/40 to-black/40 border-l-0 opacity-60";
            }
          } else {
            gradientClass =
              "from-violet-900/40 to-indigo-900/50 hover:from-violet-800/50 hover:to-indigo-700/60 border-l-0 hover:border-l-4 hover:border-l-purple-500";
          }

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="h-full"
            >
              <button
                onClick={() => handleSelectOption(option)}
                disabled={showResults}
                className={`${buttonClasses} bg-gradient-to-r ${gradientClass} backdrop-blur-md shadow-md overflow-hidden group h-full`}
              >
                <div className="flex items-start w-full">
                  <div className="font-bold text-purple-300 mr-2 text-base min-w-[20px] flex-shrink-0 mt-0.5">
                    {letters[index]}.
                  </div>
                  <span
                    className={`text-white font-medium pl-1 break-words hyphens-auto ${fontSizeClass}`}
                  >
                    {option}
                  </span>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
