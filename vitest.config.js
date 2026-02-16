import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.js"],
    coverage: {
      reporter: ["text", "html"],
      include: ["js/**/*.js"],
      exclude: ["js/vendor/**"],
      thresholds: {
        lines: 53,
        functions: 56,
        branches: 34,
        statements: 51,
      },
    },
  },
});
