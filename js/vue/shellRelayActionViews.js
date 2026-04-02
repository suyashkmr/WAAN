import { renderActionButton } from "./primevueRenderPrimitives.js";

/**
 * @param {any} h
 * @param {(actionId: string, payload?: any) => void} onAction
 */
export function createRelayHeaderActionsRoot(h, onAction) {
  return {
    name: "RelayHeaderActionsPrimitive",
    render() {
      return [
        renderActionButton(h, {
          type: "button",
          className: "wa-button dense",
          id: "relay-reload-all",
          text: "Reload chats",
          disabled: true,
          onClick: event => onAction("relay.reloadAll", {
            currentTarget: event?.currentTarget ?? null,
            target: event?.target ?? null,
          }),
        }),
        renderActionButton(h, {
          type: "button",
          className: "wa-button dense wa-button--danger",
          id: "relay-clear-storage",
          text: "Clear cache",
          disabled: true,
          onClick: event => onAction("relay.clearStorage", {
            currentTarget: event?.currentTarget ?? null,
            target: event?.target ?? null,
          }),
        }),
      ];
    },
  };
}

/**
 * @param {any} h
 * @param {(actionId: string, payload?: any) => void} onAction
 */
export function createRelayLiveActionsRoot(h, onAction) {
  return {
    name: "RelayLiveActionsPrimitive",
    render() {
      return [
        h("div", { class: "flex flex-col gap-2 w-full" }, [
          // Primary Relay Controls (Start/Pause/Logout)
          h("div", { class: "flex gap-2" }, [
            renderActionButton(h, {
              type: "button",
              className: "wa-button wa-button--primary flex-[2]",
              id: "relay-start",
              text: "Start relay",
              attrs: {
                "data-magnetic": "true",
              },
              onClick: event => onAction("relay.primaryAction", {
                currentTarget: event?.currentTarget ?? null,
                target: event?.target ?? null,
              }),
            }),
            renderActionButton(h, {
              type: "button",
              className: "wa-button wa-button--sunken flex-1",
              id: "relay-stop",
              text: "Pause",
              disabled: true,
              onClick: () => onAction("relay.stop"),
            }),
            renderActionButton(h, {
              type: "button",
              className: "wa-button wa-button--danger",
              id: "relay-logout",
              text: "Exit",
              disabled: true,
              onClick: () => onAction("relay.logout"),
              icon: h("svg", { class: "w-4 h-4", style: "fill: currentColor", viewbox: "0 0 24 24" }, [
                h("path", { d: "M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5a2 2 0 00-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" })
              ])
            }),
          ]),

          // Utility & Recovery Toolbar (Reload / Resync / Reconnect / Clear)
          h("div", { class: "flex flex-wrap gap-1.5 pt-1 mt-1 relay-utility-toolbar" }, [
            renderActionButton(h, {
              type: "button",
              className: "wa-button wa-button--sunken dense flex-1",
              id: "relay-recovery-reconnect",
              text: "Reconnect",
              disabled: true,
              attrs: {
                hidden: true,
              },
              onClick: event => onAction("relay.recoveryReconnect", {
                currentTarget: event?.currentTarget ?? null,
                target: event?.target ?? null,
              }),
            }),
            renderActionButton(h, {
              type: "button",
              className: "wa-button wa-button--sunken dense flex-1",
              id: "relay-recovery-resync",
              text: "Resync",
              disabled: true,
              attrs: {
                hidden: true,
              },
              onClick: event => onAction("relay.recoveryResync", {
                currentTarget: event?.currentTarget ?? null,
                target: event?.target ?? null,
              }),
            }),
            renderActionButton(h, {
              type: "button",
              className: "wa-button wa-button--sunken dense flex-1",
              id: "relay-reload-all",
              text: "Reload",
              onClick: event => onAction("relay.reloadAll"),
            }),
            renderActionButton(h, {
              type: "button",
              className: "wa-button wa-button--sunken dense flex-1",
              id: "relay-recovery-export",
              text: "Export diagnostics",
              disabled: true,
              attrs: {
                hidden: true,
              },
              onClick: event => onAction("relay.recoveryExportDiagnostics", {
                currentTarget: event?.currentTarget ?? null,
                target: event?.target ?? null,
              }),
            }),
            renderActionButton(h, {
              type: "button",
              className: "wa-button dense wa-button--danger",
              id: "relay-clear-storage",
              text: "Purge",
              title: "Clear local cache",
              onClick: event => onAction("relay.clearStorage", {
                currentTarget: event?.currentTarget ?? null,
                target: event?.target ?? null,
              }),
            }),
          ]),
        ]),
      ];
    },
  };
}
