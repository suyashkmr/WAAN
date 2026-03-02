const { formatErrorDetails, formatErrorMessage } = require("../errorUtils");

async function fetchChatsWithStrategy({
  client,
  mode,
  retryAttempts,
  retryDelayMs,
  waitBeforeRetry,
  logger,
  loggedGetChatsFallback,
  getChatsFromStoreFallback,
}) {
  const pause = typeof waitBeforeRetry === "function" ? waitBeforeRetry : async () => {};
  let chats = [];
  let syncPath = mode === "fallback" ? "fallback" : "primary";
  let fallbackReason = null;
  let nextLoggedGetChatsFallback = Boolean(loggedGetChatsFallback);

  if (mode === "fallback") {
    logger.info("Relay sync mode=fallback; skipping client.getChats().");
    chats = await getChatsFromStoreFallback();
    fallbackReason = "Fallback mode is forced by relay configuration.";
    return { chats, syncPath, fallbackReason, loggedGetChatsFallback: nextLoggedGetChatsFallback };
  }

  if (mode === "primary") {
    chats = await client.getChats();
    return { chats, syncPath, fallbackReason, loggedGetChatsFallback: nextLoggedGetChatsFallback };
  }

  let primaryError = null;
  try {
    for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
      try {
        chats = await client.getChats();
        primaryError = null;
        break;
      } catch (error) {
        primaryError = error;
        if (attempt >= retryAttempts) {
          throw error;
        }
        logger.debug(
          "client.getChats() failed (attempt %d/%d). Retrying in %dms.",
          attempt,
          retryAttempts,
          retryDelayMs,
        );
        await pause(retryDelayMs);
      }
    }
  } catch {
    const details = formatErrorDetails(primaryError, "WAAN getChats failed");
    if (!nextLoggedGetChatsFallback) {
      logger.info("client.getChats() unavailable; using Store.Chat fallback sync.");
      nextLoggedGetChatsFallback = true;
    }
    logger.debug("client.getChats() fallback details: %s", details);
    chats = await getChatsFromStoreFallback();
    syncPath = "fallback";
    fallbackReason = `Primary sync unavailable: ${formatErrorMessage(primaryError, "unknown error")}`;
  }

  return { chats, syncPath, fallbackReason, loggedGetChatsFallback: nextLoggedGetChatsFallback };
}

module.exports = {
  fetchChatsWithStrategy,
};
