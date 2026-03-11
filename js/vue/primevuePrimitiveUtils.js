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

export {
  formatDateAsIsoLocal,
  normalizePrimeDateModelValue,
  normalizePrimitiveValue,
  resolveOverlayTarget,
  splitComponentAttrs,
  toBoundedDate,
};
