// @ts-check
/**
 * @param {HTMLElement | null | undefined} element
 * @param {{ role?: string }} [params]
 */
function decorateToolbarRow(element, { role = "" } = {}) {
  if (!element) return null;
  element.classList.add("app-toolbar-row");
  if (role) element.setAttribute("role", role);
  return element;
}

/** @typedef {{ id: string, label: string }} SectionNavItemConfig */
/**
 * @param {{
 *   containerEl: HTMLElement | null | undefined,
 *   navItemsConfig?: SectionNavItemConfig[],
 *   documentRef?: Document | null | undefined,
 *   windowRef?: Window | null | undefined,
 *   vueRuntime?: any,
 * }} params
 */
export function createSectionNavController({
  containerEl,
  navItemsConfig = [],
  documentRef = typeof document !== "undefined" ? document : null,
  windowRef = typeof window !== "undefined" ? window : null,
  vueRuntime = /** @type {any} */ (globalThis)?.Vue ?? null,
}) {
  let currentNavItemsConfig = Array.isArray(navItemsConfig) ? navItemsConfig.slice() : [];
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
  /** @type {string | null} */
  let pendingManualSectionId = null;
  let pendingManualSectionUntil = 0;
  let sectionJumpPendingCount = 0;
  /** @type {string | null} */
  let sectionJumpRestoreBehavior = null;
  let hasRevealedInitialActiveLink = false;
  const intersectingSections = new Map();

  function disconnectSectionTracking() {
    if (sectionNavObserver) {
      sectionNavObserver.disconnect();
      sectionNavObserver = null;
    }
    if (sectionNavViewportListener && windowRef) {
      windowRef.removeEventListener("scroll", sectionNavViewportListener);
      windowRef.removeEventListener("resize", sectionNavViewportListener);
      sectionNavViewportListener = null;
    }
    intersectingSections.clear();
  }

  function resetSectionNavState() {
    activeSectionId = null;
    pendingManualSectionId = null;
    pendingManualSectionUntil = 0;
    hasRevealedInitialActiveLink = false;
    if (containerEl) delete containerEl.dataset.activeSection;
  }

  function prefersReducedMotion() {
    const reduceMotionFlag = documentRef?.body?.dataset?.reduceMotion === "true";
    return Boolean(windowRef) &&
      ((typeof windowRef?.matchMedia === "function" &&
        windowRef.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
        reduceMotionFlag);
  }

  /** @param {HTMLElement} target */
  function jumpToSection(target) {
    const rootEl = documentRef?.documentElement ?? null;
    if (rootEl?.style) {
      if (sectionJumpPendingCount === 0) {
        sectionJumpRestoreBehavior = rootEl.style.scrollBehavior ?? "";
      }
      sectionJumpPendingCount += 1;
      rootEl.style.scrollBehavior = "auto";
    }
    target.scrollIntoView({
      block: "start",
      behavior: "auto",
    });
    if (rootEl?.style) {
      const restore = () => {
        sectionJumpPendingCount = Math.max(0, sectionJumpPendingCount - 1);
        if (sectionJumpPendingCount > 0) return;
        rootEl.style.scrollBehavior = sectionJumpRestoreBehavior ?? "";
        sectionJumpRestoreBehavior = null;
      };
      if (typeof windowRef?.requestAnimationFrame === "function") {
        windowRef.requestAnimationFrame(restore);
      } else {
        restore();
      }
    }
  }

  /**
   * @param {string | null} targetId
   * @param {{ scrollActiveLink?: boolean }} [options]
   */
  function setActiveSectionNav(targetId, { scrollActiveLink = true } = {}) {
    if (!targetId || activeSectionId === targetId) return;
    activeSectionId = targetId;
    if (containerEl) containerEl.dataset.activeSection = targetId;
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
    if (!scrollActiveLink) return;
    const activeLink = sectionNavLinks.find(link => link.getAttribute("href")?.replace(/^#/, "") === targetId);
    activeLink?.scrollIntoView?.({
      inline: "center",
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  /**
   * @param {string} id
   * @param {{ preventDefault?: () => void } | null | undefined} [event]
   */
  function handleSectionNavActivate(id, event = null) {
    if (event?.preventDefault) event.preventDefault();
    const nextEntry = sectionNavItems.find(entry => entry.id === id);
    if (nextEntry?.target) jumpToSection(nextEntry.target);
    pendingManualSectionId = id;
    pendingManualSectionUntil = Date.now() + 800;
    if (typeof windowRef?.history?.replaceState === "function") {
      windowRef.history.replaceState(null, "", `#${id}`);
    }
    setActiveSectionNav(id);
  }

  /**
   * @param {string} id
   * @param {MouseEvent} event
   */
  function handleSectionNavClick(id, event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    handleSectionNavActivate(id, event);
  }

  /**
   * @param {string} id
   * @param {KeyboardEvent} event
   */
  function handleSectionNavKeydown(id, event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = sectionNavItems.findIndex(entry => entry.id === id);
    if (index === -1 || !sectionNavItems.length) return;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + sectionNavItems.length) % sectionNavItems.length;
    const nextEntry = sectionNavItems[nextIndex];
    if (nextEntry?.link) nextEntry.link.focus();
  }

  function buildSectionNav() {
    if (!containerEl) return;
    decorateToolbarRow(containerEl);
    /** @type {Array<SectionNavItemConfig & { target: HTMLElement }>} */
    const resolvedItems = [];
    currentNavItemsConfig.forEach(item => {
      const target = documentRef?.getElementById(item.id);
      if (!target) return;
      resolvedItems.push({ ...item, target });
    });
    sectionNavLinks = [];
    sectionNavItems = [];
    const canRenderWithVue = Boolean(
      vueRuntime &&
      typeof vueRuntime.h === "function" &&
      typeof vueRuntime.render === "function" &&
      vueRuntime.Fragment,
    );
    if (canRenderWithVue) {
      const { h, render, Fragment } = vueRuntime;
      render(
        h(
          Fragment,
          null,
          resolvedItems.map(item =>
            h(
              "a",
              {
                href: `#${item.id}`,
                "data-section-id": item.id,
                key: item.id,
                onClick: /** @param {MouseEvent} event */ event => handleSectionNavClick(item.id, event),
                onKeydown: /** @param {KeyboardEvent} event */ event => handleSectionNavKeydown(item.id, event),
              },
              item.label,
            )),
        ),
        containerEl,
      );
    } else {
      throw new Error("Vue runtime is required for section navigation rendering.");
    }
    sectionNavLinks = Array.from(containerEl.querySelectorAll("a[data-section-id]"));
    sectionNavItems = [];
    resolvedItems.forEach(item => {
      const link = sectionNavLinks.find(node => node.dataset.sectionId === item.id);
      if (!link) return;
      sectionNavItems.push({ link, target: item.target, id: item.id });
    });
  }

  function setupSectionNavTracking() {
    const IntersectionObserverRef = /** @type {any} */ (windowRef)?.IntersectionObserver ?? globalThis.IntersectionObserver;
    if (!sectionNavItems.length || !windowRef || typeof IntersectionObserverRef !== "function") return;

    const navItems = sectionNavItems.slice();
    const viewportAnchorY = () => {
      const viewportHeight = Number(windowRef.innerHeight) || 0;
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

      const nearestToTop = positioned.slice().sort((a, b) => Math.abs(a.top) - Math.abs(b.top))[0];
      if (nearestToTop) return nearestToTop.id;

      const upcoming = positioned.sort((a, b) => a.top - b.top);
      return upcoming[0]?.id ?? null;
    };
    const syncActiveSection = () => {
      const nextId = resolveActiveSectionId();
      if (
        pendingManualSectionId
        && Date.now() < pendingManualSectionUntil
        && nextId
        && nextId !== pendingManualSectionId
      ) {
        setActiveSectionNav(pendingManualSectionId, { scrollActiveLink: false });
        return;
      }
      if (pendingManualSectionId && Date.now() >= pendingManualSectionUntil) pendingManualSectionId = null;
      if (!nextId) return;
      const shouldRevealActiveLink = !hasRevealedInitialActiveLink;
      setActiveSectionNav(nextId, { scrollActiveLink: shouldRevealActiveLink });
      if (shouldRevealActiveLink) hasRevealedInitialActiveLink = true;
    };

    if (!navItems.length) return;
    disconnectSectionTracking();
    sectionNavObserver = new IntersectionObserverRef(
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
    windowRef.addEventListener("scroll", sectionNavViewportListener, { passive: true });
    windowRef.addEventListener("resize", sectionNavViewportListener);
    syncActiveSection();
  }

  /** @param {SectionNavItemConfig[]} items */
  function setNavItemsConfig(items) {
    currentNavItemsConfig = Array.isArray(items) ? items.slice() : [];
  }

  /** @param {SectionNavItemConfig[]} [items] */
  function rebuildSectionNav(items) {
    if (items) setNavItemsConfig(items);
    disconnectSectionTracking();
    resetSectionNavState();
    buildSectionNav();
    setupSectionNavTracking();
  }

  return { buildSectionNav, setupSectionNavTracking, setNavItemsConfig, rebuildSectionNav };
}
