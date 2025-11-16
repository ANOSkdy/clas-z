import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    exclude: ["tests/**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "server-only": resolve(__dirname, "tests/mocks/server-only.ts"),
    },
  },
});
