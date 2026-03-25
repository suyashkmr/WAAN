import {
  formatDateAsIsoLocal,
  normalizePrimeDateModelValue,
  normalizePrimitiveValue,
  resolveOverlayTarget,
  splitComponentAttrs,
  toBoundedDate,
} from "./primevuePrimitiveUtils.js";

function resolvePrimeVueComponent(componentName, globalScope = globalThis) {
  const runtime = globalScope?.PrimeVue || globalScope?.primevue || null;
  if (!runtime) return null;
  const component = runtime?.[componentName];
  if (typeof component === "function" || (component && typeof component === "object")) return component;
  return null;
}

function allowNativePrimitiveFallback(globalScope = globalThis) {
  if (globalScope?.__WAAN_DISABLE_NATIVE_PRIMITIVE_FALLBACKS__ === true) return false;
  if (globalScope?.__WAAN_ALLOW_NATIVE_PRIMITIVE_FALLBACKS__ === true) return true;
  return Boolean(globalScope?.process?.env?.VITEST || globalThis?.process?.env?.VITEST);
}

function resolvePrimeVisibleInputId(id = "", preserveNativeElement = false) {
  return preserveNativeElement && id ? `${id}--primevue` : id;
}
export function renderActionButton(h, options = {}, globalScope = globalThis) {
  const {
    id = "",
    text = "",
    children = null,
    className = "",
    type = "button",
    disabled = false,
    onClick,
    attrs = {},
  } = options;

  const commonProps = {
    ...(id ? { id } : {}),
    ...(className ? { class: className } : {}),
    type,
    disabled: Boolean(disabled),
    ...(onClick ? { onClick } : {}),
    ...attrs,
  };

  const PrimeButton = resolvePrimeVueComponent("Button", globalScope);
  if (PrimeButton) {
    const primeProps = {
      ...commonProps,
      ...(children == null ? { label: text } : {}),
      unstyled: true,
      "data-ui-runtime": "primevue",
    };
    if (children == null) return h(PrimeButton, primeProps);
    return h(PrimeButton, primeProps, { default: () => children });
  }

  if (!allowNativePrimitiveFallback(globalScope)) {
    throw new Error("renderActionButton requires PrimeVue Button at runtime");
  }

  return h("button", commonProps, children == null ? text : children);
}

export function renderRadioInput(h, options, globalScope = globalThis) {
  const {
    id,
    name,
    value,
    checked = false,
    modelValue = undefined,
    onChange,
    attrs = {},
  } = options;
  const resolvedChecked = modelValue !== undefined ? Object.is(modelValue, value) : Boolean(checked);
  const PrimeRadioButton = resolvePrimeVueComponent("RadioButton", globalScope);
  if (PrimeRadioButton) {
    return h(PrimeRadioButton, {
      inputId: id,
      name,
      value,
      modelValue: modelValue !== undefined ? modelValue : (resolvedChecked ? value : null),
      binary: false,
      unstyled: true,
      "data-ui-runtime": "primevue",
      "onUpdate:modelValue": nextValue => {
        if (typeof onChange !== "function") return;
        const normalizedNextValue = nextValue ?? null;
        onChange({
          target: {
            value,
            checked: Object.is(normalizedNextValue, value),
          },
        });
      },
      ...attrs,
    });
  }
  if (!allowNativePrimitiveFallback(globalScope)) {
    throw new Error("renderRadioInput requires PrimeVue RadioButton at runtime");
  }
  return h("input", {
    type: "radio",
    name,
    id,
    value,
    ...(resolvedChecked ? { checked: true } : {}),
    ...(onChange ? { onChange } : {}),
    ...attrs,
  });
}

export function renderTextInput(h, options, globalScope = globalThis) {
  const {
    id,
    value = "",
    placeholder = "",
    disabled = false,
    onInput,
    attrs = {},
  } = options;
  const PrimeInputText = resolvePrimeVueComponent("InputText", globalScope);
  if (PrimeInputText) {
    return h(PrimeInputText, {
      id,
      modelValue: String(value ?? ""),
      placeholder: String(placeholder || ""),
      disabled: Boolean(disabled),
      unstyled: true,
      "data-ui-runtime": "primevue",
      "onUpdate:modelValue": nextValue => {
        if (typeof onInput !== "function") return;
        onInput({ target: { value: String(nextValue ?? "") } });
      },
      ...attrs,
    });
  }
  if (!allowNativePrimitiveFallback(globalScope)) {
    throw new Error("renderTextInput requires PrimeVue InputText at runtime");
  }
  return h("input", {
    type: "text",
    id,
    value: String(value ?? ""),
    placeholder: String(placeholder || ""),
    disabled: Boolean(disabled),
    ...(onInput ? { onInput } : {}),
    ...attrs,
  });
}

