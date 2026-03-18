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
          className: "ghost-button small",
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
          className: "ghost-button small danger",
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
        renderActionButton(h, {
          type: "button",
          className: "ghost-button",
          id: "relay-start",
          text: "Start relay",
          onClick: event => onAction("relay.primaryAction", {
            currentTarget: event?.currentTarget ?? null,
            target: event?.target ?? null,
          }),
        }),
        h("div", { class: "live-button-group" }, [
          renderActionButton(h, {
            type: "button",
            className: "ghost-button",
            id: "relay-stop",
            text: "Pause sync",
            disabled: true,
            onClick: () => onAction("relay.stop"),
          }),
          renderActionButton(h, {
            type: "button",
            className: "ghost-button danger",
            id: "relay-logout",
            text: "Log out & unlink",
            disabled: true,
            onClick: () => onAction("relay.logout"),
          }),
        ]),
      ];
    },
  };
}
