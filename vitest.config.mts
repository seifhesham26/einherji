import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The route tests each begin with a dynamic import of a handler that pulls in
    // @sentry/nextjs and next/server. Alone that resolves in about a second; with
    // thirty-odd files competing for workers it can pass five, and the first test
    // in the file fails on a cold module graph rather than on anything it asserts.
    testTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
});
