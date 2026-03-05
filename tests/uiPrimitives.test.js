import { describe, it, expect } from "vitest";
import { applyUiRuntimeState } from "../js/ui/primitivesRuntime.js";
import { createVuePrimitiveComposables } from "../js/ui/primitivesVueComposables.js";

describe("ui primitives", () => {
  it("syncs runtime theme/motion/contrast state", () => {
    document.documentElement.dataset.colorScheme = "light";
    document.body.dataset.reduceMotion = "true";
    document.body.dataset.contrast = "high";

    applyUiRuntimeState({
      root: document.documentElement,
      body: document.body,
    });

    expect(document.documentElement.classList.contains("app-theme-light")).toBe(true);
    expect(document.documentElement.classList.contains("app-theme-dark")).toBe(false);
    expect(document.documentElement.dataset.uiMotion).toBe("reduced");
    expect(document.documentElement.dataset.uiContrast).toBe("high");
  });

  it("provides Vue composable wrappers with PrimeVue-aware card rendering", () => {
    const h = (type, props, children) => ({ type, props: props || {}, children });
    const PrimeCard = { name: "PrimeCardStub" };
    const windowRef = {
      Vue: { h },
      PrimeVue: { Card: PrimeCard },
    };
    const composables = createVuePrimitiveComposables({ windowRef });

    expect(composables).toBeTruthy();
    const buttonNode = composables.useUiButton({ text: "Save", variant: "primary", disabled: true });
    const inputNode = composables.useUiInput({ id: "search", placeholder: "Search…" });
    const selectNode = composables.useUiSelect({
      id: "filter",
      options: [{ value: "a", label: "A" }],
    });
    const dialogNode = composables.useUiDialog({ id: "confirm", label: "Confirm" }, ["Body"]);
    const tooltipNode = composables.useUiTooltip({ content: "Info" }, buttonNode);
    const tabsNode = composables.useUiTabs({
      tabs: [{ id: "overview", label: "Overview", content: "Overview body" }],
    });
    const cardNode = composables.useUiCard({ id: "card", header: "Header", body: "Body", footer: "Footer" });

    expect(buttonNode.type).toBe("button");
    expect(buttonNode.props.disabled).toBe(true);
    expect(inputNode.type).toBe("input");
    expect(selectNode.type).toBe("select");
    expect(dialogNode.type).toBe("div");
    expect(tooltipNode.type).toBe("span");
    expect(tabsNode.type).toBe("div");
    expect(cardNode.type).toBe(PrimeCard);
    expect(cardNode.props["data-ui-runtime"]).toBe("primevue");
  });
});
