function resolveDocument(documentRef) {
  if (documentRef) return documentRef;
  if (typeof document !== "undefined") return document;
  return null;
}

function applyClasses(element, classes = []) {
  if (!element || !Array.isArray(classes)) return element;
  classes.filter(Boolean).forEach(name => element.classList.add(name));
  return element;
}

function toClassList(classNames = "") {
  if (!classNames) return [];
  return String(classNames)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

export function createPanelShell({
  documentRef,
  tagName = "section",
  id = "",
  accent = "",
  className = "",
} = {}) {
  const doc = resolveDocument(documentRef);
  if (!doc) return null;
  const shell = doc.createElement(tagName);
  applyClasses(shell, ["app-panel-shell", ...toClassList(className)]);
  if (id) shell.id = id;
  if (accent) shell.dataset.accent = accent;
  return shell;
}

export function createPanelHeader({
  documentRef,
  title = "",
  titleTagName = "h2",
  className = "",
} = {}) {
  const doc = resolveDocument(documentRef);
  if (!doc) return null;
  const header = doc.createElement("header");
  applyClasses(header, ["card-header", "app-panel-header", ...toClassList(className)]);
  if (title) {
    const titleGroup = doc.createElement("div");
    applyClasses(titleGroup, ["card-title-group", "app-section-intro"]);
    const heading = doc.createElement(titleTagName);
    heading.textContent = title;
    titleGroup.appendChild(heading);
    header.appendChild(titleGroup);
  }
  return header;
}

export function createSectionIntro({
  documentRef,
  kicker = "",
  title = "",
  description = "",
  className = "",
} = {}) {
  const doc = resolveDocument(documentRef);
  if (!doc) return null;
  const wrapper = doc.createElement("div");
  applyClasses(wrapper, ["app-section-intro", ...toClassList(className)]);

  if (kicker) {
    const kickerEl = doc.createElement("p");
    applyClasses(kickerEl, ["section-kicker"]);
    kickerEl.textContent = kicker;
    wrapper.appendChild(kickerEl);
  }

  if (title) {
    const titleEl = doc.createElement("h3");
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);
  }

  if (description) {
    const copyEl = doc.createElement("p");
    copyEl.textContent = description;
    wrapper.appendChild(copyEl);
  }

  return wrapper;
}

export function createStatusBadge({
  documentRef,
  text = "",
  state = "",
  className = "",
} = {}) {
  const doc = resolveDocument(documentRef);
  if (!doc) return null;
  const badge = doc.createElement("span");
  applyClasses(badge, ["app-status-badge", ...toClassList(className)]);
  if (state) badge.dataset.state = state;
  if (text) badge.textContent = text;
  return badge;
}

export function createToolbarRow({
  documentRef,
  className = "",
  role = "",
} = {}) {
  const doc = resolveDocument(documentRef);
  if (!doc) return null;
  const row = doc.createElement("div");
  applyClasses(row, ["app-toolbar-row", ...toClassList(className)]);
  if (role) row.setAttribute("role", role);
  return row;
}

export function createEmptyState({
  documentRef,
  tone = "empty",
  title = "",
  message = "",
  className = "",
} = {}) {
  const doc = resolveDocument(documentRef);
  if (!doc) return null;
  const wrapper = doc.createElement("div");
  applyClasses(wrapper, ["panel-state", "app-empty-state", `panel-state--${tone}`, ...toClassList(className)]);
  wrapper.setAttribute("role", tone === "error" ? "alert" : "status");

  if (title) {
    const heading = doc.createElement("h4");
    heading.className = "panel-state-title";
    heading.textContent = title;
    wrapper.appendChild(heading);
  }
  if (message) {
    const copy = doc.createElement("p");
    copy.className = "panel-state-copy";
    copy.textContent = message;
    wrapper.appendChild(copy);
  }
  return wrapper;
}

export function decorateToolbarRow(element, { role = "" } = {}) {
  if (!element) return null;
  applyClasses(element, ["app-toolbar-row"]);
  if (role) element.setAttribute("role", role);
  return element;
}

export function initAppShellPrimitives({ documentRef } = {}) {
  const doc = resolveDocument(documentRef);
  if (!doc) return;

  doc.querySelectorAll(".card, sl-card").forEach(shell => {
    applyClasses(shell, ["app-panel-shell"]);
  });

  doc.querySelectorAll(".card-header").forEach(header => {
    applyClasses(header, ["app-panel-header"]);
  });

  doc.querySelectorAll(".card-title-group").forEach(intro => {
    applyClasses(intro, ["app-section-intro"]);
  });

  doc.querySelectorAll(".card-header-actions, .card-actions, .section-nav-inner").forEach(row => {
    decorateToolbarRow(row);
  });
  doc.querySelectorAll(".card-header-actions, .card-actions").forEach(row => {
    applyClasses(row, ["app-panel-actions"]);
  });

  const sectionNav = doc.querySelector(".section-nav");
  if (sectionNav) {
    decorateToolbarRow(sectionNav, { role: "navigation" });
  }

  doc.querySelectorAll(".actions-toolbar").forEach(toolbar => {
    applyClasses(toolbar, ["app-pulse-bar"]);
  });

  const heroStoryLane = doc.querySelector(".hero-blurb");
  if (heroStoryLane) {
    applyClasses(heroStoryLane, ["app-story-lane"]);
  }

  const relayStoryPanel = doc.getElementById("relay-live-card");
  if (relayStoryPanel) {
    applyClasses(relayStoryPanel, ["app-story-panel"]);
  }

  doc.querySelectorAll("#hero-milestones").forEach(strip => {
    applyClasses(strip, ["app-signal-strip"]);
  });

  doc.querySelectorAll(".hero-status").forEach(stack => {
    applyClasses(stack, ["app-signal-stack"]);
  });

  doc.querySelectorAll(".live-actions").forEach(dock => {
    applyClasses(dock, ["app-action-dock"]);
  });

  doc.querySelectorAll(".relay-onboarding").forEach(stepLane => {
    applyClasses(stepLane, ["app-step-lane"]);
  });

  const heroBadge = doc.getElementById("hero-status-badge");
  if (heroBadge) {
    applyClasses(heroBadge, ["app-status-badge"]);
  }
}
