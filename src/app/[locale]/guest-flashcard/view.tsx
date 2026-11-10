"use client";

import { useState, useEffect } from "react";
import { FlashcardsSidebar } from "@/components/flashcards-sidebar";
import { Button } from "@/components/ui/button";
import { Grid, Maximize2, PlusCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FlashcardView } from "@/components/flaschard-view";
import { FlashcardGrid } from "@/components/flashcard-grid";
import { TopBar } from "@/components/ui/top-bar";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Flashcard } from "@/core/entities/Flashcard";
import { ErrorMessage } from "@/shared/ui/error-message";
import { UserProgressStats } from "@/types/progress";
import { LoginPromptPopup } from "@/components/login-prompt-popup";
import { guestFlashcardsStorage } from "@/utils/guest-flashcards-storage";
import { toast } from "@/components/ui/use-toast";
import { generateMoreGuestFlashcardsAction } from "@/app/actions/flashcard-actions";
import { useTranslations } from "next-intl";

interface GuestFlashcardsViewProps {
  initialFlashcards?: Flashcard[];
  serverError?: string;
  initialCategory?: string | null;
  progressStats?: {
    success: boolean;
    data?: UserProgressStats;
    error?: string;
  };
}

export default function GuestFlashcardsView({
  initialFlashcards = [],
  serverError,
  initialCategory,
  progressStats,
}: GuestFlashcardsViewProps) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category");

  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryFromUrl
      ? decodeURIComponent(categoryFromUrl)
      : initialCategory || null
  );

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [error, setError] = useState<string | null>(serverError || null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState("");
  const [isImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const storedFlashcards = guestFlashcardsStorage.getFlashcards();
    if (storedFlashcards.length > 0) {
      setFlashcards(storedFlashcards);
    }
  }, []);

  useEffect(() => {
    if (flashcards.length > 0 && !selectedCategory && !categoryFromUrl) {
      const categories = [...new Set(flashcards.map((card) => card.category))];
      if (categories.length > 0) {
        setSelectedCategory(categories[0]);
      }
    }
  }, [flashcards, selectedCategory, categoryFromUrl]);

  useEffect(() => {
    setCurrentCardIndex(0);
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategory) {
      const params = new URLSearchParams(window.location.search);
      params.set("category", selectedCategory);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({}, "", newUrl);
    }
  }, [selectedCategory]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsSidebarCollapsed(isMobile);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNext = () => {
    if (currentCardIndex < categoryCards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setCurrentCardIndex(0);
    }
  };

  const handleNewFlashcardsClick = () => {
    setLoginPromptMessage(
      "Sign in to generate multiple categories of flashcards! As a guest, you can only create one category."
    );
    setShowLoginPrompt(true);
  };

  const handleImportAndSignIn = async () => {
    setLoginPromptMessage(
      "To save your flashcards, you must log in or create a free account. This will allow you to access them anytime, from any device."
    );
    setShowLoginPrompt(true);
  };

  const handleProgressClick = () => {
    setLoginPromptMessage(
      "Sign in to access detailed progress statistics and track your learning journey!"
    );
    setShowLoginPrompt(true);
  };

  const handleLanguageSelectClick = () => {
    setLoginPromptMessage(
      "Sign in to manage your languages and create flashcards in various languages!"
    );
    setShowLoginPrompt(true);
  };

  const handleLearningFilterClick = () => {
    setLoginPromptMessage(
      "Sign in to track your learning progress and filter categories by mastery level!"
    );
    setShowLoginPrompt(true);
  };

  const handleBackToHome = () => {
    router.push("/");
  };

  const handleGenerateFlashcards = async (category: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const existingFlashcards = flashcards.filter(
        (card) => card.category === category
      );

      const targetLanguage = existingFlashcards[0]?.targetLanguage || "en";
      const sourceLanguage = existingFlashcards[0]?.sourceLanguage || "pl";
      const difficultyLevel = existingFlashcards[0]?.difficultyLevel || "easy";

      const existingTerms = Array.from(
        new Set(
          existingFlashcards.map((card) => card.origin_text.toLowerCase())
        )
      );

      const result = await generateMoreGuestFlashcardsAction({
        category,
        existingTerms,
        count: 10,
        sourceLanguage,
        targetLanguage,
        difficultyLevel,
      });

      if (result.success && result.flashcards) {
        const updatedFlashcards = guestFlashcardsStorage.addMoreFlashcardsToCategory(
          result.flashcards,
          category
        );
        setFlashcards(updatedFlashcards);

        toast({
          title: "Flashcards Added",
          description: `Successfully added ${result.flashcards.length} new flashcards to the "${category}" category.`,
          variant: "success",
          duration: 1000,
        });
      } else {
        setError(result.error || "Failed to generate new flashcards");

        toast({
          title: "Error",
          description: result.error || "Failed to generate new flashcards",
          variant: "destructive",
          duration: 1000,
        });
      }
    } catch (error) {
      console.error("Error generating additional flashcards:", error);
      const errorMessage =
        error instanceof Error
          ? `Flashcard generation failed: ${error.message}`
          : "An unexpected error occurred during flashcard generation";

      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categoryCards = selectedCategory
    ? flashcards.filter((card) => card.category === selectedCategory)
    : flashcards;

  const currentCard = categoryCards[currentCardIndex] ?? null;

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        ></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md mx-auto px-4 relative z-10"
        >
          <div className="inline-block p-3 bg-purple-500/10 rounded-full mb-6">
            <motion.div
              animate={{
                rotate: [0, 10, 0, -10, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut",
              }}
            >
              <PlusCircle className="h-12 w-12 text-purple-400" />
            </motion.div>
          </div>

          <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
            No Flashcards Yet
          </h2>

          <p className="text-gray-300 mb-8 text-lg">
            It looks like you haven&apos;t created any flashcards yet. Head back
            to the main page to generate your first set of interactive
            flashcards!
          </p>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => router.push("/")}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-lg px-6 py-6 rounded-lg shadow-lg shadow-purple-500/20"
            >
              Create Your First Flashcards
            </Button>
          </motion.div>

          <p className="text-purple-400 text-sm mt-6">
            <motion.span
              animate={{
                opacity: [1, 0.6, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut",
              }}
            >
              Start your language learning journey today!
            </motion.span>
          </p>
        </motion.div>

        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center z-50 bg-black/30 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-black text-white flex flex-col overflow-hidden">
      <LoginPromptPopup
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message={loginPromptMessage}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <div
          className={`
          fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
          md:relative md:inset-auto md:h-full md:transform-none
          ${
            isSidebarCollapsed
              ? "-translate-x-full md:translate-x-0"
              : "translate-x-0"
          }
        `}
        >
          <FlashcardsSidebar
            selectedCategory={selectedCategory}
            onSelectCategory={(category) => {
              setSelectedCategory(category);
              if (window.innerWidth < 768) {
                setIsSidebarCollapsed(true);
              }
            }}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            flashcards={flashcards}
            variant="guest"
            onLanguageSelectClick={handleLanguageSelectClick}
            onNewFlashcardsClick={handleNewFlashcardsClick}
            onLearningFilterClick={handleLearningFilterClick}
            onFlashcardsUpdate={(updatedFlashcards) => {
              setFlashcards(updatedFlashcards);
              if (
                updatedFlashcards.length > 0 &&
                !updatedFlashcards.some(
                  (card) => card.category === selectedCategory
                )
              ) {
                const categories = [
                  ...new Set(updatedFlashcards.map((card) => card.category)),
                ];
                if (categories.length > 0) {
                  setSelectedCategory(categories[0]);
                } else {
                  setSelectedCategory(null);
                }
              }
            }}
            onImportAndSignIn={handleImportAndSignIn}
            isImporting={isImporting}
          />
        </div>
        
        {!isSidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <ErrorMessage message={error} onClose={() => setError(null)} />

          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}

          {selectedCategory || flashcards.length > 0 ? (
            <>
              <div className="flex justify-between items-center mt-2 mb-1 flex-shrink-0 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToHome}
                  className="text-white hover:text-white bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all duration-300 flex items-center gap-2 rounded-lg"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm">{t('PrivacyPolicy.backHome')}</span>
                </Button>

                <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`text-white hover:bg-purple-500/20 transition-colors ${
                      viewMode === "single" ? "bg-purple-500/20" : ""
                    }`}
                    onClick={() => setViewMode("single")}
                  >
                    <Maximize2 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`text-white hover:bg-purple-500/20 transition-colors ${
                      viewMode === "grid" ? "bg-purple-500/20" : ""
                    }`}
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-5 w-5" />
                  </Button>
                </div>

                <div className="w-20"></div>
              </div>

              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={viewMode}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-hidden"
                  >
                    {viewMode === "single" ? (
                      currentCard ? (
                        <FlashcardView
                          card={currentCard}
                          onNext={handleNext}
                          allFlashcards={flashcards}
                          isGuestMode={true}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
                          <p className="text-gray-400">
                            No flashcards available for this category.
                          </p>
                        </div>
                      )
                    ) : (
                      <FlashcardGrid
                        cards={categoryCards}
                        onGenerateFlashcards={handleGenerateFlashcards}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
              <p className="text-gray-400">
                No flashcards available. Create new flashcards to start
                learning.
              </p>
            </div>
          )}
        </main>
      </div>

      <TopBar 
        variant="guest"
        onMobileSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onImportAndSignIn={handleImportAndSignIn}
        isImporting={isImporting}
        progressStats={progressStats}
        onProgressClick={handleProgressClick}
      />
    </div>
  );
}
