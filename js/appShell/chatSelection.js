export function createChatSelectionController({
  chatSelector,
  brandName,
  formatNumber,
  formatDisplayDate,
  getActiveChatId,
  setActiveChatId,
}) {
  const remoteChatState = {
    list: [],
    lastFetchedAt: 0,
  };

  function encodeChatSelectorValue(source, id) {
    return `${source}:${id}`;
  }

  function decodeChatSelectorValue(value) {
    if (!value) return null;
    const [prefix, ...rest] = value.split(":");
    if (!prefix || !rest.length) return null;
    return { source: prefix, id: rest.join(":") };
  }

  function formatRemoteChatLabel(chat) {
    const parts = [chat.name || chat.id || `${brandName} chat`];
    if (Number.isFinite(chat.messageCount)) {
      parts.push(`${formatNumber(chat.messageCount)} msgs`);
    }
    if (chat.lastMessageAt) {
      parts.push(`Active ${formatDisplayDate(chat.lastMessageAt)}`);
    }
    return parts.join(" · ");
  }

  function setRemoteChatList(list = []) {
    remoteChatState.list = Array.isArray(list) ? list : [];
    remoteChatState.lastFetchedAt = Date.now();
  }

  function getRemoteChatList() {
    return remoteChatState.list;
  }

  function getRemoteChatsLastFetchedAt() {
    return remoteChatState.lastFetchedAt;
  }

  async function refreshChatSelector() {
    if (!chatSelector) {
      return;
    }

    const remoteChats = getRemoteChatList();
    if (!remoteChats.length) {
      chatSelector.innerHTML = '<option value="">No chats loaded yet</option>';
      chatSelector.value = "";
      chatSelector.disabled = true;
      return;
    }

    chatSelector.innerHTML = "";
    chatSelector.disabled = false;

    const remoteGroup = document.createElement("optgroup");
    remoteGroup.label = `${brandName} account`;
    remoteChats.forEach(chat => {
      const option = document.createElement("option");
      option.value = encodeChatSelectorValue("remote", chat.id);
      option.textContent = formatRemoteChatLabel(chat);
      remoteGroup.appendChild(option);
    });
    chatSelector.appendChild(remoteGroup);

    const activeValue = getActiveChatId();
    const availableValues = Array.from(chatSelector.options).map(option => option.value);
    const resolvedValue = activeValue && availableValues.includes(activeValue)
      ? activeValue
      : availableValues[0];
    if (resolvedValue) {
      chatSelector.value = resolvedValue;
      setActiveChatId(resolvedValue);
    }
  }

  async function handleChatSelectionChange(event, { loadRemoteChat, updateStatus }) {
    const target = event?.target;
    const selectionValue = target?.value || "";
    const forceReload = event?.force === true || event?.detail?.force === true;
    const decoded = decodeChatSelectorValue(selectionValue);
    if (!decoded) return;
    if (!forceReload && selectionValue === getActiveChatId()) return;
    const { source, id } = decoded;
    try {
      target.disabled = true;
      if (source === "remote") {
        if (forceReload) {
          await loadRemoteChat(id, { reloaded: true });
        } else {
          await loadRemoteChat(id);
        }
      } else {
        updateStatus("Local chat datasets are no longer available in this build.", "warning");
        await refreshChatSelector();
      }
    } catch (error) {
      console.error(error);
      updateStatus("We couldn't switch chats.", "error");
    } finally {
      target.disabled = false;
    }
  }

  return {
    encodeChatSelectorValue,
    decodeChatSelectorValue,
    setRemoteChatList,
    getRemoteChatList,
    getRemoteChatsLastFetchedAt,
    refreshChatSelector,
    handleChatSelectionChange,
  };
}
