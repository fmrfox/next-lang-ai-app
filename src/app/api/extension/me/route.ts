import { NextResponse } from "next/server";
import { authenticateExtensionRequest, extensionError } from "@/lib/extension-auth";
import { getUserRepository } from "@/lib/container";

export async function GET(req: Request) {
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
