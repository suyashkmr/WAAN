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
        lines: 55,
        functions: 58,
        branches: 36,
        statements: 53,
      },
    },
  },
});
