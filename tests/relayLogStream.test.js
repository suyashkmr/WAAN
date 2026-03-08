import { afterEach, describe, expect, it } from "vitest";
import { Fragment, h, render } from "vue";

import { createRelayLogController } from "../js/relayControls/logStream.js";

function createController(overrides = {}) {
  const logDrawerToggleButton = document.createElement("button");
  const logDrawerEl = document.createElement("div");
  const logDrawerList = document.createElement("div");
  const logDrawerConnectionLabel = document.createElement("div");

  const controller = createRelayLogController({
    brandName: "WAAN",
    relayServiceName: "Relay",
    relayBase: "/api",
    logDrawerToggleButton,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    issueBaseUrl: "https://example.invalid/issues/new",
    getRelayStatus: () => ({ running: true }),
    getDatasetLabel: () => "Dataset",
    getDataAvailable: () => true,
    getRemoteChatCount: () => 1,
    fetchJson: async () => ({}),
    updateStatus: () => {},
    vueRuntime: overrides.vueRuntime,
    globalScope: overrides.globalScope,
    ...overrides,
  });

  return {
    controller,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
  };
}

describe("relay log stream rendering", () => {
  const originalEventSource = globalThis.EventSource;
  const originalVitestEnv = process.env.VITEST;

  afterEach(() => {
    if (typeof originalEventSource === "undefined") delete globalThis.EventSource;
    else globalThis.EventSource = originalEventSource;

    if (typeof originalVitestEnv === "string") process.env.VITEST = originalVitestEnv;
    else delete process.env.VITEST;

    delete globalThis.Vue;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;
    document.body.innerHTML = "";
  });

  it("renders log entries via Vue runtime", () => {
    const vueRuntime = { h, render, Fragment };

    let sourceInstance = null;
    class FakeEventSource {
      constructor() {
        sourceInstance = this;
      }
      close() {}
    }
    globalThis.EventSource = /** @type {any} */ (FakeEventSource);

    const { controller, logDrawerList, logDrawerConnectionLabel } = createController({ vueRuntime });
    logDrawerList.innerHTML = '<p class="relay-log-empty">No relay logs yet.</p>';
    controller.initLogStream();

    sourceInstance.onmessage?.({ data: "line one" });
    sourceInstance.onmessage?.({ data: "line two" });

    expect(logDrawerList.querySelectorAll(".relay-log-entry")).toHaveLength(2);
    expect(logDrawerList.querySelectorAll(".relay-log-empty")).toHaveLength(0);
    expect(logDrawerList.textContent).toContain("line one");
    expect(logDrawerList.textContent).toContain("line two");

    sourceInstance.onopen?.();
    expect(logDrawerConnectionLabel.textContent).toBe("Live log stream");
  });

  it("renders relay logs via PrimeVue DataView when available", () => {
    const PrimeDataView = { name: "PrimeDataViewStub" };
    const globalScope = { PrimeVue: { DataView: PrimeDataView } };
    const vueRuntime = {
      Fragment: Symbol("Fragment"),
      h: (type, props = {}, children = []) => ({ type, props, children }),
      render: (vnode, container) => {
        if (!container) return;
        if (!vnode) {
          container.innerHTML = "";
          return;
        }
        if (vnode.type !== PrimeDataView) {
          container.innerHTML = "<div>rendered</div>";
          return;
        }
        const slot = vnode.children?.list;
        const listNodes = typeof slot === "function" ? slot({ items: vnode.props?.value || [] }) : [];
        container.innerHTML = `<div class="relay-log-list-prime" data-ui-runtime="${String(vnode.props?.["data-ui-runtime"] || "")}">${listNodes
          .map(node => `<p class="relay-log-entry">${String(node?.children || "")}</p>`)
          .join("")}</div>`;
      },
    };

    let sourceInstance = null;
    class FakeEventSource {
      constructor() {
        sourceInstance = this;
      }
      close() {}
    }
    globalThis.EventSource = /** @type {any} */ (FakeEventSource);

    const { controller, logDrawerList } = createController({ vueRuntime, globalScope });
    controller.initLogStream();

    sourceInstance.onmessage?.({ data: "line one" });
    sourceInstance.onmessage?.({ data: "line two" });

    const primeList = logDrawerList.querySelector(".relay-log-list-prime");
    expect(primeList?.getAttribute("data-ui-runtime")).toBe("primevue");
    expect(logDrawerList.querySelectorAll(".relay-log-entry")).toHaveLength(2);
  });

  it("fails fast without Vue runtime outside Vitest fallback mode", () => {
    delete process.env.VITEST;
    const { controller } = createController();
    expect(() => controller.openLogDrawer()).toThrow("Vue runtime is required for relay log rendering.");
  });

  it("does not require Vue just to update the connection label during init", () => {
    delete process.env.VITEST;

    let sourceInstance = null;
    class FakeEventSource {
      constructor() {
        sourceInstance = this;
      }
      close() {}
    }
    globalThis.EventSource = /** @type {any} */ (FakeEventSource);

    const { controller, logDrawerConnectionLabel, logDrawerList } = createController();

    expect(() => controller.initLogStream()).not.toThrow();
    expect(logDrawerConnectionLabel.textContent).toBe("Connecting…");

    sourceInstance.onopen?.();
    expect(logDrawerConnectionLabel.textContent).toBe("Live log stream");
    expect(logDrawerList.querySelectorAll(".relay-log-entry")).toHaveLength(0);
  });
});
