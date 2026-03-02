import { describe, it, expect } from "vitest";
import {
  applyUiRuntimeState,
  createUiButton,
  createUiInput,
  createUiSelect,
  createUiDialog,
  createUiTooltip,
  createUiTabs,
  createUiCard,
} from "../js/ui/primitives.js";

describe("ui primitives", () => {
  it("syncs runtime theme/motion/contrast state", () => {
    document.documentElement.dataset.colorScheme = "light";
    document.body.dataset.reduceMotion = "true";
    document.body.dataset.contrast = "high";

    applyUiRuntimeState();

    expect(document.documentElement.classList.contains("app-theme-light")).toBe(true);
    expect(document.documentElement.classList.contains("app-theme-dark")).toBe(false);
    expect(document.documentElement.dataset.uiMotion).toBe("reduced");
    expect(document.documentElement.dataset.uiContrast).toBe("high");
  });

  it("creates core semantic primitives", () => {
    const button = createUiButton({ text: "Save", variant: "primary" });
    const input = createUiInput({ placeholder: "Search" });
    const select = createUiSelect({
      options: [
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
      ],
    });
    const dialog = createUiDialog({ label: "Confirm", body: "Proceed?" });
    const target = document.createElement("button");
    target.textContent = "Hover";
    const tooltip = createUiTooltip({ content: "Info", target });
    const tabs = createUiTabs({
      tabs: [
        { id: "overview", label: "Overview", content: "Overview panel" },
        { id: "details", label: "Details", content: "Details panel" },
      ],
    });
    const card = createUiCard({ header: "Header", body: "Body", footer: "Footer" });

    expect(button.tagName.toLowerCase()).toBe("button");
    expect(input.tagName.toLowerCase()).toBe("input");
    expect(select.tagName.toLowerCase()).toBe("select");
    expect(dialog.tagName.toLowerCase()).toBe("div");
    expect(tooltip.tagName.toLowerCase()).toBe("span");
    expect(tabs.tagName.toLowerCase()).toBe("div");
    expect(card.tagName.toLowerCase()).toBe("section");
    expect(select.querySelectorAll("option")).toHaveLength(2);
    expect(tabs.querySelectorAll(".ui-tab")).toHaveLength(2);
    expect(tabs.querySelectorAll(".ui-tab-panel")).toHaveLength(2);
  });
});
