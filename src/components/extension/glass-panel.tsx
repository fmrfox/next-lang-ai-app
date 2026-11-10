import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Frosted-glass panel used by the extension connect page and the extension promo modal.
 * Matches the app's dark glass style (auth forms, cookie banner): translucent surface,
 * blur, thin light border and purple → pink accents.
 */
export function GlassPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-xl",
        "shadow-2xl shadow-purple-950/40",
        className
      )}
    >
      {/* soft glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-purple-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-pink-600/15 blur-3xl" />
      {/* top highlight line */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Round gradient badge with an icon — same as the auth forms' header icon. */
export function GlassIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600",
        "shadow-lg shadow-purple-600/30 ring-1 ring-white/20",
        className
      )}
    >
      <Icon className="h-7 w-7 text-white" />
    </div>
  );
}

export const glassPrimaryButton =
  "h-11 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium border border-white/20 shadow-lg shadow-purple-600/25 hover:opacity-90 transition-opacity";

export const glassSecondaryButton =
  "h-11 px-6 rounded-xl bg-white/5 border border-white/15 text-gray-200 hover:bg-white/10 hover:text-white transition-colors";
