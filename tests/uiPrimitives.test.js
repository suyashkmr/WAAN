import { describe, it, expect } from "vitest";
import {
  applyShoelaceRuntimeState,
  createUiButton,
  createUiInput,
  createUiSelect,
  createUiDialog,
  createUiTooltip,
  createUiTabs,
  createUiCard,
} from "../js/ui/primitives.js";

describe("ui primitives", () => {
  it("syncs shoelace theme/motion/contrast state", () => {
    document.documentElement.dataset.colorScheme = "light";
    document.body.dataset.reduceMotion = "true";
    document.body.dataset.contrast = "high";

    applyShoelaceRuntimeState();

    expect(document.documentElement.classList.contains("sl-theme-light")).toBe(true);
    expect(document.documentElement.classList.contains("sl-theme-dark")).toBe(false);
    expect(document.documentElement.dataset.slMotion).toBe("reduced");
    expect(document.documentElement.dataset.slContrast).toBe("high");
  });

  it("creates core shoelace primitives", () => {
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

    expect(button.tagName.toLowerCase()).toBe("sl-button");
    expect(input.tagName.toLowerCase()).toBe("sl-input");
    expect(select.tagName.toLowerCase()).toBe("sl-select");
    expect(dialog.tagName.toLowerCase()).toBe("sl-dialog");
    expect(tooltip.tagName.toLowerCase()).toBe("sl-tooltip");
    expect(tabs.tagName.toLowerCase()).toBe("sl-tab-group");
    expect(card.tagName.toLowerCase()).toBe("sl-card");
    expect(select.querySelectorAll("sl-option")).toHaveLength(2);
    expect(tabs.querySelectorAll("sl-tab")).toHaveLength(2);
    expect(tabs.querySelectorAll("sl-tab-panel")).toHaveLength(2);
  });
});
