// @ts-check

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   chatSelector: HTMLSelectElement | null | undefined,
 *   brandName: string,
 *   formatNumber: (value: number) => string,
 *   formatDisplayDate: (value: any) => string,
 *   getActiveChatId: () => string | null,
 *   setActiveChatId: (value: string) => void,
 * }} params
 */
export function createChatSelectionController({
  chatSelector,
  brandName,
  formatNumber,
  formatDisplayDate,
  getActiveChatId,
  setActiveChatId,
}) {
  const remoteChatState = {
    /** @type {AnyRecord[]} */
    list: [],
    lastFetchedAt: 0,
    vueMounted: false,
  };

  /**
   * @param {string} source
   * @param {string} id
   */
  function encodeChatSelectorValue(source, id) {
    return `${source}:${id}`;
  }

  /**
   * @param {string | null | undefined} value
   */
  function decodeChatSelectorValue(value) {
    if (!value) return null;
    const [prefix, ...rest] = value.split(":");
    if (!prefix || !rest.length) return null;
    return { source: prefix, id: rest.join(":") };
  }

  /**
   * @param {AnyRecord} chat
   */
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

  /**
   * @param {AnyRecord[]} [list]
   */
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
    const VueRuntime = /** @type {any} */ (globalThis)?.Vue;
    const canRenderWithVue = Boolean(
      VueRuntime &&
      typeof VueRuntime.h === "function" &&
      typeof VueRuntime.render === "function",
    );

    const remoteChats = getRemoteChatList();
    if (!remoteChats.length) {
      if (canRenderWithVue) {
        const { h, render } = VueRuntime;
        if (!remoteChatState.vueMounted) {
          chatSelector.replaceChildren();
          remoteChatState.vueMounted = true;
        }
        render(h("option", { value: "" }, "No chats loaded yet"), chatSelector);
      } else {
        throw new Error("Vue runtime is required for chat selector rendering.");
      }
      chatSelector.value = "";
      chatSelector.disabled = true;
      return;
    }

    chatSelector.disabled = false;
    if (canRenderWithVue) {
      const { h, render } = VueRuntime;
      if (!remoteChatState.vueMounted) {
        chatSelector.replaceChildren();
        remoteChatState.vueMounted = true;
      }
      render(
        h(
          "optgroup",
          { label: `${brandName} account` },
          remoteChats.map(chat =>
            h(
              "option",
              {
                value: encodeChatSelectorValue("remote", chat.id),
                key: `remote:${chat.id}`,
              },
              formatRemoteChatLabel(chat),
            )),
        ),
        chatSelector,
      );
    } else {
      throw new Error("Vue runtime is required for chat selector rendering.");
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

  /**
   * @param {AnyRecord} event
   * @param {{ loadRemoteChat: (id: string, options?: AnyRecord) => Promise<void>, updateStatus: (message: string, tone: string) => void }} params
   */
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
