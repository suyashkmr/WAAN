import { setAppShellActiveChatId } from "./appShellUiState.js";

let activeChatId = null;

export function setActiveChatId(id) {
  activeChatId = id ?? null;
  setAppShellActiveChatId(activeChatId);
}

export function getActiveChatId() {
  return activeChatId;
}
