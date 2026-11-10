export interface ExtensionTokenRecord {
  id: string;
  userId: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface ExtensionTokenRepository {
  create(userId: string, tokenHash: string): Promise<ExtensionTokenRecord>;
  findActiveByHash(tokenHash: string): Promise<ExtensionTokenRecord | null>;
  touch(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
}
