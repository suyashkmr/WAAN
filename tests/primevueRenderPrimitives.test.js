import { describe, expect, it } from "vitest";
import { renderActionButton } from "../js/vue/primevueRenderPrimitives.js";

describe("primevue render primitives", () => {
  it("renders PrimeVue Button vnode when runtime component is available", () => {
    const PrimeButton = { name: "PrimeButtonStub" };
    const globalScope = { PrimeVue: { Button: PrimeButton } };
    const h = (type, props = {}, children = []) => ({ type, props, children });

    const vnode = renderActionButton(h, {
      id: "run-search",
      text: "Search messages",
      className: "ghost-button",
      type: "submit",
    }, globalScope);

    expect(vnode.type).toBe(PrimeButton);
    expect(vnode.props.id).toBe("run-search");
    expect(vnode.props.label).toBe("Search messages");
    expect(vnode.props.unstyled).toBe(true);
    expect(vnode.props["data-ui-runtime"]).toBe("primevue");
  });

  it("renders PrimeVue Button default slot when children are provided", () => {
    const PrimeButton = { name: "PrimeButtonStub" };
    const globalScope = { PrimeVue: { Button: PrimeButton } };
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const childNode = h("span", { class: "child" }, "x");
    const vnode = renderActionButton(h, {
      className: "ghost-button",
      children: [childNode],
    }, globalScope);

    expect(vnode.type).toBe(PrimeButton);
    expect(vnode.props.label).toBeUndefined();
    expect(typeof vnode.children.default).toBe("function");
    expect(vnode.children.default()).toEqual([childNode]);
  });

  it("falls back to native button vnode when PrimeVue Button is unavailable", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderActionButton(h, {
      id: "reset-search",
      text: "Clear filters",
      className: "ghost-button",
      type: "button",
    }, { PrimeVue: {} });

    expect(vnode.type).toBe("button");
    expect(vnode.props.id).toBe("reset-search");
    expect(vnode.children).toBe("Clear filters");
  });

  it("preserves disabled/onClick/attrs in fallback native button path", () => {
    const clickHandler = () => {};
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderActionButton(h, {
      id: "relay-stop",
      text: "Pause Relay",
      className: "ghost-button",
      disabled: true,
      onClick: clickHandler,
      attrs: {
        "aria-label": "Pause relay",
        "data-action": "relay.stop",
      },
    }, { PrimeVue: {} });

    expect(vnode.type).toBe("button");
    expect(vnode.props.disabled).toBe(true);
    expect(vnode.props.onClick).toBe(clickHandler);
    expect(vnode.props["aria-label"]).toBe("Pause relay");
    expect(vnode.props["data-action"]).toBe("relay.stop");
  });
});
