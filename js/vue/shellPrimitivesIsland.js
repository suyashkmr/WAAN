import { createRelayControlsBridgeMethods } from "./shellRelayBridge.js";
import {
  createActionsToolbarRoot,
  createOnboardingDialogRoot,
  createRelayBannerRoot,
} from "./shellPrimitiveViews.js";
import {
  LEGACY_VUE_BRIDGE_GLOBAL_KEYS,
  VUE_BRIDGE_NAMES,
  registerVueBridge,
  resolveVueBridge,
} from "./bridgeRegistry.js";

/**
 * @param {string} actionId
 * @param {any} [payload]
 */
function dispatchShellAction(actionId, payload = null) {
  const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell);
  if (shellBridge?.dispatchRelayAction) {
    shellBridge.dispatchRelayAction(actionId, payload);
  }
}

function mountRelayBannerPrimitive() {
  const VueRuntime = globalThis.Vue;
  const bannerEl = globalThis.document?.getElementById?.("relay-status-banner");
  if (!VueRuntime || !bannerEl) return;
  if (bannerEl.dataset.vuePrimitiveMounted === "true") return;

  const { createApp, h } = VueRuntime;
  bannerEl.dataset.vueManaged = "true";
  const RelayBannerRoot = createRelayBannerRoot(h, dispatchShellAction);

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
  const ActionsToolbarRoot = createActionsToolbarRoot(h, dispatchShellAction);

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
  const OnboardingDialogRoot = createOnboardingDialogRoot(h);

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
  if (resolveVueBridge(VUE_BRIDGE_NAMES.shell)) return;

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
  /** @type {Record<string, (...args: any[]) => any>} */
  const relayActionHandlers = {};

  /**
   * @param {Record<string, (...args: any[]) => any>} handlers
   */
  function setRelayActionHandlers(handlers = {}) {
    Object.keys(relayActionHandlers).forEach(key => {
      delete relayActionHandlers[key];
    });
    Object.entries(handlers).forEach(([actionId, handler]) => {
      if (typeof handler === "function") {
        relayActionHandlers[actionId] = handler;
      }
    });
  }

  /**
   * @param {string} actionId
   * @param {any} [payload]
   */
  function dispatchRelayAction(actionId, payload = null) {
    const handler = relayActionHandlers[actionId];
    if (typeof handler !== "function") return false;
    handler(payload);
    return true;
  }

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

  registerVueBridge(VUE_BRIDGE_NAMES.shell, {
    showToast,
    dismissToast,
    showStatusMessage,
    beginStatusExit,
    finalizeStatusExit,
    updateRelayRecoveryActions,
    updateRelayControlButtons,
    setRelayActionHandlers,
    dispatchRelayAction,
  }, {
    legacyGlobalKey: LEGACY_VUE_BRIDGE_GLOBAL_KEYS[VUE_BRIDGE_NAMES.shell],
  });
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
