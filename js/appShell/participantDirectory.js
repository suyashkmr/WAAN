function normalizeJid(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

function stripJidSuffix(value) {
  return value.replace(/@[\w.]+$/, "");
}

function normalizeContactId(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.includes("@")) return normalizeJid(text);
  const digits = text.replace(/\D+/g, "");
  if (digits.length >= 5) return digits;
  return normalizeJid(text);
}

function shouldPreferLabel(next, current) {
  if (!current) return true;
  if (!next) return false;
  const currentIsNumber = /^\d+$/.test(current.replace(/\D+/g, ""));
  const nextIsNumber = /^\d+$/.test(next.replace(/\D+/g, ""));
  if (currentIsNumber && !nextIsNumber) return true;
  if (!currentIsNumber && nextIsNumber) return false;
  return next.length <= current.length;
}

export function createParticipantDirectory(entries = [], participants = []) {
  const records = new Map();
  const aliasIndex = new Map();

  const ensureRecord = id => {
    const normalized = normalizeContactId(id);
    if (!normalized) return null;
    if (!records.has(normalized)) {
      records.set(normalized, { id: normalized, label: null, aliases: new Set() });
    }
    return records.get(normalized);
  };

  const register = (id, label) => {
    let record = ensureRecord(id);
    const cleanLabel = label ? String(label).trim() : "";
    if (!record && cleanLabel) {
      const aliasKey = cleanLabel.toLowerCase();
      record = aliasIndex.get(aliasKey);
      if (!record) {
        const aliasId = `alias:${aliasKey}`;
        record = { id: aliasId, label: null, aliases: new Set() };
        records.set(aliasId, record);
      }
    }
    if (!record) return null;
    if (cleanLabel) {
      if (!record.label || shouldPreferLabel(cleanLabel, record.label)) {
        record.label = cleanLabel;
      }
      record.aliases.add(cleanLabel);
      aliasIndex.set(cleanLabel.toLowerCase(), record);
    }
    return record;
  };

  participants.forEach(participant => {
    const label = participant.label || participant.name || participant.displayName || participant.pushname;
    const id = participant.id || participant.jid || participant.phone || participant.identifier;
    if (id || label) {
      register(id, label || (id ? stripJidSuffix(id) : ""));
    }
  });

  entries.forEach(entry => {
    register(entry.sender_jid || entry.sender_id || entry.sender, entry.sender);
  });

  return { records, aliasIndex };
}

export function serializeParticipantDirectory(directory) {
  if (!directory) return null;
  return Array.from(directory.records.entries()).map(([id, record]) => ({
    id,
    label: record.label ?? null,
    aliases: Array.from(record.aliases || []),
  }));
}

export function deserializeParticipantDirectory(snapshot) {
  if (!Array.isArray(snapshot) || !snapshot.length) return null;
  const records = new Map();
  const aliasIndex = new Map();
  snapshot.forEach(item => {
    if (!item || !item.id) return;
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    const record = {
      id: item.id,
      label: item.label ?? null,
      aliases: new Set(aliases),
    };
    records.set(record.id, record);
    aliases.forEach(alias => {
      if (alias) aliasIndex.set(alias.toLowerCase(), record);
    });
    if (record.label) aliasIndex.set(record.label.toLowerCase(), record);
  });
  return { records, aliasIndex };
}

export function normalizeEntriesWithDirectory(entries = [], directory) {
  if (!directory) return entries;
  const { records, aliasIndex } = directory;

  const resolveRecord = entry => {
    const candidates = [entry.sender_jid, entry.sender_id, entry.sender];
    for (const candidate of candidates) {
      const normalized = normalizeContactId(candidate);
      if (normalized && records.has(normalized)) {
        return records.get(normalized);
      }
    }
    if (entry.sender) {
      const alias = aliasIndex.get(entry.sender.trim().toLowerCase());
      if (alias) return alias;
    }
    return null;
  };

  return entries.map(entry => {
    const record = resolveRecord(entry);
    const normalizedId =
      record?.id ||
      normalizeContactId(entry.sender_jid) ||
      normalizeContactId(entry.sender_id) ||
      normalizeContactId(entry.sender) ||
      entry.sender_id ||
      entry.sender;
    const displayName =
      record?.label ||
      (normalizedId && !normalizedId.startsWith("alias:") ? stripJidSuffix(normalizedId) : null) ||
      entry.sender ||
      "Unknown";
    const baseMessage = typeof entry.message === "string" ? entry.message : "";
    return {
      ...entry,
      sender_id: normalizedId || entry.sender_id || entry.sender,
      sender: displayName,
      search_text: entry.search_text ?? baseMessage.toLowerCase(),
    };
  });
}

export function buildParticipantRoster(directory) {
  if (!directory) return [];
  const roster = [];
  directory.records.forEach(record => {
    const label = record.label || stripJidSuffix(record.id);
    if (label) {
      roster.push({ id: record.id, label });
    }
  });
  return roster;
}
