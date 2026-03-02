// @ts-check

import { decorateToolbarRow } from "../ui/appShellPrimitives.js";

/**
 * @typedef {{ id: string, label: string }} SectionNavItemConfig
 */

/**
 * @param {{ containerEl: HTMLElement | null | undefined, navItemsConfig?: SectionNavItemConfig[] }} params
 */
export function createSectionNavController({
  containerEl,
  navItemsConfig = [],
}) {
  /** @type {HTMLAnchorElement[]} */
  let sectionNavLinks = [];
  /** @type {Array<{ link: HTMLAnchorElement, target: HTMLElement, id: string }>} */
  let sectionNavItems = [];
  /** @type {IntersectionObserver | null} */
  let sectionNavObserver = null;
  /** @type {(() => void) | null} */
  let sectionNavViewportListener = null;
  /** @type {string | null} */
  let activeSectionId = null;
  const intersectingSections = new Map();

  /**
   * @param {string | null} targetId
   */
  function setActiveSectionNav(targetId) {
    if (!targetId || activeSectionId === targetId) return;
    activeSectionId = targetId;
    if (containerEl) {
      containerEl.dataset.activeSection = targetId;
    }
    sectionNavLinks.forEach(link => {
      const linkTarget = link.getAttribute("href")?.replace(/^#/, "");
      const isActive = linkTarget === targetId;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    const activeLink = sectionNavLinks.find(
      link => link.getAttribute("href")?.replace(/^#/, "") === targetId,
    );
    const reduceMotionFlag =
      typeof document !== "undefined" ? document.body?.dataset?.reduceMotion === "true" : false;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      ((typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
        reduceMotionFlag);
    activeLink?.scrollIntoView?.({
      inline: "center",
      block: "nearest",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  function buildSectionNav() {
    if (!containerEl) return;
    decorateToolbarRow(containerEl);
    containerEl.innerHTML = "";
    sectionNavLinks = [];
    sectionNavItems = [];
    navItemsConfig.forEach(item => {
      const targetEl = document.getElementById(item.id);
      if (!targetEl) return;
      const link = document.createElement("a");
      link.href = `#${item.id}`;
      link.textContent = item.label;
      containerEl.appendChild(link);
      sectionNavLinks.push(link);
      sectionNavItems.push({ link, target: targetEl, id: item.id });
    });
  }

  function setupSectionNavTracking() {
    if (!sectionNavItems.length || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const navItems = sectionNavItems.slice();
    const viewportAnchorY = () => {
      const viewportHeight = Number(window.innerHeight) || 0;
      return viewportHeight > 0 ? Math.round(viewportHeight * 0.28) : 200;
    };
    const resolveActiveSectionId = () => {
      if (!navItems.length) return null;
      const anchorY = viewportAnchorY();
      const positioned = navItems
        .map(item => {
          const rect = item.target.getBoundingClientRect();
          const top = Number(rect?.top) || 0;
          const bottom = Number(rect?.bottom);
          return {
            id: item.id,
            top,
            bottom: Number.isFinite(bottom) ? bottom : null,
            ratio: Number(intersectingSections.get(item.id)) || 0,
          };
        });

      const containing = positioned
        .filter(item => item.bottom !== null && item.top <= anchorY && item.bottom >= anchorY)
        .sort((a, b) => {
          if (b.ratio !== a.ratio) return b.ratio - a.ratio;
          return b.top - a.top;
        });
      if (containing.length) return containing[0].id;

      const hasVisible = positioned.some(item => item.ratio > 0);
      if (hasVisible) {
        const passed = positioned
          .filter(item => item.ratio > 0 && item.top <= anchorY)
          .sort((a, b) => {
            if (b.ratio !== a.ratio) return b.ratio - a.ratio;
            return b.top - a.top;
          });
        if (passed.length) return passed[0].id;

        const visibleAhead = positioned
          .filter(item => item.ratio > 0)
          .sort((a, b) => {
            if (b.ratio !== a.ratio) return b.ratio - a.ratio;
            return a.top - b.top;
          });
        if (visibleAhead.length) return visibleAhead[0].id;
      }

      const nearestToTop = positioned
        .slice()
        .sort((a, b) => Math.abs(a.top) - Math.abs(b.top))[0];
      if (nearestToTop) return nearestToTop.id;

      const upcoming = positioned.sort((a, b) => a.top - b.top);
      return upcoming[0]?.id ?? null;
    };
    const syncActiveSection = () => {
      const nextId = resolveActiveSectionId();
      if (nextId) setActiveSectionNav(nextId);
    };
    navItems.forEach(({ link, id }) => {
      link.addEventListener("click", () => {
        setActiveSectionNav(id);
      });
      link.addEventListener("focus", () => {
        setActiveSectionNav(id);
      });
      link.addEventListener("keydown", /** @param {KeyboardEvent} event */ event => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const index = navItems.findIndex(entry => entry.link === link);
        if (index === -1) return;
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (index + delta + navItems.length) % navItems.length;
        const nextEntry = navItems[nextIndex];
        if (nextEntry?.link) nextEntry.link.focus();
      });
    });

    if (!navItems.length) return;

    if (sectionNavObserver) {
      sectionNavObserver.disconnect();
      sectionNavObserver = null;
    }
    if (sectionNavViewportListener) {
      window.removeEventListener("scroll", sectionNavViewportListener);
      window.removeEventListener("resize", sectionNavViewportListener);
      sectionNavViewportListener = null;
    }
    intersectingSections.clear();

    sectionNavObserver = new IntersectionObserver(
      /** @param {IntersectionObserverEntry[]} observerEntries */ observerEntries => {
        observerEntries.forEach(entry => {
          const id = entry?.target?.id;
          if (!id) return;
          if (entry.isIntersecting) {
            intersectingSections.set(id, entry.intersectionRatio);
            return;
          }
          intersectingSections.delete(id);
        });
        syncActiveSection();
      },
      {
        root: null,
        rootMargin: "-60% 0px -35% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );

    if (!sectionNavObserver) return;
    const observer = sectionNavObserver;
    navItems.forEach(({ target }) => observer.observe(target));
    sectionNavViewportListener = () => syncActiveSection();
    window.addEventListener("scroll", sectionNavViewportListener, { passive: true });
    window.addEventListener("resize", sectionNavViewportListener);

    syncActiveSection();
  }

  return {
    buildSectionNav,
    setupSectionNavTracking,
  };
}
