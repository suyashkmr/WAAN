import {
  VUE_BRIDGE_NAMES,
  registerVueBridge,
} from "./bridgeRegistry.js";

function normalizeCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.map(card => ({
    title: String(card?.title ?? ""),
    value: String(card?.value ?? "—"),
    hint: String(card?.hint ?? ""),
  }));
}

function createSummaryRoot(state, { h, Card }) {
  return {
    name: "WaanSummaryIsland",
    render() {
      return state.cards.map(card =>
        h(
          Card,
          {
            class: "summary-card summary-card--primevue",
            "data-ui-runtime": "primevue",
          },
          {
            title: () => h("h3", card.title),
            content: () => [
              h("p", { class: "value" }, card.value),
              card.hint ? h("small", card.hint) : null,
            ],
          },
        ),
      );
    },
  };
}

export function mountSummaryIsland({ globalScope = globalThis } = {}) {
  if (!globalScope || typeof globalScope.document === "undefined") return;
  const VueRuntime = globalScope.Vue;
  const PrimeVueRuntime = globalScope.PrimeVue || globalScope.primevue;
  const PrimeVueConfig = PrimeVueRuntime?.Config;
  const PrimeVueCard = PrimeVueRuntime?.Card;
  if (!VueRuntime || !PrimeVueConfig || !PrimeVueCard) return;

  const mountEl = globalScope.document.getElementById("summary");
  if (!mountEl) return;
  if (mountEl.dataset.vueSummaryMounted === "true") return;

  const { createApp, reactive, h } = VueRuntime;
  const state = reactive({
    cards: [],
  });

  const app = createApp(createSummaryRoot(state, { h, Card: PrimeVueCard }));
  app.use(PrimeVueConfig, { unstyled: true });
  app.component("Card", PrimeVueCard);
  app.mount(mountEl);
  mountEl.dataset.vueSummaryMounted = "true";

  registerVueBridge(VUE_BRIDGE_NAMES.summary, {
    render(cards) {
      state.cards = normalizeCards(cards);
      return true;
    },
  }, { globalScope });
}

try {
  mountSummaryIsland();
} catch (error) {
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn("Vue summary island mount failed.", error);
  }
}
