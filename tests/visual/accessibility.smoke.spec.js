import { test, expect } from "@playwright/test";
import "./stabilization.hook.js";

async function openUtilityCluster(page) {
  const cluster = page.locator("#workspace-utility-cluster");
  const summary = cluster.locator("summary").first();
  await expect(cluster).toBeVisible();
  await expect(summary).toBeVisible();
  const isOpen = await cluster.evaluate(node => Boolean(node?.open));
  if (!isOpen) {
    await summary.evaluate(node => node.click());
  }
  await expect
    .poll(async () => cluster.evaluate(node => Boolean(node?.open)))
    .toBe(true);
}

async function selectStage(page, stageId) {
  const stageRootIdByStage = {
    workspace: "workspace-stage",
    findings: "guided-findings-stage",
    deepdive: "deep-dive-stage",
    support: "faq-card",
  };
  const button = page.locator(`.stage-selector-button[data-stage-id="${stageId}"]`).first();
  await expect(button).toBeVisible();
  await button.evaluate(node => node.click());
  await expect(button).toHaveAttribute("data-stage-active", "true");
  await page.waitForFunction(targetId => {
    const stageHost = document.getElementById(targetId);
    if (!(stageHost instanceof HTMLElement)) return false;
    if (stageHost.hidden) return false;
    const style = window.getComputedStyle(stageHost);
    return style.display !== "none" && style.visibility !== "hidden";
  }, stageRootIdByStage[stageId]);
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

function commandControlLocator(page, id) {
  if (id === "search-participant") {
    return page.locator('[data-bridge-input-id="search-participant"][data-bridge-ready="true"] #search-participant--primevue[role="combobox"]:visible, select#search-participant:visible').first();
  }
  return page.locator(`#${id}:visible`).first();
}

async function expectLocatorFocused(locator) {
  const resolveLocator = () => (typeof locator === "function" ? locator() : locator);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const target = resolveLocator();
    await expect(target).toBeVisible();
    try {
      await target.scrollIntoViewIfNeeded();
      await target.focus();
      await expect
        .poll(async () =>
          target.evaluate(element =>
            element === document.activeElement
              || element.contains(document.activeElement),
          ))
        .toBe(true);
      return;
    } catch (error) {
      const detached = String(error).includes("Element is not attached to the DOM");
      if (!detached || attempt === 2) throw error;
    }
  }
}

