import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { isDemoMode, isDemoUserId } from "@/lib/demo-helpers";
import ExtensionConnectView from "./view";

export const dynamic = "force-dynamic";

export default async function ExtensionConnectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demoCookie = await isDemoMode();
  const { userId, user } = demoCookie ? { userId: null, user: null } : await auth();
  // Signed in directly to the shared demo account counts as demo too.
  const demo = demoCookie || isDemoUserId(userId);

  return (
    <ExtensionConnectView
      isSignedIn={Boolean(userId) && !demo}
      isDemo={demo}
      email={user?.email ?? null}
    />
  );
}
