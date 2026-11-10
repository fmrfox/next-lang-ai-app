"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flashcard } from "@/core/entities/Flashcard";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks";
import { Grid, Maximize2, Sparkles, Pin } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { FlashcardsSidebar } from "@/components/flashcards-sidebar";
import { FlashcardView } from "@/components/flaschard-view";
import { FlashcardGrid } from "@/components/flashcard-grid";
import { TopBar } from "@/components/ui/top-bar";
import { ErrorMessage } from "@/shared/ui/error-message";
import { UserProgressStats } from "@/types/progress";
import { toast } from "@/components/ui/use-toast";
import {
  generateMoreFlashcardsAction,
  deleteExtensionFlashcardAction,
} from "@/app/actions/flashcard-actions";
import { isExtensionCategory } from "@/lib/extension-category";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { addFavoriteAction, removeFavoriteAction } from "@/app/actions/favorite-actions";
import { LoginPromptPopup } from "@/components/login-prompt-popup";
import { WelcomeNewUserModal } from "@/components/welcome-new-user-modal";
import { useDemoMode, getMasteredCategoriesFromDemo, getDemoFavoriteIds, addDemoFavorite, removeDemoFavorite } from "@/hooks";
import { useTranslations } from "next-intl";
import { defaultLocale } from "@/i18n/routing";
import { Locale } from "@/types/locale";

interface FlashcardsViewProps {
  initialFlashcards: Flashcard[];
  answerFlashcards?: Flashcard[];
  initialFavoriteIds?: number[];
  isFavoritesView?: boolean;
  serverError?: string | null;
  initialCategory?: string | null;
  progressStats?: {
    success: boolean;
    data?: UserProgressStats;
    error?: string;
  };
  masteredCategories?: string[];
}

