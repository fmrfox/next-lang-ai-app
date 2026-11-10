import { LANGUITO_ORIGIN, MAX_CONTEXT_LENGTH } from "./config";
import { storage } from "./storage";
import type { Flashcard, Settings } from "./types";

export type ApiErrorCode =
  | "not_connected"
  | "unauthorized"
  | "invalid_input"
  | "rate_limited"
  | "generation_failed"
  | "server_error"
  | "network";

export class ApiError extends Error {
  constructor(public code: ApiErrorCode, message?: string) {
    super(message ?? code);
  }
}

const KNOWN_CODES: ApiErrorCode[] = [
  "unauthorized",
  "invalid_input",
  "rate_limited",
  "generation_failed",
  "server_error",
];

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const authToken = token ?? (await storage.getConnection())?.token;
  if (!authToken) throw new ApiError("not_connected");

  let response: Response;
  try {
    response = await fetch(`${LANGUITO_ORIGIN}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError("network");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code as ApiErrorCode | undefined;
    const resolved = code && KNOWN_CODES.includes(code) ? code : "server_error";
    // A revoked/invalid token can't recover by itself — forget it so the UI asks to reconnect.
    if (resolved === "unauthorized" && !token) await storage.clearConnection();
    throw new ApiError(resolved, body?.error?.message);
  }
  return body as T;
}

export const api = {
  /** Single word/phrase selected on a page → pinned extension category. */
  createFlashcard(input: { text: string; context?: string }, settings: Settings) {
    return request<{ duplicate: boolean; flashcard: Flashcard }>("/api/extension/flashcards", {
      method: "POST",
      body: JSON.stringify({
        text: input.text,
        context: input.context?.slice(0, MAX_CONTEXT_LENGTH * 2),
        learningLanguage: settings.learningLanguage,
        nativeLanguage: settings.nativeLanguage,
        level: settings.level,
      }),
    });
  },

  me(token?: string) {
    return request<{ email: string | null }>("/api/extension/me", {}, token);
  },

  revokeToken(token: string) {
    return request<{ ok: true }>("/api/extension/token", { method: "DELETE" }, token);
  },
};

const ERROR_MESSAGE_KEYS: Record<ApiErrorCode, string> = {
  not_connected: "errNotConnected",
  unauthorized: "errUnauthorized",
  invalid_input: "errInvalidInput",
  rate_limited: "errRateLimited",
  generation_failed: "errGenerationFailed",
  server_error: "errServer",
  network: "errNetwork",
};

export function errorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "server_error";
  return chrome.i18n.getMessage(ERROR_MESSAGE_KEYS[code]);
}
