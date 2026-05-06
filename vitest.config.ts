import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      thresholds: {
        lines: 45,
        branches: 55,
        functions: 70,
        statements: 45,
      },
    },
  },
});
