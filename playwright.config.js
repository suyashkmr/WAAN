import { defineConfig, devices } from "@playwright/test";

const visualPort = Number.parseInt(process.env.PW_VISUAL_PORT ?? "4174", 10);
const visualDistDir = process.env.PW_VISUAL_DIST_DIR ?? "dist";
const visualBaseUrl = `http://127.0.0.1:${visualPort}`;

export default defineConfig({
  testDir: "tests/visual",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  fullyParallel: true,
  timeout: 120000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: visualBaseUrl,
    trace: "on-first-retry",
    animations: "disabled",
    colorScheme: "dark",
  },
  webServer: {
    command: `npm run build -- --outDir ${visualDistDir} && npm run preview -- --host 127.0.0.1 --port ${visualPort} --strictPort --outDir ${visualDistDir}`,
    url: visualBaseUrl,
    timeout: 180000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "desktop-1440",
      use: {
        browserName: "chromium",
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "laptop-1024",
      use: {
        browserName: "chromium",
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 900 },
      },
    },
    {
      name: "tablet-768",
      use: {
        browserName: "chromium",
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile-390",
      use: {
        browserName: "chromium",
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
