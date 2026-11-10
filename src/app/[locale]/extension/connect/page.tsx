import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-helpers";
import ExtensionConnectView from "./view";

export const dynamic = "force-dynamic";

export default async function ExtensionConnectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = await isDemoMode();
  const { userId, user } = demo ? { userId: null, user: null } : await auth();

  return (
    <ExtensionConnectView
      isSignedIn={Boolean(userId)}
      isDemo={demo}
      email={user?.email ?? null}
    />
  );
}
