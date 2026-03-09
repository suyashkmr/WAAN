import { describe, expect, it, vi } from "vitest";
import { createPanelActionDispatcher } from "../js/vue/panelActionDispatcher.js";

describe("panel action dispatcher", () => {
  it("dispatches action payloads to registered handlers", () => {
    const { setPanelActionHandlers, dispatchPanelAction, hasPanelActionHandler } = createPanelActionDispatcher();
    const handler = vi.fn();
    setPanelActionHandlers({
      "savedViews:apply-view": handler,
    });

    dispatchPanelAction("savedViews:apply-view", { viewId: "view-7" });

    expect(handler).toHaveBeenCalledWith("savedViews:apply-view", { viewId: "view-7" });
    expect(hasPanelActionHandler("savedViews:apply-view")).toBe(true);
    expect(hasPanelActionHandler("savedViews:missing")).toBe(false);
  });
});
