/**
 * Content script injected only on the Languito origin. It lets the /extension/connect page
 * hand an API token to the extension via window.postMessage.
 */
import {
  EXTENSION_MESSAGE_SOURCE,
  WEB_MESSAGE_SOURCE,
  type ExtensionToWebMessage,
  type RuntimeMessage,
  type WebToExtensionMessage,
} from "../shared/protocol";

const post = (message: ExtensionToWebMessage) => window.postMessage(message, window.location.origin);
const announce = () =>
  post({ source: EXTENSION_MESSAGE_SOURCE, type: "READY", version: chrome.runtime.getManifest().version });

window.addEventListener("message", (event: MessageEvent<WebToExtensionMessage>) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.source !== WEB_MESSAGE_SOURCE) return;

  if (data.type === "PING") {
    announce();
    return;
  }

  if (data.type === "CONNECT" && typeof data.token === "string") {
    const message: RuntimeMessage = { type: "STORE_CONNECTION", token: data.token, email: data.email ?? null };
    chrome.runtime
      .sendMessage(message)
      .then((response?: { ok: boolean }) =>
        post({ source: EXTENSION_MESSAGE_SOURCE, type: response?.ok ? "CONNECTED" : "CONNECT_FAILED" })
      )
      .catch(() => post({ source: EXTENSION_MESSAGE_SOURCE, type: "CONNECT_FAILED" }));
  }
});

announce();
