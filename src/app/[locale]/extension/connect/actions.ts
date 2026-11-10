"use server";

import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-helpers";
import { getCreateExtensionTokenUseCase } from "@/lib/container";

export async function createExtensionTokenAction(): Promise<
  { success: true; token: string; email: string | null } | { success: false; error: string }
> {
  if (await isDemoMode()) {
    return { success: false, error: "demo" };
  }

  const { userId, user } = await auth();
  if (!userId || !user) {
    return { success: false, error: "unauthorized" };
  }

  try {
    const { token } = await getCreateExtensionTokenUseCase().execute({
      userId,
      userEmail: user.email ?? "",
    });
    return { success: true, token, email: user.email ?? null };
  } catch (error) {
    console.error("Create extension token error:", error);
    return { success: false, error: "server_error" };
  }
}
