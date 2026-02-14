export function createSectionNavController({
  containerEl,
  navItemsConfig = [],
}) {
  let sectionNavLinks = [];
  let sectionNavItems = [];
  let sectionNavObserver = null;
  let activeSectionId = null;

  function setActiveSectionNav(targetId) {
    if (!targetId || activeSectionId === targetId) return;
    activeSectionId = targetId;
    sectionNavLinks.forEach(link => {
      const linkTarget = link.getAttribute("href")?.replace(/^#/, "");
      link.classList.toggle("active", linkTarget === targetId);
    });
  }

  function buildSectionNav() {
    if (!containerEl) return;
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

    navItems.forEach(({ link, id }) => {
      link.addEventListener("click", () => {
        setActiveSectionNav(id);
      });
      link.addEventListener("focus", () => {
        setActiveSectionNav(id);
      });
      link.addEventListener("keydown", event => {
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

    sectionNavObserver = new IntersectionObserver(
      observerEntries => {
        const visible = observerEntries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) {
          setActiveSectionNav(visible[0].target.id);
          return;
        }
        const nearest = navItems
          .map(item => ({
            id: item.id,
            distance: Math.abs(item.target.getBoundingClientRect().top),
          }))
          .sort((a, b) => a.distance - b.distance)[0];
        if (nearest) setActiveSectionNav(nearest.id);
      },
      {
        root: null,
        rootMargin: "-60% 0px -35% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );

    navItems.forEach(({ target }) => sectionNavObserver.observe(target));

    const initial =
      navItems
        .map(item => ({
          id: item.id,
          top: item.target.getBoundingClientRect().top,
        }))
        .filter(Boolean)
        .sort((a, b) => {
          if (a.top >= 0 && b.top >= 0) return a.top - b.top;
          if (a.top >= 0) return -1;
          if (b.top >= 0) return 1;
          return a.top - b.top;
        })[0] || navItems[0];
    if (initial) setActiveSectionNav(initial.id);
  }

  return {
    buildSectionNav,
    setupSectionNavTracking,
  };
}
