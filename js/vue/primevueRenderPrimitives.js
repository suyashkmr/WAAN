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
    return h(PrimeButton, {
      ...commonProps,
      label: text,
      unstyled: true,
      "data-ui-runtime": "primevue",
    });
  }

  return h("button", commonProps, text);
}
