import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "istanbul",
      extension: [".js", ".vue"],
      reporter: ["text", "html"],
      include: ["js/**/*.js", "src/**/*.vue"],
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