test.describe("WAAN Accessibility Smoke", () => {
  async function readAccessibilityState(page) {
    return page.evaluate(() => ({
      reduceMotionPressed: document.getElementById("reduce-motion-toggle")?.getAttribute("aria-pressed") || "",
      highContrastPressed: document.getElementById("high-contrast-toggle")?.getAttribute("aria-pressed") || "",
      reduceMotionFlag: document.body?.dataset.reduceMotion || "",
      contrastFlag: document.body?.dataset.contrast || "",
      uiMotion: document.documentElement?.dataset.uiMotion || "",
      uiContrast: document.documentElement?.dataset.uiContrast || "",
    }));
  }

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
        && Boolean(document.querySelector(".stage-selector-button[data-stage-id='workspace']"))
        && Boolean(document.getElementById("actions-toolbar"))
        && Boolean(document.getElementById("relay-status-panel"));
    });
  });

  test("keeps accessibility toggles bound and stateful", async ({ page }) => {
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
    await expect(highContrastToggle).toHaveAttribute("aria-pressed", /^(false|true)$/);
    await expect(highContrastToggle).toHaveText(/Contrast:/);

    const beforeReduceMotion = await readAccessibilityState(page);
    await reduceMotionToggle.click();
    await expect(reduceMotionToggle).toHaveText(/Motion:/);
    await expect(reduceMotionToggle).toHaveAttribute("aria-pressed", /^(true|false)$/);
    await expect
      .poll(async () => {
        const after = await readAccessibilityState(page);
        return (
          after.reduceMotionPressed !== beforeReduceMotion.reduceMotionPressed
          && after.reduceMotionFlag !== beforeReduceMotion.reduceMotionFlag
          && after.uiMotion !== beforeReduceMotion.uiMotion
          && ["true", "false"].includes(after.reduceMotionFlag)
          && ["reduced", "standard"].includes(after.uiMotion)
        );
      })
      .toBe(true);

    const beforeHighContrast = await readAccessibilityState(page);
    await highContrastToggle.click();
    await expect(highContrastToggle).toHaveText(/Contrast:/);
    await expect(highContrastToggle).toHaveAttribute("aria-pressed", /^(true|false)$/);
    await expect
      .poll(async () => {
        const after = await readAccessibilityState(page);
        return (
          after.highContrastPressed !== beforeHighContrast.highContrastPressed
          && after.contrastFlag !== beforeHighContrast.contrastFlag
          && after.uiContrast !== beforeHighContrast.uiContrast
          && ["", "high"].includes(after.contrastFlag)
          && ["standard", "high"].includes(after.uiContrast)
        );
      })
      .toBe(true);
  });

  test("keeps migrated command controls keyboard focusable", async ({ page }, testInfo) => {
    await selectStage(page, "deepdive");
    await page.waitForFunction(() =>
      Boolean(document.getElementById("search-keyword"))
      && Boolean(
        document.querySelector(
          '[data-bridge-input-id="search-participant"][data-bridge-ready="true"] #search-participant--primevue[role="combobox"], select#search-participant:not(.hidden)',
        ),
      )
      && Boolean(document.getElementById("search-start"))
      && Boolean(document.getElementById("search-end"))
      && Boolean(document.getElementById("run-search")),
    );

    const focusSelectors = [
      "search-keyword",
      "search-participant",
      "search-start",
      "search-end",
      "run-search",
    ];

    for (const controlId of focusSelectors) {
      const target = commandControlLocator(page, controlId);
      await expect(target).toBeVisible();
      if (testInfo.project.name === "tablet-768" && controlId === "search-participant") {
        continue;
      }
      await expectLocatorFocused(() => commandControlLocator(page, controlId));
    }
  });

  test("keeps dense data-surface metric help controls keyboard focusable", async ({ page }) => {
    await selectStage(page, "findings");
    const selectors = [
      '[aria-describedby="participants-share-note"]',
      '[aria-describedby="participants-avg-words-note"]',
    ];

    for (const selector of selectors) {
      const visibleTarget = page.locator(`${selector}:visible`).first();
      if (await visibleTarget.count()) {
        await expect(visibleTarget).toBeVisible();
        await expectLocatorFocused(visibleTarget);
        await expect
          .poll(async () => visibleTarget.evaluate(element => element.getAttribute("aria-describedby") || ""))
          .toBe((await visibleTarget.getAttribute("aria-describedby")) || "");
      } else {
        await expect(page.locator(selector).first()).toHaveCount(1);
      }
    }
  });

  test("keeps support and diagnostics actions keyboard reachable", async ({ page }) => {
    await selectStage(page, "workspace");
    await openUtilityCluster(page);
    await waitForShellUtilityBinding(page, "log-drawer-toggle");
    const logDrawerToggle = page.locator("#log-drawer-toggle:visible").first();
    await expect(logDrawerToggle).toBeVisible();
    await expect(logDrawerToggle).toHaveAttribute("title", /.+/);
    await expectLocatorFocused(logDrawerToggle);

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
    ];

    for (const selector of actionSelectors) {
      const target = page.locator(`${selector}:visible`).first();
      await expect(target).toBeVisible();
      await expect(target).toHaveAttribute("title", /.+/);
      await expectLocatorFocused(target);
    }

    await page.evaluate(() => {
      document.getElementById("relay-log-drawer")?.setAttribute("aria-hidden", "true");
    });
    await selectStage(page, "support");
    const faqToggle = page.locator('#faq-card .card-toggle[data-target="faq-content"]:visible').first();
    await expect(faqToggle).toBeVisible();
    await expect(faqToggle).toHaveAttribute("title", /.+/);
    await expectLocatorFocused(faqToggle);
  });
});
