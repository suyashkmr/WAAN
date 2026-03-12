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

  it("falls back to native button vnode only in explicit fallback mode", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderActionButton(h, {
      id: "reset-search",
      text: "Clear filters",
      className: "ghost-button",
      type: "button",
    }, { PrimeVue: {}, __WAAN_ALLOW_NATIVE_PRIMITIVE_FALLBACKS__: true });

    expect(vnode.type).toBe("button");
    expect(vnode.props.id).toBe("reset-search");
    expect(vnode.children).toBe("Clear filters");
  });

  it("preserves disabled/onClick/attrs in explicit fallback native button path", () => {
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
    }, { PrimeVue: {}, __WAAN_ALLOW_NATIVE_PRIMITIVE_FALLBACKS__: true });

    expect(vnode.type).toBe("button");
    expect(vnode.props.disabled).toBe(true);
    expect(vnode.props.onClick).toBe(clickHandler);
    expect(vnode.props["aria-label"]).toBe("Pause relay");
    expect(vnode.props["data-action"]).toBe("relay.stop");
  });

  it("renders PrimeVue RadioButton when runtime component is available", () => {
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

    expect(vnode.type).toBe(PrimeRadioButton);
    expect(vnode.props.inputId).toBe("theme-system");
    expect(vnode.props.name).toBe("theme-option");
    expect(vnode.props.value).toBe("system");
    expect(vnode.props.modelValue).toBe("system");
    expect(vnode.props["data-ui-runtime"]).toBe("primevue");
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

    expect(checkedNode.props.modelValue).toBe(1);
    expect(uncheckedNode.props.modelValue).toBe(1);
  });

  it("falls back to native radio input only in explicit fallback mode", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderRadioInput(h, {
      id: "theme-dark",
      name: "theme-option",
      value: "dark",
      checked: false,
      onChange: () => {},
    }, { PrimeVue: {}, __WAAN_ALLOW_NATIVE_PRIMITIVE_FALLBACKS__: true });

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

  it("falls back to native text input only in explicit fallback mode", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderTextInput(h, {
      id: "search-keyword",
      value: "x",
    }, { PrimeVue: {}, __WAAN_ALLOW_NATIVE_PRIMITIVE_FALLBACKS__: true });
    expect(vnode.type).toBe("input");
    expect(vnode.props.type).toBe("text");
    expect(vnode.props.id).toBe("search-keyword");
    expect(vnode.props.value).toBe("x");
  });

  it("preserves non-change select handlers via the PrimeVue host wrapper", () => {
    const PrimeSelect = { name: "PrimeSelectStub" };
    const globalScope = { PrimeVue: { Select: PrimeSelect }, document: { body: { nodeType: 1 } } };
    const onDblclick = vi.fn();
    const onKeydown = vi.fn();
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderSelectInput(h, {
      id: "chat-selector",
      value: "chat-1",
      options: [
        { value: "", label: "Loaded chats" },
        { value: "chat-1", label: "Chat 1" },
      ],
      attrs: {
        onDblclick,
        onKeydown,
      },
    }, globalScope);

    expect(vnode.type).toBe("div");
    expect(vnode.props.onDblclick).toBe(onDblclick);
    expect(vnode.props.onKeydown).toBe(onKeydown);
    expect(vnode.children[0].type).toBe(PrimeSelect);
    expect(vnode.children[0].props.onDblclick).toBeUndefined();
    expect(vnode.children[0].props.onKeydown).toBeUndefined();
  });

  it("preserves a hidden native select when requested for DOM-driven bridges", () => {
    const PrimeSelect = { name: "PrimeSelectStub" };
    const globalScope = { PrimeVue: { Select: PrimeSelect }, document: { body: { nodeType: 1 } } };
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderSelectInput(h, {
      id: "global-range",
      preserveNativeElement: true,
      value: "all",
      options: [
        { value: "all", label: "All time" },
        { value: "30", label: "Last 30 days" },
      ],
    }, globalScope);

    expect(vnode.type).toBe("div");
    expect(vnode.children).toHaveLength(2);
    expect(vnode.children[0].type).toBe("select");
    expect(vnode.children[0].props.id).toBe("global-range");
    expect(vnode.children[0].props.class).toBe("waan-native-bridge-control");
    expect(vnode.children[1].type).toBe(PrimeSelect);
    expect(vnode.children[1].props.inputId).toBe("global-range--primevue");
  });

  it("renders PrimeVue Select and maps model updates to change events", () => {
    const PrimeSelect = { name: "PrimeSelectStub" };
    let captured = "";
    const globalScope = { PrimeVue: { Select: PrimeSelect }, document: { body: { nodeType: 1 } } };
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderSelectInput(h, {
      id: "search-participant",
      value: "",
      options: [
        { value: "", label: "All participants" },
        { value: "ana", label: "Ana" },
      ],
      onChange: event => {
        captured = String(event?.target?.value || "");
      },
    }, globalScope);

    expect(vnode.type).toBe("div");
    expect(vnode.props.class).toBe("waan-prime-select-host");
    expect(vnode.children[0].type).toBe(PrimeSelect);
    expect(vnode.children[0].props.inputId).toBe("search-participant");
    expect(vnode.children[0].props.optionLabel).toBe("label");
    expect(vnode.children[0].props.optionValue).toBe("value");
    expect(vnode.children[0].props.appendTo).toBe(globalScope.document.body);
    expect(vnode.children[0].props.panelClass).toContain("waan-prime-select-overlay");
    expect(vnode.children[0].props["data-ui-runtime"]).toBe("primevue");
    vnode.children[0].props["onUpdate:modelValue"]("ana");
    expect(captured).toBe("ana");
  });

  it("renders PrimeVue DatePicker and maps ISO bounds + model updates", () => {
    const PrimeDatePicker = { name: "PrimeDatePickerStub" };
    let captured = "";
    const globalScope = { PrimeVue: { DatePicker: PrimeDatePicker }, document: { body: { nodeType: 1 } } };
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderDateInput(h, {
      id: "search-end",
      value: "2026-03-10",
      onChange: event => {
        captured = String(event?.target?.value || "");
      },
      attrs: {
        min: "2026-01-01",
        max: "2026-12-31",
      },
    }, globalScope);

    expect(vnode.type).toBe("div");
    expect(vnode.children[0].type).toBe(PrimeDatePicker);
    expect(vnode.children[0].props.inputId).toBe("search-end");
    expect(vnode.children[0].props.modelValue).toBe("2026-03-10");
    expect(vnode.children[0].props.updateModelType).toBe("string");
    expect(vnode.children[0].props.dateFormat).toBe("yy-mm-dd");
    expect(vnode.children[0].props.appendTo).toBe(globalScope.document.body);
    expect(vnode.children[0].props.panelClass).toContain("waan-prime-datepicker-overlay");
    expect(vnode.children[0].props.minDate instanceof Date).toBe(true);
    expect(vnode.children[0].props.maxDate instanceof Date).toBe(true);
    expect(vnode.children[0].props["data-ui-runtime"]).toBe("primevue");
    vnode.children[0].props["onUpdate:modelValue"]("2026-03-21");
    expect(captured).toBe("2026-03-21");
  });

  it("normalizes PrimeVue Calendar fallback to local ISO values", () => {
    const PrimeCalendar = { name: "PrimeCalendarStub" };
    let captured = "";
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderDateInput(h, {
      id: "search-start",
      value: "2026-03-10",
      onChange: event => {
        captured = String(event?.target?.value || "");
      },
      attrs: {
        min: "2026-03-01",
        max: "2026-03-31",
      },
    }, { PrimeVue: { Calendar: PrimeCalendar } });

    expect(vnode.type).toBe("div");
    expect(vnode.children[0].type).toBe(PrimeCalendar);
    expect(vnode.children[0].props.modelValue instanceof Date).toBe(true);
    expect(vnode.children[0].props.updateModelType).toBeUndefined();
    expect(vnode.children[0].props.modelValue.getFullYear()).toBe(2026);
    expect(vnode.children[0].props.modelValue.getMonth()).toBe(2);
    expect(vnode.children[0].props.modelValue.getDate()).toBe(10);

    vnode.children[0].props["onUpdate:modelValue"](new Date(2026, 2, 21));
    expect(captured).toBe("2026-03-21");
  });

  it("parses ISO date bounds in local calendar time", () => {
    const PrimeDatePicker = { name: "PrimeDatePickerStub" };
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderDateInput(h, {
      id: "search-start",
      value: "2026-01-15",
      attrs: {
        min: "2026-01-01",
        max: "2026-01-31",
      },
    }, { PrimeVue: { DatePicker: PrimeDatePicker } });

    expect(vnode.children[0].props.minDate.getFullYear()).toBe(2026);
    expect(vnode.children[0].props.minDate.getMonth()).toBe(0);
    expect(vnode.children[0].props.minDate.getDate()).toBe(1);
    expect(vnode.children[0].props.maxDate.getFullYear()).toBe(2026);
    expect(vnode.children[0].props.maxDate.getMonth()).toBe(0);
    expect(vnode.children[0].props.maxDate.getDate()).toBe(31);
  });

  it("preserves a hidden native date input when requested for DOM-driven bridges", () => {
    const PrimeDatePicker = { name: "PrimeDatePickerStub" };
    const globalScope = { PrimeVue: { DatePicker: PrimeDatePicker }, document: { body: { nodeType: 1 } } };
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderDateInput(h, {
      id: "custom-start",
      preserveNativeElement: true,
      value: "2026-03-10",
      attrs: {
        min: "2026-03-01",
        max: "2026-03-31",
      },
    }, globalScope);

    expect(vnode.type).toBe("div");
    expect(vnode.props.class).toBe("waan-prime-date-host");
    expect(vnode.children).toHaveLength(2);
    expect(vnode.children[0].type).toBe("input");
    expect(vnode.children[0].props.id).toBe("custom-start");
    expect(vnode.children[0].props.type).toBe("date");
    expect(vnode.children[0].props.class).toBe("waan-native-bridge-control");
    expect(vnode.children[1].type).toBe(PrimeDatePicker);
    expect(vnode.children[1].props.inputId).toBe("custom-start--primevue");
  });

  it("requires PrimeVue components at runtime when fallback mode is disabled", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const runtimeWithoutFallback = { PrimeVue: {}, __WAAN_DISABLE_NATIVE_PRIMITIVE_FALLBACKS__: true };

    expect(() =>
      renderActionButton(h, {
        id: "native-button",
        text: "Native",
      }, runtimeWithoutFallback),
    ).toThrow(/PrimeVue Button/);

    expect(() =>
      renderRadioInput(h, {
        id: "native-radio",
        name: "mode",
        value: "a",
      }, runtimeWithoutFallback),
    ).toThrow(/PrimeVue RadioButton/);

    expect(() =>
      renderTextInput(h, {
        id: "native-text",
        value: "x",
      }, runtimeWithoutFallback),
    ).toThrow(/PrimeVue InputText/);

    expect(() =>
      renderSelectInput(h, {
        id: "native-select",
        value: "all",
        options: [{ value: "all", label: "All time" }],
      }, runtimeWithoutFallback),
    ).toThrow(/PrimeVue Select\/Dropdown/);

    expect(() =>
      renderDateInput(h, {
        id: "native-date",
        value: "2026-03-10",
      }, runtimeWithoutFallback),
    ).toThrow(/PrimeVue DatePicker\/Calendar/);

    expect(() =>
      renderDialogContainer(h, {
        className: "native-dialog",
      }, runtimeWithoutFallback),
    ).toThrow(/PrimeVue Dialog/);
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

  it("falls back to native dialog container only in explicit fallback mode", () => {
    const h = (type, props = {}, children = []) => ({ type, props, children });
    const vnode = renderDialogContainer(h, {
      className: "onboarding-panel",
      label: "Welcome to WAAN",
      children: [],
    }, { PrimeVue: {}, __WAAN_ALLOW_NATIVE_PRIMITIVE_FALLBACKS__: true });

    expect(vnode.type).toBe("div");
    expect(vnode.props.role).toBe("dialog");
    expect(vnode.props["aria-modal"]).toBe("true");
    expect(vnode.props["aria-label"]).toBe("Welcome to WAAN");
  });
});
