const LINK_REGEX = /(https?:\/\/\S+)/i;
const POLL_PREFIX_REGEX = /^poll:/i;

function isMediaMessage(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  if (
    lower.includes("<media omitted>") ||
    lower.includes("<image omitted>") ||
    lower.includes("<video omitted>") ||
    lower.includes("<gif omitted>") ||
    lower.includes("<audio omitted>") ||
    lower.includes("voice message") ||
    lower.includes("voice note") ||
    lower.includes("<sticker omitted>") ||
    (lower.includes("sticker") && lower.includes("omitted"))
  ) {
    return true;
  }
  if (/^img-\d+/i.test(message) || /^vid-\d+/i.test(message) || /^ptt-\d+/i.test(message)) {
    return true;
  }
  if (/\.(?:jpe?g|png|gif|heic|webp)\b/i.test(message)) return true;
  if (/\.(?:mp4|mov|mkv|avi|gifv?)\b/i.test(message)) return true;
  if (/\.(?:mp3|m4a|aac|wav|opus|ogg)\b/i.test(message)) return true;
  if (/\.(?:pdf|docx?|pptx?|xls[xm]?|zip|rar|7z|csv|txt)\b/i.test(message)) return true;
  if (/\bsticker\b/i.test(message)) return true;
  return false;
}

function isDeletedMessage(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("this message was deleted") ||
    lower.includes("you deleted this message")
  );
}

function normalizePollOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map(option => {
      if (option == null) return null;
      if (typeof option === "string") return option.trim();
      if (typeof option === "object") {
        const text = option.name || option.title || option.label || option.localizedText;
        return text ? String(text).trim() : null;
      }
      return String(option).trim();
    })
    .filter(Boolean);
}

export function createMessageTypeAccumulator() {
  return {
    linkCount: 0,
    mediaCount: 0,
    pollCount: 0,
    deletedMessageCount: 0,
    linkSnapshots: [],
    mediaSnapshots: [],
    pollEntries: [],
    pollSenderCounts: new Map(),
  };
}

export function recordMessageTypeEntry({
  accumulator,
  entry,
  trimmedMessage,
  snapshot,
}) {
  if (isDeletedMessage(trimmedMessage)) {
    accumulator.deletedMessageCount += 1;
  }

  if (LINK_REGEX.test(trimmedMessage)) {
    accumulator.linkCount += 1;
    accumulator.linkSnapshots.push({ ...snapshot });
  }
  if (isMediaMessage(trimmedMessage)) {
    accumulator.mediaCount += 1;
    accumulator.mediaSnapshots.push({ ...snapshot });
  }

  const hasPoll =
    Boolean(entry.has_poll) ||
    Boolean(entry.poll_title) ||
    (Array.isArray(entry.poll_options) && entry.poll_options.length > 0) ||
    POLL_PREFIX_REGEX.test(trimmedMessage);
  if (!hasPoll) return;

  accumulator.pollCount += 1;
  const pollOptions = normalizePollOptions(entry.poll_options);
  const pollSnapshot = {
    ...snapshot,
    title: entry.poll_title || trimmedMessage.split("\n")[0] || "Poll",
    options: pollOptions,
  };
  accumulator.pollEntries.push(pollSnapshot);
  const pollSender = entry.sender || "Unknown";
  accumulator.pollSenderCounts.set(
    pollSender,
    (accumulator.pollSenderCounts.get(pollSender) || 0) + 1,
  );
}
