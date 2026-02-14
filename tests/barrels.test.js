import { describe, it, expect } from "vitest";
import * as appShellBarrel from "../js/appShell/index.js";
import * as dashboardRenderBarrel from "../js/appShell/dashboardRender/index.js";

describe("barrel exports", () => {
  it("exports core appShell modules", () => {
    expect(typeof appShellBarrel.createChatSelectionController).toBe("function");
    expect(typeof appShellBarrel.createRangeFiltersController).toBe("function");
    expect(typeof appShellBarrel.createDatasetLifecycleController).toBe("function");
    expect(typeof appShellBarrel.createRelayBootstrapController).toBe("function");
    expect(typeof appShellBarrel.createEventBindingsController).toBe("function");
    expect(typeof appShellBarrel.createBootstrapController).toBe("function");
    expect(typeof appShellBarrel.createDataStatusController).toBe("function");
    expect(typeof appShellBarrel.fetchJson).toBe("function");
  });

  it("exports dashboardRender composition modules", () => {
    expect(typeof dashboardRenderBarrel.createDashboardRenderController).toBe("function");
    expect(typeof dashboardRenderBarrel.createActivityPanelsController).toBe("function");
    expect(typeof dashboardRenderBarrel.createHighlightsStatsController).toBe("function");
    expect(typeof dashboardRenderBarrel.createParticipantsPanelController).toBe("function");
    expect(typeof dashboardRenderBarrel.applyParticipantPreset).toBe("function");
    expect(typeof dashboardRenderBarrel.toggleParticipantRow).toBe("function");
  });
});
