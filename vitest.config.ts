import { defineConfig } from "vitest/config";
import path from "path";

// Mirror the "@/*" path alias from tsconfig.json so tests can import
// modules that use it (src/lib/seo.ts imports "@/i18n/routing").
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
