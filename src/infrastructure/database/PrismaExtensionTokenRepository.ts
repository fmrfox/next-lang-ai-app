import { prisma } from "@/lib/prisma";
import {
  ExtensionTokenRecord,
  ExtensionTokenRepository,
} from "@/core/interfaces/repositories/ExtensionTokenRepository";

const select = {
  id: true,
  userId: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const;

export class PrismaExtensionTokenRepository implements ExtensionTokenRepository {
  async create(userId: string, tokenHash: string): Promise<ExtensionTokenRecord> {
    return prisma.extensionToken.create({
      data: { userId, tokenHash },
      select,
    });
  }

  async findActiveByHash(tokenHash: string): Promise<ExtensionTokenRecord | null> {
    return prisma.extensionToken.findFirst({
      where: { tokenHash, revokedAt: null },
      select,
    });
  }

  async touch(id: string): Promise<void> {
    await prisma.extensionToken.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async revoke(id: string): Promise<void> {
    await prisma.extensionToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
