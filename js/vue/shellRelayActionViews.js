/**
 * @param {any} h
 * @param {(actionId: string, payload?: any) => void} onAction
 */
export function createRelayHeaderActionsRoot(h, onAction) {
  return {
    name: "RelayHeaderActionsPrimitive",
    render() {
      return [
        h(
          "button",
          {
            type: "button",
            class: "ghost-button small",
            id: "relay-reload-all",
            disabled: true,
            onClick: event => onAction("relay.reloadAll", {
              currentTarget: event?.currentTarget ?? null,
              target: event?.target ?? null,
            }),
          },
          "Reload All Chats",
        ),
        h(
          "button",
          {
            type: "button",
            class: "ghost-button small danger",
            id: "relay-clear-storage",
            disabled: true,
            onClick: event => onAction("relay.clearStorage", {
              currentTarget: event?.currentTarget ?? null,
              target: event?.target ?? null,
            }),
          },
          "Clear Cached Chats",
        ),
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
        h(
          "button",
          {
            type: "button",
            class: "ghost-button",
            id: "relay-start",
            onClick: event => onAction("relay.primaryAction", {
              currentTarget: event?.currentTarget ?? null,
              target: event?.target ?? null,
            }),
          },
          "Connect Relay",
        ),
        h("div", { class: "live-button-group" }, [
          h(
            "button",
            {
              type: "button",
              class: "ghost-button",
              id: "relay-stop",
              disabled: true,
              onClick: () => onAction("relay.stop"),
            },
            "Pause Relay",
          ),
          h(
            "button",
            {
              type: "button",
              class: "ghost-button danger",
              id: "relay-logout",
              disabled: true,
              onClick: () => onAction("relay.logout"),
            },
            "Log Out & Unlink",
          ),
        ]),
      ];
    },
  };
}
