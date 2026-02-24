#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.UI_BASELINE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve(process.cwd(), "docs/ui-baseline");

const CAPTURE_PLAN = [
  { scheme: "light", width: 1280, height: 900 },
  { scheme: "dark", width: 1280, height: 900 },
  { scheme: "light", width: 390, height: 844 },
  { scheme: "dark", width: 390, height: 844 },
];

const SURFACES = [
  { key: "hero", selector: "#hero-panel" },
  { key: "section-nav", selector: ".section-nav" },
  { key: "summary", selector: "#summary" },
  { key: "relay-status", selector: "#relay-status-banner" },
];

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function preparePage(page, scheme) {
  await page.addInitScript(themeScheme => {
    window.localStorage.setItem("waan-theme-preference", themeScheme);
    window.localStorage.setItem("waan-reduce-motion", "true");
    window.localStorage.setItem("waan-high-contrast", "false");
    window.localStorage.setItem("waan-compact-mode", "false");
    window.localStorage.setItem("waan-onboarding-dismissed", "done");
  }, scheme);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("main").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForLoadState("load");
  await page.waitForTimeout(250);

  await page.addStyleTag({
    content: `*,
*::before,
*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`,
  });

  await page.evaluate(() => {
    const status = document.getElementById("data-status");
    if (status) status.classList.remove("is-active", "is-exiting");

    const summary = document.getElementById("summary");
    if (summary) {
      summary.classList.remove("hidden");
      if (!summary.children.length) {
        summary.innerHTML = `
          <article class="card stat-card">
            <p class="stat-label">Messages</p>
            <p class="stat-value">12,345</p>
          </article>
          <article class="card stat-card">
            <p class="stat-label">Participants</p>
            <p class="stat-value">42</p>
          </article>
          <article class="card stat-card">
            <p class="stat-label">Media</p>
            <p class="stat-value">678</p>
          </article>`;
      }
    }

    const relayBanner = document.getElementById("relay-status-banner");
    const relayMessage = document.getElementById("relay-status-message");
    const relayMeta = document.getElementById("relay-status-meta");
    if (relayBanner) relayBanner.classList.remove("hidden");
    if (relayMessage && !relayMessage.textContent?.trim()) relayMessage.textContent = "Relay offline.";
    if (relayMeta && !relayMeta.textContent?.trim()) {
      relayMeta.textContent = "Open the relay app, press Connect, then choose a chat.";
    }
  });
}

async function captureRun(browser, plan) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: plan.width, height: plan.height },
    colorScheme: plan.scheme,
  });
  const page = await context.newPage();
  await preparePage(page, plan.scheme);

  for (const surface of SURFACES) {
    const locator = page.locator(surface.selector);
    await locator.scrollIntoViewIfNeeded();
    await locator.waitFor({ state: "visible", timeout: 10000 });
    const name = `phase1-${plan.scheme}-${plan.width}-${surface.key}.png`;
    const filePath = path.join(OUTPUT_DIR, name);
    await locator.screenshot({ path: filePath });
  }

  await context.close();
}

async function main() {
  await ensureOutputDir();
  const browser = await chromium.launch();
  try {
    for (const plan of CAPTURE_PLAN) {
      await captureRun(browser, plan);
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(`Captured ${CAPTURE_PLAN.length * SURFACES.length} screenshots in docs/ui-baseline\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
