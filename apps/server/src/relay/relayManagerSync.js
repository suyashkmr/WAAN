const { formatErrorMessage, formatErrorDetails } = require("../errorUtils");

function resolveEffectiveSyncMode(options, fallbackMode) {
  const requestedMode =
    options && typeof options.mode === "string"
      ? options.mode.trim().toLowerCase()
      : "";
  return requestedMode === "auto" || requestedMode === "primary" || requestedMode === "fallback"
    ? requestedMode
    : fallbackMode;
}

function applySyncSuccessState(manager, { chats, syncPath, persistDurationMs, syncStartedAt }) {
  const previousSyncPath = manager.state.syncPath;
  const syncDurationMs = Math.max(0, Date.now() - syncStartedAt);
  manager.state.chatCount = chats.length;
  manager.state.chatsSyncedAt = new Date().toISOString();
  manager.state.syncPath = syncPath;
  manager.state.lastSyncDurationMs = syncDurationMs;
  manager.state.lastSyncPersistDurationMs = persistDurationMs;
  if (previousSyncPath && previousSyncPath !== syncPath) {
    manager.log(`Sync path transition detected: ${previousSyncPath} -> ${syncPath}.`);
  }
  manager.log(
    `Synced ${chats.length} chats via ${syncPath} in ${syncDurationMs}ms (meta persist ${persistDurationMs}ms).`,
  );
}

function applySyncFailureState(manager, error) {
  const message = formatErrorMessage(error, "Chat sync failed");
  const details = formatErrorDetails(error, "Chat sync failed");
  manager.logger.error("Failed to sync chats: %s", details);
  manager.state.lastError = message;
}

module.exports = {
  resolveEffectiveSyncMode,
  applySyncSuccessState,
  applySyncFailureState,
};
