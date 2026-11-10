/**
 * Messages exchanged inside the extension and with the Languito /extension/connect page.
 * The window.postMessage part must stay in sync with src/lib/extension-bridge-protocol.ts in the web app.
 */
export const EXTENSION_MESSAGE_SOURCE = "languito-extension";
export const WEB_MESSAGE_SOURCE = "languito-web";

export type WebToExtensionMessage =
  | { source: typeof WEB_MESSAGE_SOURCE; type: "PING" }
  | { source: typeof WEB_MESSAGE_SOURCE; type: "CONNECT"; token: string; email: string | null };

export type ExtensionToWebMessage =
  | { source: typeof EXTENSION_MESSAGE_SOURCE; type: "READY"; version: string }
  | { source: typeof EXTENSION_MESSAGE_SOURCE; type: "CONNECTED" }
  | { source: typeof EXTENSION_MESSAGE_SOURCE; type: "CONNECT_FAILED" };

/** chrome.runtime messages handled by the background service worker. */
export type RuntimeMessage =
  | { type: "STORE_CONNECTION"; token: string; email: string | null }
  | { type: "OPEN_CONNECT_PAGE" }
  | { type: "OPEN_LANGUITO" };
