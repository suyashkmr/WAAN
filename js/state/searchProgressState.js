const searchProgressState = {
  active: false,
  scanned: 0,
  total: 0,
  percent: 0,
};

const listeners = new Set();

function emitSearchProgressState() {
  const snapshot = { ...searchProgressState };
  listeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch {
      // Ignore listener failures to keep progress updates resilient.
    }
  });
}

export function getSearchProgressState() {
  return searchProgressState;
}

export function subscribeSearchProgressState(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSearchProgressState({ active, scanned, total } = {}) {
  const nextActive = active === undefined ? searchProgressState.active : Boolean(active);
  const nextTotal = Number.isFinite(total) ? Math.max(0, Number(total)) : searchProgressState.total;
  const nextScannedRaw = Number.isFinite(scanned) ? Math.max(0, Number(scanned)) : searchProgressState.scanned;
  const nextScanned = Math.min(nextScannedRaw, nextTotal || nextScannedRaw);
  const nextPercent = nextTotal ? Math.min(100, (nextScanned / nextTotal) * 100) : 0;

  searchProgressState.active = nextActive;
  searchProgressState.scanned = nextScanned;
  searchProgressState.total = nextTotal;
  searchProgressState.percent = nextPercent;
  emitSearchProgressState();
}

export function resetSearchProgressState() {
  searchProgressState.active = false;
  searchProgressState.scanned = 0;
  searchProgressState.total = 0;
  searchProgressState.percent = 0;
  emitSearchProgressState();
}
