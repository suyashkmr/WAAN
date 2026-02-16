export function createBusyRuntimeController({ globalProgressEl, globalProgressLabel }) {
  let globalBusyCount = 0;

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

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response.json();
}

export function stripRelaySuffix(value) {
  if (!value) return "";
  return value.replace(/@(?:c|g)\.us$/gi, "");
}

export function formatRelayAccount(account) {
  if (!account) return "";
  if (account.pushName) return account.pushName;
  if (account.wid) return stripRelaySuffix(account.wid);
  return "";
}
