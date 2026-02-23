let activeChatId = null;

export function setActiveChatId(id) {
  activeChatId = id ?? null;
}

export function getActiveChatId() {
  return activeChatId;
}
