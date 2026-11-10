/**
 * window.postMessage protocol between the /extension/connect page and the
 * extension's bridge content script. Keep in sync with extension/src/shared/protocol.ts.
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
