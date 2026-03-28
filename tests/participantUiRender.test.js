import { afterEach, describe, expect, it, vi } from "vitest";
import { Fragment, h, render } from "vue";

import { createSearchParticipantUiController } from "../js/search/participantUi.js";
import { readPrimeSelectBridgeValue } from "../js/vue/primeSelectBridge.js";

function renderPrimeSelectLabel(vnode) {
  const selectNode = vnode?.children?.[0];
  const options = Array.isArray(selectNode?.props?.options) ? selectNode.props.options : [];
  const modelValue = selectNode?.props?.modelValue ?? "";
  const selected = options.find(option => String(option?.value ?? "") === String(modelValue ?? ""));
  return String(selected?.label ?? "");
}

describe("search participant UI rendering", () => {
  const originalVitestEnv = process.env.VITEST;

  afterEach(() => {
    if (typeof originalVitestEnv === "string") process.env.VITEST = originalVitestEnv;
    else delete process.env.VITEST;
    delete globalThis.__WAAN_ALLOW_NATIVE_BRIDGE_FALLBACKS__;
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
    globalThis.__WAAN_ALLOW_NATIVE_BRIDGE_FALLBACKS__ = true;
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
            container.innerHTML = `<div class="p-select" data-runtime="${String(vnode?.props?.["data-ui-runtime"] || "")}">${renderPrimeSelectLabel(vnode)}</div>`;
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
    expect(participantSelect.dataset.primevueManaged).toBeUndefined();
    expect(participantSelect.dataset.primevueDelegateInstalled).toBeUndefined();
    const mountEl = document.getElementById("search-participant--mount");
    expect(mountEl?.classList.contains("prime-select-bridge")).toBe(true);
    expect(mountEl?.isConnected).toBe(true);
    expect(mountEl?.dataset.bridgeReady).toBe("true");
    expect(mountEl?.dataset.bridgeInputId).toBe("search-participant");
  });

  it("renders the visible participant placeholder label through the bridged PrimeVue mount", () => {
    const participantSelect = document.createElement("select");
    participantSelect.id = "search-participant";
    const participantLabel = document.createElement("label");
    participantLabel.htmlFor = "search-participant";
    participantLabel.textContent = "Participant";
    document.body.appendChild(participantLabel);
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
            container.innerHTML = `<div class="p-select">${renderPrimeSelectLabel(vnode)}</div>`;
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

    expect(document.getElementById("search-participant--mount")?.textContent).toContain("All participants");
    expect(participantLabel.htmlFor).toBe("search-participant--primevue");
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

    expect(readPrimeSelectBridgeValue(participantSelect)).toBe("");

    const vnode = latestRoot.render();
    vnode.children[0].props["onUpdate:modelValue"]("Ana");

    expect(participantSelect.value).toBe("");
    expect(readPrimeSelectBridgeValue(participantSelect)).toBe("Ana");
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

    expect(participantSelect.value).toBe("");
    expect(readPrimeSelectBridgeValue(participantSelect)).toBe("Ana");
    expect(nativeChangeListener).not.toHaveBeenCalled();
  });

  it("preserves the visible bridged participant selection when options are repopulated", () => {
    const participantSelect = document.createElement("select");
    participantSelect.id = "search-participant";
    document.body.appendChild(participantSelect);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    let latestRoot = null;
    let entries = [{ type: "message", sender: "Ana" }];
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
      getEntries: () => entries,
      getDatasetFingerprint: () => `fp-${entries.length}`,
      getSearchState: () => ({ query: { participant: "" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint, entriesLength, selectedStateValue, selectedUiValue }) =>
        `${datasetFingerprint}|${entriesLength}|${selectedStateValue}|${selectedUiValue}`,
      vueRuntime,
    });

    controller.populateParticipants();
    latestRoot.render().children[0].props["onUpdate:modelValue"]("Ana");

    entries = [
      { type: "message", sender: "Ana" },
      { type: "message", sender: "Ben" },
    ];
    controller.populateParticipants();

    expect(readPrimeSelectBridgeValue(participantSelect)).toBe("Ana");
    expect(Array.from(participantSelect.options).map(option => option.value)).toEqual(["", "Ana", "Ben"]);
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
