import { toISODate, sanitizeText, formatDisplayDate } from "./utils.js";
import {
  createDatasetIndexCache,
  ensureIndexedDataset,
  resolveIndexedCandidates,
  normalizeTokenList,
} from "./search/workerIndex.js";

const cancelledJobs = new Set();
const datasetIndexCache = createDatasetIndexCache();

if (typeof self !== "undefined") {
  self.onmessage = event => {
    const { id, type, payload } = event.data || {};
    if (typeof id === "undefined") return;

    if (type === "cancel") {
      cancelledJobs.add(id);
      return;
    }
    if (type !== "search") return;

    try {
      const {
        entries = [],
        query = {},
        resultLimit = 200,
        startMs = null,
        endMs = null,
        datasetFingerprint = "",
      } = payload || {};
      const result = runSearch({
        jobId: id,
        entries,
        query,
        resultLimit,
        startMs,
        endMs,
        datasetFingerprint,
      });
      if (!result) return;
      self.postMessage({ id, type: "result", ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      self.postMessage({ id, type: "error", error: message });
    } finally {
      cancelledJobs.delete(id);
    }
  };
}

function isCancelled(id) {
  return cancelledJobs.has(id);
}

function runSearch({ jobId, entries, query, resultLimit, startMs, endMs, datasetFingerprint }) {
  if (!Array.isArray(entries) || !entries.length) {
    return { results: [], total: 0, summary: null };
  }

  if (isCancelled(jobId)) {
    self.postMessage({ id: jobId, type: "cancelled" });
    return null;
  }

  ensureIndexedDataset(datasetIndexCache, { entries, datasetFingerprint });
  const tokens = normalizeTokenList(query.text);
  const validStart = typeof startMs === "number" ? startMs : null;
  const validEnd = typeof endMs === "number" ? endMs : null;
  const candidateIndexes = resolveIndexedCandidates(datasetIndexCache, query);
  const results = [];
  let totalMatches = 0;
  const dayCounts = new Map();
  const participantCounts = new Map();
  const totalCandidates = candidateIndexes.length;

  if (isCancelled(jobId)) {
    self.postMessage({ id: jobId, type: "cancelled" });
    return null;
  }

  for (let i = 0; i < totalCandidates; i += 1) {
    if (isCancelled(jobId)) {
      self.postMessage({ id: jobId, type: "cancelled" });
      return null;
    }
    if (i % 500 === 0) {
      self.postMessage({ id: jobId, type: "progress", scanned: i, total: totalCandidates });
    }
    const record = datasetIndexCache.messageRecords[candidateIndexes[i]];
    if (!record) continue;
    if (validStart !== null && record.tsMs < validStart) continue;
    if (validEnd !== null && record.tsMs > validEnd) continue;

    totalMatches += 1;
    const dayKey = toISODate(new Date(record.tsMs));
    dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
    const senderKey = record.sender || "[Unknown]";
    participantCounts.set(senderKey, (participantCounts.get(senderKey) || 0) + 1);

    if (results.length < resultLimit) {
      results.push({
        sender: record.sender,
        timestamp: record.timestampIso,
        message: record.message,
        messageHtml: highlightMessage(record.message, tokens),
      });
    }
  }

  if (isCancelled(jobId)) {
    self.postMessage({ id: jobId, type: "cancelled" });
    return null;
  }

  self.postMessage({ id: jobId, type: "progress", scanned: totalCandidates, total: totalCandidates });
  const summary = totalMatches
    ? buildSearchSummary({
        query,
        dayCounts,
        participantCounts,
        total: totalMatches,
        truncated: totalMatches > results.length,
      })
    : null;

  return { results, total: totalMatches, summary };
}

function highlightMessage(text, tokens) {
  const safe = sanitizeText(text || "");
  if (!tokens || !tokens.length) return safe;
  return tokens.reduce((output, token) => {
    if (!token) return output;
    const escapedToken = sanitizeText(token);
    if (!escapedToken) return output;
    const escaped = escapedToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    return output.replace(regex, "<mark>$1</mark>");
  }, safe);
}

function describeSearchFilters(query) {
  const details = [];
  if (query?.text) details.push(`Keywords: "${query.text}"`);
  if (query?.participant) details.push(`Participant: ${query.participant}`);
  if (query?.start || query?.end) {
    const start = query.start ? formatDisplayDate(query.start) : "Any";
    const end = query.end ? formatDisplayDate(query.end) : "Any";
    details.push(`Dates: ${start} → ${end}`);
  }
  if (!details.length) details.push("Filters: none (all messages)");
  return details;
}

function buildSearchSummary({ query, dayCounts, participantCounts, total, truncated }) {
  const hitsPerDay = Array.from(dayCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  const topParticipants = Array.from(participantCounts.entries())
    .map(([sender, count]) => ({ sender, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.sender.localeCompare(b.sender))
    .slice(0, 5);
  return {
    total,
    truncated: Boolean(truncated),
    hitsPerDay,
    topParticipants,
    filters: describeSearchFilters(query),
  };
}
