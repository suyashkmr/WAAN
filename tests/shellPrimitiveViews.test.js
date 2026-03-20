import { describe, expect, it, vi } from "vitest";
import {
  createActionsToolbarRoot,
  createFirstRunActionsRoot,
  createOnboardingDialogRoot,
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
  it("uses PrimeVue Button vnode type when runtime is available", () => {
    const originalPrimeVue = globalThis.PrimeVue;
    try {
      const PrimeButton = { name: "PrimeButtonStub" };
      globalThis.PrimeVue = { Button: PrimeButton };
      const onAction = vi.fn();
      const headerRoot = createRelayHeaderActionsRoot(h, onAction);
      const headerTree = headerRoot.render();
      const reloadButton = findNode(
        headerTree,
        node => node?.props?.id === "relay-reload-all",
      );
      expect(reloadButton).toBeTruthy();
      expect(reloadButton.type).toBe(PrimeButton);
      expect(reloadButton.props["data-ui-runtime"]).toBe("primevue");
      expect(reloadButton.props.disabled).toBe(true);
    } finally {
      if (typeof originalPrimeVue === "undefined") {
        delete globalThis.PrimeVue;
      } else {
        globalThis.PrimeVue = originalPrimeVue;
      }
    }
  });

  it("renders only primary export actions in the toolbar primitive", () => {
    const onAction = vi.fn();
    const root = createActionsToolbarRoot(h, onAction);
    const tree = root.render();

    const pdfButton = findNode(
      tree,
      node => node?.props?.id === "download-pdf",
    );
    const markdownButton = findNode(
      tree,
      node => node?.props?.id === "download-markdown-report",
    );
    const slidesButton = findNode(
      tree,
      node => node?.props?.id === "download-slides-report",
    );
    const onboardingButton = findNode(
      tree,
      node => node?.props?.id === "onboarding-start",
    );
    expect(pdfButton).toBeTruthy();
    expect(markdownButton).toBeTruthy();
    expect(slidesButton).toBeTruthy();
    expect(onboardingButton).toBeNull();

    pdfButton.props.onClick();
    markdownButton.props.onClick();
    slidesButton.props.onClick();

    expect(onAction).toHaveBeenNthCalledWith(1, "export.pdf");
    expect(onAction).toHaveBeenNthCalledWith(2, "export.markdown");
    expect(onAction).toHaveBeenNthCalledWith(3, "export.slides");
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

  it("renders onboarding root with PrimeVue dialog when available", () => {
    const originalPrimeVue = globalThis.PrimeVue;
    try {
      const PrimeDialog = { name: "PrimeDialogStub" };
      globalThis.PrimeVue = { Dialog: PrimeDialog };
      const onAction = vi.fn();
      const root = createOnboardingDialogRoot(h, onAction);
      const tree = root.render();
      expect(tree?.type).toBe(PrimeDialog);
      expect(tree?.props?.["data-ui-runtime"]).toBe("primevue");
      const slotTree = typeof tree?.children?.default === "function"
        ? tree.children.default()
        : [];
      const skipButton = findNode(
        slotTree,
        node => node?.props?.id === "onboarding-skip",
      );
      const nextButton = findNode(
        slotTree,
        node => node?.props?.id === "onboarding-next",
      );
      expect(skipButton).toBeTruthy();
      expect(nextButton).toBeTruthy();
      skipButton.props.onClick();
      nextButton.props.onClick();
      expect(onAction).toHaveBeenNthCalledWith(1, "onboarding.skip");
      expect(onAction).toHaveBeenNthCalledWith(2, "onboarding.next");
    } finally {
      if (typeof originalPrimeVue === "undefined") {
        delete globalThis.PrimeVue;
      } else {
        globalThis.PrimeVue = originalPrimeVue;
      }
    }
  });

  it("dispatches relay core actions from Vue relay action primitives", () => {
    const onAction = vi.fn();
    const headerRoot = createRelayHeaderActionsRoot(h, onAction);
    const headerTree = headerRoot.render();
    const reloadButton = findNode(
      headerTree,
      node => node?.props?.id === "relay-reload-all",
    );
    const clearButton = findNode(
      headerTree,
      node => node?.props?.id === "relay-clear-storage",
    );
    expect(reloadButton).toBeTruthy();
    expect(clearButton).toBeTruthy();
    expect(reloadButton.props.disabled).toBe(true);
    expect(clearButton.props.disabled).toBe(true);
    reloadButton.props.onClick();
    clearButton.props.onClick();

    const liveRoot = createRelayLiveActionsRoot(h, onAction);
    const liveTree = liveRoot.render();
    const connectButton = findNode(
      liveTree,
      node => node?.props?.id === "relay-start",
    );
    const stopButton = findNode(
      liveTree,
      node => node?.props?.id === "relay-stop",
    );
    const logoutButton = findNode(
      liveTree,
      node => node?.props?.id === "relay-logout",
    );
    expect(connectButton).toBeTruthy();
    expect(stopButton).toBeTruthy();
    expect(logoutButton).toBeTruthy();
    expect(stopButton.props.disabled).toBe(true);
    expect(logoutButton.props.disabled).toBe(true);
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
