export function createChatSelectionController({
  chatSelector,
  brandName,
  formatNumber,
  formatDisplayDate,
  listChatDatasets,
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

  function formatLocalChatLabel(chat) {
    const parts = [chat.label || "Untitled chat"];
    if (Number.isFinite(chat.messageCount)) {
      parts.push(`${formatNumber(chat.messageCount)} msgs`);
    }
    if (chat.dateRange?.start && chat.dateRange?.end) {
      parts.push(`${formatDisplayDate(chat.dateRange.start)} -> ${formatDisplayDate(chat.dateRange.end)}`);
    }
    return parts.join(" · ");
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

    const storedChats = listChatDatasets();
    const remoteChats = getRemoteChatList();
    if (!storedChats.length && !remoteChats.length) {
      chatSelector.innerHTML = '<option value="">No chats loaded yet</option>';
      chatSelector.value = "";
      chatSelector.disabled = true;
      return;
    }

    chatSelector.innerHTML = "";
    chatSelector.disabled = false;

    if (storedChats.length) {
      const storedGroup = document.createElement("optgroup");
      storedGroup.label = "Your chats";
      storedChats.forEach(chat => {
        const option = document.createElement("option");
        option.value = encodeChatSelectorValue("local", chat.id);
        option.textContent = formatLocalChatLabel(chat);
        storedGroup.appendChild(option);
      });
      chatSelector.appendChild(storedGroup);
    }

    if (remoteChats.length) {
      const remoteGroup = document.createElement("optgroup");
      remoteGroup.label = `${brandName} account`;
      remoteChats.forEach(chat => {
        const option = document.createElement("option");
        option.value = encodeChatSelectorValue("remote", chat.id);
        option.textContent = formatRemoteChatLabel(chat);
        remoteGroup.appendChild(option);
      });
      chatSelector.appendChild(remoteGroup);
    }

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

  async function handleChatSelectionChange(event, {
    getChatDatasetById,
    applyEntriesToApp,
    loadRemoteChat,
    updateStatus,
  }) {
    const decoded = decodeChatSelectorValue(event.target.value);
    if (!decoded) return;
    if (event.target.value === getActiveChatId()) return;
    const { source, id } = decoded;
    try {
      event.target.disabled = true;
      if (source === "local") {
        const dataset = getChatDatasetById(id);
        if (!dataset) {
          updateStatus("We couldn't load that chat.", "error");
          await refreshChatSelector();
          return;
        }
        await applyEntriesToApp(dataset.entries, dataset.label, {
          datasetId: dataset.id,
          analyticsOverride: dataset.analytics ?? null,
          statusMessage: `Switched to ${dataset.label}.`,
          selectionValue: event.target.value,
          participants: dataset.meta?.participants || [],
          participantDirectoryData: dataset.participantDirectory ?? null,
          entriesNormalized: true,
        });
      } else if (source === "remote") {
        await loadRemoteChat(id);
      }
    } catch (error) {
      console.error(error);
      updateStatus("We couldn't switch chats.", "error");
    } finally {
      event.target.disabled = false;
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
