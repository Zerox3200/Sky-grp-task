import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: ["tests/setup/globalSetup.ts"],
    globalTeardown: ["tests/setup/globalTeardown.ts"],
    setupFiles: ["tests/setup/env.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
