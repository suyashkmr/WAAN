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
 *   vueRuntime?: { h?: (...args: any[]) => any, render?: (...args: any[]) => any } | null,
 *   now?: () => number,
 *   syncPageControls?: ((nextState: Record<string, any>) => boolean) | null,
 * }} params
 */
export function createChatSelectionController({
  chatSelector,
  brandName,
  formatNumber,
  formatDisplayDate,
  getActiveChatId,
  setActiveChatId,
  vueRuntime = /** @type {any} */ (globalThis)?.Vue ?? null,
  now = () => Date.now(),
  syncPageControls = null,
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
   * @param {{ successfulFetch?: boolean | null | undefined }} [options]
   */
  function setRemoteChatList(list = [], options = {}) {
    remoteChatState.list = Array.isArray(list) ? list : [];
    const successfulFetch = options.successfulFetch ?? (remoteChatState.list.length > 0);
    remoteChatState.lastFetchedAt = successfulFetch ? now() : 0;
  }

  function getRemoteChatList() {
    return remoteChatState.list;
  }

  function getRemoteChatsLastFetchedAt() {
    return remoteChatState.lastFetchedAt;
  }

  /**
   * @param {boolean} disabled
   */
  function syncChatSelectionDisabled(disabled) {
    if (typeof syncPageControls !== "function") return false;
    return Boolean(syncPageControls({ chatDisabled: disabled }));
  }

  async function refreshChatSelector() {
    const chatOptions = getRemoteChatList().length
      ? getRemoteChatList().map(chat => ({
        value: encodeChatSelectorValue("remote", chat.id),
        label: formatRemoteChatLabel(chat),
      }))
      : [{ value: "", label: "No chats loaded yet" }];
    const activeValue = getActiveChatId();
    const availableValues = chatOptions.map(option => option.value);
    const resolvedValue = activeValue && availableValues.includes(activeValue)
      ? activeValue
      : availableValues[0] || "";
    if (typeof syncPageControls === "function" && syncPageControls({
        chatOptions,
        chatValue: resolvedValue,
        chatDisabled: !getRemoteChatList().length,
      })) {
      if (resolvedValue) {
        setActiveChatId(resolvedValue);
      }
      return;
    }
    if (!chatSelector) {
      return;
    }
    const canRenderWithVue = Boolean(
      vueRuntime &&
      typeof vueRuntime.h === "function" &&
      typeof vueRuntime.render === "function",
    );
    const resolvedVueRuntime = canRenderWithVue ? /** @type {{ h: (...args: any[]) => any, render: (...args: any[]) => any }} */ (vueRuntime) : null;

    const remoteChats = getRemoteChatList();
    if (!remoteChats.length) {
      if (resolvedVueRuntime) {
        const { h, render } = resolvedVueRuntime;
        if (!remoteChatState.vueMounted) {
          chatSelector.textContent = "";
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
    if (resolvedVueRuntime) {
      const { h, render } = resolvedVueRuntime;
      if (!remoteChatState.vueMounted) {
        chatSelector.textContent = "";
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
      if (target) {
        target.disabled = true;
      }
      syncChatSelectionDisabled(true);
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
      if (target) {
        target.disabled = false;
      }
      syncChatSelectionDisabled(!getRemoteChatList().length);
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
