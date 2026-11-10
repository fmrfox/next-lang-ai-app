import { NextResponse } from "next/server";
import {
  authenticateExtensionRequest,
  extensionError,
  extensionPreflight,
  withCors,
} from "@/lib/extension-auth";
import { getUserRepository } from "@/lib/container";

async function handle(req: Request) {
  try {
    const session = await authenticateExtensionRequest(req);
    if (!session) return extensionError("unauthorized", "Invalid or revoked extension token");

    const user = await getUserRepository().getUserById(session.userId);
    return NextResponse.json({ email: user?.email ?? null });
  } catch (error) {
    console.error("Extension me route error:", error);
    return extensionError("server_error", "Unexpected error");
  }
}

export async function GET(req: Request) {
  return withCors(req, await handle(req));
}

export const OPTIONS = extensionPreflight;
