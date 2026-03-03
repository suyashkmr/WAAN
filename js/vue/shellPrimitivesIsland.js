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
 * @param {any} [globalScope]
 */
function dispatchShellAction(actionId, payload = null, globalScope = globalThis) {
  const shellBridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope });
  if (shellBridge?.dispatchShellAction) {
    shellBridge.dispatchShellAction(actionId, payload);
    return;
  }
  if (shellBridge?.dispatchRelayAction) {
    shellBridge.dispatchRelayAction(actionId, payload);
  }
}

function mountRelayBannerPrimitive(globalScope = globalThis) {
  const VueRuntime = globalScope?.Vue;
  const bannerEl = globalScope?.document?.getElementById?.("relay-status-banner");
  if (!VueRuntime || !bannerEl) return;
  if (bannerEl.dataset.vuePrimitiveMounted === "true") return;

  const { createApp, h } = VueRuntime;
  bannerEl.dataset.vueManaged = "true";
  const RelayBannerRoot = createRelayBannerRoot(h, (actionId, payload = null) =>
    dispatchShellAction(actionId, payload, globalScope),
  );

  const app = createApp(RelayBannerRoot);
  app.mount(bannerEl);
  bannerEl.dataset.vuePrimitiveMounted = "true";
}

function mountActionsToolbarPrimitive(globalScope = globalThis) {
  const VueRuntime = globalScope?.Vue;
  const toolbarEl = globalScope?.document?.getElementById?.("actions-toolbar");
  if (!VueRuntime || !toolbarEl) return;
  if (toolbarEl.dataset.vuePrimitiveMounted === "true") return;
  const { createApp, h } = VueRuntime;
  toolbarEl.dataset.vueManaged = "true";
  const ActionsToolbarRoot = createActionsToolbarRoot(h, (actionId, payload = null) =>
    dispatchShellAction(actionId, payload, globalScope),
  );

  const app = createApp(ActionsToolbarRoot);
  app.mount(toolbarEl);
  toolbarEl.dataset.vuePrimitiveMounted = "true";
}

function mountOnboardingDialogPrimitive(globalScope = globalThis) {
  const VueRuntime = globalScope?.Vue;
  const onboardingEl = globalScope?.document?.getElementById?.("onboarding-overlay");
  if (!VueRuntime || !onboardingEl) return;
  if (onboardingEl.dataset.vuePrimitiveMounted === "true") return;
  const { createApp, h } = VueRuntime;
  onboardingEl.dataset.vueManaged = "true";
  const OnboardingDialogRoot = createOnboardingDialogRoot(h, (actionId, payload = null) =>
    dispatchShellAction(actionId, payload, globalScope),
  );

  const app = createApp(OnboardingDialogRoot);
  app.mount(onboardingEl);
  onboardingEl.dataset.vuePrimitiveMounted = "true";
}

function mountDashboardCardShellPrimitives(globalScope = globalThis) {
  if (typeof globalScope?.document === "undefined") return;
  const cardMountEls = globalScope.document.querySelectorAll('section[data-vue-shell-mount="card-shell"]');

  cardMountEls.forEach(existing => {
    if (!existing) return;
    if (existing.dataset.vuePrimitiveMounted === "true") return;
    const tagName = existing.tagName.toLowerCase();
    if (tagName !== "section") return;
    existing.dataset.vuePrimitiveMounted = "true";
    // Keep legacy nodes/listeners stable while shell migration is in-flight.
    existing.dataset.vueManaged = "card-shell";
  });
}

function mountFeedbackPrimitiveBridge(globalScope = globalThis) {
  const VueRuntime = globalScope?.Vue;
  const statusEl = globalScope?.document?.getElementById?.("data-status");
  const toastContainerEl = globalScope?.document?.getElementById?.("toast-container");
  if (!VueRuntime || !statusEl || !toastContainerEl) return;
  if (resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope })) return;

  const { createApp, h, reactive } = VueRuntime;
  const statusState = reactive({ message: "" });
  const toastState = reactive({ items: [] });
  let statusHideTimer = null;
  let statusExitTimer = null;
  let nextToastId = 1;
  const setTimer = globalScope?.setTimeout ? globalScope.setTimeout.bind(globalScope) : globalThis.setTimeout.bind(globalThis);
  const raf = globalScope?.requestAnimationFrame
    ? globalScope.requestAnimationFrame.bind(globalScope)
    : globalThis.requestAnimationFrame?.bind(globalThis);

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
    statusExitTimer = setTimer(() => finalizeStatusExit(), exitDurationMs);
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
    raf?.(() => {
      statusEl.classList.add("is-active");
    });
    statusHideTimer = setTimer(() => beginStatusExit(exitDurationMs), autoHideDelayMs);
  }

  function dismissToast(toastOrId) {
    const toastId = typeof toastOrId === "number" ? toastOrId : Number(toastOrId?.dataset?.toastId || 0);
    const index = toastState.items.findIndex(item => item.id === toastId);
    if (index === -1) return;
    toastState.items[index].dismissing = true;
    setTimer(() => {
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
    setTimer(() => dismissToast(id), duration);
  }

  const { updateRelayRecoveryActions, updateRelayControlButtons } = createRelayControlsBridgeMethods({
    documentRef: globalScope.document ?? null,
  });
  /** @type {Record<string, (...args: any[]) => any>} */
  const shellActionHandlers = {};

  /**
   * @param {Record<string, (...args: any[]) => any>} handlers
   */
  function setShellActionHandlers(handlers = {}) {
    Object.entries(handlers).forEach(([actionId, handler]) => {
      if (!actionId) return;
      if (typeof handler === "function") {
        shellActionHandlers[actionId] = handler;
      } else {
        delete shellActionHandlers[actionId];
      }
    });
  }

  /**
   * @param {string} actionId
   * @param {any} [payload]
   */
  function dispatchShellActionBridge(actionId, payload = null) {
    const handler = shellActionHandlers[actionId];
    if (typeof handler !== "function") return false;
    handler(payload);
    return true;
  }

  function setRelayActionHandlers(handlers = {}) {
    setShellActionHandlers(handlers);
  }

  function dispatchRelayAction(actionId, payload = null) {
    return dispatchShellActionBridge(actionId, payload);
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
    setShellActionHandlers,
    dispatchShellAction: dispatchShellActionBridge,
    setRelayActionHandlers,
    dispatchRelayAction,
  }, {
    globalScope,
    legacyGlobalKey: LEGACY_VUE_BRIDGE_GLOBAL_KEYS[VUE_BRIDGE_NAMES.shell],
  });
}

export function mountShellPrimitivesIsland({ globalScope = globalThis } = {}) {
  if (typeof globalScope?.document === "undefined") return;
  mountRelayBannerPrimitive(globalScope);
  mountActionsToolbarPrimitive(globalScope);
  mountOnboardingDialogPrimitive(globalScope);
  mountDashboardCardShellPrimitives(globalScope);
  mountFeedbackPrimitiveBridge(globalScope);
}

try {
  mountShellPrimitivesIsland();
} catch (error) {
  globalThis.console?.warn?.("Vue shell primitives unavailable; using legacy DOM primitives.", error);
}
