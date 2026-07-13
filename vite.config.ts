import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Tauri expects a fixed dev port and doesn't want vite clearing its output.
export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      // Crepe's theme CSS imports katex statically even with the Latex
      // feature disabled; stub it out to keep ~1 MB of fonts out of the bundle.
      "katex/dist/katex.min.css": fileURLToPath(
        new URL("./src/styles/empty.css", import.meta.url),
      ),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "es2022",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
});
