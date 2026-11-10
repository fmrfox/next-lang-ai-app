"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Globe,
  Plus,
  BookOpen,
  CheckCircle,
  ListFilter,
  Save,
  LogOut,
  Pin,
} from "lucide-react";
import { EXTENSION_CATEGORY, isExtensionCategory } from "@/lib/extension-category";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Flashcard } from "@/core/entities/Flashcard";
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
import {
  deleteCategoryAction,
  getUserLanguagesAction,
  generateMoreFlashcardsAction,
  generateMoreGuestFlashcardsAction,
} from "@/app/actions/flashcard-actions";
import { useRouter } from "@/i18n/navigation";
import { ErrorMessage } from "@/shared/ui/error-message";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { guestFlashcardsStorage } from "@/utils/guest-flashcards-storage";
import { AIGenerationLoader } from "@/components/ui/ai-generation-loader";
import { GenerateFlashcardsDialog } from "@/components/generate-flashcards-dialog";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { SidebarVariant } from "@/types/component-props";
import { useSupabase } from "@/hooks/useSupabase";

interface FlashcardsSidebarProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  flashcards: Flashcard[];
  variant?: SidebarVariant;
  onLanguageSelectClick?: () => void;
  onNewFlashcardsClick?: () => void;
  onFlashcardsUpdate?: (updatedFlashcards: Flashcard[]) => void;
  masteredCategories?: string[];
  onLearningFilterClick?: () => void;
  // Mobile-specific props
  onExitDemo?: () => void;
  onImportAndSignIn?: () => void;
  isImporting?: boolean;
  // Demo mode callbacks
  onDemoModeAction?: (actionType: string) => void;
}

