import { api, ApiError, errorMessage } from "../shared/api";
import {
  CONNECT_URL,
  FLASHCARDS_URL,
  LANGUITO_ORIGINS,
  MAX_CONTEXT_LENGTH,
  MAX_SELECTION_LENGTH,
} from "../shared/config";
import { t } from "../shared/i18n";
import type { RuntimeMessage } from "../shared/protocol";
import { storage } from "../shared/storage";
import { getSelectionDetails, renderToast, type SelectionDetails, type ToastState } from "./page-scripts";

const MENU_ID = "languito-create-flashcard";
const TOKEN_PATTERN = /^lgt_[A-Za-z0-9_-]{43}$/;

const CONNECT_ACTION = () => ({ label: t("actionConnect"), message: { type: "OPEN_CONNECT_PAGE" } as const });
const OPEN_ACTION = () => ({ label: t("actionOpenLanguito"), message: { type: "OPEN_LANGUITO" } as const });

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU_ID, title: t("menuCreate"), contexts: ["selection"] });

  await storage.removeLegacyKeys();

  if (reason === chrome.runtime.OnInstalledReason.INSTALL && !(await storage.getConnection())) {
    await chrome.tabs.create({ url: CONNECT_URL() });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || tab?.id === undefined) return;
  void createFlashcardFromTab(tab, info.frameId ?? 0, info.selectionText);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "create-flashcard" || tab?.id === undefined) return;
  void createFlashcardFromTab(tab, undefined);
});

// Notification ids: "connect:<id>" or "open:<id>".
chrome.notifications.onClicked.addListener((notificationId) => {
  const url = notificationId.startsWith("connect:") ? CONNECT_URL() : FLASHCARDS_URL();
  void chrome.tabs.create({ url });
  void chrome.notifications.clear(notificationId);
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;

  switch (message.type) {
    case "STORE_CONNECTION": {
      // Only the bridge content script running on the Languito origin may hand over a token.
      const fromLanguito =
        sender.tab !== undefined &&
        sender.url !== undefined &&
        LANGUITO_ORIGINS.includes(new URL(sender.url).origin);
      if (!fromLanguito) {
        sendResponse({ ok: false });
        return;
      }
      storeConnection(message.token, message.email).then((ok) => sendResponse({ ok }));
      return true; // async response
    }
    case "OPEN_CONNECT_PAGE":
      void chrome.tabs.create({ url: CONNECT_URL() });
      return;
    case "OPEN_LANGUITO":
      void chrome.tabs.create({ url: FLASHCARDS_URL() });
      return;
  }
});

async function storeConnection(token: string, email: string | null): Promise<boolean> {
  if (!TOKEN_PATTERN.test(token)) return false;
  try {
    const me = await api.me(token); // make sure the token actually works
    const previous = await storage.getConnection();
    await storage.setConnection({ token, email: me.email ?? email });
    if (previous && previous.token !== token) {
      api.revokeToken(previous.token).catch(() => {});
    }
    return true;
  } catch (error) {
    console.warn("Languito: storing connection failed", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Flashcard creation
// ---------------------------------------------------------------------------

async function readSelection(tabId: number, frameId: number | undefined): Promise<SelectionDetails | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: frameId === undefined ? { tabId, allFrames: true } : { tabId, frameIds: [frameId] },
      func: getSelectionDetails,
      args: [MAX_CONTEXT_LENGTH],
    });
    return results.map((r) => r.result as SelectionDetails | undefined).find((r) => r?.text) ?? null;
  } catch {
    // Restricted pages (chrome://, Web Store, built-in PDF viewer…) can't be scripted.
    return null;
  }
}

/** Shows progress in the page; falls back to system notifications where pages can't be scripted. */
function createFeedback(tabId: number) {
  const id = crypto.randomUUID();
  let canInject = true;

  const notify = (state: Omit<ToastState, "id">) => {
    if (state.kind === "loading") return;
    const prefix = state.action?.message.type === "OPEN_CONNECT_PAGE" ? "connect" : "open";
    const message = state.card ? `${state.card.front} → ${state.card.back}` : state.body ?? "";
    void chrome.notifications.create(`${prefix}:${id}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: state.title,
      message,
    });
  };

  return async (state: Omit<ToastState, "id">) => {
    if (canInject) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId, frameIds: [0] },
          func: renderToast,
          args: [{ ...state, id }],
        });
        return;
      } catch {
        canInject = false;
      }
    }
    notify(state);
  };
}

async function flashBadge(tabId: number) {
  await chrome.action.setBadgeBackgroundColor({ color: "#9333ea", tabId });
  await chrome.action.setBadgeText({ text: "✓", tabId });
  setTimeout(() => chrome.action.setBadgeText({ text: "", tabId }).catch(() => {}), 3000);
}

async function createFlashcardFromTab(tab: chrome.tabs.Tab, frameId: number | undefined, fallbackText?: string) {
  const tabId = tab.id!;
  const show = createFeedback(tabId);
  const fail = (body: string, withConnect = false) =>
    show({
      kind: "error",
      title: t("toastErrorTitle"),
      body,
      action: withConnect ? CONNECT_ACTION() : undefined,
      autoCloseMs: withConnect ? undefined : 6000,
    });

  const details = await readSelection(tabId, frameId);
  const text = (details?.text || fallbackText || "").replace(/\s+/g, " ").trim();

  if (!text) return fail(t("errNoSelection"));
  if (text.length > MAX_SELECTION_LENGTH) return fail(t("errTooLong"));
  if (!(await storage.getConnection())) return fail(t("errNotConnected"), true);

  const settings = await storage.getSettings();
  if (settings.learningLanguage === settings.nativeLanguage) return fail(t("errSameLanguages"));

  await show({ kind: "loading", title: t("toastGenerating"), body: `„${text}”` });

  try {
    const { flashcard, duplicate } = await api.createFlashcard(
      { text, context: details?.context || undefined },
      settings
    );
    await storage.addToHistory({ flashcard, pageUrl: tab.url, createdAt: Date.now() });
    await show({
      kind: duplicate ? "duplicate" : "success",
      title: t(duplicate ? "toastDuplicate" : "toastSaved"),
      card: {
        front: flashcard.term,
        back: flashcard.translation,
        example: flashcard.example,
        exampleTranslation: flashcard.exampleTranslation,
      },
      action: OPEN_ACTION(),
      autoCloseMs: 8000,
    });
    if (!duplicate) await flashBadge(tabId);
  } catch (error) {
    const needsConnect =
      error instanceof ApiError && (error.code === "unauthorized" || error.code === "not_connected");
    await fail(errorMessage(error), needsConnect);
  }
}

// Test hook for the Playwright smoke test (development builds only; stripped from production).
if (import.meta.env.MODE === "development") {
  (globalThis as Record<string, unknown>).__languitoTest = { createFlashcardFromTab };
}
