import { NextResponse } from "next/server";
import { getAuthenticateExtensionTokenUseCase } from "@/lib/container";
import type { AuthenticatedExtension } from "@/core/useCases/extension";

export type ExtensionErrorCode =
  | "unauthorized"
  | "invalid_input"
  | "rate_limited"
  | "generation_failed"
  | "server_error";

const STATUS: Record<ExtensionErrorCode, number> = {
  unauthorized: 401,
  invalid_input: 400,
  rate_limited: 429,
  generation_failed: 502,
  server_error: 500,
};

/**
 * CORS for the browser extension. Chrome usually exempts extensions with host permissions from CORS,
 * but not always (e.g. when the user restricts the extension's site access), so the API answers
 * preflights itself. Only chrome-extension:// origins are allowed. Safe because auth is a bearer
 * token sent explicitly by the caller — no cookies are involved.
 */
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (!origin.startsWith("chrome-extension://")) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Adds CORS headers for extension origins to a route response. */
export function withCors<T extends Response>(req: Request, response: T): T {
  for (const [key, value] of Object.entries(corsHeaders(req))) response.headers.set(key, value);
  return response;
}

/** OPTIONS handler shared by the extension API routes. */
export function extensionPreflight(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export function extensionError(code: ExtensionErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status: STATUS[code] });
}

/** Resolves the `Authorization: Bearer lgt_…` header sent by the browser extension. */
export async function authenticateExtensionRequest(
  req: Request
): Promise<AuthenticatedExtension | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return null;
  return getAuthenticateExtensionTokenUseCase().execute(match[1]);
}
