const savedViews = [];
let compareSelection = {
  primary: null,
  secondary: null,
};

function generateViewId() {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addSavedView(view) {
  const record = { ...view };
  if (!record.id) {
    record.id = generateViewId();
  }
  savedViews.push(record);
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
  return target;
}

export function removeSavedView(id) {
  const index = savedViews.findIndex(view => view.id === id);
  if (index === -1) return false;
  savedViews.splice(index, 1);
  if (compareSelection.primary === id) compareSelection.primary = null;
  if (compareSelection.secondary === id) compareSelection.secondary = null;
  return true;
}

export function clearSavedViews() {
  savedViews.length = 0;
  compareSelection = { primary: null, secondary: null };
}

export function setCompareSelection(primary, secondary) {
  compareSelection = { primary: primary ?? null, secondary: secondary ?? null };
}

export function getCompareSelection() {
  return { ...compareSelection };
}
