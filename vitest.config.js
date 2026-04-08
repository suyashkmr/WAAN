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
      include: ["js/**/*.js", "src/**/*.js", "src/**/*.vue", "apps/server/src/**/*.js"],
      exclude: [
        "js/vendor/**",
        "apps/server/src/index.js",
        "apps/server/src/server.js",
        "apps/server/src/http/relayRouter.js",
        "apps/server/src/relay/relayBrowserWindow.js",
        "apps/server/src/relay/relayConfig.js",
        "apps/server/src/relay/relayContacts.js",
        "apps/server/src/relay/relayLifecycle.js",
        "apps/server/src/relay/relayLifecycleSetup.js",
        "apps/server/src/relay/relayManagerSync.js",
        "apps/server/src/relay/relayMessageSync.js",
        "apps/server/src/relay/relayStartupResync.js",
        "apps/server/src/relay/relayState.js",
        "apps/server/src/relay/syncStrategy.js",
      ],
      thresholds: {
        lines: 55,
        functions: 65,
        branches: 36,
        statements: 53,
      },
    },
  },
});
