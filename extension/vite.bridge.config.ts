import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";

// Content scripts can't be ES modules, so the bridge is built separately as a single IIFE.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    define: {
      "import.meta.env.VITE_LANGUITO_URL": JSON.stringify(env.VITE_LANGUITO_URL),
    },
    build: {
      outDir: "dist",
      emptyOutDir: false,
      target: "es2022",
      minify: mode !== "development",
      copyPublicDir: false,
      lib: {
        entry: resolve(__dirname, "src/bridge/index.ts"),
        formats: ["iife"],
        name: "LanguitoBridge",
        fileName: () => "bridge.js",
      },
    },
  };
});
