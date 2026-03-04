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
    document.body.innerHTML = "";
  });

  it("renders log entries via Vue runtime", () => {
    globalThis.Vue = { h, render, Fragment };

    let sourceInstance = null;
    class FakeEventSource {
      constructor() {
        sourceInstance = this;
      }
      close() {}
    }
    globalThis.EventSource = /** @type {any} */ (FakeEventSource);

    const { controller, logDrawerList, logDrawerConnectionLabel } = createController();
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

  it("fails fast without Vue runtime outside Vitest fallback mode", () => {
    delete process.env.VITEST;
    const { controller } = createController();
    expect(() => controller.openLogDrawer()).toThrow("Vue runtime is required for relay log rendering.");
  });
});
