import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createVueFrontendAdapterLayer,
  installVueFrontendAdapterLayer,
  VUE_FRONTEND_ADAPTER_KEY,
} from "../js/appShell/vueFrontendAdapterLayer.js";
import { VUE_BRIDGE_NAMES } from "../js/vue/bridgeRegistry.js";
import { VUE_RUNTIME_REGISTRY_KEY } from "../js/vue/bridgeRegistry.js";

describe("vue frontend adapter layer", () => {
  afterEach(() => {
    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
  });

  it("maps app-shell state APIs and relay endpoints for Vue composables", () => {
    const snapshot = { selection: { activeChatId: "remote:1" } };
    const unsubscribe = vi.fn();
    const stateStore = {
      getAppShellUiState: vi.fn(() => snapshot),
      subscribeAppShellUiState: vi.fn(() => unsubscribe),
      setAppShellActiveChatId: vi.fn(),
      setAppShellCurrentRange: vi.fn(),
      setAppShellCustomRange: vi.fn(),
      setAppShellHourlyFiltersState: vi.fn(),
      setAppShellWeekdayFiltersState: vi.fn(),
    };

    const adapter = createVueFrontendAdapterLayer({
      stateStore,
      apiBase: "http://127.0.0.1:3334/api",
      relayBase: "http://127.0.0.1:4546",
      brandName: "WAAN",
      relayServiceName: "WAAN Relay",
    });

    expect(adapter.meta.brandName).toBe("WAAN");
    expect(adapter.appShellState.getSnapshot()).toEqual(snapshot);
    expect(adapter.relayEndpoints.chats).toBe("http://127.0.0.1:3334/api/chats");
    expect(adapter.relayEndpoints.relayStatus).toBe("http://127.0.0.1:4546/relay/status");

    const cb = vi.fn();
    const off = adapter.appShellState.subscribe(cb);
    expect(stateStore.subscribeAppShellUiState).toHaveBeenCalledWith(cb);
    off();
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    adapter.appShellState.actions.setActiveChatId("remote:2");
    adapter.appShellState.actions.setCurrentRange("30");
    adapter.appShellState.actions.setCustomRange({ type: "custom", start: "2026-01-01", end: "2026-01-31" });
    adapter.appShellState.actions.setHourlyFilters({ brush: { start: 8, end: 18 } });
    adapter.appShellState.actions.setWeekdayFilters({ filters: { weekdays: true, weekends: false, working: true, offhours: false } });
    expect(stateStore.setAppShellActiveChatId).toHaveBeenCalledWith("remote:2");
    expect(stateStore.setAppShellCurrentRange).toHaveBeenCalledWith("30");
    expect(stateStore.setAppShellCustomRange).toHaveBeenCalled();
    expect(stateStore.setAppShellHourlyFiltersState).toHaveBeenCalled();
    expect(stateStore.setAppShellWeekdayFiltersState).toHaveBeenCalled();

    const shellBridge = { updateRelayControlButtons: vi.fn() };
    adapter.vueBridgeRegistry.register(VUE_BRIDGE_NAMES.shell, shellBridge);
    expect(adapter.vueBridgeRegistry.resolve(VUE_BRIDGE_NAMES.shell)).toBe(shellBridge);
  });

  it("installs adapter on a target global scope", () => {
    const scope = {};
    const adapter = { meta: { brandName: "WAAN" } };
    const installed = installVueFrontendAdapterLayer({
      adapter,
      globalScope: scope,
    });
    expect(installed).toBe(adapter);
    expect(scope[VUE_FRONTEND_ADAPTER_KEY]).toBe(adapter);
  });
});
