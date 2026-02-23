const defaultDocument = typeof document !== "undefined" ? document : null;

export function createDomCache(root = defaultDocument) {
  const cache = new Map();
  const resolveRoot = () => root || defaultDocument;

  return {
    getById(id) {
      const doc = resolveRoot();
      if (!doc || !id) return null;
      if (!cache.has(id)) {
        cache.set(id, doc.getElementById ? doc.getElementById(id) : defaultDocument?.getElementById(id) || null);
      }
      return cache.get(id);
    },
    query(selector) {
      const doc = resolveRoot();
      if (!doc || !selector) return null;
      if (!cache.has(selector)) {
        cache.set(selector, doc.querySelector(selector));
      }
      return cache.get(selector);
    },
    queryAll(selector) {
      const doc = resolveRoot();
      if (!doc || !selector) return [];
      return doc.querySelectorAll(selector);
    },
    clear() {
      cache.clear();
    },
  };
}

export function createDeferredRenderScheduler({ getToken } = {}) {
  const deferTask =
    typeof window !== "undefined" && typeof window.requestIdleCallback === "function"
      ? callback =>
          window.requestIdleCallback(
            deadline => {
              if (deadline.timeRemaining() > 8) {
                callback();
              } else {
                setTimeout(callback, 0);
              }
            },
            { timeout: 500 },
          )
      : callback => setTimeout(callback, 0);

  return (task, token) => {
    deferTask(() => {
      if (typeof token !== "undefined" && typeof getToken === "function" && token !== getToken()) return;
      task();
    });
  };
}
