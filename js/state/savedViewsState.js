const savedViews = [];
let compareSelection = {
  primary: null,
  secondary: null,
};
const savedViewsStateListeners = new Set();

function generateViewId() {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepCloneValue(value) {
  if (Array.isArray(value)) return value.map(item => deepCloneValue(item));
  if (!value || typeof value !== "object") return value;
  const clone = {};
  Object.entries(value).forEach(([key, entry]) => {
    clone[key] = deepCloneValue(entry);
  });
  return clone;
}

function createSavedViewsStateSnapshot() {
  return {
    views: savedViews.map(view => deepCloneValue(view)),
    compareSelection: { ...compareSelection },
  };
}

function emitSavedViewsStateChange() {
  if (!savedViewsStateListeners.size) return;
  savedViewsStateListeners.forEach(listener => {
    try {
      listener(createSavedViewsStateSnapshot());
    } catch {
      // Keep state updates resilient if one subscriber fails.
    }
  });
}

export function subscribeSavedViewsState(listener, { emitCurrent = false } = {}) {
  if (typeof listener !== "function") return () => {};
  savedViewsStateListeners.add(listener);
  if (emitCurrent) {
    try {
      listener(createSavedViewsStateSnapshot());
    } catch {
      // Keep subscription initialization resilient with runtime emissions.
    }
  }
  return () => {
    savedViewsStateListeners.delete(listener);
  };
}

export function getSavedViewsState() {
  return createSavedViewsStateSnapshot();
}

export function addSavedView(view) {
  const record = { ...view };
  if (!record.id) {
    record.id = generateViewId();
  }
  savedViews.push(record);
  emitSavedViewsStateChange();
  return record;
}

export function getSavedViews() {
  return savedViews.slice();
}

export function updateSavedView(id, updates) {
  const target = savedViews.find(view => view.id === id);
  if (!target) return null;
  if (typeof updates === "function") {
    updates(target);
  } else if (updates && typeof updates === "object") {
    Object.assign(target, updates);
  }
  emitSavedViewsStateChange();
  return target;
}

export function removeSavedView(id) {
  const index = savedViews.findIndex(view => view.id === id);
  if (index === -1) return false;
  savedViews.splice(index, 1);
  if (compareSelection.primary === id) compareSelection.primary = null;
  if (compareSelection.secondary === id) compareSelection.secondary = null;
  emitSavedViewsStateChange();
  return true;
}

export function clearSavedViews() {
  savedViews.length = 0;
  compareSelection = { primary: null, secondary: null };
  emitSavedViewsStateChange();
}

export function setCompareSelection(primary, secondary) {
  const next = { primary: primary ?? null, secondary: secondary ?? null };
  if (compareSelection.primary === next.primary && compareSelection.secondary === next.secondary) return;
  compareSelection = next;
  emitSavedViewsStateChange();
}

export function getCompareSelection() {
  return { ...compareSelection };
}
