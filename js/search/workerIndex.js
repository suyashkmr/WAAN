import { getTimestamp } from "../analytics.js";

const CHECKPOINT_INTERVAL = 500;

export function createDatasetIndexCache() {
  return {
    fingerprint: null,
    sourceLength: 0,
    sourceEntriesRef: null,
    entryKeys: [],
    messageRecords: [],
    tokenIndex: new Map(),
    participantIndex: new Map(),
    checkpoints: [],
  };
}

export function normalizeTokenList(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function normalizeEntryText(entry) {
  if (!entry) return "";
  if (typeof entry.search_text === "string") return entry.search_text.toLowerCase();
  if (typeof entry.message === "string") return entry.message.toLowerCase();
  return "";
}

function createEntryKey(entry) {
  if (!entry) return "";
  const type = entry.type || "";
  const id = entry.message_id || "";
  const ts = entry.timestamp || entry.timestamp_text || entry.date || "";
  const timestampText = entry.timestamp_text || "";
  const date = entry.date || "";
  const sender = entry.sender || "";
  const content = String(entry.search_text || entry.message || "");
  let contentHash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    contentHash ^= content.charCodeAt(index);
    contentHash = Math.imul(contentHash, 16777619) >>> 0;
  }
  return `${type}|${id}|${ts}|${timestampText}|${date}|${sender}|${(contentHash >>> 0).toString(16)}`;
}

function matchesCachedIdentity(cache, entries, datasetFingerprint) {
  if (cache.fingerprint !== datasetFingerprint) return false;
  if (cache.sourceLength !== entries.length) return false;
  if (cache.sourceEntriesRef === entries) return true;
  if (cache.entryKeys.length === entries.length) {
    for (let index = 0; index < entries.length; index += 1) {
      if (createEntryKey(entries[index]) !== cache.entryKeys[index]) return false;
    }
    return true;
  }
  for (const checkpoint of cache.checkpoints) {
    if (!checkpoint) continue;
    if (checkpoint.index >= entries.length) return false;
    if (createEntryKey(entries[checkpoint.index]) !== checkpoint.key) return false;
  }
  return true;
}

function createMessageRecord(entry) {
  if (!entry || entry.type !== "message") return null;
  const sender = entry.sender || "";
  const timestamp = getTimestamp(entry);
  const tsMs = timestamp instanceof Date ? timestamp.getTime() : Number(new Date(timestamp).getTime());
  if (!tsMs || Number.isNaN(tsMs)) return null;
  const searchText = normalizeEntryText(entry);
  return {
    sender,
    senderLower: sender.toLowerCase(),
    tsMs,
    timestampIso: new Date(tsMs).toISOString(),
    message: entry.message || "",
    tokenSet: new Set(normalizeTokenList(searchText)),
  };
}

function addRecordToIndex(cache, record) {
  const recordIndex = cache.messageRecords.length;
  cache.messageRecords.push(record);

  const participantList = cache.participantIndex.get(record.senderLower) || [];
  participantList.push(recordIndex);
  cache.participantIndex.set(record.senderLower, participantList);

  record.tokenSet.forEach(token => {
    const tokenList = cache.tokenIndex.get(token) || [];
    tokenList.push(recordIndex);
    cache.tokenIndex.set(token, tokenList);
  });
}

function buildCheckpointSnapshot(entries, fromIndex = 0) {
  const checkpoints = [];
  for (let index = fromIndex; index < entries.length; index += CHECKPOINT_INTERVAL) {
    checkpoints.push({ index, key: createEntryKey(entries[index]) });
  }
  const midpoint = Math.floor((entries.length - 1) / 2);
  if (midpoint >= 0 && !checkpoints.some(item => item.index === midpoint)) {
    checkpoints.push({ index: midpoint, key: createEntryKey(entries[midpoint]) });
  }
  const lastIndex = entries.length - 1;
  if (lastIndex >= 0 && !checkpoints.some(item => item.index === lastIndex)) {
    checkpoints.push({ index: lastIndex, key: createEntryKey(entries[lastIndex]) });
  }
  return checkpoints;
}

function canApplyAppendOnlyUpdate(cache, entries) {
  if (!Array.isArray(entries)) return false;
  if (!cache.fingerprint || entries.length <= cache.sourceLength) return false;
  if (cache.entryKeys.length !== cache.sourceLength) return false;
  for (let index = 0; index < cache.sourceLength; index += 1) {
    if (createEntryKey(entries[index]) !== cache.entryKeys[index]) return false;
  }
  return true;
}

