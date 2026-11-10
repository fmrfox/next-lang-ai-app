"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Flashcard } from "@/core/entities/Flashcard";
import { speak } from "@/utils/speak";
import { SupportedTTSLanguage } from "@/types/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenerateFlashcardsDialog } from "@/components/generate-flashcards-dialog";
import { AIGenerationLoader } from "@/components/ui/ai-generation-loader";

const langToTTSMap: Record<string, SupportedTTSLanguage> = {
  en: "en-US",
  pl: "pl-PL",
  es: "es-ES",
  it: "it-IT",
};

interface FlashcardGridProps {
  cards: Flashcard[];
  onGenerateFlashcards?: (category: string) => void;
  /** When set, each card gets a delete button (used for the extension category). */
  onDeleteCard?: (card: Flashcard) => void;
}

export function FlashcardGrid({
  cards,
  onGenerateFlashcards,
  onDeleteCard,
}: FlashcardGridProps) {
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleCard = (index: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleGenerateButtonClick = () => {
    const defaultCategory =
      cards.length > 0 ? cards[0].category : "New Category";
    setSelectedCategory(defaultCategory);
    setIsGenerateDialogOpen(true);
  };

  const handleConfirmGenerate = () => {
    if (selectedCategory && onGenerateFlashcards) {
      setIsGenerateDialogOpen(false);
      setIsGenerating(true);

      const handleGeneration = async () => {
        try {
          await onGenerateFlashcards(selectedCategory);
        } finally {
          setIsGenerating(false);
        }
      };

      handleGeneration();
    }
  };

  return (
    <>
      {isGenerating && <AIGenerationLoader />}

      <ScrollArea className="h-[calc(100vh-80px)] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 pb-16">
          {onGenerateFlashcards && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="aspect-[3/2] relative cursor-pointer [perspective:1000px] group"
            onClick={handleGenerateButtonClick}
          >
            <div className="w-full h-full">
              <div className="h-full bg-gradient-to-br from-purple-950/95 to-purple-900/95 border-purple-600/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] backdrop-blur-md rounded-xl p-6 flex flex-col group hover:border-purple-500 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:bg-gradient-to-br hover:from-purple-900/95 hover:to-purple-800/95 transition-all duration-300 overflow-hidden">
                <motion.div
                  className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none group-hover:opacity-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.1 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-fuchsia-500/20 to-purple-600/30 blur-xl" />
                </motion.div>

                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10">
                  <div className="flex items-center gap-2 mb-2 group-hover:scale-110 transition-transform duration-300">
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="text-fuchsia-400 group-hover:text-fuchsia-300"
                    >
                      <Sparkles className="h-5 w-5" />
                    </motion.div>
                  </div>

                  <h3 className="text-lg sm:text-2xl font-bold text-fuchsia-100 group-hover:text-white transition-colors duration-300">
                    Generate New Flashcards
                  </h3>

                  <p className="text-purple-200/80 text-center text-sm group-hover:text-purple-100 transition-colors duration-300">
                    Create more flashcards for the
                    <br />
                    <span className="font-medium text-fuchsia-300 group-hover:text-fuchsia-200 transition-colors duration-300">
                      {cards.length > 0 ? `"${cards[0].category}"` : ""}
                    </span>{" "}
                    category
                  </p>
                </div>

                <div className="mt-auto pt-4 text-xs text-fuchsia-400/70 border-t border-purple-500/20 group-hover:border-purple-400/30 flex items-center justify-center relative z-10 group-hover:text-fuchsia-300 transition-all duration-300">
                  <Plus className="h-3 w-3 mr-1 group-hover:scale-110 transition-transform duration-300" />{" "}
                  Click to generate
                </div>
              </div>
            </div>
          </motion.div>
          )}

          {cards.map((card, index) => {
            const targetTTS = langToTTSMap[card.targetLanguage] || "en-US";

            return (
              <motion.div
                key={card.id ?? index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.1 }}
                className="aspect-[3/2] relative cursor-pointer [perspective:1000px] group"
                onClick={() => toggleCard(index)}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
                {onDeleteCard && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 z-20 h-8 w-8 rounded-full bg-black/60 border border-white/10 text-gray-300 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCard(card);
                    }}
                    aria-label="Delete flashcard"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                <motion.div
                  className="w-full h-full relative [transform-style:preserve-3d] transition-transform duration-150"
                  animate={{ rotateY: flippedCards[index] ? 180 : 0 }}
                >
                  <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                    <div className="h-full bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-6 flex flex-col group hover:border-purple-500/50 transition-all duration-300 hover:bg-black/50 hover:shadow-2xl overflow-hidden">
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                        <h3 className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/80">
                          {card.translate_text}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(card.translate_text, targetTTS);
                          }}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center justify-center gap-1 w-full">
                          <div className="text-gray-300 text-center italic text-sm line-clamp-2">
                            &quot;{card.translate_example}&quot;
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              speak(card.translate_example, targetTTS);
                            }}
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-auto pt-3 text-xs text-gray-400 border-t border-white/10">
                        Click to flip
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="h-full bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-6 flex flex-col group hover:border-purple-500/50 transition-all duration-300 hover:bg-black/50 hover:shadow-2xl overflow-hidden">
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                        <h3 className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/80">
                          {card.origin_text}
                        </h3>
                        <div className="text-gray-300 text-center italic text-sm line-clamp-2">
                          &quot;{card.example_using}&quot;
                        </div>
                      </div>

                      <div className="mt-auto pt-3 text-xs text-gray-400 border-t border-white/10">
                        Click to flip
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      <GenerateFlashcardsDialog
        isOpen={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onConfirm={handleConfirmGenerate}
        categoryName={selectedCategory}
        isGenerating={isGenerating}
      />
    </>
  );
}
