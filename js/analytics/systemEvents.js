import {
  SYSTEM_PATTERNS,
  SYSTEM_JOIN_TEXT_PATTERNS,
  SYSTEM_JOIN_REQUEST_TEXT_PATTERNS,
  SYSTEM_JOIN_SUBTYPES,
  SYSTEM_JOIN_REQUEST_SUBTYPES,
  SYSTEM_ADD_SUBTYPES,
  SYSTEM_REMOVE_SUBTYPES,
  SYSTEM_LEAVE_SUBTYPES,
  SYSTEM_CHANGE_SUBTYPES,
} from "../constants.js";

export function analyzeSystemEvents(systems = [], { buildSystemSnapshot }) {
  let joinEvents = 0;
  let addedEvents = 0;
  let leftEvents = 0;
  let removedEvents = 0;
  let changedEvents = 0;
  let systemJoinRequests = 0;

  const systemSnapshots = {
    joins: [],
    added: [],
    left: [],
    removed: [],
    changed: [],
    join_requests: [],
    other: [],
  };

  systems.forEach(entry => {
    const lowerMessage = (entry.message || "").toLowerCase();
    const participantCount = getSystemParticipantCount(entry) || 1;
    const baseSnapshot = buildSystemSnapshot(entry, { participant_count: participantCount });
    const pushSnapshot = (collection, extra = {}) => {
      collection.push({ ...baseSnapshot, ...extra });
    };
    let classified = false;
    let countedAsJoin = false;

    if (isJoinSystemEntry(entry)) {
      joinEvents += participantCount;
      pushSnapshot(systemSnapshots.joins, { participant_count: participantCount });
      classified = true;
      countedAsJoin = true;
    } else if (containsWord(lowerMessage, "joined")) {
      joinEvents += 1;
      pushSnapshot(systemSnapshots.joins, { participant_count: 1 });
      classified = true;
      countedAsJoin = true;
    }

    // Keep join and added mutually exclusive to avoid double-counting one system event.
    const additions = countedAsJoin ? 0 : getAdditionIncrement(entry);
    if (additions > 0) {
      addedEvents += additions;
      pushSnapshot(systemSnapshots.added, { participant_count: additions });
      classified = true;
    }

    const leaves = getLeaveIncrement(entry);
    if (leaves > 0) {
      leftEvents += leaves;
      pushSnapshot(systemSnapshots.left, { participant_count: leaves });
      classified = true;
    }

    const removals = getRemovalIncrement(entry);
    if (removals > 0) {
      removedEvents += removals;
      pushSnapshot(systemSnapshots.removed, { participant_count: removals });
      classified = true;
    }

    if (isChangeSystemEntry(entry) || containsWord(lowerMessage, "changed")) {
      changedEvents += 1;
      pushSnapshot(systemSnapshots.changed);
      classified = true;
    }

    if (isJoinRequestEntry(entry)) {
      systemJoinRequests += participantCount;
      pushSnapshot(systemSnapshots.join_requests, { participant_count: participantCount });
      classified = true;
    } else if (SYSTEM_PATTERNS[3].test(lowerMessage)) {
      systemJoinRequests += 1;
      pushSnapshot(systemSnapshots.join_requests, { participant_count: 1 });
      classified = true;
    }

    if (!classified) {
      systemSnapshots.other.push(baseSnapshot);
    }
  });

  return {
    joinEvents,
    addedEvents,
    leftEvents,
    removedEvents,
    changedEvents,
    systemJoinRequests,
    systemSnapshots,
  };
}

function countAffectedParticipants(message, verbs = ["added"]) {
  if (!message) return 0;
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized.length) return 0;
  const verbsPattern = verbs.map(verb => verb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`^(?:you|[^:]+)\\s+(?:${verbsPattern})\\s+(.+)$`, "i");
  const match = normalized.match(pattern);
  if (!match) return 0;

  let namesFragment = match[1].trim();
  namesFragment = namesFragment.replace(/\s+(?:to|into)\s+(?:the|this)\s+group.*$/i, "");
  namesFragment = namesFragment.replace(/\s+(?:from|out of)\s+(?:the|this)\s+group.*$/i, "");
  namesFragment = namesFragment.replace(/[.。]+$/g, "");
  namesFragment = namesFragment.replace(/\s+(?:and|&)\s+/gi, ",");

  return namesFragment
    .split(/\s*,\s*/)
    .map(name => name.trim())
    .filter(Boolean).length;
}

function getSystemParticipantCount(entry) {
  if (!entry) return null;
  const declaredCount = Number(entry.system_participant_count);
  if (Number.isFinite(declaredCount) && declaredCount > 0) {
    return declaredCount;
  }
  if (Array.isArray(entry.system_participants) && entry.system_participants.length) {
    return entry.system_participants.length;
  }
  return null;
}

function matchesAnyPattern(patterns, text) {
  if (!text) return false;
  return patterns.some(pattern => pattern.test(text));
}

function isJoinSystemEntry(entry) {
  if (!entry) return false;
  if (entry.system_subtype && SYSTEM_JOIN_SUBTYPES.has(entry.system_subtype)) {
    return true;
  }
  return matchesAnyPattern(SYSTEM_JOIN_TEXT_PATTERNS, entry.message);
}

function isJoinRequestEntry(entry) {
  if (!entry) return false;
  if (entry.system_subtype && SYSTEM_JOIN_REQUEST_SUBTYPES.has(entry.system_subtype)) {
    return true;
  }
  return matchesAnyPattern(SYSTEM_JOIN_REQUEST_TEXT_PATTERNS, entry.message);
}

function containsWord(text, word) {
  if (!text || !word) return false;
  const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return pattern.test(text);
}

function isChangeSystemEntry(entry) {
  if (!entry) return false;
  if (entry.system_subtype && SYSTEM_CHANGE_SUBTYPES.has(entry.system_subtype)) return true;
  const lower = (entry.message || "").toLowerCase();
  return containsWord(lower, "changed");
}

function getAdditionIncrement(entry) {
  if (!entry) return 0;
  if (entry.system_subtype && SYSTEM_ADD_SUBTYPES.has(entry.system_subtype)) {
    return getSystemParticipantCount(entry) || 1;
  }
  const fromText = countAffectedParticipants(entry.message, ["added", "invited"]);
  if (fromText > 0) return fromText;
  const lower = (entry.message || "").toLowerCase();
  if (containsWord(lower, "added") || containsWord(lower, "invited")) {
    return 1;
  }
  return 0;
}

function getRemovalIncrement(entry) {
  if (!entry) return 0;
  if (entry.system_subtype && SYSTEM_REMOVE_SUBTYPES.has(entry.system_subtype)) {
    return getSystemParticipantCount(entry) || 1;
  }
  const fromText = countAffectedParticipants(entry.message, ["removed"]);
  if (fromText > 0) return fromText;
  const lower = (entry.message || "").toLowerCase();
  if (containsWord(lower, "removed")) return 1;
  return 0;
}

function getLeaveIncrement(entry) {
  if (!entry) return 0;
  if (entry.system_subtype && SYSTEM_LEAVE_SUBTYPES.has(entry.system_subtype)) {
    return getSystemParticipantCount(entry) || 1;
  }
  const lower = (entry.message || "").toLowerCase();
  if (containsWord(lower, "left")) return 1;
  return 0;
}