export function ensureIndexedDataset(cache, { entries, datasetFingerprint }) {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  if (!datasetFingerprint) {
    cache.fingerprint = null;
    cache.sourceLength = normalizedEntries.length;
    cache.sourceEntriesRef = normalizedEntries;
    cache.entryKeys = new Array(normalizedEntries.length);
    cache.messageRecords = [];
    cache.tokenIndex = new Map();
    cache.participantIndex = new Map();
    cache.checkpoints = buildCheckpointSnapshot(normalizedEntries);
    for (let entryIndex = 0; entryIndex < normalizedEntries.length; entryIndex += 1) {
      cache.entryKeys[entryIndex] = createEntryKey(normalizedEntries[entryIndex]);
      const record = createMessageRecord(normalizedEntries[entryIndex]);
      if (!record) continue;
      addRecordToIndex(cache, record);
    }
    return { mode: "rebuild", indexedMessages: cache.messageRecords.length };
  }

  if (matchesCachedIdentity(cache, normalizedEntries, datasetFingerprint)) {
    return { mode: "reuse", indexedMessages: cache.messageRecords.length };
  }

  const appendOnlyUpdate =
    cache.fingerprint !== null &&
    cache.fingerprint !== datasetFingerprint &&
    canApplyAppendOnlyUpdate(cache, normalizedEntries);

  if (appendOnlyUpdate) {
    for (let entryIndex = cache.sourceLength; entryIndex < normalizedEntries.length; entryIndex += 1) {
      cache.entryKeys.push(createEntryKey(normalizedEntries[entryIndex]));
      const record = createMessageRecord(normalizedEntries[entryIndex]);
      if (!record) continue;
      addRecordToIndex(cache, record);
    }
    cache.fingerprint = datasetFingerprint;
    cache.sourceLength = normalizedEntries.length;
    cache.sourceEntriesRef = normalizedEntries;
    cache.checkpoints = buildCheckpointSnapshot(normalizedEntries);
    return { mode: "append", indexedMessages: cache.messageRecords.length };
  }

  cache.fingerprint = datasetFingerprint;
  cache.sourceLength = normalizedEntries.length;
  cache.sourceEntriesRef = normalizedEntries;
  cache.entryKeys = new Array(normalizedEntries.length);
  cache.messageRecords = [];
  cache.tokenIndex = new Map();
  cache.participantIndex = new Map();
  cache.checkpoints = buildCheckpointSnapshot(normalizedEntries);
  for (let entryIndex = 0; entryIndex < normalizedEntries.length; entryIndex += 1) {
    cache.entryKeys[entryIndex] = createEntryKey(normalizedEntries[entryIndex]);
    const record = createMessageRecord(normalizedEntries[entryIndex]);
    if (!record) continue;
    addRecordToIndex(cache, record);
  }
  return { mode: "rebuild", indexedMessages: cache.messageRecords.length };
}

function intersectSortedLists(left, right) {
  const output = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const a = left[i];
    const b = right[j];
    if (a === b) {
      output.push(a);
      i += 1;
      j += 1;
      continue;
    }
    if (a < b) i += 1;
    else j += 1;
  }
  return output;
}

function resolveTokenCandidateIndexes(cache, token) {
  const key = String(token || "");
  if (!key) return [];
  const merged = [];
  cache.tokenIndex.forEach((indexes, indexedToken) => {
    if (indexedToken.includes(key)) merged.push(...indexes);
  });
  if (!merged.length) return [];
  return Array.from(new Set(merged)).sort((a, b) => a - b);
}

export function resolveIndexedCandidates(cache, query = {}) {
  const tokens = normalizeTokenList(query.text);
  const participant = query.participant ? String(query.participant).toLowerCase() : "";
  const tokenLists = tokens
    .map(token => resolveTokenCandidateIndexes(cache, token))
    .sort((a, b) => a.length - b.length);
  if (tokenLists.some(list => list.length === 0)) return [];

  let candidates = null;
  if (tokenLists.length) {
    candidates = tokenLists[0];
    for (let index = 1; index < tokenLists.length; index += 1) {
      candidates = intersectSortedLists(candidates, tokenLists[index]);
      if (!candidates.length) return [];
    }
  }

  if (participant) {
    const participantList = cache.participantIndex.get(participant) || [];
    if (!participantList.length) return [];
    candidates = candidates ? intersectSortedLists(candidates, participantList) : participantList;
  }

  if (candidates) return candidates;
  return cache.messageRecords.map((_, index) => index);
}
