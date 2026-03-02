import { createRelayControlsBridgeMethods } from "./shellRelayBridge.js";

const SHELL_BRIDGE_KEY = "__WAAN_VUE_SHELL_BRIDGE__";

function mountRelayBannerPrimitive() {
  const VueRuntime = globalThis.Vue;
  const bannerEl = globalThis.document?.getElementById?.("relay-status-banner");
  if (!VueRuntime || !bannerEl) return;
  if (bannerEl.dataset.vuePrimitiveMounted === "true") return;

  const { createApp, h } = VueRuntime;
  bannerEl.dataset.vueManaged = "true";

  const RelayBannerRoot = {
    name: "RelayBannerPrimitive",
    render() {
      return [
        h("div", { class: "relay-banner-indicator", id: "relay-status-dot", "aria-hidden": "true" }),
        h("div", { class: "relay-banner-text" }, [
          h("p", { class: "relay-banner-status", id: "relay-status-message" }, "Relay status unknown."),
          h(
            "p",
            { class: "relay-banner-meta", id: "relay-status-meta" },
            "Launch the desktop relay and press Connect to mirror chats into WAAN.",
          ),
        ]),
        h("div", { class: "relay-banner-actions", id: "relay-status-actions", hidden: true }, [
          h("button", { type: "button", class: "ghost-button small", id: "relay-recovery-reconnect" }, "Reconnect"),
          h("button", { type: "button", class: "ghost-button small", id: "relay-recovery-resync" }, "Resync"),
          h("button", { type: "button", class: "ghost-button small", id: "relay-recovery-export" }, "Export diagnostics"),
        ]),
      ];
    },
  };

  const app = createApp(RelayBannerRoot);
  app.mount(bannerEl);
  bannerEl.dataset.vuePrimitiveMounted = "true";
}

function mountActionsToolbarPrimitive() {
  const VueRuntime = globalThis.Vue;
  const toolbarEl = globalThis.document?.getElementById?.("actions-toolbar");
  if (!VueRuntime || !toolbarEl) return;
  if (toolbarEl.dataset.vuePrimitiveMounted === "true") return;
  const { createApp, h } = VueRuntime;
  toolbarEl.dataset.vueManaged = "true";

  const ActionsToolbarRoot = {
    name: "ActionsToolbarPrimitive",
    render() {
      return [
        h("div", { class: "toolbar-group primary" }, [
          h("button", { type: "button", class: "ghost-button", id: "download-pdf" }, "Save as PDF"),
          h("button", { type: "button", class: "ghost-button", id: "download-markdown-report" }, "Save text report"),
          h("button", { type: "button", class: "ghost-button", id: "download-slides-report" }, "Save slides (HTML)"),
        ]),
        h("div", { class: "toolbar-group secondary" }, [
          h(
            "button",
            {
              type: "button",
              class: "ghost-button",
              id: "compact-toggle",
              "aria-pressed": "false",
              title: "Switch between compact and comfort layouts",
            },
            "Compact mode",
          ),
          h("div", { class: "theme-toggle" }, [
            h("span", "Theme"),
            h("div", { class: "segmented-option" }, [
              h("input", {
                type: "radio",
                name: "theme-option",
                id: "theme-system",
                value: "system",
                checked: true,
              }),
              h("label", { for: "theme-system" }, "Auto"),
            ]),
            h("div", { class: "segmented-option" }, [
              h("input", {
                type: "radio",
                name: "theme-option",
                id: "theme-light",
                value: "light",
              }),
              h("label", { for: "theme-light" }, "Light"),
            ]),
            h("div", { class: "segmented-option" }, [
              h("input", {
                type: "radio",
                name: "theme-option",
                id: "theme-dark",
                value: "dark",
              }),
              h("label", { for: "theme-dark" }, "Dark"),
            ]),
          ]),
          h("div", { class: "a11y-controls", "aria-label": "Accessibility options" }, [
            h(
              "button",
              {
                type: "button",
                class: "ghost-button small",
                id: "reduce-motion-toggle",
                "aria-pressed": "mixed",
              },
              "Motion: Standard",
            ),
            h(
              "button",
              {
                type: "button",
                class: "ghost-button small",
                id: "high-contrast-toggle",
                "aria-pressed": "false",
              },
              "Contrast: Standard",
            ),
          ]),
          h("button", { type: "button", class: "ghost-button", id: "log-drawer-toggle" }, "View Relay Logs"),
        ]),
      ];
    },
  };

  const app = createApp(ActionsToolbarRoot);
  app.mount(toolbarEl);
  toolbarEl.dataset.vuePrimitiveMounted = "true";
}

function mountOnboardingDialogPrimitive() {
  const VueRuntime = globalThis.Vue;
  const onboardingEl = globalThis.document?.getElementById?.("onboarding-overlay");
  if (!VueRuntime || !onboardingEl) return;
  if (onboardingEl.dataset.vuePrimitiveMounted === "true") return;
  const { createApp, h } = VueRuntime;
  onboardingEl.dataset.vueManaged = "true";

  const OnboardingDialogRoot = {
    name: "OnboardingDialogPrimitive",
    render() {
      return h("div", { class: "onboarding-panel" }, [
        h("h2", "Welcome to WAAN"),
        h("p", { class: "onboarding-step-label", id: "onboarding-step-label" }),
        h("p", { id: "onboarding-copy" }, "Link the relay to start mirroring chats."),
        h("div", { class: "onboarding-actions" }, [
          h("button", { type: "button", class: "ghost-button", id: "onboarding-skip" }, "Skip"),
          h("button", { type: "button", class: "ghost-button primary", id: "onboarding-next" }, "Next"),
        ]),
      ]);
    },
  };

  const app = createApp(OnboardingDialogRoot);
  app.mount(onboardingEl);
  onboardingEl.dataset.vuePrimitiveMounted = "true";
}

