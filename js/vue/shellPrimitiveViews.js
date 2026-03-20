import { renderActionButton, renderDialogContainer } from "./primevueRenderPrimitives.js";
import { UI_COPY } from "../uiCopy.js";

export {
  createRelayHeaderActionsRoot,
  createRelayLiveActionsRoot,
} from "./shellRelayActionViews.js";

/**
 * @param {any} h
 * @param {(actionId: string) => void} onAction
 */
export function createRelayBannerRoot(h, onAction) {
  return {
    name: "RelayBannerPrimitive",
    render() {
      return [
        h("div", { class: "relay-banner-indicator", id: "relay-status-dot", "aria-hidden": "true" }),
        h("div", { class: "relay-banner-text" }, [
          h("p", { class: "relay-banner-status", id: "relay-status-message" }, "Relay offline."),
          h(
            "p",
            { class: "relay-banner-meta", id: "relay-status-meta" },
            UI_COPY.relay.banner.offlineMeta,
          ),
        ]),
        h("div", { class: "relay-banner-actions", id: "relay-status-actions", hidden: true }, [
          renderActionButton(h, {
            type: "button",
            className: "ghost-button small",
            id: "relay-recovery-reconnect",
            text: "Reconnect",
            onClick: () => onAction("relay.recoveryReconnect"),
          }),
          renderActionButton(h, {
            type: "button",
            className: "ghost-button small",
            id: "relay-recovery-resync",
            text: "Resync",
            onClick: () => onAction("relay.recoveryResync"),
          }),
          renderActionButton(h, {
            type: "button",
            className: "ghost-button small",
            id: "relay-recovery-export",
            text: "Export diagnostics",
            onClick: () => onAction("relay.recoveryExportDiagnostics"),
          }),
        ]),
      ];
    },
  };
}

/**
 * @param {any} h
 * @param {(actionId: string, payload?: any) => void} onAction
 */
export function createActionsToolbarRoot(h, onAction) {
  return {
    name: "ActionsToolbarPrimitive",
    render() {
      return [
        h("div", { class: "toolbar-group primary" }, [
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "download-pdf",
            text: "Export PDF",
            onClick: () => onAction("export.pdf"),
          }),
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "download-markdown-report",
            text: "Export text report",
            onClick: () => onAction("export.markdown"),
          }),
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "download-slides-report",
            text: "Export slides",
            onClick: () => onAction("export.slides"),
          }),
        ]),
      ];
    },
  };
}

/**
 * @param {any} h
 * @param {(actionId: string) => void} onAction
 */
export function createOnboardingDialogRoot(h, onAction) {
  return {
    name: "OnboardingDialogPrimitive",
    render() {
      return renderDialogContainer(h, {
        className: "onboarding-panel",
        label: "Need a setup reminder?",
        children: [
          h("h2", "Need a setup reminder?"),
          h("p", { class: "onboarding-step-label", id: "onboarding-step-label" }),
          h("p", { id: "onboarding-copy" }, UI_COPY.relay.offlineNextStep),
          h("div", { class: "onboarding-actions" }, [
            renderActionButton(h, {
              type: "button",
              className: "ghost-button",
              id: "onboarding-skip",
              text: "Close",
              onClick: () => onAction("onboarding.skip"),
            }),
            renderActionButton(h, {
              type: "button",
              className: "ghost-button primary",
              id: "onboarding-next",
              text: "Next tip",
              onClick: () => onAction("onboarding.next"),
            }),
          ]),
        ],
      });
    },
  };
}

/**
 * @param {any} h
 * @param {(actionId: string, payload?: any) => void} onAction
 */
export function createFirstRunActionsRoot(h, onAction) {
  return {
    name: "FirstRunActionsPrimitive",
    render() {
      return [
        renderActionButton(h, {
          type: "button",
          className: "ghost-button tiny",
          id: "first-run-open-relay",
          text: UI_COPY.relay.firstRun.openRelay,
          onClick: () => onAction("relay.firstRunOpenRelay"),
        }),
        renderActionButton(h, {
          type: "button",
          className: "ghost-button tiny primary",
          id: "first-run-primary-action",
          text: UI_COPY.relay.firstRun.startRelay,
          onClick: () => onAction("relay.firstRunPrimaryAction"),
        }),
        h(
          "a",
          {
            class: "ghost-button tiny",
            id: "first-run-macos-help-link",
            href: "#faq-macos-gatekeeper",
          },
          "macOS launch help",
        ),
      ];
    },
  };
}
