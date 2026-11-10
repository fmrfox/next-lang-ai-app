"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCookieConsent } from "@/components/cookie-consent";
import {
  EXTENSION_MESSAGE_SOURCE,
  WEB_MESSAGE_SOURCE,
  type ExtensionToWebMessage,
  type WebToExtensionMessage,
} from "@/lib/extension-bridge-protocol";
import {
  GlassPanel,
  glassPrimaryButton,
  glassSecondaryButton,
} from "@/components/extension/glass-panel";

/** Chrome Web Store listing. When unset, the modal offers the packaged ZIP instead. */
const STORE_URL = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL;
const ZIP_URL = "/downloads/languito-extension.zip";

const DISMISS_KEY = "extension-promo-dismissed-at";
const SHOW_AGAIN_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 1500;
const DETECTION_TIMEOUT_MS = 1200;
const INSTALL_STEPS = ["step1", "step2", "step3"] as const;

function wasRecentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < SHOW_AGAIN_AFTER_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // storage blocked — the modal will simply show again next time
  }
}

/** Desktop only: the extension can't be installed on phones/tablets. */
function isDesktop(): boolean {
  return window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;
}

/** Resolves true if the extension's bridge answers on this page. */
function detectExtension(): Promise<boolean> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent<ExtensionToWebMessage>) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.source === EXTENSION_MESSAGE_SOURCE && event.data.type === "READY") {
        cleanup();
        resolve(true);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, DETECTION_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
    window.addEventListener("message", onMessage);
    const ping: WebToExtensionMessage = { source: WEB_MESSAGE_SOURCE, type: "PING" };
    window.postMessage(ping, window.location.origin);
  });
}

/**
 * Announces the Languito browser extension once per visitor (again after 30 days),
 * after the cookie banner has been answered, on desktop, when the extension isn't installed.
 */
export function ExtensionPromoModal() {
  const t = useTranslations("ExtensionPromo");
  const { consent } = useCookieConsent();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const onConnectPage = pathname?.includes("/extension/connect") ?? false;

  useEffect(() => {
    if (!consent || onConnectPage) return;
    if (!isDesktop() || wasRecentlyDismissed()) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const installed = await detectExtension();
      if (!cancelled && !installed) setOpen(true);
    }, SHOW_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [consent, onConnectPage]);

  const close = () => {
    rememberDismissal();
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>

            {/* Flex wrapper centers the dialog; framer-motion owns `transform`. */}
            <div className="pointer-events-none fixed inset-0 z-[61] flex items-center justify-center p-4">
              <Dialog.Content
                asChild
                forceMount
                aria-describedby="extension-promo-description"
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <motion.div
                  className="pointer-events-auto w-full max-w-md outline-none"
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <GlassPanel className="bg-black/70 p-7">
                    <Dialog.Close
                      className="absolute -right-2 -top-2 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label={t("close")}
                    >
                      <X className="h-4 w-4" />
                    </Dialog.Close>

                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-purple-300">
                      {t("badge")}
                    </p>
                    <Dialog.Title className="mt-2 text-2xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                      {t("title")}
                    </Dialog.Title>
                    <Dialog.Description
                      id="extension-promo-description"
                      className="mt-3 text-sm leading-relaxed text-gray-300"
                    >
                      {t("description")}
                    </Dialog.Description>

                    {/* What the user gets — a selected word turned into a flashcard */}
                    <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4">
                      <p className="text-sm text-gray-400">
                        {t("previewSentenceStart")}{" "}
                        <mark className="rounded bg-purple-500/30 px-1 text-white">
                          {t("previewTerm")}
                        </mark>{" "}
                        {t("previewSentenceEnd")}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-sm">
                        <span className="font-semibold text-white">{t("previewTerm")}</span>
                        <span className="text-purple-200">{t("previewTranslation")}</span>
                      </div>
                    </div>

                    {!STORE_URL && (
                      <ol className="mt-5 space-y-1.5 text-xs leading-relaxed text-gray-400">
                        {INSTALL_STEPS.map((step, i) => (
                          <li key={step} className="flex gap-2">
                            <span className="w-4 flex-shrink-0 font-semibold text-purple-300">
                              {i + 1}.
                            </span>
                            <span>{t(step)}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button type="button" onClick={close} className={glassSecondaryButton}>
                        {t("later")}
                      </button>
                      {STORE_URL ? (
                        <a
                          href={STORE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={close}
                          className={cn(glassPrimaryButton, "inline-flex items-center justify-center")}
                        >
                          {t("addToChrome")}
                        </a>
                      ) : (
                        <a
                          href={ZIP_URL}
                          download
                          onClick={rememberDismissal}
                          className={cn(glassPrimaryButton, "inline-flex items-center justify-center")}
                        >
                          {t("download")}
                        </a>
                      )}
                    </div>

                    <p className="mt-4 text-center text-xs text-gray-500">{t("browsers")}</p>
                  </GlassPanel>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
