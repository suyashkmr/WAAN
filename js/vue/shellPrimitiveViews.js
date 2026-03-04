import { renderActionButton } from "./primevueRenderPrimitives.js";

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
          h("p", { class: "relay-banner-status", id: "relay-status-message" }, "Relay status unknown."),
          h(
            "p",
            { class: "relay-banner-meta", id: "relay-status-meta" },
            "Launch the desktop relay and press Connect to mirror chats into WAAN.",
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
            text: "Save as PDF",
            onClick: () => onAction("export.pdf"),
          }),
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "download-markdown-report",
            text: "Save text report",
            onClick: () => onAction("export.markdown"),
          }),
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "download-slides-report",
            text: "Save slides (HTML)",
            onClick: () => onAction("export.slides"),
          }),
        ]),
        h("div", { class: "toolbar-group secondary" }, [
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "compact-toggle",
            text: "Compact mode",
            attrs: {
              "aria-pressed": "false",
              title: "Switch between compact and comfort layouts",
            },
            onClick: () => onAction("ui.compact.toggle"),
          }),
          h("div", { class: "theme-toggle" }, [
            h("span", "Theme"),
            h("div", { class: "segmented-option" }, [
              h("input", {
                type: "radio",
                name: "theme-option",
                id: "theme-system",
                value: "system",
                checked: true,
                onChange: event => {
                  const target = /** @type {HTMLInputElement | null} */ (event?.target ?? null);
                  if (target?.checked) {
                    onAction("ui.theme.set", { preference: "system" });
                  }
                },
              }),
              h("label", { for: "theme-system" }, "Auto"),
            ]),
            h("div", { class: "segmented-option" }, [
              h("input", {
                type: "radio",
                name: "theme-option",
                id: "theme-light",
                value: "light",
                onChange: event => {
                  const target = /** @type {HTMLInputElement | null} */ (event?.target ?? null);
                  if (target?.checked) {
                    onAction("ui.theme.set", { preference: "light" });
                  }
                },
              }),
              h("label", { for: "theme-light" }, "Light"),
            ]),
            h("div", { class: "segmented-option" }, [
              h("input", {
                type: "radio",
                name: "theme-option",
                id: "theme-dark",
                value: "dark",
                onChange: event => {
                  const target = /** @type {HTMLInputElement | null} */ (event?.target ?? null);
                  if (target?.checked) {
                    onAction("ui.theme.set", { preference: "dark" });
                  }
                },
              }),
              h("label", { for: "theme-dark" }, "Dark"),
            ]),
          ]),
          h("div", { class: "a11y-controls", "aria-label": "Accessibility options" }, [
            renderActionButton(h, {
              type: "button",
              className: "ghost-button small",
              id: "reduce-motion-toggle",
              text: "Motion: Standard",
              attrs: {
                "aria-pressed": "mixed",
              },
              onClick: () => onAction("ui.motion.cycle"),
            }),
            renderActionButton(h, {
              type: "button",
              className: "ghost-button small",
              id: "high-contrast-toggle",
              text: "Contrast: Standard",
              attrs: {
                "aria-pressed": "false",
              },
              onClick: () => onAction("ui.contrast.toggle"),
            }),
          ]),
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "log-drawer-toggle",
            text: "View Relay Logs",
            onClick: () => onAction("relay.logDrawerOpen"),
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
      return h("div", { class: "onboarding-panel" }, [
        h("h2", "Welcome to WAAN"),
        h("p", { class: "onboarding-step-label", id: "onboarding-step-label" }),
        h("p", { id: "onboarding-copy" }, "Link the relay to start mirroring chats."),
        h("div", { class: "onboarding-actions" }, [
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "onboarding-skip",
            text: "Skip",
            onClick: () => onAction("onboarding.skip"),
          }),
          renderActionButton(h, {
            type: "button",
            className: "ghost-button primary",
            id: "onboarding-next",
            text: "Next",
            onClick: () => onAction("onboarding.next"),
          }),
        ]),
      ]);
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
          text: "Open Relay Controls",
          onClick: () => onAction("relay.firstRunOpenRelay"),
        }),
        renderActionButton(h, {
          type: "button",
          className: "ghost-button tiny primary",
          id: "first-run-primary-action",
          text: "Connect Relay",
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
