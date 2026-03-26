import { test, expect } from "@playwright/test";

function commandControlSelector(id) {
  if (id === "search-participant") {
    return '[data-bridge-input-id="search-participant"][data-bridge-ready="true"] #search-participant[role="combobox"], select#search-participant:not(.hidden)';
  }
  return `#${id}`;
}

async function openUtilityCluster(page) {
  await page.evaluate(() => {
    const cluster = document.getElementById("workspace-utility-cluster");
    if (cluster instanceof HTMLDetailsElement) cluster.open = true;
  });
}

async function waitForShellUtilityBinding(page, ...ids) {
  await page.waitForFunction(boundIds => {
    const runtime = window.__WAAN_VUE_RUNTIME__;
    const shellBridgeReady =
      typeof runtime?.bridges?.shell?.dispatchShellAction === "function"
      && typeof runtime?.bridges?.shell?.setShellActionHandlers === "function";
    if (!shellBridgeReady) return false;
    return boundIds.every(id => document.getElementById(id)?.dataset?.shellActionBound === "true");
  }, ids);
}

test.describe("WAAN Accessibility Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("waan-onboarding-dismissed", "done");
      window.localStorage.removeItem("waan-reduce-motion");
      window.localStorage.removeItem("waan-high-contrast");
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForFunction(() => {
      const runtime = window.__WAAN_VUE_RUNTIME__;
      return Boolean(runtime?.bridges?.shell)
        && Boolean(document.getElementById("search-keyword"))
        && Boolean(
          document.querySelector(
            '[data-bridge-input-id="search-participant"][data-bridge-ready="true"] #search-participant[role="combobox"], select#search-participant:not(.hidden)',
          ),
        )
        && Boolean(document.getElementById("search-start"))
        && Boolean(document.getElementById("search-end"))
        && Boolean(document.getElementById("run-search"))
        && Boolean(document.getElementById("actions-toolbar"))
        && Boolean(document.getElementById("relay-status-panel"));
    });
  });

  test("applies reduced-motion and high-contrast states", async ({ page }) => {
    await openUtilityCluster(page);
    await waitForShellUtilityBinding(page, "reduce-motion-toggle", "high-contrast-toggle");
    const reduceMotionToggle = page.locator("#reduce-motion-toggle:visible").first();
    const highContrastToggle = page.locator("#high-contrast-toggle:visible").first();

    await expect(reduceMotionToggle).toBeVisible();
    await expect(highContrastToggle).toBeVisible();
    await expect(reduceMotionToggle).toBeEnabled();
    await expect(highContrastToggle).toBeEnabled();
    await expect(reduceMotionToggle).toHaveAttribute("title", /.+/);
    await expect(highContrastToggle).toHaveAttribute("title", /.+/);
    await expect(reduceMotionToggle).toHaveAttribute("aria-pressed", "mixed");
    await expect(highContrastToggle).toHaveAttribute("aria-pressed", "false");

    await reduceMotionToggle.click();
    await expect(reduceMotionToggle).toHaveAttribute("aria-pressed", "true");
    await expect(reduceMotionToggle).toHaveText(/Motion: Reduced/);
    await page.waitForFunction(() =>
      document.body?.dataset.reduceMotion === "true"
      && document.documentElement?.dataset.uiMotion === "reduced"
    );

    await highContrastToggle.click();
    await expect(highContrastToggle).toHaveAttribute("aria-pressed", "true");
    await expect(highContrastToggle).toHaveText(/Contrast: Boosted/);
    await page.waitForFunction(() =>
      document.body?.dataset.contrast === "high"
      && document.documentElement?.dataset.uiContrast === "high"
    );
  });

  test("keeps migrated command controls keyboard focusable", async ({ page }) => {
    const focusSelectors = [
      "search-keyword",
      "search-participant",
      "search-start",
      "search-end",
      "run-search",
    ];

    for (const controlId of focusSelectors) {
      const selector = commandControlSelector(controlId);
      await page.waitForFunction(targetSelector => {
        const element = document.querySelector(targetSelector);
        return Boolean(element && element.isConnected);
      }, selector);
      await expect
        .poll(async () =>
          page.evaluate(targetSelector => {
            const element = document.querySelector(targetSelector);
            if (!(element instanceof HTMLElement)) return false;
            element.scrollIntoView({
              block: "center",
              inline: "nearest",
            });
            element.focus();
            return Boolean(
              element === document.activeElement
                || element.contains(document.activeElement),
            );
          }, selector),
        )
        .toBe(true);
    }
  });

  test("keeps dense data-surface metric help controls keyboard focusable", async ({ page }) => {
    const selectors = [
      '[aria-describedby="participants-share-note"]',
      '[aria-describedby="participants-avg-words-note"]',
    ];

    for (const selector of selectors) {
      const visibleTarget = page.locator(`${selector}:visible`).first();
      if (await visibleTarget.count()) {
        await expect(visibleTarget).toBeVisible();
        await visibleTarget.focus();
        await expect
          .poll(async () => page.evaluate(() => document.activeElement?.getAttribute("aria-describedby") || ""))
          .toBe((await visibleTarget.getAttribute("aria-describedby")) || "");
      } else {
        await expect(page.locator(selector).first()).toHaveCount(1);
      }
    }
  });

  test("keeps support and diagnostics actions keyboard reachable", async ({ page }) => {
    await openUtilityCluster(page);
    await waitForShellUtilityBinding(page, "log-drawer-toggle");
    const logDrawerToggle = page.locator("#log-drawer-toggle:visible").first();
    await expect(logDrawerToggle).toBeVisible();
    await expect(logDrawerToggle).toHaveAttribute("title", /.+/);
    await logDrawerToggle.focus();
    await expect
      .poll(async () => logDrawerToggle.evaluate(element => element === document.activeElement))
      .toBe(true);

    await page.evaluate(() => {
      document.getElementById("relay-log-drawer")?.setAttribute("aria-hidden", "false");
    });
    const drawer = page.locator("#relay-log-drawer");
    await expect(drawer).toHaveAttribute("aria-hidden", "false");

    const actionSelectors = [
      "#relay-log-export",
      "#relay-log-report",
      "#relay-log-clear",
      "#relay-log-close",
      '#faq-card .card-toggle[data-target="faq-content"]',
    ];

    for (const selector of actionSelectors) {
      const target = page.locator(`${selector}:visible`).first();
      await expect(target).toBeVisible();
      await expect(target).toHaveAttribute("title", /.+/);
      await target.focus();
      await expect
        .poll(async () => target.evaluate(element => element === document.activeElement))
        .toBe(true);
    }
  });
});
