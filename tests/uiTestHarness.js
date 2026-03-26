import { VUE_APP_SHELL_ROOT_KEY } from "../js/vue/appShellRoot.js";
import { clearVueBridgeRuntime } from "./vueBridgeTestUtils.js";

function normalizeDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return value == null ? "" : String(value);
}

/**
 * @param {any} vnode
 * @returns {Node}
 */
function createNode(vnode) {
  if (vnode == null || vnode === false) return document.createComment("");
  if (Array.isArray(vnode)) {
    const fragment = document.createDocumentFragment();
    vnode.forEach(child => {
      fragment.appendChild(createNode(child));
    });
    return fragment;
  }
  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(String(vnode));
  }
  const type = vnode?.type;
  if (typeof type !== "string") {
    if (type && typeof type === "object") {
      const props = vnode?.props || {};
      if (
        !props.inputId
        && (props.id || props.label || typeof props.onClick === "function" || props["data-panel-action"])
      ) {
        const el = document.createElement("button");
        if (props.id) el.id = String(props.id);
        el.className = String(props.class || "p-button");
        el.disabled = Boolean(props.disabled);
        if (props["data-ui-runtime"]) {
          el.setAttribute("data-ui-runtime", String(props["data-ui-runtime"]));
        }
        if (props["data-panel-action"]) {
          el.setAttribute("data-panel-action", String(props["data-panel-action"]));
        }
        el.textContent = String(props.label || "");
        if (typeof props.onClick === "function") {
          el.addEventListener("click", props.onClick);
        }
        return el;
      }
      if (props.inputId && props.optionLabel && props.optionValue) {
        const el = document.createElement("select");
        el.id = String(props.inputId);
        el.className = "p-select";
        (props.options || []).forEach(option => {
          const optionEl = document.createElement("option");
          optionEl.value = String(option?.[props.optionValue] ?? "");
          optionEl.textContent = String(option?.[props.optionLabel] ?? "");
          el.appendChild(optionEl);
        });
        el.value = String(props.modelValue ?? "");
        el.disabled = Boolean(props.disabled);
        el.addEventListener("change", event => {
          props["onUpdate:modelValue"]?.(event.target.value);
        });
        return el;
      }
      if (props.inputId) {
        const el = document.createElement("input");
        el.id = String(props.inputId);
        el.type = "date";
        el.className = "p-datepicker";
        el.value = normalizeDateValue(props.modelValue);
        el.disabled = Boolean(props.disabled);
        el.min = normalizeDateValue(props.minDate);
        el.max = normalizeDateValue(props.maxDate);
        el.addEventListener("change", event => {
          props["onUpdate:modelValue"]?.(event.target.value);
        });
        return el;
      }
    }
    return document.createComment("unsupported-vnode");
  }
  const el = document.createElement(type);
  const props = vnode?.props || {};
  Object.entries(props).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === "class") {
      if (Array.isArray(value)) {
        el.className = value.filter(Boolean).join(" ");
      } else {
        el.className = String(value);
      }
      return;
    }
    if (key === "style" && typeof value === "object") {
      Object.entries(value).forEach(([styleKey, styleValue]) => {
        if (styleValue == null) return;
        el.style.setProperty(String(styleKey), String(styleValue));
      });
      return;
    }
    if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value);
      return;
    }
    el.setAttribute(key, String(value));
  });
  const children = vnode?.children;
  if (Array.isArray(children)) {
    children.forEach(child => {
      el.appendChild(createNode(child));
    });
  } else if (children != null && typeof children !== "object") {
    el.textContent = String(children);
  }
  return el;
}

export function createVueRuntimeStub() {
  return {
    reactive: value => value,
    h: (type, props = {}, children = []) => ({ type, props, children }),
    render: (vnode, container) => {
      if (!container) return;
      container.innerHTML = "";
      if (!vnode) return;
      container.appendChild(createNode(vnode));
    },
    createApp: rootComponent => ({
      use() {
        return this;
      },
      component() {
        return this;
      },
      mount(mountEl) {
        if (!mountEl) return;
        const vnode = typeof rootComponent?.render === "function"
          ? rootComponent.render()
          : null;
        mountEl.innerHTML = "";
        if (vnode) {
          mountEl.appendChild(createNode(vnode));
        }
        mountEl.dataset.vueAppMounted = "true";
      },
    }),
  };
}

export function seedFullShellDom({ ownerDocument = document } = {}) {
  ownerDocument.body.innerHTML = `
    <section id="summary"></section>
    <div id="highlights-list"></div>
    <table id="top-senders"><tbody></tbody></table>
    <div id="timeofday-chart"></div>
    <div id="data-status"></div>
    <div id="toast-container"></div>
    <div class="page-controls"><div class="control-row primary-controls"></div></div>
    <form id="advanced-search-form">
      <button id="reset-search" type="button">Clear filters</button>
      <button id="run-search" type="submit">Search</button>
    </form>
    <div id="search-results-list"></div>
    <div id="search-insights"></div>
    <div id="saved-view-gallery"></div>
    <div id="compare-summary"></div>
  `;
}

export function installTestUiGlobals({
  globalScope = globalThis,
  vueRuntime,
  primeVue,
  setPrimeVueAlias = true,
} = {}) {
  if (typeof vueRuntime !== "undefined") {
    globalScope.Vue = vueRuntime;
  }
  if (typeof primeVue !== "undefined") {
    globalScope.PrimeVue = primeVue;
    if (setPrimeVueAlias) {
      globalScope.primevue = primeVue;
    }
  }
}

export function resetTestUiGlobals({
  globalScope = globalThis,
  clearBridgeRuntime = true,
  clearAppShellRoot = false,
  clearDomRefsCaptured = false,
  clearBody = false,
  clearVueRuntime = true,
  clearPrimeVueRuntime = true,
} = {}) {
  if (!globalScope) return;
  if (clearBridgeRuntime) {
    clearVueBridgeRuntime({ globalScope });
  }
  if (clearVueRuntime) {
    delete globalScope.Vue;
  }
  if (clearPrimeVueRuntime) {
    delete globalScope.PrimeVue;
    delete globalScope.primevue;
  }
  if (clearAppShellRoot) {
    delete globalScope[VUE_APP_SHELL_ROOT_KEY];
  }
  if (clearDomRefsCaptured) {
    delete globalScope.document?.documentElement?.dataset?.waanDomRefsCaptured;
  }
  if (clearBody) {
    globalScope.document?.body?.replaceChildren();
  }
}
