/**
 * @param {Window | null | undefined} windowRef
 */
function resolvePrimeVueRuntime(windowRef) {
  return windowRef?.PrimeVue || windowRef?.primevue || null;
}

/**
 * Vue composable-style primitive wrappers for migrated Vue/PrimeVue surfaces.
 * These helpers return VNodes and keep fallback behavior framework-neutral.
 *
 * @param {{ windowRef?: Window | null }} [params]
 */
export function createVuePrimitiveComposables({
  windowRef = globalThis.window ?? null,
} = {}) {
  const VueRuntime = windowRef?.Vue || globalThis.Vue || null;
  if (!VueRuntime?.h) return null;
  const h = VueRuntime.h;
  const primeVueRuntime = resolvePrimeVueRuntime(windowRef);
  const PrimeCard = primeVueRuntime?.Card ?? null;

  return {
    useUiButton({ text = "", id = "", variant = "default", disabled = false } = {}) {
      const className = variant && variant !== "default" ? `ui-button ui-button-${variant}` : "ui-button";
      return h(
        "button",
        {
          type: "button",
          id: id || undefined,
          class: className,
          disabled: Boolean(disabled),
        },
        text,
      );
    },
    useUiInput({ id = "", type = "text", value = "", placeholder = "" } = {}) {
      return h("input", {
        id: id || undefined,
        class: "ui-input",
        type,
        value: String(value ?? ""),
        placeholder: String(placeholder || ""),
      });
    },
    useUiSelect({ id = "", value = "", options = [] } = {}) {
      return h(
        "select",
        {
          id: id || undefined,
          class: "ui-select",
          value: String(value ?? ""),
        },
        (Array.isArray(options) ? options : []).map(option =>
          h("option", { value: String(option?.value ?? "") }, String(option?.label ?? option?.value ?? "")),
        ),
      );
    },
    useUiDialog({ id = "", label = "" } = {}, children = []) {
      return h(
        "div",
        {
          id: id || undefined,
          class: "ui-dialog",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": label || undefined,
        },
        children,
      );
    },
    useUiTooltip({ content = "" } = {}, child = null) {
      return h(
        "span",
        {
          class: "ui-tooltip",
          role: "tooltip",
          "data-content": content || undefined,
        },
        child ? [child] : [],
      );
    },
    useUiTabs({ id = "", tabs = [] } = {}) {
      const safeTabs = Array.isArray(tabs) ? tabs : [];
      return h("div", { id: id || undefined, class: "ui-tabs" }, [
        h(
          "div",
          { class: "ui-tabs-nav" },
          safeTabs.map((tab, index) =>
            h(
              "button",
              {
                type: "button",
                class: "ui-tab",
                "data-panel": String(tab?.id ?? `tab-${index + 1}`),
                "aria-selected": index === 0 ? "true" : undefined,
              },
              String(tab?.label ?? tab?.id ?? `Tab ${index + 1}`),
            ),
          ),
        ),
        h(
          "div",
          { class: "ui-tabs-panels" },
          safeTabs.map((tab, index) =>
            h(
              "section",
              {
                class: "ui-tab-panel",
                "data-name": String(tab?.id ?? `tab-${index + 1}`),
              },
              String(tab?.content ?? ""),
            ),
          ),
        ),
      ]);
    },
    useUiCard({ id = "", header = "", body = "", footer = "", className = "" } = {}) {
      if (PrimeCard) {
        return h(
          PrimeCard,
          {
            id: id || undefined,
            class: ["ui-card", className].filter(Boolean).join(" "),
            "data-ui-runtime": "primevue",
          },
          {
            title: () => (header ? h("span", header) : null),
            content: () => [body ? h("div", { class: "ui-card-body" }, body) : null],
            footer: () => (footer ? h("span", { class: "ui-card-footer" }, footer) : null),
          },
        );
      }
      return h("section", { id: id || undefined, class: ["ui-card", className].filter(Boolean).join(" ") }, [
        header ? h("header", { class: "ui-card-header" }, header) : null,
        body ? h("div", { class: "ui-card-body" }, body) : null,
        footer ? h("footer", { class: "ui-card-footer" }, footer) : null,
      ]);
    },
  };
}