export function FlashcardsSidebar({
  selectedCategory,
  onSelectCategory,
  isCollapsed,
  onToggleCollapse,
  flashcards,
  variant = "authenticated",
  onLanguageSelectClick,
  onNewFlashcardsClick,
  onFlashcardsUpdate,
  masteredCategories = [],
  onLearningFilterClick,
  // Mobile-specific props
  onExitDemo,
  onImportAndSignIn,
  isImporting,
  // Demo mode callbacks
  onDemoModeAction,
}: FlashcardsSidebarProps) {
  const t = useTranslations('Sidebar');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingCategory, setGeneratingCategory] = useState<string | null>(
    null
  );
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [categoryToGenerate, setCategoryToGenerate] = useState<string | null>(
    null
  );
  const [learningFilter, setLearningFilter] = useState<string>("all");

  const router = useRouter();
  const { toast } = useToast();
  const { signOut } = useSupabase();

  // Determine if component is in guest mode
  const isGuestMode = variant === "guest" || variant === "demo";

  // Memoized language fetcher
  const fetchLanguages = useCallback(async () => {
    if (variant === "guest") {
      setSelectedLanguage("all");
      return;
    }

    if (variant === "demo") {
      // In demo mode, extract languages from flashcards
      const uniqueLanguages = [...new Set(flashcards.map(card => card.targetLanguage))];
      setLanguages(uniqueLanguages);
      if (!selectedLanguage) {
        setSelectedLanguage("all");
      }
      return;
    }

    setIsLoadingLanguages(true);
    try {
      const result = await getUserLanguagesAction();
      if (result.success) {
        setLanguages(result.languages || []);
        if (!selectedLanguage) {
          setSelectedLanguage("all");
        }
      } else {
        setErrorMessage(result.error || "Failed to fetch available languages");
      }
    } catch (error) {
      console.error("Error fetching languages:", error);
      setErrorMessage("An error occurred while fetching available languages");
    } finally {
      setIsLoadingLanguages(false);
    }
  }, [variant, selectedLanguage, flashcards]);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  useEffect(() => {
    if (selectedLanguage && selectedLanguage !== "all") {
      const hasLanguageCategories = flashcards.some(
        (card) => card.targetLanguage === selectedLanguage
      );

      if (!hasLanguageCategories && languages.length > 0) {
        setSelectedLanguage("all");
      }
    }
  }, [languages, flashcards, selectedLanguage]);

  // Memoized language name getter
  const getLanguageName = useCallback((languageCode: string): string => {
    const languageNames: Record<string, string> = {
      en: "English",
      pl: "Polski",
      es: "Español",
      de: "Deutsch",
      fr: "Français",
      it: "Italiano",
      pt: "Português",
      ru: "Русский",
      zh: "中文",
      ja: "日本語",
      ko: "한국어",
    };

    return languageNames[languageCode] || languageCode;
  }, []);

  // Memoized filtered flashcards
  const filteredFlashcards = useMemo(() => 
    selectedLanguage && selectedLanguage !== "all"
      ? flashcards.filter((card) => card.targetLanguage === selectedLanguage)
      : flashcards,
    [flashcards, selectedLanguage]
  );

  // Memoized categories
  const categories = useMemo(() => 
    [...new Set(filteredFlashcards.map((card) => card.category))].filter(
      (category) => !isExtensionCategory(category)
    ),
    [filteredFlashcards]
  );

  // The extension category is permanent and pinned on top (signed-in users only).
  const showExtensionCategory = variant !== "guest";
  const extensionCardCount = useMemo(
    () => flashcards.filter((card) => isExtensionCategory(card.category)).length,
    [flashcards]
  );



  // Memoized filtered categories by learning status
  const getFilteredCategoriesByLearningStatus = useCallback(() => {
    if (learningFilter === "all") {
      return categories;
    } else if (learningFilter === "mastered") {
      return categories.filter((category) =>
        masteredCategories.includes(category)
      );
    } else if (learningFilter === "learning") {
      return categories.filter(
        (category) => !masteredCategories.includes(category)
      );
    }
    return categories;
  }, [learningFilter, categories, masteredCategories]);

  const displayedCategories = useMemo(() => 
    getFilteredCategoriesByLearningStatus(),
    [getFilteredCategoriesByLearningStatus]
  );

  // Memoized handlers
  const handleDeleteCategory = useCallback((category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if in demo mode
    if (variant === "demo" && onDemoModeAction) {
      onDemoModeAction("deleteCategory");
      return;
    }
    
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  }, [variant, onDemoModeAction]);

  const handleGenerateClick = useCallback((category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if in demo mode
    if (variant === "demo" && onDemoModeAction) {
      onDemoModeAction("generateMore");
      return;
    }
    
    setCategoryToGenerate(category);
    setIsGenerateDialogOpen(true);
  }, [variant, onDemoModeAction]);

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
  }, []);

  const confirmDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      if (isGuestMode) {
        const deletedCount =
          guestFlashcardsStorage.deleteFlashcardsByCategory(categoryToDelete);

        closeDeleteDialog();
        router.refresh();

        toast({
          title: t('categoryDeleted'),
          description: t('categoryDeletedSuccess', { 
            category: categoryToDelete, 
            count: deletedCount.toString()
          }),
          variant: "success",
          duration: 1000,
        });

        const updatedFlashcards = guestFlashcardsStorage.getFlashcards();
        if (onFlashcardsUpdate) {
          onFlashcardsUpdate(updatedFlashcards);
        }
      } else {
        const result = await deleteCategoryAction(categoryToDelete);

        if (result.success) {
          closeDeleteDialog();
          router.refresh();
          await fetchLanguages();

          toast({
            title: t('categoryDeleted'),
            description: t('categoryDeletedSuccess', { 
              category: categoryToDelete, 
              count: (result.deletedCount || 0).toString()
            }),
            variant: "success",
            duration: 1000,
          });
        } else {
          setErrorMessage(result.error || t('failedToDeleteCategory'));

          toast({
            title: t('error'),
            description: result.error || t('failedToDeleteCategory'),
            variant: "destructive",
            duration: 1000,
          });
        }
      }
    } catch (error) {
      console.error("Category deletion error:", error);
      const errorMessage =
        error instanceof Error
          ? `Category deletion failed: ${error.message}`
          : "An unexpected error occurred while deleting the category";

      setErrorMessage(errorMessage);

      toast({
        title: t('error'),
        description: errorMessage,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [categoryToDelete, isGuestMode, closeDeleteDialog, router, toast, t, onFlashcardsUpdate, fetchLanguages]);

  const handleLanguageChange = useCallback((value: string) => {
    if (variant === "guest" && onLanguageSelectClick) {
      onLanguageSelectClick();
      return;
    }

    setSelectedLanguage(value);

    const newCategories = [
      ...new Set(
        value === "all"
          ? flashcards.map((card) => card.category)
          : flashcards
              .filter((card) => card.targetLanguage === value)
              .map((card) => card.category)
      ),
    ];

    if (!newCategories.includes(selectedCategory || "")) {
      if (newCategories.length > 0) {
        onSelectCategory(newCategories[0]);
      } else {
        onSelectCategory("");
      }
    }
  }, [variant, onLanguageSelectClick, flashcards, selectedCategory, onSelectCategory]);

  const handleGenerateMoreFlashcards = useCallback(async () => {
    if (!categoryToGenerate) return;

    setIsGenerating(true);
    setGeneratingCategory(categoryToGenerate);
    setErrorMessage(null);
    closeGenerateDialog();

    try {
      const existingFlashcards = flashcards.filter(
        (card) => card.category === categoryToGenerate
      );

      const targetLanguage = existingFlashcards[0]?.targetLanguage || "en";
      const sourceLanguage = existingFlashcards[0]?.sourceLanguage || "pl";
      const difficultyLevel = existingFlashcards[0]?.difficultyLevel || "easy";

      const existingTerms = Array.from(
        new Set(
          existingFlashcards.map((card) => card.origin_text.toLowerCase())
        )
      );

      if (isGuestMode) {
        const result = await generateMoreGuestFlashcardsAction({
          category: categoryToGenerate,
          existingTerms,
          count: 10,
          sourceLanguage,
          targetLanguage,
          difficultyLevel,
        });

        if (result.success && result.flashcards) {
          const updatedFlashcards = guestFlashcardsStorage.addMoreFlashcardsToCategory(
            result.flashcards,
            categoryToGenerate
          );

          if (onFlashcardsUpdate) {
            onFlashcardsUpdate(updatedFlashcards);
          }

          toast({
            title: t('flashcardsAdded'),
            description: t('flashcardsAddedSuccess', { 
              count: result.flashcards.length, 
              category: categoryToGenerate 
            }),
            variant: "success",
            duration: 1000,
          });
        } else {
          setErrorMessage(result.error || t('failedToGenerateFlashcards'));

          toast({
            title: t('error'),
            description: result.error || t('failedToGenerateFlashcards'),
            variant: "destructive",
            duration: 1000,
          });
        }
      } else {
        const result = await generateMoreFlashcardsAction({
          category: categoryToGenerate,
          existingTerms,
          count: 10,
          sourceLanguage,
          targetLanguage,
          difficultyLevel,
        });

        if (result.success) {
          router.refresh();

          toast({
            title: t('flashcardsAdded'),
            description: t('addedNewFlashcards', { category: categoryToGenerate }),
            variant: "success",
            duration: 1000,
          });
        } else {
          setErrorMessage(result.error || t('failedToGenerateFlashcards'));

          toast({
            title: t('error'),
            description: result.error || t('failedToGenerateFlashcards'),
            variant: "destructive",
            duration: 1000,
          });
        }
      }
    } catch (error) {
      console.error("Error generating additional flashcards:", error);
      const errorMessage =
        error instanceof Error
          ? `Flashcard generation failed: ${error.message}`
          : "An unexpected error occurred during flashcard generation";

      setErrorMessage(errorMessage);

      toast({
        title: t('error'),
        description: errorMessage,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsGenerating(false);
      setGeneratingCategory(null);
    }
  }, [categoryToGenerate, isGuestMode, flashcards, onFlashcardsUpdate, toast, t, router]);

  const closeGenerateDialog = useCallback(() => {
    setIsGenerateDialogOpen(false);
    setCategoryToGenerate(null);
  }, []);

  // Memoized empty state message
  const emptyStateMessage = useMemo(() => {
    if (isLoadingLanguages) return t('loadingCategories');
    if (learningFilter === "mastered") return t('noMasteredCategories');
    if (learningFilter === "learning") return t('noLearningCategories');
    if (selectedLanguage === "all") return t('noCategoriesAvailable');
    if (selectedLanguage) {
      return t('noCategoriesForLanguage', { language: getLanguageName(selectedLanguage) });
    }
    return t('noCategoriesAvailable');
  }, [isLoadingLanguages, learningFilter, selectedLanguage, t, getLanguageName]);

  // Memoized function to get target language for a category
  const categoryInfoMap = useMemo(() => {
    const infoMap = new Map<string, { 
      language: string; 
      translation: string; 
    }>();
    
    filteredFlashcards.forEach(card => {
      if (!infoMap.has(card.category)) {
        infoMap.set(card.category, {
          language: card.targetLanguage.toUpperCase(),
          translation: card.translate_category
        });
      }
    });
    
    return infoMap;
  }, [filteredFlashcards]);

  // Optimized functions using the map
  const getCategoryLanguage = useCallback((category: string): string => {
    return categoryInfoMap.get(category)?.language || '';
  }, [categoryInfoMap]);

  const getCategoryTranslation = useCallback((category: string): string => {
    return categoryInfoMap.get(category)?.translation || category;
  }, [categoryInfoMap]);

  return (
    <div className="relative h-full overflow-hidden">
      {isGenerating && <AIGenerationLoader />}

      <motion.div
        className={cn(
          "h-full bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col transition-all duration-200",
          // On mobile: completely hide when collapsed, on desktop: show narrow version
          isCollapsed 
            ? "w-0 md:w-[60px]" 
            : "w-[350px]"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          {!isCollapsed && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70"
            >
              {t('categories')}
            </motion.h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="text-white hover:bg-purple-500/20 transition-all duration-300 hover:text-purple-400 flex ml-auto"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Controls Section - only visible on mobile and when not collapsed */}
        {!isCollapsed && (
          <div className="md:hidden border-b border-white/10 bg-black/10">
            <div className="p-3 space-y-3">
              {/* Language Switcher for Mobile */}
              <div className="flex items-center justify-center">
                <div className="w-full">
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Mobile Action Buttons */}
              <div className="flex flex-col space-y-2">
                {/* Exit Demo Button for Mobile */}
                {variant === "demo" && onExitDemo && (
                  <Button
                    onClick={onExitDemo}
                    className="w-full border border-red-500 text-red-400 hover:text-red-300 hover:border-red-400 bg-transparent transition-colors text-sm py-2"
                  >
                    Exit Demo
                  </Button>
                )}

                {/* Log Out Button for Authenticated Users on Mobile */}
                {variant === "authenticated" && (
                  <Button
                    onClick={signOut}
                    className="w-full border border-red-500 text-red-400 hover:text-red-300 hover:border-red-400 bg-transparent transition-colors text-sm py-2"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('logOut')}
                  </Button>
                )}

                {/* Import and Sign In Button for Mobile */}
                {variant === "guest" && onImportAndSignIn && (
                  <Button
                    onClick={onImportAndSignIn}
                    disabled={isImporting}
                    className="w-full text-white border-purple-500 hover:bg-purple-500/20 bg-gradient-to-r from-purple-500/10 to-purple-500/0 text-sm py-2"
                  >
                    <Save className="w-4 h-4 mr-2 text-purple-400" />
                    {isImporting ? "Importing..." : "Log in to save"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-2 border-b border-white/10">
          {isGuestMode && onNewFlashcardsClick ? (
            <Button
              variant="outline"
              className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 hover:bg-gradient-to-r hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 group flex items-center justify-center rounded-md"
              onClick={onNewFlashcardsClick}
            >
              <PlusCircle className="h-4 w-4 mr-2 group-hover:text-purple-300" />
              {!isCollapsed && <span>{t('newFlashcards')}</span>}
            </Button>
          ) : (
            <Link href="/" className="block w-full">
              <Button
                variant="outline"
                className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 hover:bg-gradient-to-r hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 group flex items-center justify-center rounded-md"
              >
                <PlusCircle className="h-4 w-4 mr-2 group-hover:text-purple-300" />
                {!isCollapsed && <span>{t('newFlashcards')}</span>}
              </Button>
            </Link>
          )}

          {!isCollapsed &&
            (variant === "guest" || languages.length > 0 || isLoadingLanguages) && (
              <div className="space-y-2 mt-2">
                {variant === "guest" ? (
                  <div
                    className="w-full bg-black/20 border border-white/10 text-white rounded-md h-10 flex items-center px-3 cursor-pointer hover:bg-purple-500/10 transition-colors duration-200"
                    onClick={onLanguageSelectClick}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-purple-400" />
                      <span className="text-white">{t('allLanguages')}</span>
                    </div>
                    <div className="ml-auto">
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </div>
                  </div>
                ) : (
                  <Select
                    value={selectedLanguage || undefined}
                    onValueChange={handleLanguageChange}
                    disabled={isLoadingLanguages}
                  >
                    <SelectTrigger className="w-full bg-black/20 border-white/10 text-white">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-purple-400" />
                        <SelectValue placeholder={t('changeLanguage')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10 text-white">
                      <SelectItem
                        value="all"
                        className="hover:bg-purple-500/20"
                      >
                        {t('allLanguages')}
                      </SelectItem>
                      {languages.map((lang) => (
                        <SelectItem
                          key={lang}
                          value={lang}
                          className="hover:bg-purple-500/20"
                        >
                          {getLanguageName(lang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {variant !== "guest" && (
                  <div>
                    <Select
                      value={learningFilter}
                      onValueChange={setLearningFilter}
                    >
                      <SelectTrigger className="w-full bg-black/20 border-white/10 text-white">
                        <div className="flex items-center gap-2">
                          <ListFilter className="h-4 w-4 text-purple-400" />
                          <SelectValue placeholder={t('filterProgress')} />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10 text-white">
                        <SelectItem
                          value="all"
                          className="hover:bg-purple-500/20"
                        >
                          {t('allCategories')}
                        </SelectItem>
                        <SelectItem
                          value="learning"
                          className="hover:bg-blue-500/20"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-400" />
                            <span>{t('learning')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="mastered"
                          className="hover:bg-green-500/20"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span>{t('mastered')}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {variant === "guest" && onLearningFilterClick && (
                  <div
                    className="w-full bg-black/20 border border-white/10 text-white rounded-md h-10 flex items-center px-3 cursor-pointer hover:bg-purple-500/10 transition-colors duration-200 mt-2"
                    onClick={onLearningFilterClick}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <ListFilter className="h-4 w-4 text-purple-400" />
                      <span className="text-white">{t('allCategories')}</span>
                    </div>
                    <div className="ml-auto">
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>

        {errorMessage && (
          <div className="p-2">
            <ErrorMessage
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
            />
          </div>
        )}

        {/* Pinned outside the scroll area so it is always visible. */}
        {showExtensionCategory && (
          <div className="px-2 pt-2 flex-shrink-0">
            <ExtensionCategoryRow
              isSelected={isExtensionCategory(selectedCategory)}
              isCollapsed={isCollapsed}
              count={extensionCardCount}
              onSelect={() => onSelectCategory(EXTENSION_CATEGORY)}
            />
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {displayedCategories.length > 0 ? (
              displayedCategories.map((category) => (
                <div key={category} className="flex items-center gap-2 w-full">
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex-1 min-w-0 justify-start mb-1 relative group overflow-hidden transition-all duration-300 pr-2",
                      selectedCategory === category
                        ? "bg-purple-500/20 text-white hover:bg-purple-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => onSelectCategory(category)}
                    title={!isCollapsed ? category : undefined}
                  >
                    <div className="flex items-center min-w-0 w-full">
                      {!isCollapsed && masteredCategories.includes(category) && (
                        <CheckCircle className="h-4 w-4 mr-2 text-green-400 flex-shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={cn(
                          "relative z-10 block text-sm font-medium",
                          isCollapsed ? "text-center w-full" : "truncate min-w-0"
                        )}>
                          {isCollapsed ? category.charAt(0) : category}
                        </span>
                        {!isCollapsed && getCategoryTranslation(category) !== category && (
                          <span className="text-xs text-white/50 truncate">
                            ({getCategoryTranslation(category)})
                          </span>
                        )}
                      </div>
                      {!isCollapsed && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-white/10 text-white/70 rounded flex-shrink-0">
                          {getCategoryLanguage(category)}
                        </span>
                      )}
                    </div>
                    {selectedCategory === category && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-pink-500" />
                    )}
                    {masteredCategories.includes(category) && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 to-green-400" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>

                  {!isCollapsed && (
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 min-w-[32px] p-0 text-gray-400 hover:text-green-400 hover:bg-green-500/10 flex-shrink-0"
                        onClick={(e) => handleGenerateClick(category, e)}
                        title={t('addMoreFlashcards')}
                        disabled={
                          isGenerating || generatingCategory === category
                        }
                      >
                        <Plus className="h-4 w-4" />
                        {generatingCategory === category && (
                          <span className="sr-only">{t('generating')}</span>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 min-w-[32px] p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                        onClick={(e) => handleDeleteCategory(category, e)}
                        title={t('deleteCategory')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              !showExtensionCategory && (
                <p className="text-gray-400 text-center py-4">
                  {emptyStateMessage}
                </p>
              )
            )}
          </div>
        </ScrollArea>
      </motion.div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('deleteCategoryTitle', { category: categoryToDelete || '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteCategoryDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={closeDeleteDialog}
              disabled={isDeleting}
            >
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              disabled={isDeleting}
            >
              {isDeleting ? t('deleting') : t('deleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GenerateFlashcardsDialog
        isOpen={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onConfirm={handleGenerateMoreFlashcards}
        categoryName={categoryToGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
}

function ExtensionCategoryRow({
  isSelected,
  isCollapsed,
  count,
  onSelect,
}: {
  isSelected: boolean;
  isCollapsed: boolean;
  count: number;
  onSelect: () => void;
}) {
  const t = useTranslations("Extension");

  return (
    <div className="pb-2 mb-2 border-b border-white/10">
      <Button
        variant="ghost"
        onClick={onSelect}
        title={t("pinnedCategory")}
        className={cn(
          "w-full h-auto py-2 justify-start relative overflow-hidden border transition-all duration-300",
          isCollapsed ? "px-0 justify-center" : "px-3",
          isSelected
            ? "bg-gradient-to-r from-amber-500/30 to-orange-500/20 border-amber-400/70 text-white hover:from-amber-500/40"
            : "bg-gradient-to-r from-amber-500/15 to-orange-500/5 border-amber-500/30 text-amber-100 hover:from-amber-500/25 hover:text-white"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 w-full">
          <Pin className="h-4 w-4 text-amber-400 flex-shrink-0 rotate-45" />
          {!isCollapsed && (
            <>
              <div className="flex flex-col min-w-0 flex-1 text-left">
                <span className="text-sm font-semibold truncate">{t("categoryName")}</span>
                <span className="text-xs text-amber-200/60 truncate font-normal">
                  {t("categorySubtitle")}
                </span>
              </div>
              <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-200 rounded flex-shrink-0">
                {count}
              </span>
            </>
          )}
        </div>
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400 to-orange-500" />
        )}
      </Button>
    </div>
  );
}
