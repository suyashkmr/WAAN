import { renderActionButton, renderDialogContainer, renderRadioInput } from "./primevueRenderPrimitives.js";
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
  let themePreference = (() => {
    const theme = globalThis?.document?.documentElement?.dataset?.theme;
    if (theme === "dark" || theme === "light" || theme === "system") return theme;
    return "system";
  })();
  /**
   * @param {string} preference
   */
  const handleThemeSelection = preference => {
    if (preference !== "dark" && preference !== "light" && preference !== "system") return;
    themePreference = preference;
    onAction("ui.theme.set", { preference });
  };

  return {
    name: "ActionsToolbarPrimitive",
    render() {
      const selectedTheme = themePreference || "system";
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
        h("div", { class: "toolbar-group secondary" }, [
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "onboarding-start",
            text: "Setup tips",
            attrs: {
              title: "Open the setup reminder.",
            },
            onClick: () => onAction("onboarding.start"),
          }),
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
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "log-drawer-toggle",
            text: "Diagnostics",
            attrs: {
              title: UI_COPY.relayLog.help,
            },
            onClick: () => onAction("relay.logDrawerOpen"),
          }),
          h("div", { class: "theme-toggle" }, [
            h("span", "Theme"),
            h("div", { class: "segmented-option" }, [
              renderRadioInput(h, {
                name: "theme-option",
                id: "theme-system",
                value: "system",
                modelValue: selectedTheme,
                onChange: event => {
                  const target = /** @type {HTMLInputElement | null} */ (event?.target ?? null);
                  if (target?.checked) {
                    handleThemeSelection("system");
                  }
                },
              }),
              h("label", { for: "theme-system" }, "Auto"),
            ]),
            h("div", { class: "segmented-option" }, [
              renderRadioInput(h, {
                name: "theme-option",
                id: "theme-light",
                value: "light",
                modelValue: selectedTheme,
                onChange: event => {
                  const target = /** @type {HTMLInputElement | null} */ (event?.target ?? null);
                  if (target?.checked) {
                    handleThemeSelection("light");
                  }
                },
              }),
              h("label", { for: "theme-light" }, "Light"),
            ]),
            h("div", { class: "segmented-option" }, [
              renderRadioInput(h, {
                name: "theme-option",
                id: "theme-dark",
                value: "dark",
                modelValue: selectedTheme,
                onChange: event => {
                  const target = /** @type {HTMLInputElement | null} */ (event?.target ?? null);
                  if (target?.checked) {
                    handleThemeSelection("dark");
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