function mountDashboardCardShellPrimitives() {
  const VueRuntime = globalThis.Vue;
  if (!VueRuntime || typeof globalThis.document === "undefined") return;
  const { createApp } = VueRuntime;
  const cardMountEls = globalThis.document.querySelectorAll('section[data-vue-shell-mount="card-shell"]');

  cardMountEls.forEach(existing => {
    if (!existing) return;
    if (existing.dataset.vuePrimitiveMounted === "true") return;
    const tagName = existing.tagName.toLowerCase();
    if (tagName !== "section") return;

    const template = existing.innerHTML;
    existing.dataset.vueManaged = "true";
    existing.dataset.vuePrimitiveMounted = "true";
    const cardId = existing.id || "unknown";

    createApp({
      name: `CardShellPrimitive-${cardId}`,
      template,
    }).mount(existing);
  });
}

function mountFeedbackPrimitiveBridge() {
  const VueRuntime = globalThis.Vue;
  const statusEl = globalThis.document?.getElementById?.("data-status");
  const toastContainerEl = globalThis.document?.getElementById?.("toast-container");
  if (!VueRuntime || !statusEl || !toastContainerEl) return;
  if (globalThis[SHELL_BRIDGE_KEY]) return;

  const { createApp, h, reactive } = VueRuntime;
  const statusState = reactive({ message: "" });
  const toastState = reactive({ items: [] });
  let statusHideTimer = null;
  let statusExitTimer = null;
  let nextToastId = 1;

  function clearStatusClasses() {
    statusEl.classList.remove("is-active", "is-exiting", "success", "warning", "error");
    statusEl.classList.add("hidden");
  }

  function finalizeStatusExit() {
    clearStatusClasses();
  }

  function beginStatusExit(exitDurationMs = 300) {
    statusEl.classList.add("is-exiting");
    if (statusExitTimer) {
      clearTimeout(statusExitTimer);
    }
    statusExitTimer = globalThis.setTimeout(() => finalizeStatusExit(), exitDurationMs);
  }

  function showStatusMessage(message, tone = "info", { autoHideDelayMs = 5000, exitDurationMs = 300 } = {}) {
    statusState.message = String(message ?? "");
    statusEl.classList.remove("hidden", "is-exiting", "success", "warning", "error");
    if (tone) statusEl.classList.add(String(tone));
    if (statusHideTimer) {
      clearTimeout(statusHideTimer);
      statusHideTimer = null;
    }
    if (statusExitTimer) {
      clearTimeout(statusExitTimer);
      statusExitTimer = null;
    }
    globalThis.requestAnimationFrame?.(() => {
      statusEl.classList.add("is-active");
    });
    statusHideTimer = globalThis.setTimeout(() => beginStatusExit(exitDurationMs), autoHideDelayMs);
  }

  function dismissToast(toastOrId) {
    const toastId = typeof toastOrId === "number" ? toastOrId : Number(toastOrId?.dataset?.toastId || 0);
    const index = toastState.items.findIndex(item => item.id === toastId);
    if (index === -1) return;
    toastState.items[index].dismissing = true;
    globalThis.setTimeout(() => {
      const nextIndex = toastState.items.findIndex(item => item.id === toastId);
      if (nextIndex >= 0) toastState.items.splice(nextIndex, 1);
    }, 150);
  }

  function showToast(message, tone = "info", { duration = 5000, maxToasts = 4 } = {}) {
    const id = nextToastId++;
    toastState.items.push({
      id,
      message: String(message ?? ""),
      tone: String(tone || "info"),
      dismissing: false,
    });
    while (toastState.items.length > maxToasts) {
      toastState.items.shift();
    }
    globalThis.setTimeout(() => dismissToast(id), duration);
  }

  const { updateRelayRecoveryActions, updateRelayControlButtons } = createRelayControlsBridgeMethods({
    documentRef: globalThis.document ?? null,
  });

  const StatusRoot = {
    name: "StatusSnackbarPrimitive",
    render() {
      return h("span", statusState.message);
    },
  };
  createApp(StatusRoot).mount(statusEl);

  const ToastRoot = {
    name: "ToastPrimitive",
    render() {
      return toastState.items.map(item =>
        h(
          "div",
          {
            class: ["toast", item.tone, item.dismissing ? "toast-dismiss" : ""],
            "data-toast-id": String(item.id),
          },
          [
            h("div", { class: "toast-message" }, item.message),
            h(
              "button",
              {
                type: "button",
                class: "toast-close",
                "aria-label": "Dismiss",
                onClick: () => dismissToast(item.id),
              },
              "x",
            ),
          ],
        ),
      );
    },
  };
  createApp(ToastRoot).mount(toastContainerEl);

  globalThis[SHELL_BRIDGE_KEY] = {
    showToast,
    dismissToast,
    showStatusMessage,
    beginStatusExit,
    finalizeStatusExit,
    updateRelayRecoveryActions,
    updateRelayControlButtons,
  };
}

try {
  if (typeof globalThis.document !== "undefined") {
    mountRelayBannerPrimitive();
    mountActionsToolbarPrimitive();
    mountOnboardingDialogPrimitive();
    mountDashboardCardShellPrimitives();
    mountFeedbackPrimitiveBridge();
  }
} catch (error) {
  globalThis.console?.warn?.("Vue shell primitives unavailable; using legacy DOM primitives.", error);
}
