import { describe, it, expect } from "vitest";
import { computeAnalytics, getTimestamp } from "../js/analytics.js";

function buildEntry({
  sender = "User",
  text = "hello world",
  timestamp = "2025-01-01T10:00:00Z",
  type = "message",
} = {}) {
  return {
    type,
    message: text,
    timestamp,
    sender,
  };
}

describe("analytics helpers", () => {
  it("computes summaries from message entries", () => {
    const entries = [
      buildEntry({ sender: "Ana", timestamp: "2025-01-01T10:00:00Z" }),
      buildEntry({ sender: "Ben", timestamp: "2025-01-01T11:00:00Z" }),
      buildEntry({ sender: "Ana", timestamp: "2025-01-02T09:30:00Z" }),
      buildEntry({ sender: "Cara", timestamp: "2025-01-02T12:45:00Z", text: "poll: lunch?" }),
    ];

    const analytics = computeAnalytics(entries);
    expect(analytics.total_messages).toBe(4);
    expect(Array.isArray(analytics.daily_counts)).toBe(true);
    expect(analytics.unique_senders).toBe(3);
    expect(analytics.message_types.summary.length).toBeGreaterThan(0);
  });

  it("normalizes timestamps via getTimestamp", () => {
    const entry = buildEntry({ timestamp: "2025-02-03T05:00:00Z" });
    const ts = getTimestamp(entry);
    expect(ts).toBeInstanceOf(Date);
    expect(ts.toISOString()).toBe("2025-02-03T05:00:00.000Z");
  });
});
