import { describe, expect, it } from "vitest";
import { updateRelayBanner, updateRelayOnboarding } from "../js/relayControls/statusView.js";

function createBannerElements() {
  const relayBannerEl = document.createElement("section");
  const relayBannerMessage = document.createElement("p");
  const relayBannerMeta = document.createElement("p");
  return { relayBannerEl, relayBannerMessage, relayBannerMeta };
}

function createOnboardingSteps() {
  const createStep = stepId => {
    const el = document.createElement("article");
    el.dataset.stepId = stepId;
    const detail = document.createElement("p");
    detail.className = "relay-step-detail";
    el.appendChild(detail);
    return el;
  };
  return [createStep("start"), createStep("qr"), createStep("sync")];
}

describe("relay status view mapping", () => {
  it("renders offline fallback when status is missing", () => {
    const { relayBannerEl, relayBannerMessage, relayBannerMeta } = createBannerElements();

    updateRelayBanner({
      status: null,
      relayBannerEl,
      relayBannerMessage,
      relayBannerMeta,
      describeRelayStatusFn: () => ({ message: "" }),
      formatRelayAccountFn: () => "",
      formatRelativeTime: () => "",
      formatDisplayDate: () => "",
      formatNumber: value => String(value),
    });

    expect(relayBannerEl.dataset.status).toBe("offline");
    expect(relayBannerMessage.textContent).toBe("Relay offline.");
    expect(relayBannerMeta.textContent).toContain("Open the relay app");
  });

  it("applies status and metadata for starting/waiting/running transitions", () => {
    const { relayBannerEl, relayBannerMessage, relayBannerMeta } = createBannerElements();
    const describeRelayStatusFn = status => ({ message: `state:${status.status}` });

    updateRelayBanner({
      status: { status: "starting", chatCount: 0 },
      relayBannerEl,
      relayBannerMessage,
      relayBannerMeta,
      describeRelayStatusFn,
      formatRelayAccountFn: () => "",
      formatRelativeTime: () => "",
      formatDisplayDate: () => "today",
      formatNumber: value => String(value),
    });
    expect(relayBannerEl.dataset.status).toBe("starting");
    expect(relayBannerMessage.textContent).toBe("state:starting");

    updateRelayBanner({
      status: { status: "waiting_qr", chatCount: 0 },
      relayBannerEl,
      relayBannerMessage,
      relayBannerMeta,
      describeRelayStatusFn,
      formatRelayAccountFn: () => "",
      formatRelativeTime: () => "",
      formatDisplayDate: () => "today",
      formatNumber: value => String(value),
    });
    expect(relayBannerEl.dataset.status).toBe("waiting_qr");
    expect(relayBannerMessage.textContent).toBe("state:waiting_qr");

    updateRelayBanner({
      status: {
        status: "running",
        account: { pushName: "Suyash" },
        chatCount: 739,
        chatsSyncedAt: "2026-02-25T10:00:00.000Z",
        syncPath: "fallback",
        lastSyncPathReason: "Primary sync unavailable: browser session stale",
        lastSyncDurationMs: 18234,
      },
      relayBannerEl,
      relayBannerMessage,
      relayBannerMeta,
      describeRelayStatusFn,
      formatRelayAccountFn: () => "Suyash (1234567890)",
      formatRelativeTime: () => "just now",
      formatDisplayDate: () => "today",
      formatNumber: value => String(value),
    });

    expect(relayBannerEl.dataset.status).toBe("running");
    expect(relayBannerMessage.textContent).toBe("state:running");
    expect(relayBannerMeta.textContent).toContain("Account: Suyash (1234567890)");
    expect(relayBannerMeta.textContent).toContain("Synced just now");
    expect(relayBannerMeta.textContent).toContain("739 chats indexed");
    expect(relayBannerMeta.textContent).toContain("Sync path: fallback");
    expect(relayBannerMeta.textContent).toContain(
      "Fallback reason: Primary sync unavailable: browser session stale",
    );
    expect(relayBannerMeta.textContent).toContain("Sync slowdown detected (18s)");
  });

  it("maps onboarding step states across relay lifecycle", () => {
    const steps = createOnboardingSteps();

    updateRelayOnboarding({ status: { status: "starting" }, relayOnboardingSteps: steps });
    expect(steps[0].dataset.state).toBe("active");
    expect(steps[1].dataset.state).toBe("pending");
    expect(steps[2].dataset.state).toBe("pending");

    updateRelayOnboarding({ status: { status: "waiting_qr" }, relayOnboardingSteps: steps });
    expect(steps[0].dataset.state).toBe("complete");
    expect(steps[1].dataset.state).toBe("active");
    expect(steps[2].dataset.state).toBe("pending");

    updateRelayOnboarding({
      status: { status: "running", chatCount: 0 },
      relayOnboardingSteps: steps,
    });
    expect(steps[0].dataset.state).toBe("complete");
    expect(steps[1].dataset.state).toBe("complete");
    expect(steps[2].dataset.state).toBe("active");

    updateRelayOnboarding({
      status: { status: "running", chatCount: 5 },
      relayOnboardingSteps: steps,
    });
    expect(steps[2].dataset.state).toBe("complete");
  });
});
