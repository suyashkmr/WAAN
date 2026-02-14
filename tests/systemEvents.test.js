import { describe, it, expect } from "vitest";
import {
  analyzeSystemEvents,
  classifyExportSystemMessage,
} from "../js/analytics/systemEvents.js";

function buildSystemEntry({
  message,
  sender = "System",
  timestamp = "2025-01-01T10:00:00Z",
  system_subtype,
} = {}) {
  return {
    type: "system",
    sender,
    timestamp,
    message,
    system_subtype,
  };
}

describe("systemEvents", () => {
  it("classifies export join request text", () => {
    const classification = classifyExportSystemMessage(
      "whatsapp",
      "Ravi requested to join",
    );
    expect(classification).toEqual({ subtype: "join_request" });
  });

  it("keeps join and added counters non-overlapping", () => {
    const systems = [
      buildSystemEntry({
        message: "Bob joined using this group's invite link and got added by admin",
      }),
    ];
    const analytics = analyzeSystemEvents(systems, {
      buildSystemSnapshot: entry => ({ message: entry.message }),
    });

    expect(analytics.joinEvents).toBe(1);
    expect(analytics.addedEvents).toBe(0);
    expect(analytics.systemSnapshots.joins).toHaveLength(1);
    expect(analytics.systemSnapshots.added).toHaveLength(0);
  });

  it("counts member additions when no join signal is present", () => {
    const systems = [
      buildSystemEntry({
        message: "You added Bob, Cara",
      }),
    ];
    const analytics = analyzeSystemEvents(systems, {
      buildSystemSnapshot: entry => ({ message: entry.message }),
    });

    expect(analytics.joinEvents).toBe(0);
    expect(analytics.addedEvents).toBe(2);
    expect(analytics.systemSnapshots.added).toHaveLength(1);
  });
});
