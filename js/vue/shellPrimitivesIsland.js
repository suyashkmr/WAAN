import { createRelayControlsBridgeMethods } from "./shellRelayBridge.js";
import {
  createActionsToolbarRoot,
  createFirstRunActionsRoot,
  createOnboardingDialogRoot,
  createRelayBannerRoot,
  createRelayHeaderActionsRoot,
  createRelayLiveActionsRoot,
} from "./shellPrimitiveViews.js";
import { mountPageControlsPrimitive } from "./shellPageControlsIsland.js";
import { VUE_BRIDGE_NAMES, registerVueBridge, resolveVueBridge } from "./bridgeRegistry.js";
import { renderActionButton } from "./primevueRenderPrimitives.js";
import { mountConfiguredShellPrimitive } from "./shellPrimitiveMounting.js";

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
  const bannerEl = globalScope?.document?.getElementById?.("relay-status-banner");
  mountConfiguredShellPrimitive({
    globalScope,
    mountEl: bannerEl,
    createRoot: h => createRelayBannerRoot(h, (actionId, payload = null) =>
      dispatchShellAction(actionId, payload, globalScope)),
  });
}

function mountActionsToolbarPrimitive(globalScope = globalThis) {
  const toolbarEl = globalScope?.document?.getElementById?.("actions-toolbar");
  mountConfiguredShellPrimitive({
    globalScope,
    mountEl: toolbarEl,
    createRoot: h => createActionsToolbarRoot(h, (actionId, payload = null) =>
      dispatchShellAction(actionId, payload, globalScope)),
  });
}

function mountOnboardingDialogPrimitive(globalScope = globalThis) {
  const onboardingEl = globalScope?.document?.getElementById?.("onboarding-overlay");
  mountConfiguredShellPrimitive({
    globalScope,
    mountEl: onboardingEl,
    createRoot: h => createOnboardingDialogRoot(h, (actionId, payload = null) =>
      dispatchShellAction(actionId, payload, globalScope)),
  });
}

function mountFirstRunActionsPrimitive(globalScope = globalThis) {
  const firstRunActionsEl = globalScope?.document?.querySelector?.("#first-run-setup .first-run-actions");
  mountConfiguredShellPrimitive({
    globalScope,
    mountEl: firstRunActionsEl,
    createRoot: h => createFirstRunActionsRoot(h, (actionId, payload = null) =>
      dispatchShellAction(actionId, payload, globalScope)),
  });
}

function mountRelayHeaderActionsPrimitive(globalScope = globalThis) {
  const actionsEl = globalScope?.document?.querySelector?.("#relay-live-card .card-header-actions");
  mountConfiguredShellPrimitive({
    globalScope,
    mountEl: actionsEl,
    createRoot: h => createRelayHeaderActionsRoot(h, (actionId, payload = null) =>
      dispatchShellAction(actionId, payload, globalScope)),
  });
}

function mountRelayLiveActionsPrimitive(globalScope = globalThis) {
  const actionsEl = globalScope?.document?.querySelector?.("#relay-live-card .live-actions");
  mountConfiguredShellPrimitive({
    globalScope,
    mountEl: actionsEl,
    createRoot: h => createRelayLiveActionsRoot(h, (actionId, payload = null) =>
      dispatchShellAction(actionId, payload, globalScope)),
  });
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
    // Preserve existing card-shell nodes while shell primitives are mounted.
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
  const statusState = reactive({ message: "", tone: "", active: false, exiting: false, hidden: true });
  const toastState = reactive({ items: [] });
  let statusHideTimer = null;
  let statusExitTimer = null;
  let nextToastId = 1;
  const setTimer = globalScope?.setTimeout ? globalScope.setTimeout.bind(globalScope) : globalThis.setTimeout.bind(globalThis);
  const raf = globalScope?.requestAnimationFrame
    ? globalScope.requestAnimationFrame.bind(globalScope)
    : globalThis.requestAnimationFrame?.bind(globalThis);

  function syncStatusMountClasses() {
    statusEl.classList.toggle("hidden", Boolean(statusState.hidden));
    statusEl.classList.toggle("is-active", Boolean(statusState.active));
    statusEl.classList.toggle("is-exiting", Boolean(statusState.exiting));
    statusEl.classList.toggle("success", statusState.tone === "success");
    statusEl.classList.toggle("warning", statusState.tone === "warning");
    statusEl.classList.toggle("error", statusState.tone === "error");
  }
  function finalizeStatusExit() {
    statusState.active = false;
    statusState.exiting = false;
    statusState.hidden = true;
    statusState.tone = "";
    syncStatusMountClasses();
  }
  function beginStatusExit(exitDurationMs = 300) {
    statusState.active = false;
    statusState.exiting = true;
    syncStatusMountClasses();
    if (statusExitTimer) {
      clearTimeout(statusExitTimer);
    }
    statusExitTimer = setTimer(() => finalizeStatusExit(), exitDurationMs);
  }
  function showStatusMessage(message, tone = "info", { autoHideDelayMs = 5000, exitDurationMs = 300 } = {}) {
    statusState.message = String(message ?? "");
    statusState.hidden = false;
    statusState.exiting = false;
    statusState.active = false;
    statusState.tone = tone ? String(tone) : "";
    syncStatusMountClasses();
    if (statusHideTimer) {
      clearTimeout(statusHideTimer);
      statusHideTimer = null;
    }
    if (statusExitTimer) {
      clearTimeout(statusExitTimer);
      statusExitTimer = null;
    }
    raf?.(() => {
      statusState.active = true;
      syncStatusMountClasses();
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
  const pageControlsBridge = mountPageControlsPrimitive(globalScope);
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
      return h(
        "span",
        {
          class: [
            statusState.hidden ? "hidden" : "",
            statusState.active ? "is-active" : "",
            statusState.exiting ? "is-exiting" : "",
            statusState.tone || "",
          ].filter(Boolean).join(" "),
        },
        statusState.message,
      );
    },
  };
  syncStatusMountClasses();
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
            renderActionButton(h, {
              type: "button",
              className: "toast-close",
              text: "x",
              attrs: {
                "aria-label": "Dismiss",
              },
              onClick: () => dismissToast(item.id),
            }),
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
    get ownsPageControlInteractions() {
      return Boolean(pageControlsBridge?.ownsPageControlInteractions);
    },
    getPageControlState: () => pageControlsBridge?.readPageControlState?.() ?? null,
    syncPageControls: nextState => pageControlsBridge?.syncPageControls?.(nextState) ?? false,
    focusPageControl: controlKey => pageControlsBridge?.focusPageControl?.(controlKey) ?? false,
    scrollPageControl: controlKey => pageControlsBridge?.scrollPageControl?.(controlKey) ?? false,
  }, { globalScope });
}
export function mountShellPrimitivesIsland({ globalScope = globalThis } = {}) {
  if (typeof globalScope?.document === "undefined") return;
  mountRelayBannerPrimitive(globalScope);
  mountRelayHeaderActionsPrimitive(globalScope);
  mountRelayLiveActionsPrimitive(globalScope);
  mountActionsToolbarPrimitive(globalScope);
  mountOnboardingDialogPrimitive(globalScope);
  mountFirstRunActionsPrimitive(globalScope);
  mountDashboardCardShellPrimitives(globalScope);
  mountFeedbackPrimitiveBridge(globalScope);
}
