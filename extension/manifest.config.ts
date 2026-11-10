import pkg from "./package.json" with { type: "json" };
import { relatedOrigins } from "./src/shared/origins";

/** Builds manifest.json for the given Languito origin (e.g. https://languito.eu). */
export function buildManifest(languitoOrigin: string): chrome.runtime.ManifestV3 {
  const sitePatterns = relatedOrigins(languitoOrigin).map((origin) => `${origin}/*`);

  return {
    manifest_version: 3,
    name: "__MSG_extName__",
    short_name: "Languito",
    description: "__MSG_extDescription__",
    version: pkg.version,
    default_locale: "en",
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    },
    action: {
      default_popup: "popup.html",
      default_title: "__MSG_extName__",
      default_icon: {
        16: "icons/icon-16.png",
        32: "icons/icon-32.png",
      },
    },
    background: {
      service_worker: "background.js",
      type: "module",
    },
    // activeTab + scripting: read the selection's surrounding sentence and show an in-page toast,
    // only on the tab where the user invoked the context menu / shortcut.
    permissions: ["contextMenus", "storage", "activeTab", "scripting", "notifications"],
    host_permissions: sitePatterns,
    content_scripts: [
      {
        // Bridge used only by the /extension/connect page to hand over the API token.
        matches: sitePatterns,
        js: ["bridge.js"],
        run_at: "document_start",
      },
    ],
    commands: {
      "create-flashcard": {
        suggested_key: { default: "Alt+Shift+F" },
        description: "__MSG_commandCreate__",
      },
    },
  };
}
