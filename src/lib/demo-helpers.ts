/**
 * Simple demo mode helpers for server-side usage
 * Uses the centralized demoModeService for consistency
 */

import { cookies } from "next/headers";
import { demoModeService } from "@/core/useCases/session/demo-mode.service";

export async function isDemoMode(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieString = cookieStore.getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
  return demoModeService.isDemoMode(cookieString);
}

export function getDemoUserId(): string | null {
  return process.env.DEMO_USER_ID || null;
}

/**
 * True for the shared demo account. The demo account is a real user, so it can also be reached
 * through a normal sign-in (without the demo cookie) — features that must never write to it
 * (e.g. the browser extension) check the user id, not only the cookie.
 */
export function isDemoUserId(userId: string | null | undefined): boolean {
  const demoUserId = getDemoUserId();
  return Boolean(demoUserId && userId && userId === demoUserId);
} 