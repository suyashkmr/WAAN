import { describe, it, expect } from "vitest";
import * as appShellBarrel from "../js/appShell/index.js";

describe("barrel exports", () => {
  it("exports runtime composition surface", () => {
    expect(typeof appShellBarrel.createAppDomRefs).toBe("function");
    expect(typeof appShellBarrel.createAnalyticsRequestTracker).toBe("function");
    expect(typeof appShellBarrel.setupAppBootstrap).toBe("function");
    expect(typeof appShellBarrel.createExportRuntime).toBe("function");
    expect(typeof appShellBarrel.createExportFilterSummary).toBe("function");
    expect(typeof appShellBarrel.createRelayRuntime).toBe("function");
    expect(typeof appShellBarrel.createDashboardRuntime).toBe("function");
    expect(typeof appShellBarrel.createDatasetLifecycleRuntime).toBe("function");
  });

  it("exports app shell controllers used by appShell.js", () => {
    expect(typeof appShellBarrel.createOnboardingController).toBe("function");
    expect(typeof appShellBarrel.createStatusUiController).toBe("function");
    expect(typeof appShellBarrel.createThemeUiController).toBe("function");
    expect(typeof appShellBarrel.createChatSelectionController).toBe("function");
    expect(typeof appShellBarrel.createRangeFiltersController).toBe("function");
    expect(typeof appShellBarrel.createAnalyticsPipeline).toBe("function");
    expect(typeof appShellBarrel.createKeyboardShortcutsController).toBe("function");
    expect(typeof appShellBarrel.createDataStatusController).toBe("function");
    expect(typeof appShellBarrel.createParticipantInteractionsController).toBe("function");
    expect(typeof appShellBarrel.createBusyRuntimeController).toBe("function");
    expect(typeof appShellBarrel.fetchJson).toBe("function");
    expect(typeof appShellBarrel.formatRelayAccount).toBe("function");
  });
});
