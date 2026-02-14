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
        lines: 41,
        functions: 43,
        branches: 27,
        statements: 40,
      },
    },
  },
});
