import {
  LEGACY_VUE_BRIDGE_GLOBAL_KEYS,
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

function createSummaryRoot(state) {
  return {
    name: "WaanSummaryIsland",
    render() {
      const { h } = window.Vue;
      const Card = (window.PrimeVue || window.primevue)?.Card;
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

function mountSummaryIsland() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const VueRuntime = window.Vue;
  const PrimeVueRuntime = window.PrimeVue || window.primevue;
  const PrimeVueConfig = PrimeVueRuntime?.Config;
  const PrimeVueCard = PrimeVueRuntime?.Card;
  if (!VueRuntime || !PrimeVueConfig || !PrimeVueCard) return;

  const mountEl = document.getElementById("summary");
  if (!mountEl) return;
  if (mountEl.dataset.vueSummaryMounted === "true") return;

  const { createApp, reactive } = VueRuntime;
  const state = reactive({
    cards: [],
  });

  const app = createApp(createSummaryRoot(state));
  app.use(PrimeVueConfig, { unstyled: true });
  app.component("Card", PrimeVueCard);
  app.mount(mountEl);
  mountEl.dataset.vueSummaryMounted = "true";

  registerVueBridge(VUE_BRIDGE_NAMES.summary, {
    render(cards) {
      state.cards = normalizeCards(cards);
      return true;
    },
  }, {
    globalScope: window,
    legacyGlobalKey: LEGACY_VUE_BRIDGE_GLOBAL_KEYS[VUE_BRIDGE_NAMES.summary],
  });
}

try {
  mountSummaryIsland();
} catch (error) {
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn("Vue summary island unavailable; keeping legacy summary renderer.", error);
  }
}
