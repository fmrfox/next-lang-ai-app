import { PrismaFlashcardRepository } from "@/infrastructure/database/PrismaFlashcardRepository";
import { PrismaFavoriteRepository } from "@/infrastructure/database/PrismaFavoriteRepository";
import { PrismaProgressRepository } from "@/infrastructure/database/PrismaProgressRepository";
import { PrismaUserRepository } from "@/infrastructure/database/PrismaUserRepository";
import { PrismaExtensionTokenRepository } from "@/infrastructure/database/PrismaExtensionTokenRepository";
import { GetUserFlashcardsUseCase } from "@/core/useCases/flashcards/GetUserFlashcards";
import { GenerateFlashcardsUseCase } from "@/core/useCases/flashcards/GenerateFlashcards";
import { UpdateFlashcardProgressUseCase } from "@/core/useCases/flashcards/UpdateFlashcardProgress";
import { DeleteCategoryUseCase } from "@/core/useCases/flashcards/DeleteCategoryUseCase";
import { GetUserLanguagesUseCase } from "@/core/useCases/flashcards/GetUserLanguagesUseCase";
import { ImportGuestFlashcardsUseCase } from "@/core/useCases/flashcards/ImportGuestFlashcardsUseCase";
import { HandleGuestFlashcardGenerationUseCase } from "@/core/useCases/flashcards/HandleGuestFlashcardGenerationUseCase";
import { GetUserProgressStatsUseCase } from "@/core/useCases/progress/GetUserProgressStats";
import { UpdateDailyGoalUseCase } from "@/core/useCases/progress/UpdateDailyGoalUseCase";
import { GetReviewedTodayCountUseCase } from "@/core/useCases/progress/GetReviewedTodayCountUseCase";
import { AddFavoriteUseCase } from "@/core/useCases/favorites/AddFavoriteUseCase";
import { GetUserFavoritesUseCase } from "@/core/useCases/favorites/GetUserFavoritesUseCase";
import { RemoveFavoriteUseCase } from "@/core/useCases/favorites/RemoveFavoriteUseCase";
import {
  CreateExtensionTokenUseCase,
  AuthenticateExtensionTokenUseCase,
  RevokeExtensionTokenUseCase,
  GenerateFlashcardFromSelectionUseCase,
} from "@/core/useCases/extension";
import { FlashcardRepository } from "@/core/interfaces/repositories/FlashcardRepository";
import { UserRepository } from "@/core/interfaces/repositories/UserRepository";
import { FavoriteRepository } from "@/core/interfaces/repositories/FavoriteRepository";
import { 
  aiFlashcardGenerationService,
  createUserManagementService,
  createFlashcardProgressService
} from "@/core/services";

// Auth imports
import { 
  SignInWithOtpUseCase,
  SignUpWithOtpUseCase,
  VerifyOtpUseCase,
  SignInWithOAuthUseCase,
  HandleAuthCallbackUseCase,
  SendContactEmailUseCase
} from "@/core/useCases/auth";
import { 
  SupabaseAuthService,
  ResendEmailService,
  OpenAIModerationService
} from "@/infrastructure/services";
import { AuthService } from "@/core/services/AuthService";
import { EmailService } from "@/core/services/EmailService";
import { ModerationService } from "@/core/services/ModerationService";

// Prosty kontener DI - Dependency Injection - clean architecture
class Container {
  private static instance: Container;
  private services: Map<string, unknown> = new Map();

