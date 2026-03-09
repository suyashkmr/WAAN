import { describe, expect, it, vi } from "vitest";
import {
  renderActionButton,
  renderRadioInput,
  renderTextInput,
  renderSelectInput,
  renderDateInput,
  renderDialogContainer,
} from "../js/vue/primevueRenderPrimitives.js";

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

  it("renders native radio input even when PrimeVue runtime is available", () => {
    const PrimeRadioButton = { name: "PrimeRadioButtonStub" };
    const globalScope = { PrimeVue: { RadioButton: PrimeRadioButton } };
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderRadioInput(h, {
      id: "theme-system",
      name: "theme-option",
      value: "system",
      checked: true,
      onChange: () => {},
    }, globalScope);

    expect(vnode.type).toBe("input");
    expect(vnode.props.type).toBe("radio");
    expect(vnode.props.id).toBe("theme-system");
    expect(vnode.props.name).toBe("theme-option");
    expect(vnode.props.value).toBe("system");
    expect(vnode.props.checked).toBe(true);
  });

  it("derives checked state from modelValue in controlled mode", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const checkedNode = renderRadioInput(h, {
      id: "numeric-one",
      name: "numeric-option",
      value: 1,
      modelValue: 1,
      onChange: vi.fn(),
    }, { PrimeVue: { RadioButton: { name: "PrimeRadioButtonStub" } } });
    const uncheckedNode = renderRadioInput(h, {
      id: "numeric-two",
      name: "numeric-option",
      value: 2,
      modelValue: 1,
      onChange: vi.fn(),
    }, { PrimeVue: { RadioButton: { name: "PrimeRadioButtonStub" } } });

    expect(checkedNode.props.checked).toBe(true);
    expect(uncheckedNode.props.checked).toBeUndefined();
  });

  it("falls back to native radio input when PrimeVue RadioButton is unavailable", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderRadioInput(h, {
      id: "theme-dark",
      name: "theme-option",
      value: "dark",
      checked: false,
      onChange: () => {},
    }, { PrimeVue: {} });

    expect(vnode.type).toBe("input");
    expect(vnode.props.type).toBe("radio");
    expect(vnode.props.id).toBe("theme-dark");
    expect(vnode.props.name).toBe("theme-option");
    expect(vnode.props.value).toBe("dark");
  });

  it("renders PrimeVue InputText and maps model updates to input events", () => {
    const PrimeInputText = { name: "PrimeInputTextStub" };
    const globalScope = { PrimeVue: { InputText: PrimeInputText } };
    let captured = "";
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderTextInput(h, {
      id: "search-keyword",
      value: "launch",
      placeholder: "e.g. launch plan",
      onInput: event => {
        captured = String(event?.target?.value || "");
      },
    }, globalScope);

    expect(vnode.type).toBe(PrimeInputText);
    expect(vnode.props.modelValue).toBe("launch");
    expect(vnode.props["data-ui-runtime"]).toBe("primevue");
    vnode.props["onUpdate:modelValue"]("new value");
    expect(captured).toBe("new value");
  });

  it("falls back to native text input when PrimeVue InputText is unavailable", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderTextInput(h, {
      id: "search-keyword",
      value: "x",
    }, { PrimeVue: {} });
    expect(vnode.type).toBe("input");
    expect(vnode.props.type).toBe("text");
    expect(vnode.props.id).toBe("search-keyword");
    expect(vnode.props.value).toBe("x");
  });

  it("renders native select even when PrimeVue Select is available", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderSelectInput(h, {
      id: "search-participant",
      value: "",
      options: [
        { value: "", label: "All participants" },
        { value: "ana", label: "Ana" },
      ],
    }, { PrimeVue: { Select: { name: "PrimeSelectStub" } } });

    expect(vnode.type).toBe("select");
    expect(vnode.props.id).toBe("search-participant");
    expect(vnode.children).toHaveLength(2);
  });

  it("renders native date input even when PrimeVue DatePicker is available", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderDateInput(h, {
      id: "search-end",
      value: "2026-03-10",
    }, { PrimeVue: { DatePicker: { name: "PrimeDatePickerStub" } } });

    expect(vnode.type).toBe("input");
    expect(vnode.props.type).toBe("date");
    expect(vnode.props.id).toBe("search-end");
    expect(vnode.props.value).toBe("2026-03-10");
  });

  it("renders PrimeVue Dialog container when runtime component is available", () => {
    const PrimeDialog = { name: "PrimeDialogStub" };
    const globalScope = { PrimeVue: { Dialog: PrimeDialog } };
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const child = h("p", {}, "Body");
    const vnode = renderDialogContainer(h, {
      className: "onboarding-panel",
      label: "Welcome to WAAN",
      children: [child],
    }, globalScope);

    expect(vnode.type).toBe(PrimeDialog);
    expect(vnode.props.visible).toBe(true);
    expect(vnode.props.appendTo).toBe("self");
    expect(vnode.props.unstyled).toBe(true);
    expect(vnode.props["data-ui-runtime"]).toBe("primevue");
    expect(typeof vnode.children.default).toBe("function");
  });

  it("falls back to native dialog container when PrimeVue Dialog is unavailable", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderDialogContainer(h, {
      className: "onboarding-panel",
      label: "Welcome to WAAN",
      children: [],
    }, { PrimeVue: {} });

    expect(vnode.type).toBe("div");
    expect(vnode.props.role).toBe("dialog");
    expect(vnode.props["aria-modal"]).toBe("true");
    expect(vnode.props["aria-label"]).toBe("Welcome to WAAN");
  });
});
