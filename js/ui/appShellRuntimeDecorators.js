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

export function decorateToolbarRow(element, { role = "" } = {}) {
  if (!element) return null;
  applyClasses(element, ["app-toolbar-row"]);
  if (role) element.setAttribute("role", role);
  return element;
}

export function initAppShellPrimitives({ documentRef } = {}) {
  const doc = resolveDocument(documentRef);
  if (!doc) return;

  doc.querySelectorAll(".card").forEach(shell => {
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
