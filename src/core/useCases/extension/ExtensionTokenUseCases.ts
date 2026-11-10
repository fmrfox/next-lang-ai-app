import { ExtensionTokenRepository } from "@/core/interfaces/repositories/ExtensionTokenRepository";
import { UserManagementService } from "@/core/services";
import {
  generateExtensionToken,
  hashExtensionToken,
  isWellFormedExtensionToken,
} from "@/lib/extension-token";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
/** A token unused for this long stops working (e.g. extension removed without disconnecting). */
const IDLE_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

export class CreateExtensionTokenUseCase {
  constructor(
    private tokenRepository: ExtensionTokenRepository,
    private userManagementService: UserManagementService
  ) {}

  /** Returns the raw token. It is shown exactly once; only its hash is persisted. */
  async execute(params: { userId: string; userEmail: string }): Promise<{ token: string }> {
    // The token row references User, which may not exist yet for brand-new accounts.
    await this.userManagementService.upsertUser(params.userId, params.userEmail);

    const token = generateExtensionToken();
    await this.tokenRepository.create(params.userId, hashExtensionToken(token));
    return { token };
  }
}

export interface AuthenticatedExtension {
  tokenId: string;
  userId: string;
}

export class AuthenticateExtensionTokenUseCase {
  constructor(private tokenRepository: ExtensionTokenRepository) {}

  async execute(rawToken: string): Promise<AuthenticatedExtension | null> {
    if (!isWellFormedExtensionToken(rawToken)) return null;

    const record = await this.tokenRepository.findActiveByHash(hashExtensionToken(rawToken));
    if (!record) return null;

    const lastUsed = (record.lastUsedAt ?? record.createdAt).getTime();
    if (Date.now() - lastUsed > IDLE_EXPIRY_MS) {
      this.tokenRepository.revoke(record.id).catch(() => {});
      return null;
    }

    if (Date.now() - lastUsed > TOUCH_INTERVAL_MS) {
      // Best effort — a failed timestamp update must not block the request.
      this.tokenRepository.touch(record.id).catch(() => {});
    }

    return { tokenId: record.id, userId: record.userId };
  }
}

export class RevokeExtensionTokenUseCase {
  constructor(private tokenRepository: ExtensionTokenRepository) {}

  async execute(tokenId: string): Promise<void> {
    await this.tokenRepository.revoke(tokenId);
  }
}
