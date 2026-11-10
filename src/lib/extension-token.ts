import { createHash, randomBytes } from "crypto";

const TOKEN_PREFIX = "lgt_";

export function generateExtensionToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

export function hashExtensionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isWellFormedExtensionToken(token: string): boolean {
  return /^lgt_[A-Za-z0-9_-]{43}$/.test(token);
}