export default function FlashcardsView({
  initialFlashcards,
  answerFlashcards,
  initialFavoriteIds = [],
  isFavoritesView = false,
  serverError,
  initialCategory,
  progressStats,
  masteredCategories = [],
}: FlashcardsViewProps) {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category");

  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryFromUrl
      ? decodeURIComponent(categoryFromUrl)
      : initialCategory || null
  );

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [answerCycle, setAnswerCycle] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(
    () => new Set(initialFavoriteIds)
  );
  const [visibleFlashcards, setVisibleFlashcards] = useState<Flashcard[]>(
    () => initialFlashcards
  );
  // Start with collapsed state, will be updated based on screen size
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [error, setError] = useState<string | null>(serverError || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState("");
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const router = useRouter();
  const params = useParams();
  const currentLocale = (params?.locale as Locale) || defaultLocale;
  const homePath = currentLocale === defaultLocale ? "/" : `/${currentLocale}`;
  const { isDemoMode, exitDemoMode } = useDemoMode();
  const { isSignedIn } = useUser();
  const t = useTranslations('Flashcards');
  const tExt = useTranslations('Extension');
  // Cards deleted in this session — hidden immediately, before router.refresh() brings fresh data.
  const [deletedIds, setDeletedIds] = useState<Set<number>>(() => new Set());
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  // Calculate masteredCategories for demo mode from localStorage
  const calculatedMasteredCategories = isDemoMode && progressStats?.data 
    ? getMasteredCategoriesFromDemo(progressStats.data)
    : masteredCategories;

  // Set initial sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsSidebarCollapsed(isMobile);
    };

    // Set initial state
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (initialFlashcards.length > 0 && !selectedCategory && !categoryFromUrl) {
      const categories = [
        ...new Set(initialFlashcards.map((card) => card.category)),
      ];
      if (categories.length > 0) {
        setSelectedCategory(categories[0]);
      }
    }
  }, [initialFlashcards, selectedCategory, categoryFromUrl]);

  useEffect(() => {
    setFavoriteIds(new Set(initialFavoriteIds));
  }, [initialFavoriteIds]);

  useEffect(() => {
    if (isFavoritesView) {
      setVisibleFlashcards(initialFlashcards);
    }
  }, [initialFlashcards, isFavoritesView]);

  useEffect(() => {
    if (!isDemoMode) return;

    const syncDemoFavorites = () => {
      const demoIds = getDemoFavoriteIds();
      setFavoriteIds(new Set(demoIds));

      if (isFavoritesView) {
        setVisibleFlashcards(
          initialFlashcards.filter((card) => demoIds.includes(card.id))
        );
      }
    };

    syncDemoFavorites();

    window.addEventListener("demoFavoritesUpdate", syncDemoFavorites);
    window.addEventListener("storage", syncDemoFavorites);

    return () => {
      window.removeEventListener("demoFavoritesUpdate", syncDemoFavorites);
      window.removeEventListener("storage", syncDemoFavorites);
    };
  }, [isDemoMode, isFavoritesView, initialFlashcards]);

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

  // Check if user is new (no flashcards and signed in, not in demo mode)
  useEffect(() => {
    if (isSignedIn && !isDemoMode && initialFlashcards.length === 0) {
      // Check if we've already shown the welcome modal for this session
      const hasShownWelcome = sessionStorage.getItem('hasShownWelcomeModal');
      if (!hasShownWelcome) {
        setShowWelcomeModal(true);
        sessionStorage.setItem('hasShownWelcomeModal', 'true');
      }
    }
  }, [isSignedIn, isDemoMode, initialFlashcards.length]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNext = (known: boolean) => {
    setCurrentCardIndex((prev) => (prev + 1) % categoryCards.length);
    setAnswerCycle((prev) => prev + 1);
  };

  const handleGenerateFlashcards = async (category: string) => {
    // Check if in demo mode and show login prompt
    if (isDemoMode) {
      setLoginPromptMessage("Sign in to generate new flashcards and unlock unlimited access to all features!");
      setShowLoginPrompt(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Zbieramy istniejące fiszki dla tej kategorii
      const existingFlashcards = initialFlashcards.filter(
        (card) => card.category === category
      );

      const targetLanguage = existingFlashcards[0]?.targetLanguage || "en";
      const sourceLanguage = existingFlashcards[0]?.sourceLanguage || "pl";
      const difficultyLevel = existingFlashcards[0]?.difficultyLevel || "easy";

      // Zbieramy istniejące terminy, aby uniknąć duplikatów
      const existingTerms = Array.from(
        new Set(
          existingFlashcards.map((card) => card.origin_text.toLowerCase())
        )
      );

      const result = await generateMoreFlashcardsAction({
        category,
        existingTerms,
        count: 10,
        sourceLanguage,
        targetLanguage,
        difficultyLevel,
      });

      if (result.success) {
        router.refresh();
        toast({
          title: "Flashcards Added",
          description: `Successfully added new flashcards to the "${category}" category.`,
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

  // Handler for demo mode actions that should show login prompt
  const handleDemoModeAction = (actionType: string) => {
    let message = "";
    switch (actionType) {
      case "newFlashcards":
        message = "Sign in to create new flashcards and save your progress!";
        break;
      case "generateMore":
        message = "Sign in to generate more flashcards for this category!";
        break;
      case "deleteCategory":
        message = "Sign in to manage your flashcard categories!";
        break;
      default:
        message = "Sign in to unlock all features including saving flashcards, tracking progress, and generating new content!";
    }
    setLoginPromptMessage(message);
    setShowLoginPrompt(true);
  };

  const flashcardsSource = (isFavoritesView ? visibleFlashcards : initialFlashcards).filter(
    (card) => !deletedIds.has(card.id)
  );
  const isExtensionSelected = isExtensionCategory(selectedCategory);
  const canDeleteCards = isExtensionSelected && !isDemoMode;

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;
    setIsDeletingCard(true);
    const result = await deleteExtensionFlashcardAction(cardToDelete.id);
    setIsDeletingCard(false);
    if (result.success) {
      setDeletedIds((prev) => new Set(prev).add(cardToDelete.id));
      setCurrentCardIndex(0);
      toast({ title: tExt("cardDeleted"), variant: "success", duration: 1500 });
      router.refresh();
    } else {
      toast({ title: tExt("cardDeleteFailed"), description: result.error, variant: "destructive" });
    }
    setCardToDelete(null);
  };
  const categoryCards = selectedCategory
    ? flashcardsSource.filter((card) => card.category === selectedCategory)
    : flashcardsSource;

  const currentCard = categoryCards[currentCardIndex] ?? null;
  const answerPoolFlashcards = answerFlashcards ?? initialFlashcards;

  const handleToggleFavorite = async (flashcardId: number) => {
    const isCurrentlyFavorited = favoriteIds.has(flashcardId);
    const nextFavoriteIds = new Set(favoriteIds);

    if (isDemoMode) {
      if (isCurrentlyFavorited) {
        removeDemoFavorite(flashcardId);
        nextFavoriteIds.delete(flashcardId);
      } else {
        addDemoFavorite(flashcardId);
        nextFavoriteIds.add(flashcardId);
      }

      setFavoriteIds(nextFavoriteIds);

      if (isFavoritesView) {
        setVisibleFlashcards((prev) => {
          const updated = isCurrentlyFavorited
            ? prev.filter((card) => card.id !== flashcardId)
            : prev;

          if (updated.length === 0) {
            setSelectedCategory(null);
            return updated;
          }

          if (selectedCategory) {
            const categories = new Set(updated.map((card) => card.category));
            if (!categories.has(selectedCategory)) {
              setSelectedCategory(Array.from(categories)[0] ?? null);
            }
          }

          return updated;
        });
      }

      return;
    }

    if (isCurrentlyFavorited) {
      const result = await removeFavoriteAction(flashcardId);
      if (result.success) {
        nextFavoriteIds.delete(flashcardId);
        setFavoriteIds(nextFavoriteIds);

        if (isFavoritesView) {
          setVisibleFlashcards((prev) => {
            const updated = prev.filter((card) => card.id !== flashcardId);

            if (updated.length === 0) {
              setSelectedCategory(null);
              return updated;
            }

            if (selectedCategory) {
              const categories = new Set(updated.map((card) => card.category));
              if (!categories.has(selectedCategory)) {
                setSelectedCategory(Array.from(categories)[0] ?? null);
              }
            }

            return updated;
          });
        }
      }
      return;
    }

    const result = await addFavoriteAction(flashcardId);
    if (result.success) {
      nextFavoriteIds.add(flashcardId);
      setFavoriteIds(nextFavoriteIds);
    }
  };

  return (
    <div className="min-h-screen h-screen bg-black text-white flex flex-col overflow-hidden">
      <TopBar 
        variant={isDemoMode ? "demo" : "authenticated"}
        onMobileSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        progressStats={progressStats}
        onExitDemo={() => {
          // Use hook function to exit demo mode
          exitDemoMode();
          // Hard navigation to ensure redirect
          window.location.assign(homePath);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
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
              // On mobile, collapse sidebar after selecting category
              if (window.innerWidth < 768) {
                setIsSidebarCollapsed(true);
              }
            }}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            flashcards={flashcardsSource}
            variant={isDemoMode ? "demo" : "authenticated"}
            masteredCategories={calculatedMasteredCategories}
            onNewFlashcardsClick={isDemoMode ? () => handleDemoModeAction("newFlashcards") : undefined}
            onDemoModeAction={isDemoMode ? handleDemoModeAction : undefined}
            onExitDemo={() => {
              // Use hook function to exit demo mode
              exitDemoMode();
              // Hard navigation to ensure redirect
              window.location.assign(homePath);
            }}
          />
        </div>
        
        {/* Mobile overlay - only show when sidebar is not collapsed on mobile */}
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

          {selectedCategory || initialFlashcards.length > 0 ? (
            <>
              <div className="flex justify-center mt-2 mb-1 flex-shrink-0">
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
              </div>

              <div className="flex-1 overflow-hidden">
                {isExtensionSelected && categoryCards.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-6">
                    <div className="text-center max-w-md">
                      <Pin className="h-10 w-10 mx-auto mb-4 text-amber-400 rotate-45" />
                      <h2 className="text-xl font-semibold mb-2">{tExt("emptyCategoryTitle")}</h2>
                      <p className="text-gray-400 mb-6">{tExt("emptyCategoryHint")}</p>
                      <Button
                        onClick={() => router.push("/extension/connect")}
                        className="bg-amber-500/90 hover:bg-amber-400 text-black font-medium"
                      >
                        {tExt("connectExtension")}
                      </Button>
                    </div>
                  </div>
                ) : (
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
                          allFlashcards={answerPoolFlashcards}
                          isFavorited={favoriteIds.has(currentCard.id)}
                          onToggleFavorite={handleToggleFavorite}
                          answerCycle={answerCycle}
                          onDelete={canDeleteCards ? setCardToDelete : undefined}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
                          <p className="text-gray-400">
                            {t('noFlashcardsTitle')}
                          </p>
                        </div>
                      )
                    ) : (
                      <FlashcardGrid
                        cards={categoryCards}
                        onGenerateFlashcards={isExtensionSelected ? undefined : handleGenerateFlashcards}
                        onDeleteCard={canDeleteCards ? setCardToDelete : undefined}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[calc(100vh-12rem)] p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center max-w-sm sm:max-w-lg mx-auto px-2 sm:px-4 relative z-10"
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200 leading-relaxed">
                  {t('noFlashcardsTitle')}
                </h2>

                <div className="flex justify-center">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => router.push("/")}
                      className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-sm sm:text-lg px-4 sm:px-8 py-3 sm:py-4 rounded-lg shadow-lg shadow-purple-500/20 font-medium inline-flex items-center justify-center"
                    >
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {t('startLearningButton')}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          )}
        </main>
      </div>

      <AlertDialog open={cardToDelete !== null} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tExt("deleteCardTitle", { term: cardToDelete?.translate_text ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{tExt("deleteCardDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCard}>{tExt("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCard} disabled={isDeletingCard}>
              {tExt("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Login Prompt Popup */}
      <LoginPromptPopup
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message={loginPromptMessage}
      />

      {/* Welcome Modal */}
      <WelcomeNewUserModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />
    </div>
  );
}
