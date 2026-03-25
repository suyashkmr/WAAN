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
        h("div", { class: "flex flex-col gap-3 w-full" }, [
          // Primary Action
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
          
          // Secondary Sync Actions
          h("div", { class: "live-button-group flex gap-2" }, [
            renderActionButton(h, {
              type: "button",
              className: "ghost-button flex-1",
              id: "relay-stop",
              text: "Pause sync",
              disabled: true,
              onClick: () => onAction("relay.stop"),
            }),
            renderActionButton(h, {
              type: "button",
              className: "ghost-button danger flex-1",
              id: "relay-logout",
              text: "Logout",
              disabled: true,
              onClick: () => onAction("relay.logout"),
            }),
          ]),

          // Utility Actions
          h("div", { class: "flex gap-2" }, [
            renderActionButton(h, {
              type: "button",
              className: "ghost-button tiny flex-1",
              id: "relay-reload-all",
              text: "Reload",
              disabled: true,
              onClick: event => onAction("relay.reloadAll", {
                currentTarget: event?.currentTarget ?? null,
                target: event?.target ?? null,
              }),
            }),
            renderActionButton(h, {
              type: "button",
              className: "ghost-button tiny danger flex-1",
              id: "relay-clear-storage",
              text: "Clear cache",
              disabled: true,
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
