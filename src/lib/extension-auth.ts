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
