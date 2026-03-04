import { describe, expect, it, vi } from "vitest";
import {
  createActionsToolbarRoot,
  createFirstRunActionsRoot,
  createRelayHeaderActionsRoot,
  createRelayLiveActionsRoot,
} from "../js/vue/shellPrimitiveViews.js";

function h(type, props = {}, children = []) {
  return { type, props, children };
}

/**
 * @param {any} node
 * @param {(candidate: any) => boolean} predicate
 * @returns {any | null}
 */
function findNode(node, predicate) {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findNode(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (predicate(node)) return node;
  const children = Array.isArray(node?.children) ? node.children : [];
  for (const child of children) {
    const match = findNode(child, predicate);
    if (match) return match;
  }
  return null;
}

describe("shell primitive views", () => {
  it("dispatches theme set action from toolbar theme radio controls", () => {
    const onAction = vi.fn();
    const root = createActionsToolbarRoot(h, onAction);
    const tree = root.render();

    const systemInput = findNode(
      tree,
      node => node?.type === "input" && node?.props?.id === "theme-system",
    );
    const lightInput = findNode(
      tree,
      node => node?.type === "input" && node?.props?.id === "theme-light",
    );
    const darkInput = findNode(
      tree,
      node => node?.type === "input" && node?.props?.id === "theme-dark",
    );

    expect(systemInput).toBeTruthy();
    expect(lightInput).toBeTruthy();
    expect(darkInput).toBeTruthy();

    systemInput.props.onChange({ target: { checked: true } });
    lightInput.props.onChange({ target: { checked: true } });
    darkInput.props.onChange({ target: { checked: true } });

    expect(onAction).toHaveBeenNthCalledWith(1, "ui.theme.set", { preference: "system" });
    expect(onAction).toHaveBeenNthCalledWith(2, "ui.theme.set", { preference: "light" });
    expect(onAction).toHaveBeenNthCalledWith(3, "ui.theme.set", { preference: "dark" });
  });

  it("dispatches first-run relay actions from Vue first-run buttons", () => {
    const onAction = vi.fn();
    const root = createFirstRunActionsRoot(h, onAction);
    const tree = root.render();

    const openRelayButton = findNode(
      tree,
      node => node?.type === "button" && node?.props?.id === "first-run-open-relay",
    );
    const primaryActionButton = findNode(
      tree,
      node => node?.type === "button" && node?.props?.id === "first-run-primary-action",
    );

    expect(openRelayButton).toBeTruthy();
    expect(primaryActionButton).toBeTruthy();

    openRelayButton.props.onClick();
    primaryActionButton.props.onClick();

    expect(onAction).toHaveBeenNthCalledWith(1, "relay.firstRunOpenRelay");
    expect(onAction).toHaveBeenNthCalledWith(2, "relay.firstRunPrimaryAction");
  });

  it("dispatches relay core actions from Vue relay action primitives", () => {
    const onAction = vi.fn();
    const headerRoot = createRelayHeaderActionsRoot(h, onAction);
    const headerTree = headerRoot.render();
    const reloadButton = findNode(
      headerTree,
      node => node?.type === "button" && node?.props?.id === "relay-reload-all",
    );
    const clearButton = findNode(
      headerTree,
      node => node?.type === "button" && node?.props?.id === "relay-clear-storage",
    );
    expect(reloadButton).toBeTruthy();
    expect(clearButton).toBeTruthy();
    reloadButton.props.onClick();
    clearButton.props.onClick();

    const liveRoot = createRelayLiveActionsRoot(h, onAction);
    const liveTree = liveRoot.render();
    const connectButton = findNode(
      liveTree,
      node => node?.type === "button" && node?.props?.id === "relay-start",
    );
    const stopButton = findNode(
      liveTree,
      node => node?.type === "button" && node?.props?.id === "relay-stop",
    );
    const logoutButton = findNode(
      liveTree,
      node => node?.type === "button" && node?.props?.id === "relay-logout",
    );
    expect(connectButton).toBeTruthy();
    expect(stopButton).toBeTruthy();
    expect(logoutButton).toBeTruthy();
    connectButton.props.onClick();
    stopButton.props.onClick();
    logoutButton.props.onClick();

    expect(onAction).toHaveBeenNthCalledWith(1, "relay.reloadAll", {
      currentTarget: null,
      target: null,
    });
    expect(onAction).toHaveBeenNthCalledWith(2, "relay.clearStorage", {
      currentTarget: null,
      target: null,
    });
    expect(onAction).toHaveBeenNthCalledWith(3, "relay.primaryAction", {
      currentTarget: null,
      target: null,
    });
    expect(onAction).toHaveBeenNthCalledWith(4, "relay.stop");
    expect(onAction).toHaveBeenNthCalledWith(5, "relay.logout");
  });
});
