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
          h(
            "button",
            {
              type: "button",
              class: "ghost-button small",
              id: "relay-recovery-reconnect",
              onClick: () => onAction("relay.recoveryReconnect"),
            },
            "Reconnect",
          ),
          h(
            "button",
            {
              type: "button",
              class: "ghost-button small",
              id: "relay-recovery-resync",
              onClick: () => onAction("relay.recoveryResync"),
            },
            "Resync",
          ),
          h(
            "button",
            {
              type: "button",
              class: "ghost-button small",
              id: "relay-recovery-export",
              onClick: () => onAction("relay.recoveryExportDiagnostics"),
            },
            "Export diagnostics",
          ),
        ]),
      ];
    },
  };
}

/**
 * @param {any} h
 * @param {(actionId: string) => void} onAction
 */
export function createActionsToolbarRoot(h, onAction) {
  return {
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
          h(
            "button",
            {
              type: "button",
              class: "ghost-button",
              id: "log-drawer-toggle",
              onClick: () => onAction("relay.logDrawerOpen"),
            },
            "View Relay Logs",
          ),
        ]),
      ];
    },
  };
}

/**
 * @param {any} h
 */
export function createOnboardingDialogRoot(h) {
  return {
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
}
