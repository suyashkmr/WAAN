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
  };
}

try {
  if (typeof globalThis.document !== "undefined") {
    mountRelayBannerPrimitive();
    mountFeedbackPrimitiveBridge();
  }
} catch (error) {
  globalThis.console?.warn?.("Vue shell primitives unavailable; using legacy DOM primitives.", error);
}
