function resolvePrimeVueComponent(componentName, globalScope = globalThis) {
  const runtime = globalScope?.PrimeVue || globalScope?.primevue || null;
  if (!runtime) return null;
  const component = runtime?.[componentName];
  if (typeof component === "function" || (component && typeof component === "object")) return component;
  return null;
}

function normalizePrimitiveValue(value) {
  return value == null ? "" : String(value);
}

function toBoundedDate(value) {
  if (!value) return undefined;
  const normalizedValue = String(value);
  const isoDateMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = isoDateMatch
    ? new Date(
        Number(isoDateMatch[1]),
        Number(isoDateMatch[2]) - 1,
        Number(isoDateMatch[3]),
      )
    : new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDateAsIsoLocal(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : toBoundedDate(value);
  if (!date || Number.isNaN(date.getTime())) return normalizePrimitiveValue(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizePrimeDateModelValue(value, prefersDateObject = false) {
  if (prefersDateObject) return toBoundedDate(value) ?? null;
  return normalizePrimitiveValue(value);
}


function splitComponentAttrs(attrs = {}) {
  const componentAttrs = { ...attrs };
  const wrapperAttrs = {};
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (/^on[A-Z]/.test(key)) {
      wrapperAttrs[key] = value;
      delete componentAttrs[key];
    }
  });
  return { componentAttrs, wrapperAttrs };
}

function resolveOverlayTarget(globalScope = globalThis) {
  return globalScope?.document?.body ?? undefined;
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
  void globalScope;
  const resolvedChecked = modelValue !== undefined ? Object.is(modelValue, value) : Boolean(checked);
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
  } = options;

  const normalizedOptions = Array.isArray(selectOptions)
    ? selectOptions.map(option => ({
      value: normalizePrimitiveValue(option?.value),
      label: String(option?.label ?? option?.value ?? ""),
    }))
    : [];

  const PrimeSelect =
    resolvePrimeVueComponent("Select", globalScope) ??
    resolvePrimeVueComponent("Dropdown", globalScope);
  if (PrimeSelect) {
    const { componentAttrs, wrapperAttrs } = splitComponentAttrs(attrs);
    return h(
      "div",
      {
        class: "waan-prime-select-host",
        ...wrapperAttrs,
      },
      [h(PrimeSelect, {
        inputId: id,
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
      })],
    );
  }

  return h(
    "select",
    {
      id,
      disabled: Boolean(disabled),
      value: normalizePrimitiveValue(value),
      ...(onChange ? { onChange } : {}),
      ...attrs,
    },
    normalizedOptions.map(option => h("option", { value: option.value }, option.label)),
  );
}

export function renderDateInput(h, options, globalScope = globalThis) {
  const {
    id,
    value = "",
    disabled = false,
    onChange,
    attrs = {},
  } = options;
  const PrimeDatePicker = resolvePrimeVueComponent("DatePicker", globalScope);
  const PrimeCalendar = PrimeDatePicker ? null : resolvePrimeVueComponent("Calendar", globalScope);
  const PrimeDateComponent = PrimeDatePicker ?? PrimeCalendar;
  if (PrimeDateComponent) {
    const { min, max, ...restAttrs } = attrs;
    const usesCalendarFallback = Boolean(PrimeCalendar);
    return h(PrimeDateComponent, {
      inputId: id,
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
    });
  }

  return h("input", {
    type: "date",
    id,
    value: normalizePrimitiveValue(value),
    disabled: Boolean(disabled),
    ...(onChange ? { onChange } : {}),
    ...attrs,
  });
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
