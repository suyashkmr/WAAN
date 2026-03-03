import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VUE_APP_SHELL_ROOT_KEY, mountVueAppShellRoot } from "../js/vue/appShellRoot.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../js/vue/bridgeRegistry.js";

function createVueRuntimeStub() {
  /** @type {any} */
  const runtime = {
    reactive: value => value,
    h: (type, props, children) => ({ type, props: props || {}, children }),
    render: (vnode, container) => {
      if (!container) return;
      if (!vnode) {
        container.innerHTML = "";
        return;
      }
      const html = vnode?.props?.innerHTML;
      container.innerHTML = typeof html === "string" ? html : "";
    },
  };
  runtime.createApp = component => ({
    use: () => runtime.createApp(component),
    component: () => runtime.createApp(component),
    mount: mountEl => {
      if (!mountEl) return;
      if (component?.template) mountEl.innerHTML = component.template;
    },
  });
  return runtime;
}

describe("vue app shell root", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <section id="summary"></section>
      <div id="highlights-list"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <section id="relay-status-banner"></section>
      <div id="actions-toolbar"></div>
      <div id="onboarding-overlay"></div>
      <section id="saved-views-card" data-vue-shell-mount="card-shell"><div>Saved</div></section>
      <div id="data-status"></div>
      <div id="toast-container"></div>
      <div id="search-results-list"></div>
      <div id="search-insights"></div>
      <div id="saved-view-gallery"></div>
      <div id="compare-summary"></div>
    `;
    const vueRuntime = createVueRuntimeStub();
    window.Vue = vueRuntime;
    globalThis.Vue = vueRuntime;
    window.PrimeVue = { Config: {}, Card: {} };
    window.primevue = window.PrimeVue;
  });

  afterEach(() => {
    delete window[VUE_APP_SHELL_ROOT_KEY];
    delete window.Vue;
    delete window.PrimeVue;
    delete window.primevue;
    delete globalThis.Vue;
  });

  it("mounts Vue app-shell root once and records lifecycle state", () => {
    const first = mountVueAppShellRoot();
    const second = mountVueAppShellRoot();

    expect(first?.mounted).toBe(true);
    expect(first).toBe(second);
    expect(window[VUE_APP_SHELL_ROOT_KEY]?.mounted).toBe(true);
    expect(window[VUE_APP_SHELL_ROOT_KEY]?.mountedAt).toBeGreaterThan(0);
  });

  it("does not lock root as mounted after early no-op and allows later successful retry", () => {
    delete window.Vue;
    delete globalThis.Vue;
    delete window.PrimeVue;
    delete window.primevue;
    delete window.__WAAN_VUE_RUNTIME__;
    delete window.__WAAN_VUE_SUMMARY_BRIDGE__;
    delete window.__WAAN_VUE_SHELL_BRIDGE__;
    delete window.__WAAN_VUE_DASHBOARD_PANELS_BRIDGE__;
    delete window.__WAAN_VUE_SEARCH_SAVED_BRIDGE__;

    const first = mountVueAppShellRoot();
    expect(first?.mounted).toBe(false);

    const vueRuntime = createVueRuntimeStub();
    window.Vue = vueRuntime;
    globalThis.Vue = vueRuntime;
    window.PrimeVue = { Config: {}, Card: {} };
    window.primevue = window.PrimeVue;

    const second = mountVueAppShellRoot();
    expect(second).toBe(first);
    expect(second?.mounted).toBe(true);
    expect(window[VUE_APP_SHELL_ROOT_KEY]?.attempts).toBeGreaterThanOrEqual(2);
  });

  it("mounts and resolves bridges on provided global scope", () => {
    const scopedRuntime = createVueRuntimeStub();
    const fakeWindow = {
      document,
      console,
      setTimeout,
      clearTimeout,
      requestAnimationFrame: callback => callback(),
      Vue: scopedRuntime,
      PrimeVue: { Config: {}, Card: {} },
      primevue: { Config: {}, Card: {} },
    };

    const rootState = mountVueAppShellRoot({ globalScope: fakeWindow });

    expect(rootState?.mounted).toBe(true);
    expect(fakeWindow[VUE_APP_SHELL_ROOT_KEY]?.mounted).toBe(true);
    expect(resolveVueBridge(VUE_BRIDGE_NAMES.shell, { globalScope: fakeWindow })).toBeTruthy();
    expect(resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved, { globalScope: fakeWindow })).toBeTruthy();
  });
});
