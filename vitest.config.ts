import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    include: ["lib/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/**/*.spec.ts"],
  },
});
