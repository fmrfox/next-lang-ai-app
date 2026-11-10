import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { buildManifest } from "./manifest.config";

function manifestPlugin(origin: string): Plugin {
  return {
    name: "languito-manifest",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(buildManifest(origin), null, 2),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (!env.VITE_LANGUITO_URL) throw new Error("VITE_LANGUITO_URL is not set");

  return {
    plugins: [react(), manifestPlugin(env.VITE_LANGUITO_URL)],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      target: "es2022",
      sourcemap: mode === "development" ? "inline" : false,
      minify: mode !== "development",
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "popup.html"),
          background: resolve(__dirname, "src/background/index.ts"),
        },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js",
        },
      },
    },
  };
});
