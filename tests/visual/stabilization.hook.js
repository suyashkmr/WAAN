import { test } from "@playwright/test";

const STABILIZATION_STYLE = `
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    transition-delay: 0ms !important;
    scroll-behavior: auto !important;
    caret-color: transparent !important;
  }

  [data-stage],
  .hero-live-card,
  .hero-blurb {
    opacity: 1 !important;
    transform: none !important;
  }

  * {
    scrollbar-width: none !important;
  }

  *::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(cssText => {
    const STYLE_ID = "waan-playwright-stabilization-style";
    const ensureStyle = () => {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.type = "text/css";
      style.textContent = cssText;
      document.head.appendChild(style);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ensureStyle, { once: true });
    } else {
      ensureStyle();
    }
  }, STABILIZATION_STYLE);
});
