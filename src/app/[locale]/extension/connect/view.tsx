"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Link2,
  Loader2,
  LogIn,
  Puzzle,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { GlassIcon, GlassPanel, glassPrimaryButton } from "@/components/extension/glass-panel";
import {
  EXTENSION_MESSAGE_SOURCE,
  ExtensionToWebMessage,
  WEB_MESSAGE_SOURCE,
  WebToExtensionMessage,
} from "@/lib/extension-bridge-protocol";
import { createExtensionTokenAction } from "./actions";

type Status = "detecting" | "notDetected" | "ready" | "connecting" | "connected" | "error";

const DETECTION_TIMEOUT_MS = 2000;
const CONNECT_TIMEOUT_MS = 5000;

function postToExtension(message: WebToExtensionMessage) {
  window.postMessage(message, window.location.origin);
}

function isExtensionMessage(event: MessageEvent): event is MessageEvent<ExtensionToWebMessage> {
  return (
    event.source === window &&
    event.origin === window.location.origin &&
    event.data?.source === EXTENSION_MESSAGE_SOURCE
  );
}

interface Props {
  isSignedIn: boolean;
  isDemo: boolean;
  email: string | null;
}

export default function ExtensionConnectView({ isSignedIn, isDemo, email }: Props) {
  const t = useTranslations("Extension");
  const [status, setStatus] = useState<Status>("detecting");

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isExtensionMessage(event)) return;
      switch (event.data.type) {
        case "READY":
          setStatus((s) => (s === "detecting" || s === "notDetected" ? "ready" : s));
          break;
        case "CONNECTED":
          setStatus("connected");
          break;
        case "CONNECT_FAILED":
          setStatus("error");
          break;
      }
    };
    window.addEventListener("message", onMessage);
    // The bridge announces itself on load, but may have done so before React hydrated.
    postToExtension({ source: WEB_MESSAGE_SOURCE, type: "PING" });
    const timer = setTimeout(
      () => setStatus((s) => (s === "detecting" ? "notDetected" : s)),
      DETECTION_TIMEOUT_MS
    );
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, []);

  const connect = async () => {
    setStatus("connecting");
    const result = await createExtensionTokenAction();
    if (!result.success) {
      setStatus("error");
      return;
    }
    postToExtension({
      source: WEB_MESSAGE_SOURCE,
      type: "CONNECT",
      token: result.token,
      email: result.email,
    });
    setTimeout(() => setStatus((s) => (s === "connecting" ? "error" : s)), CONNECT_TIMEOUT_MS);
  };

  const renderBody = () => {
    if (isDemo) return <Message icon="error" text={t("demoNotSupported")} />;
    if (!isSignedIn) return <Message icon="info" text={t("signInRequired")} />;
    switch (status) {
      case "detecting":
        return <Message icon="loading" text={t("detecting")} />;
      case "notDetected":
        return <Message icon="error" text={t("notDetected")} />;
      case "ready":
        return <Message icon="info" text={t("readyToConnect", { email: email ?? "" })} />;
      case "connecting":
        return <Message icon="loading" text={t("connecting")} />;
      case "connected":
        return <Message icon="success" text={t("connected")} />;
      case "error":
        return <Message icon="error" text={t("connectFailed")} />;
    }
  };

  const renderAction = () => {
    if (isDemo || !isSignedIn) {
      return (
        <Link href="/sign-in" className={cn(glassPrimaryButton, "inline-flex items-center gap-2")}>
          <LogIn className="h-4 w-4" />
          {t("signIn")}
        </Link>
      );
    }
    if (status === "connected") {
      return (
        <Link href="/flashcards" className={cn(glassPrimaryButton, "inline-flex items-center gap-2")}>
          {t("goToFlashcards")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      );
    }
    return (
      <button
        onClick={connect}
        disabled={status !== "ready" && status !== "error"}
        className={cn(glassPrimaryButton, "inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed")}
      >
        <Link2 className="h-4 w-4" />
        {status === "error" ? t("tryAgain") : t("connect")}
      </button>
    );
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <GlassPanel className="p-8">
          <div className="flex flex-col items-center text-center">
            <GlassIcon icon={Puzzle} />
            <h1 className="mt-5 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">{t("description")}</p>
          </div>

          <div className="my-7 rounded-xl border border-white/10 bg-black/30 px-5 py-6">{renderBody()}</div>

          <div className="flex justify-center">{renderAction()}</div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}

function Message({
  icon,
  text,
}: {
  icon: "loading" | "success" | "error" | "info";
  text: string;
}) {
  const styles = {
    loading: "bg-purple-500/15 text-purple-300 ring-purple-400/30",
    success: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    error: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
    info: "bg-purple-500/15 text-purple-300 ring-purple-400/30",
  }[icon];

  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-full ring-1", styles)}>
        {icon === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
        {icon === "success" && <CheckCircle2 className="h-5 w-5" />}
        {icon === "error" && <AlertCircle className="h-5 w-5" />}
        {icon === "info" && <Sparkles className="h-5 w-5" />}
      </div>
      <p className="text-gray-200 leading-relaxed">{text}</p>
    </div>
  );
}
