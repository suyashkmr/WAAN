/**
 * @param {string} componentName
 * @param {any} [globalScope]
 * @returns {any | null}
 */
function resolvePrimeVueComponent(componentName, globalScope = globalThis) {
  const runtime = globalScope?.PrimeVue || globalScope?.primevue || null;
  if (!runtime) return null;
  const component = runtime?.[componentName];
  if (typeof component === "function" || (component && typeof component === "object")) {
    return component;
  }
  return null;
}

/**
 * Render an action button using PrimeVue `Button` when available.
 * Falls back to native `button` for runtimes/tests that do not expose PrimeVue components.
 *
 * @param {any} h
 * @param {{
 *   id?: string,
 *   text?: string,
 *   children?: any,
 *   className?: string,
 *   type?: "button" | "submit" | "reset",
 *   disabled?: boolean,
 *   onClick?: ((event: any) => void) | undefined,
 *   attrs?: Record<string, any>,
 * }} options
 * @param {any} [globalScope]
 * @returns {any}
 */
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
    return h(PrimeButton, primeProps, {
      default: () => children,
    });
  }

  return h("button", commonProps, children == null ? text : children);
}

/**
 * Render a radio input using PrimeVue `RadioButton` when available.
 * Falls back to native `input[type=radio]` for partial runtimes/tests.
 *
 * @param {any} h
 * @param {{
 *   id: string,
 *   name: string,
 *   value: string,
 *   checked?: boolean,
 *   onChange?: ((event: any) => void) | undefined,
 *   attrs?: Record<string, any>,
 * }} options
 * @param {any} [globalScope]
 * @returns {any}
 */
export function renderRadioInput(h, options, globalScope = globalThis) {
  const {
    id,
    name,
    value,
    checked = false,
    onChange,
    attrs = {},
  } = options;
  const PrimeRadioButton = resolvePrimeVueComponent("RadioButton", globalScope);
  if (PrimeRadioButton) {
    const selectedValue = checked ? value : null;
    return h(PrimeRadioButton, {
      inputId: id,
      name,
      value,
      modelValue: selectedValue,
      defaultValue: selectedValue,
      unstyled: true,
      "data-ui-runtime": "primevue",
      "onUpdate:modelValue": nextValue => {
        if (typeof onChange !== "function") return;
        onChange({
          target: {
            checked: nextValue === value,
            value,
          },
        });
      },
      ...attrs,
    });
  }
  return h("input", {
    type: "radio",
    name,
    id,
    value,
    ...(checked ? { checked: true } : {}),
    ...(onChange ? { onChange } : {}),
    ...attrs,
  });
}

/**
 * Render a text input using PrimeVue `InputText` when available.
 *
 * @param {any} h
 * @param {{
 *   id: string,
 *   value?: string,
 *   placeholder?: string,
 *   disabled?: boolean,
 *   onInput?: ((event: any) => void) | undefined,
 *   attrs?: Record<string, any>,
 * }} options
 * @param {any} [globalScope]
 * @returns {any}
 */
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
        onInput({
          target: {
            value: String(nextValue ?? ""),
          },
        });
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

/**
 * Render a select input using PrimeVue `Select` (or legacy `Dropdown`) when available.
 *
 * @param {any} h
 * @param {{
 *   id: string,
 *   value?: string,
 *   options?: Array<{ value: string, label: string }>,
 *   disabled?: boolean,
 *   onChange?: ((event: any) => void) | undefined,
 *   attrs?: Record<string, any>,
 * }} options
 * @param {any} [globalScope]
 * @returns {any}
 */
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
      value: String(option?.value ?? ""),
      label: String(option?.label ?? option?.value ?? ""),
    }))
    : [];
  const PrimeSelect = resolvePrimeVueComponent("Select", globalScope)
    || resolvePrimeVueComponent("Dropdown", globalScope);
  if (PrimeSelect) {
    return h(PrimeSelect, {
      inputId: id,
      options: normalizedOptions,
      optionLabel: "label",
      optionValue: "value",
      modelValue: String(value ?? ""),
      disabled: Boolean(disabled),
      unstyled: true,
      "data-ui-runtime": "primevue",
      "onUpdate:modelValue": nextValue => {
        if (typeof onChange !== "function") return;
        onChange({
          target: {
            value: String(nextValue ?? ""),
          },
        });
      },
      ...attrs,
    });
  }
  return h(
    "select",
    {
      id,
      disabled: Boolean(disabled),
      value: String(value ?? ""),
      ...(onChange ? { onChange } : {}),
      ...attrs,
    },
    normalizedOptions.map(option =>
      h("option", { value: option.value }, option.label)),
  );
}

/**
 * Render a date input using PrimeVue `DatePicker` (or legacy `Calendar`) when available.
 *
 * @param {any} h
 * @param {{
 *   id: string,
 *   value?: string,
 *   disabled?: boolean,
 *   onChange?: ((event: any) => void) | undefined,
 *   attrs?: Record<string, any>,
 * }} options
 * @param {any} [globalScope]
 * @returns {any}
 */
export function renderDateInput(h, options, globalScope = globalThis) {
  const {
    id,
    value = "",
    disabled = false,
    onChange,
    attrs = {},
  } = options;
  const PrimeDatePicker = resolvePrimeVueComponent("DatePicker", globalScope)
    || resolvePrimeVueComponent("Calendar", globalScope);
  if (PrimeDatePicker) {
    const hasValue = String(value || "").length > 0;
    return h(PrimeDatePicker, {
      inputId: id,
      modelValue: hasValue ? new Date(`${value}T00:00:00`) : null,
      dateFormat: "yy-mm-dd",
      manualInput: false,
      disabled: Boolean(disabled),
      unstyled: true,
      "data-ui-runtime": "primevue",
      "onUpdate:modelValue": nextValue => {
        if (typeof onChange !== "function") return;
        const date = nextValue instanceof Date ? nextValue : null;
        const normalized = date
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
          : "";
        onChange({
          target: {
            value: normalized,
          },
        });
      },
      ...attrs,
    });
  }
  return h("input", {
    type: "date",
    id,
    value: String(value || ""),
    disabled: Boolean(disabled),
    ...(onChange ? { onChange } : {}),
    ...attrs,
  });
}

/**
 * Render a dialog container using PrimeVue `Dialog` when available.
 * Falls back to a semantic `div` dialog container in partial runtimes/tests.
 *
 * @param {any} h
 * @param {{
 *   id?: string,
 *   className?: string,
 *   label?: string,
 *   attrs?: Record<string, any>,
 *   children?: any,
 * }} options
 * @param {any} [globalScope]
 * @returns {any}
 */
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