  private constructor() {
    // Inicjalizacja repozytoriów
    this.services.set('FlashcardRepository', new PrismaFlashcardRepository());
    this.services.set('FavoriteRepository', new PrismaFavoriteRepository());
    this.services.set('ProgressRepository', new PrismaProgressRepository());
    this.services.set('UserRepository', new PrismaUserRepository());
    this.services.set('ExtensionTokenRepository', new PrismaExtensionTokenRepository());
    
    // Inicjalizacja serwisów
    this.services.set('AIFlashcardGenerationService', aiFlashcardGenerationService);
    this.services.set('UserManagementService', createUserManagementService(this.get('UserRepository')));
    this.services.set('FlashcardProgressService', createFlashcardProgressService(this.get('ProgressRepository')));
    
    // Auth services
    this.services.set('AuthService', new SupabaseAuthService());
    this.services.set('EmailService', new ResendEmailService());
    this.services.set('ModerationService', new OpenAIModerationService());
    
    // Inicjalizacja przypadków użycia
    this.services.set(
      'GetUserFlashcardsUseCase', 
      new GetUserFlashcardsUseCase(this.get('FlashcardRepository'))
    );
    
    this.services.set(
      'GenerateFlashcardsUseCase',
      new GenerateFlashcardsUseCase(
        this.get('FlashcardRepository'),
        this.get('AIFlashcardGenerationService'),
        this.get('UserManagementService'),
        this.get('FlashcardProgressService')
      )
    );
    
    this.services.set(
      'UpdateFlashcardProgressUseCase',
      new UpdateFlashcardProgressUseCase(
        this.get('ProgressRepository')
      )
    );
    
    this.services.set(
      'GetUserProgressStatsUseCase',
      new GetUserProgressStatsUseCase(
        this.get('FlashcardRepository'),
        this.get('ProgressRepository'),
        this.get('UserRepository')
      )
    );
    
    this.services.set(
      'DeleteCategoryUseCase',
      new DeleteCategoryUseCase(
        this.get('FlashcardRepository')
      )
    );
    
    this.services.set(
      'GetUserLanguagesUseCase',
      new GetUserLanguagesUseCase(
        this.get('FlashcardRepository')
      )
    );
    
    this.services.set(
      'ImportGuestFlashcardsUseCase',
      new ImportGuestFlashcardsUseCase(
        this.get('FlashcardRepository'),
        this.get('UserManagementService')
      )
    );
    
    this.services.set(
      'HandleGuestFlashcardGenerationUseCase',
      new HandleGuestFlashcardGenerationUseCase(
        this.get('AIFlashcardGenerationService')
      )
    );
    
    this.services.set(
      'UpdateDailyGoalUseCase',
      new UpdateDailyGoalUseCase(
        this.get('UserRepository')
      )
    );
    
    this.services.set(
      'GetReviewedTodayCountUseCase',
      new GetReviewedTodayCountUseCase(
        this.get('ProgressRepository')
      )
    );

    this.services.set(
      'AddFavoriteUseCase',
      new AddFavoriteUseCase(
        this.get('FavoriteRepository')
      )
    );

    this.services.set(
      'GetUserFavoritesUseCase',
      new GetUserFavoritesUseCase(
        this.get('FavoriteRepository')
      )
    );

    this.services.set(
      'RemoveFavoriteUseCase',
      new RemoveFavoriteUseCase(
        this.get('FavoriteRepository')
      )
    );
    
    // Browser extension use cases
    this.services.set(
      'CreateExtensionTokenUseCase',
      new CreateExtensionTokenUseCase(
        this.get('ExtensionTokenRepository'),
        this.get('UserManagementService')
      )
    );

    this.services.set(
      'AuthenticateExtensionTokenUseCase',
      new AuthenticateExtensionTokenUseCase(this.get('ExtensionTokenRepository'))
    );

    this.services.set(
      'RevokeExtensionTokenUseCase',
      new RevokeExtensionTokenUseCase(this.get('ExtensionTokenRepository'))
    );

    this.services.set(
      'GenerateFlashcardFromSelectionUseCase',
      new GenerateFlashcardFromSelectionUseCase(
        this.get('FlashcardRepository'),
        this.get('AIFlashcardGenerationService'),
        this.get('FlashcardProgressService')
      )
    );

    // Auth use cases
    this.services.set(
      'SignInWithOtpUseCase',
      new SignInWithOtpUseCase(
        this.get('AuthService')
      )
    );
    
    this.services.set(
      'SignUpWithOtpUseCase',
      new SignUpWithOtpUseCase(
        this.get('AuthService')
      )
    );
    
    this.services.set(
      'VerifyOtpUseCase',
      new VerifyOtpUseCase(
        this.get('AuthService')
      )
    );
    
    this.services.set(
      'SignInWithOAuthUseCase',
      new SignInWithOAuthUseCase(
        this.get('AuthService')
      )
    );
    
    this.services.set(
      'HandleAuthCallbackUseCase',
      new HandleAuthCallbackUseCase(
        this.get('AuthService')
      )
    );
    
    this.services.set(
      'SendContactEmailUseCase',
      new SendContactEmailUseCase(
        this.get('EmailService'),
        this.get('ModerationService')
      )
    );
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  get<T>(serviceName: string): T {
    if (!this.services.has(serviceName)) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return this.services.get(serviceName) as T;
  }
}

export const container = Container.getInstance();

// Eksportowane helpery
export const getFlashcardRepository = (): FlashcardRepository => 
  container.get('FlashcardRepository');

export const getFavoriteRepository = (): FavoriteRepository =>
  container.get('FavoriteRepository');

export const getUserFlashcardsUseCase = (): GetUserFlashcardsUseCase => 
  container.get('GetUserFlashcardsUseCase');
  
export const getGenerateFlashcardsUseCase = (): GenerateFlashcardsUseCase =>
  container.get('GenerateFlashcardsUseCase');
  
export const getUpdateFlashcardProgressUseCase = (): UpdateFlashcardProgressUseCase =>
  container.get('UpdateFlashcardProgressUseCase'); 
  
export const getUserProgressStatsUseCase = (): GetUserProgressStatsUseCase =>
  container.get('GetUserProgressStatsUseCase'); 
  
export const getDeleteCategoryUseCase = (): DeleteCategoryUseCase =>
  container.get('DeleteCategoryUseCase');
  
export const getUserLanguagesUseCase = (): GetUserLanguagesUseCase =>
  container.get('GetUserLanguagesUseCase');
  
export const getImportGuestFlashcardsUseCase = (): ImportGuestFlashcardsUseCase =>
  container.get('ImportGuestFlashcardsUseCase');
  
export const getHandleGuestFlashcardGenerationUseCase = (): HandleGuestFlashcardGenerationUseCase =>
  container.get('HandleGuestFlashcardGenerationUseCase');
  
export const getUpdateDailyGoalUseCase = (): UpdateDailyGoalUseCase =>
  container.get('UpdateDailyGoalUseCase');
  
export const getReviewedTodayCountUseCase = (): GetReviewedTodayCountUseCase =>
  container.get('GetReviewedTodayCountUseCase');

export const getAddFavoriteUseCase = (): AddFavoriteUseCase =>
  container.get('AddFavoriteUseCase');

export const getUserFavoritesUseCase = (): GetUserFavoritesUseCase =>
  container.get('GetUserFavoritesUseCase');

export const getRemoveFavoriteUseCase = (): RemoveFavoriteUseCase =>
  container.get('RemoveFavoriteUseCase');

export const getUserRepository = (): UserRepository =>
  container.get('UserRepository');

// Browser extension exports
export const getCreateExtensionTokenUseCase = (): CreateExtensionTokenUseCase =>
  container.get('CreateExtensionTokenUseCase');

export const getAuthenticateExtensionTokenUseCase = (): AuthenticateExtensionTokenUseCase =>
  container.get('AuthenticateExtensionTokenUseCase');

export const getRevokeExtensionTokenUseCase = (): RevokeExtensionTokenUseCase =>
  container.get('RevokeExtensionTokenUseCase');

export const getGenerateFlashcardFromSelectionUseCase = (): GenerateFlashcardFromSelectionUseCase =>
  container.get('GenerateFlashcardFromSelectionUseCase');

// Auth exports
export const getSignInWithOtpUseCase = (): SignInWithOtpUseCase =>
  container.get('SignInWithOtpUseCase');
  
export const getSignUpWithOtpUseCase = (): SignUpWithOtpUseCase =>
  container.get('SignUpWithOtpUseCase');
  
export const getVerifyOtpUseCase = (): VerifyOtpUseCase =>
  container.get('VerifyOtpUseCase');
  
export const getSignInWithOAuthUseCase = (): SignInWithOAuthUseCase =>
  container.get('SignInWithOAuthUseCase');
  
export const getHandleAuthCallbackUseCase = (): HandleAuthCallbackUseCase =>
  container.get('HandleAuthCallbackUseCase');
  
export const getSendContactEmailUseCase = (): SendContactEmailUseCase =>
  container.get('SendContactEmailUseCase');

// Services exports
export const getAuthService = (): AuthService =>
  container.get('AuthService');
  
export const getEmailService = (): EmailService =>
  container.get('EmailService');
  
export const getModerationService = (): ModerationService =>
  container.get('ModerationService'); 