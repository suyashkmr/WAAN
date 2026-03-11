import { afterEach, describe, expect, it, vi } from "vitest";
import { Fragment, h, render } from "vue";

import { createSearchParticipantUiController } from "../js/search/participantUi.js";

describe("search participant UI rendering", () => {
  const originalVitestEnv = process.env.VITEST;

  afterEach(() => {
    if (typeof originalVitestEnv === "string") process.env.VITEST = originalVitestEnv;
    else delete process.env.VITEST;
    delete globalThis.Vue;
    delete globalThis.PrimeVue;
    document.body.innerHTML = "";
  });

  it("renders participant options with Vue runtime and clears prefilled markup", () => {
    const vueRuntime = { h, render, Fragment };
    const participantSelect = document.createElement("select");
    participantSelect.innerHTML = '<option value="">All participants</option>';

    const controller = createSearchParticipantUiController({
      participantSelect,
      getEntries: () => [
        { type: "message", sender: "Ben" },
        { type: "message", sender: "Ana" },
        { type: "system", sender: "Ignored" },
      ],
      vueRuntime,
      getDatasetFingerprint: () => "fp-1",
      getSearchState: () => ({ query: { participant: "" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint, entriesLength, selectedStateValue, selectedUiValue }) =>
        `${datasetFingerprint}|${entriesLength}|${selectedStateValue}|${selectedUiValue}`,
    });

    controller.populateParticipants();

    const options = Array.from(participantSelect.options).map(option => option.value);
    expect(options).toEqual(["", "Ana", "Ben"]);
    expect(participantSelect.disabled).toBe(false);
  });

  it("keeps native participant select rendering when PrimeVue bridge is unavailable", () => {
    delete process.env.VITEST;
    const participantSelect = document.createElement("select");

    const controller = createSearchParticipantUiController({
      participantSelect,
      getEntries: () => [{ type: "message", sender: "Ana" }],
      getDatasetFingerprint: () => "fp-1",
      getSearchState: () => ({ query: { participant: "" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint }) => datasetFingerprint,
      vueRuntime: { h, render, Fragment },
    });

    expect(() => controller.populateParticipants()).not.toThrow();
    expect(Array.from(participantSelect.options).map(option => option.value)).toEqual(["", "Ana"]);
    expect(participantSelect.dataset.primevueManaged).not.toBe("true");
  });

  it("mounts a PrimeVue-managed participant select while preserving the native ref", () => {
    const participantSelect = document.createElement("select");
    participantSelect.id = "search-participant";
    document.body.appendChild(participantSelect);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    const vueRuntime = {
      h,
      reactive: value => value,
      createApp(root) {
        return {
          use() {
            return this;
          },
          mount(container) {
            const vnode = root.render();
            container.innerHTML = `<div class="p-select" data-runtime="${String(vnode?.props?.["data-ui-runtime"] || "")}"></div>`;
          },
        };
      },
    };

    const controller = createSearchParticipantUiController({
      participantSelect,
      getEntries: () => [{ type: "message", sender: "Ana" }],
      getDatasetFingerprint: () => "fp-1",
      getSearchState: () => ({ query: { participant: "" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint }) => datasetFingerprint,
      vueRuntime,
    });

    controller.populateParticipants();

    expect(participantSelect.id).toBe("search-participant");
    expect(participantSelect.isConnected).toBe(false);
    expect(participantSelect.dataset.primevueManaged).toBe("detached");
    expect(participantSelect.__waanPrimeSelectBridge?.mountEl?.classList.contains("prime-select-bridge")).toBe(true);
    expect(participantSelect.__waanPrimeSelectBridge?.mountEl?.isConnected).toBe(true);
  });

  it("keeps bridged participant state in sync after user selection", () => {
    const participantSelect = document.createElement("select");
    participantSelect.id = "search-participant";
    document.body.appendChild(participantSelect);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    let latestRoot = null;
    const vueRuntime = {
      h,
      reactive: value => value,
      createApp(root) {
        latestRoot = root;
        return {
          use() {
            return this;
          },
          mount(container) {
            const vnode = root.render();
            container.innerHTML = `<div class="p-select" data-runtime="${String(vnode?.children?.[0]?.props?.["data-ui-runtime"] || vnode?.props?.["data-ui-runtime"] || "")}"></div>`;
          },
        };
      },
    };

    const controller = createSearchParticipantUiController({
      participantSelect,
      getEntries: () => [{ type: "message", sender: "Ana" }],
      getDatasetFingerprint: () => "fp-1",
      getSearchState: () => ({ query: { participant: "" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint }) => datasetFingerprint,
      vueRuntime,
    });

    controller.populateParticipants();

    const bridgeState = participantSelect.__waanPrimeSelectBridge?.state;
    expect(bridgeState?.value).toBe("");

    const vnode = latestRoot.render();
    vnode.children[0].props["onUpdate:modelValue"]("Ana");

    expect(participantSelect.value).toBe("Ana");
    expect(bridgeState?.value).toBe("Ana");
  });

  it("does not emit mirrored native change events for the bridged participant select", () => {
    const participantSelect = document.createElement("select");
    participantSelect.id = "search-participant";
    document.body.appendChild(participantSelect);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    let latestRoot = null;
    const nativeChangeListener = vi.fn();
    participantSelect.addEventListener("change", nativeChangeListener);
    const vueRuntime = {
      h,
      reactive: value => value,
      createApp(root) {
        latestRoot = root;
        return {
          use() {
            return this;
          },
          mount(container) {
            const vnode = root.render();
            container.innerHTML = `<div class="p-select" data-runtime="${String(vnode?.children?.[0]?.props?.["data-ui-runtime"] || vnode?.props?.["data-ui-runtime"] || "")}"></div>`;
          },
        };
      },
    };

    const controller = createSearchParticipantUiController({
      participantSelect,
      getEntries: () => [{ type: "message", sender: "Ana" }],
      getDatasetFingerprint: () => "fp-1",
      getSearchState: () => ({ query: { participant: "" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint }) => datasetFingerprint,
      vueRuntime,
    });

    controller.populateParticipants();

    const vnode = latestRoot.render();
    vnode.children[0].props["onUpdate:modelValue"]("Ana");

    expect(participantSelect.value).toBe("Ana");
    expect(nativeChangeListener).not.toHaveBeenCalled();
  });

  it("clears stale participant selection before syncing the PrimeVue bridge", () => {
    const participantSelect = document.createElement("select");
    participantSelect.id = "search-participant";
    participantSelect.innerHTML = '<option value="">All participants</option><option value="Ben">Ben</option>';
    participantSelect.value = "Ben";
    document.body.appendChild(participantSelect);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    const bridgeStates = [];
    const vueRuntime = {
      h,
      reactive(value) {
        bridgeStates.push(value);
        return value;
      },
      createApp(root) {
        return {
          use() {
            return this;
          },
          mount(container) {
            const vnode = root.render();
            container.innerHTML = `<div class="p-select" data-runtime="${String(vnode?.props?.["data-ui-runtime"] || "")}"></div>`;
          },
        };
      },
    };

    const controller = createSearchParticipantUiController({
      participantSelect,
      getEntries: () => [{ type: "message", sender: "Ana" }],
      getDatasetFingerprint: () => "fp-2",
      getSearchState: () => ({ query: { participant: "" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint, entriesLength }) => `${datasetFingerprint}|${entriesLength}`,
      vueRuntime,
    });

    controller.populateParticipants();

    expect(participantSelect.value).toBe("");
    expect(bridgeStates.at(-1)?.value).toBe("");
  });

  it("disables the PrimeVue bridge when the dataset is empty even with a stale participant in state", () => {
    const participantSelect = document.createElement("select");
    participantSelect.id = "search-participant";
    document.body.appendChild(participantSelect);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    const bridgeStates = [];
    const vueRuntime = {
      h,
      reactive(value) {
        bridgeStates.push(value);
        return value;
      },
      createApp(root) {
        return {
          use() {
            return this;
          },
          mount(container) {
            const vnode = root.render();
            container.innerHTML = `<div class="p-select" data-runtime="${String(vnode?.props?.["data-ui-runtime"] || "")}"></div>`;
          },
        };
      },
    };

    const controller = createSearchParticipantUiController({
      participantSelect,
      getEntries: () => [],
      getDatasetFingerprint: () => "fp-empty",
      getSearchState: () => ({ query: { participant: "Ben" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint, entriesLength, selectedStateValue }) => `${datasetFingerprint}|${entriesLength}|${selectedStateValue}`,
      vueRuntime,
    });

    controller.populateParticipants();

    expect(participantSelect.disabled).toBe(true);
    expect(bridgeStates.at(-1)?.disabled).toBe(true);
  });
});
