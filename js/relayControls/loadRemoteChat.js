export async function loadRemoteChatFromRelay({
  chatId,
  options = {},
  apiBase,
  remoteMessageLimit,
  brandName,
  relayServiceName,
  fetchJson,
  updateStatus,
  withGlobalBusy,
  applyEntriesToApp,
  encodeChatSelectorValue,
  formatNumber,
}) {
  if (!chatId) return;
  const limit = Number(options.limit) || remoteMessageLimit;
  const params = new URLSearchParams({ limit: String(limit), refresh: "1" });
  if (options.refresh === false) params.delete("refresh");
  if (options.fullLimit) params.set("full", String(options.fullLimit));
  else if (options.full === true) params.set("full", String(limit));
  const endpoint = `${apiBase}/chats/${encodeURIComponent(chatId)}/messages?${params.toString()}`;

  await withGlobalBusy(async () => {
    updateStatus("Fetching messages directly from the relay…", "info");
    try {
      const payload = await fetchJson(endpoint);
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      const label = payload.label || `${brandName} chat`;
      await applyEntriesToApp(entries, label, {
        datasetId: `remote-${chatId}`,
        selectionValue: encodeChatSelectorValue("remote", chatId),
        statusMessage:
          options.statusMessage ??
          `${options.reloaded ? "Reloaded" : "Loaded"} ${formatNumber(entries.length)} messages from ${label}.`,
        persist: false,
        participants: Array.isArray(payload.participants) ? payload.participants : [],
      });
    } catch (error) {
      console.error(error);
      updateStatus(
        `We couldn't reach ${relayServiceName}. Make sure the desktop relay is running (or start it with \`npm start --workspace apps/server\`).`,
        "error",
      );
      throw error;
    }
  }, "Fetching messages…");
}
