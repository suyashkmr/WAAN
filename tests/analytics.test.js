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

  it("keeps join and added events non-overlapping for one system line", () => {
    const entries = [
      buildEntry({ sender: "Ana", timestamp: "2025-01-01T10:00:00Z" }),
      {
        type: "system",
        sender: "System",
        timestamp: "2025-01-02T09:00:00Z",
        message: "Bob joined using this group's invite link and got added by admin",
      },
    ];

    const analytics = computeAnalytics(entries);
    expect(analytics.join_events).toBe(1);
    expect(analytics.added_events).toBe(0);
  });

  it("anchors outlook highlights on dataset end date", () => {
    const entries = [
      buildEntry({ sender: "Ana", timestamp: "2025-01-01T10:00:00Z", text: "a" }),
      buildEntry({ sender: "Ana", timestamp: "2025-01-02T10:00:00Z", text: "b" }),
      buildEntry({ sender: "Ana", timestamp: "2025-01-03T10:00:00Z", text: "c" }),
      buildEntry({ sender: "Ana", timestamp: "2025-01-04T10:00:00Z", text: "d" }),
      buildEntry({ sender: "Ana", timestamp: "2025-01-05T10:00:00Z", text: "e" }),
      buildEntry({ sender: "Ana", timestamp: "2025-01-06T10:00:00Z", text: "f" }),
    ];

    const analytics = computeAnalytics(entries);
    const today = analytics.highlights.find(item => item.label === "Today’s activity outlook");
    const tomorrow = analytics.highlights.find(item => item.label === "Tomorrow’s activity outlook");

    expect(today).toBeTruthy();
    expect(tomorrow).toBeTruthy();
    expect(today.descriptor).toContain("06-01-2025");
    expect(tomorrow.descriptor).toContain("07-01-2025");
  });
});
