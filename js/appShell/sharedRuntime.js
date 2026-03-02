// @ts-check

/**
 * @param {{
 *   globalProgressEl: HTMLElement | null | undefined,
 *   globalProgressLabel: HTMLElement | null | undefined,
 * }} params
 */
export function createBusyRuntimeController({ globalProgressEl, globalProgressLabel }) {
  let globalBusyCount = 0;

  /**
   * @param {boolean} isBusy
   * @param {string} [message]
   */
  function setGlobalBusy(isBusy, message = "Working...") {
    if (!globalProgressEl || !globalProgressLabel) return;
    if (isBusy) {
      globalBusyCount += 1;
      globalProgressLabel.textContent = message;
      globalProgressEl.hidden = false;
    } else if (globalBusyCount > 0) {
      globalBusyCount -= 1;
      if (globalBusyCount === 0) {
        globalProgressEl.hidden = true;
      }
    }
  }

  /**
   * @template T
   * @param {() => Promise<T> | T} task
   * @param {string} [message]
   * @returns {Promise<T>}
   */
  async function withGlobalBusy(task, message = "Working...") {
    setGlobalBusy(true, message);
    try {
      return await task();
    } finally {
      setGlobalBusy(false);
    }
  }

  return {
    withGlobalBusy,
  };
}

/**
 * @param {string} url
 * @param {RequestInit} [options]
 */
export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response.json();
}

/**
 * @param {string | null | undefined} value
 */
export function stripRelaySuffix(value) {
  if (!value) return "";
  return value.replace(/@(?:c|g)\.us$/gi, "");
}

/**
 * @param {{ pushName?: string, wid?: string } | null | undefined} account
 */
export function formatRelayAccount(account) {
  if (!account) return "";
  if (account.pushName) return account.pushName;
  if (account.wid) return stripRelaySuffix(account.wid);
  return "";
}
