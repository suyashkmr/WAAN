import { describe, it, expect, vi } from "vitest";
import { createRelayVisibilityAdapter, createRelayPlatformAdapter } from "../js/relayControls/platformAdapter.js";

describe("relay platform adapter", () => {
  it("handles missing document safely for visibility checks", () => {
    const adapter = createRelayVisibilityAdapter({ documentRef: null });

    expect(adapter.isHidden()).toBe(false);
    const cleanup = adapter.addChangeListener(() => {});
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
  });

  it("prefers explicit electron API and falls back to window reference", () => {
    const explicitElectronApi = { notifySyncSummary: vi.fn() };
    const windowElectronApi = { setRelayAutostart: vi.fn() };

    const explicitPlatform = createRelayPlatformAdapter({
      electronAPI: explicitElectronApi,
      windowRef: { electronAPI: windowElectronApi },
    });
    const fallbackPlatform = createRelayPlatformAdapter({
      windowRef: { electronAPI: windowElectronApi },
    });

    expect(explicitPlatform.electronAPI).toBe(explicitElectronApi);
    expect(fallbackPlatform.electronAPI).toBe(windowElectronApi);
  });
});