export function renderSelectInput(h, options, globalScope = globalThis) {
  const {
    id,
    value = "",
    options: selectOptions = [],
    disabled = false,
    onChange,
    attrs = {},
    preserveNativeElement = false,
    visibleInputId = "",
  } = options;
  const normalizedOptions = Array.isArray(selectOptions)
    ? selectOptions.map(option => ({
      value: normalizePrimitiveValue(option?.value),
      label: String(option?.label ?? option?.value ?? ""),
    }))
    : [];

  const PrimeSelect = resolvePrimeVueComponent("Select", globalScope) ??
    resolvePrimeVueComponent("Dropdown", globalScope);
  if (!PrimeSelect) {
    throw new Error("renderSelectInput requires PrimeVue Select/Dropdown at runtime");
  }
  const { componentAttrs, wrapperAttrs } = splitComponentAttrs(attrs);
  const resolvedVisibleInputId = visibleInputId || resolvePrimeVisibleInputId(id, preserveNativeElement);
  return h(
    "div",
    {
      class: "waan-prime-select-host",
      ...wrapperAttrs,
    },
    [
      preserveNativeElement
        ? h(
          "select",
          {
            id,
            class: "waan-native-bridge-control",
            disabled: Boolean(disabled),
            value: normalizePrimitiveValue(value),
            "aria-hidden": "true",
            tabindex: -1,
          },
          normalizedOptions.map(option => h("option", { value: option.value }, option.label)),
        )
        : null,
      h(PrimeSelect, {
        inputId: resolvedVisibleInputId,
        modelValue: normalizePrimitiveValue(value),
        options: normalizedOptions,
        optionLabel: "label",
        optionValue: "value",
        disabled: Boolean(disabled),
        appendTo: resolveOverlayTarget(globalScope),
        panelClass: "waan-prime-control-overlay waan-prime-select-overlay",
        scrollHeight: "18rem",
        unstyled: true,
        "data-ui-runtime": "primevue",
        "onUpdate:modelValue": nextValue => {
          if (typeof onChange !== "function") return;
          onChange({ target: { value: normalizePrimitiveValue(nextValue) } });
        },
        ...componentAttrs,
      }, {
        dropdownicon: () => h(
          "svg",
          {
            class: "w-4 h-4 waan-prime-select-icon",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            "aria-hidden": "true",
          },
          [
            h("path", {
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "stroke-width": "2",
              d: "M19 9l-7 7-7-7",
            }),
          ],
        ),
      }),
    ].filter(Boolean),
  );
}

export function renderDateInput(h, options, globalScope = globalThis) {
  const {
    id,
    value = "",
    disabled = false,
    onChange,
    attrs = {},
    preserveNativeElement = false,
    visibleInputId = "",
  } = options;
  const PrimeDatePicker = resolvePrimeVueComponent("DatePicker", globalScope);
  const PrimeCalendar = PrimeDatePicker ? null : resolvePrimeVueComponent("Calendar", globalScope);
  const PrimeDateComponent = PrimeDatePicker ?? PrimeCalendar;
  if (!PrimeDateComponent) {
    throw new Error("renderDateInput requires PrimeVue DatePicker/Calendar at runtime");
  }
  const { min, max, ...restAttrs } = attrs;
  const usesCalendarFallback = Boolean(PrimeCalendar);
  const resolvedVisibleInputId = visibleInputId || resolvePrimeVisibleInputId(id, preserveNativeElement);
  return h(
    "div",
    { class: "waan-prime-date-host" },
    [
      preserveNativeElement
        ? h("input", {
          type: "date",
          id,
          class: "waan-native-bridge-control",
          value: normalizePrimitiveValue(value),
          disabled: Boolean(disabled),
          min: normalizePrimitiveValue(min),
          max: normalizePrimitiveValue(max),
          "aria-hidden": "true",
          tabindex: -1,
        })
        : null,
      h(PrimeDateComponent, {
        inputId: resolvedVisibleInputId,
        modelValue: normalizePrimeDateModelValue(value, usesCalendarFallback),
        ...(usesCalendarFallback ? {} : { updateModelType: "string" }),
        dateFormat: "yy-mm-dd",
        appendTo: resolveOverlayTarget(globalScope),
        manualInput: true,
        showIcon: false,
        disabled: Boolean(disabled),
        minDate: toBoundedDate(min),
        maxDate: toBoundedDate(max),
        panelClass: "waan-prime-control-overlay waan-prime-datepicker-overlay",
        unstyled: true,
        "data-ui-runtime": "primevue",
        "onUpdate:modelValue": nextValue => {
          if (typeof onChange !== "function") return;
          onChange({ target: { value: formatDateAsIsoLocal(nextValue) } });
        },
        ...restAttrs,
      }),
    ].filter(Boolean),
  );
}

export function renderDialogContainer(h, options = {}, globalScope = globalThis) {
  const {
    id = "",
    className = "",
    label = "",
    attrs = {},
    children = [],
  } = options;

  const PrimeDialog = resolvePrimeVueComponent("Dialog", globalScope);
  if (PrimeDialog) {
    return h(
      PrimeDialog,
      {
        ...(id ? { id } : {}),
        ...(className ? { class: className } : {}),
        visible: true,
        appendTo: "self",
        modal: false,
        closable: false,
        draggable: false,
        resizable: false,
        dismissableMask: false,
        unstyled: true,
        "data-ui-runtime": "primevue",
        ...attrs,
      },
      {
        default: () => children,
        ...(label ? { header: () => label } : {}),
      },
    );
  }

  if (!allowNativePrimitiveFallback(globalScope)) {
    throw new Error("renderDialogContainer requires PrimeVue Dialog at runtime");
  }
  return h(
    "div",
    {
      ...(id ? { id } : {}),
      ...(className ? { class: className } : {}),
      role: "dialog",
      "aria-modal": "true",
      ...(label ? { "aria-label": label } : {}),
      ...attrs,
    },
    children,
  );
}
