import { defineConfig } from "vite";

// Tauri expects a fixed dev port and doesn't want vite clearing its output.
export default defineConfig({
  clearScreen: false,
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
