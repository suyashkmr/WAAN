const defaultSearchQuery = {
  text: "",
  participant: "",
  start: "",
  end: "",
};

const searchState = {
  query: { ...defaultSearchQuery },
  results: [],
  total: 0,
  lastRun: null,
  summary: null,
  lastRunHasFilters: false,
};

export function getSearchState() {
  return searchState;
}

export function setSearchQuery(query) {
  searchState.query = { ...defaultSearchQuery, ...(query || {}) };
}

export function setSearchResults(results, total, summary, meta = {}) {
  searchState.results = Array.isArray(results) ? results : [];
  searchState.total = Number.isFinite(total) ? total : 0;
  searchState.lastRun = new Date().toISOString();
  searchState.summary = summary ?? null;
  searchState.lastRunHasFilters = Boolean(meta.hasFilters);
}

export function resetSearchState() {
  searchState.query = { ...defaultSearchQuery };
  searchState.results = [];
  searchState.total = 0;
  searchState.lastRun = null;
  searchState.summary = null;
  searchState.lastRunHasFilters = false;
}
