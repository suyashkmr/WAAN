import { describe, it, expect } from "vitest";
import {
  createParticipantDirectory,
  serializeParticipantDirectory,
  deserializeParticipantDirectory,
  normalizeEntriesWithDirectory,
  buildParticipantRoster,
} from "../js/appShell/participantDirectory.js";

describe("participantDirectory", () => {
  it("builds records from participants and entries with label preference", () => {
    const directory = createParticipantDirectory(
      [
        { sender_jid: "12345@c.us", sender: "12345" },
        { sender_jid: "12345@c.us", sender: "Alice" },
        { sender: "Teammate" },
      ],
      [
        { id: "12345@c.us", label: "Alice A" },
        { phone: "+1 (999) 777-6666", displayName: "Bob" },
      ],
    );

    expect(directory.records.has("12345@c.us")).toBe(true);
    expect(directory.records.get("12345@c.us").label).toBe("Alice");
    expect(directory.records.has("19997776666")).toBe(true);
    expect(directory.records.get("19997776666").label).toBe("Bob");
    expect(directory.aliasIndex.get("alice").id).toBe("12345@c.us");
  });

  it("creates alias-only records when only label is available", () => {
    const directory = createParticipantDirectory([], [{ label: "Unknown Contact" }]);
    const record = directory.aliasIndex.get("unknown contact");

    expect(record).toBeTruthy();
    expect(record.id.startsWith("alias:")).toBe(true);
    expect(record.label).toBe("Unknown Contact");
  });

  it("serializes/deserializes and preserves alias lookup", () => {
    const directory = createParticipantDirectory(
      [{ sender_jid: "55555@c.us", sender: "Chris" }],
      [],
    );

    const snapshot = serializeParticipantDirectory(directory);
    const rehydrated = deserializeParticipantDirectory(snapshot);

    expect(rehydrated.records.get("55555@c.us").label).toBe("Chris");
    expect(rehydrated.aliasIndex.get("chris").id).toBe("55555@c.us");
    expect(deserializeParticipantDirectory([])).toBeNull();
  });

  it("normalizes entries with resolved sender ids, labels, and search text", () => {
    const directory = createParticipantDirectory(
      [{ sender_jid: "11111@c.us", sender: "Alice" }],
      [{ id: "22222@c.us", label: "Bob" }],
    );

    const normalized = normalizeEntriesWithDirectory(
      [
        { sender_jid: "11111@c.us", message: "Hello there" },
        { sender: "Bob", message: "Yo" },
        { sender_id: "33333", sender: "33333", message: "Ping", search_text: "custom" },
        { sender: "Mystery", message: null },
      ],
      directory,
    );

    expect(normalized[0].sender_id).toBe("11111@c.us");
    expect(normalized[0].sender).toBe("Alice");
    expect(normalized[0].search_text).toBe("hello there");

    expect(normalized[1].sender_id).toBe("22222@c.us");
    expect(normalized[1].sender).toBe("Bob");

    expect(normalized[2].sender_id).toBe("33333");
    expect(normalized[2].sender).toBe("33333");
    expect(normalized[2].search_text).toBe("custom");

    expect(normalized[3].sender).toBe("mystery");
    expect(normalized[3].search_text).toBe("");
  });

  it("builds roster labels from records and jid fallback", () => {
    const directory = createParticipantDirectory(
      [{ sender_jid: "44444@g.us", sender: "44444" }],
      [{ id: "55555@c.us", label: "Eve" }],
    );

    const roster = buildParticipantRoster(directory);

    expect(roster).toEqual(
      expect.arrayContaining([
        { id: "44444@g.us", label: "44444" },
        { id: "55555@c.us", label: "Eve" },
      ]),
    );
    expect(buildParticipantRoster(null)).toEqual([]);
  });
});
