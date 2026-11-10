/**
 * Functions injected into web pages with chrome.scripting.executeScript({ func }).
 * They are serialised with Function.prototype.toString, so they MUST be self-contained:
 * no imports, no references to anything outside the function body.
 */
import type { RuntimeMessage } from "../shared/protocol";

export interface SelectionDetails {
  text: string;
  context: string;
}

/** Returns the selected text and the sentence(s) around it, to disambiguate the meaning. */
export function getSelectionDetails(maxContext: number): SelectionDetails {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();

  let text = "";
  let source = "";

  const active = document.activeElement;
  const isTextField =
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLInputElement && /^(text|search|url|)$/.test(active.type));

  if (isTextField) {
    const field = active as HTMLInputElement | HTMLTextAreaElement;
    const start = field.selectionStart ?? 0;
    const end = field.selectionEnd ?? 0;
    text = field.value.slice(start, end);
    source = field.value;
  }

  if (!text) {
    const selection = window.getSelection();
    text = selection?.toString() ?? "";
    if (selection && selection.rangeCount > 0) {
      const node = selection.getRangeAt(0).commonAncestorContainer;
      let el: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
      // Climb to a block that holds at least a sentence of text.
      while (el && el !== document.body && clean(el.innerText || "").length < 80) {
        el = el.parentElement;
      }
      source = el?.innerText ?? "";
    }
  }

  text = clean(text);
  source = clean(source);
  if (!text || !source) return { text, context: "" };

  const index = source.toLowerCase().indexOf(text.toLowerCase());
  if (index === -1) return { text, context: source.slice(0, maxContext) };

  // Expand to sentence boundaries around the selection.
  const boundary = /[.!?…。]\s/g;
  let start = 0;
  let end = source.length;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(source))) {
    const pos = match.index + 1;
    if (pos <= index) start = pos;
    else if (pos >= index + text.length) {
      end = pos;
      break;
    }
  }

  let context = source.slice(start, end).trim();
  if (context.length > maxContext) {
    const half = Math.floor((maxContext - text.length) / 2);
    const from = Math.max(0, index - half);
    context = source.slice(from, from + maxContext).trim();
  }
  return { text, context: context === text ? "" : context };
}

export interface ToastState {
  id: string;
  kind: "loading" | "success" | "duplicate" | "error";
  title: string;
  body?: string;
  card?: { front: string; back: string; example?: string; exampleTranslation?: string };
  action?: { label: string; message: RuntimeMessage };
  autoCloseMs?: number;
}

/** Renders (or updates) the Languito toast in the top-right corner of the page. */
export function renderToast(state: ToastState): void {
  const HOST_ID = "languito-extension-toast";
  // Kept in the extension's isolated world (shared by every executeScript call), invisible to the
  // page. The shadow root is closed so page scripts can't read the toast or reach its buttons.
  const state_ = globalThis as unknown as { __languitoToast?: { host: HTMLElement; root: ShadowRoot } };
  let toastRef = state_.__languitoToast;
  if (!toastRef || !toastRef.host.isConnected) {
    const newHost = document.createElement("div");
    newHost.id = HOST_ID;
    newHost.style.cssText =
      "all:initial;position:fixed;top:16px;right:16px;z-index:2147483647;";
    toastRef = { host: newHost, root: newHost.attachShadow({ mode: "closed" }) };
    state_.__languitoToast = toastRef;
    document.documentElement.appendChild(newHost);
  }
  const { host, root } = toastRef;
  host.dataset.toastId = state.id;

  const el = (tag: string, className?: string, text?: string) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text; // AI/page content is never parsed as HTML
    return node;
  };

  const style = el("style");
  style.textContent = `
    .toast{width:320px;box-sizing:border-box;padding:14px 16px;border-radius:14px;
      background:#111014;color:#f4f4f5;border:1px solid #3b2a5c;
      box-shadow:0 12px 32px rgba(0,0,0,.45);font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;
      animation:in .18s ease-out}
    @keyframes in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
    .head{display:flex;align-items:center;gap:8px;margin-bottom:4px}
    .brand{width:18px;height:18px;border-radius:5px;flex:none;background:linear-gradient(135deg,#9333ea,#db2777)}
    .title{font-weight:600;flex:1}
    .close{all:unset;cursor:pointer;color:#a1a1aa;font-size:18px;line-height:1;padding:0 2px}
    .close:hover{color:#fff}
    .body{color:#a1a1aa;margin-top:2px;word-break:break-word}
    .error .title{color:#fca5a5}
    .spinner{width:14px;height:14px;border:2px solid #4c3a6e;border-top-color:#c084fc;border-radius:50%;
      animation:spin .8s linear infinite;flex:none}
    @keyframes spin{to{transform:rotate(360deg)}}
    .card{margin-top:10px;padding:10px 12px;border-radius:10px;background:#1c1726;border:1px solid #2f2445}
    .front{font-size:15px;font-weight:600;color:#fff}
    .back{font-size:14px;color:#d8b4fe;margin-top:2px}
    .ex{margin-top:8px;font-style:italic;color:#d4d4d8}
    .ex-t{color:#a1a1aa;margin-top:2px}
    .action{all:unset;cursor:pointer;margin-top:10px;display:inline-block;padding:6px 12px;border-radius:8px;
      background:#9333ea;color:#fff;font-weight:600}
    .action:hover{background:#a855f7}
  `;

  const toast = el("div", `toast ${state.kind}`);
  const head = el("div", "head");
  head.appendChild(el("div", state.kind === "loading" ? "spinner" : "brand"));
  head.appendChild(el("div", "title", state.title));
  const close = el("button", "close", "×");
  close.setAttribute("aria-label", "Close");
  close.addEventListener("click", (event) => {
    if (event.isTrusted) host.remove();
  });
  head.appendChild(close);
  toast.appendChild(head);

  if (state.body) toast.appendChild(el("div", "body", state.body));

  if (state.card) {
    const card = el("div", "card");
    card.appendChild(el("div", "front", state.card.front));
    card.appendChild(el("div", "back", state.card.back));
    if (state.card.example) card.appendChild(el("div", "ex", state.card.example));
    if (state.card.exampleTranslation) card.appendChild(el("div", "ex-t", state.card.exampleTranslation));
    toast.appendChild(card);
  }

  if (state.action) {
    const { label, message } = state.action;
    const button = el("button", "action", label);
    button.addEventListener("click", (event) => {
      if (!event.isTrusted) return; // ignore clicks synthesized by the page
      chrome.runtime.sendMessage(message);
      host.remove();
    });
    toast.appendChild(button);
  }

  toast.setAttribute("role", state.kind === "error" ? "alert" : "status");
  root.replaceChildren(style, toast);

  if (state.autoCloseMs) {
    setTimeout(() => {
      // Only close if a newer toast hasn't replaced this one.
      const current = document.getElementById(HOST_ID);
      if (current?.dataset.toastId === state.id) current.remove();
    }, state.autoCloseMs);
  }
}
