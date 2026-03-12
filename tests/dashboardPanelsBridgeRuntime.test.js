import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../js/vue/dashboardPanelsIsland.js", () => ({
  mountDashboardPanelsIsland: vi.fn(),
}));

vi.mock("../js/vue/bridgeRegistry.js", () => ({
  VUE_BRIDGE_NAMES: { dashboardPanels: "dashboardPanels" },
  resolveVueBridge: vi.fn(),
}));

describe("dashboard panels bridge runtime", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("caches the resolved dashboard panels bridge across repeated invocations", async () => {
    const { createDashboardPanelsBridgeInvoker } = await import("../js/vue/dashboardPanelsBridgeRuntime.js");
    const { mountDashboardPanelsIsland } = await import("../js/vue/dashboardPanelsIsland.js");
    const { resolveVueBridge } = await import("../js/vue/bridgeRegistry.js");

    const renderHourlyHeatmap = vi.fn(() => true);
    resolveVueBridge.mockReturnValue({ renderHourlyHeatmap });

    const invokeBridge = createDashboardPanelsBridgeInvoker();

    expect(invokeBridge("renderHourlyHeatmap", { pass: 1 })).toBe(true);
    expect(invokeBridge("renderHourlyHeatmap", { pass: 2 })).toBe(true);

    expect(mountDashboardPanelsIsland).toHaveBeenCalledTimes(1);
    expect(resolveVueBridge).toHaveBeenCalledTimes(1);
    expect(renderHourlyHeatmap).toHaveBeenCalledTimes(2);
    expect(renderHourlyHeatmap).toHaveBeenNthCalledWith(1, { pass: 1 });
    expect(renderHourlyHeatmap).toHaveBeenNthCalledWith(2, { pass: 2 });
  });
});
