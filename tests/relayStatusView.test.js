import { describe, expect, it, vi } from "vitest";
import { h, render } from "vue";
import { updateRelayBanner, updateRelayOnboarding } from "../js/relayControls/statusView.js";
import { createRelayStatusViewRenderer } from "../js/vue/relayStatusViewRenderer.js";

function createBannerElements() {
  const relayBannerEl = document.createElement("section");
  const relayBannerMessage = document.createElement("p");
  const relayBannerMeta = document.createElement("p");
  return { relayBannerEl, relayBannerMessage, relayBannerMeta };
}

function createOnboardingSteps() {
  /** @type {Record<string, HTMLElement | null>} */
  const details = {};
  const createStep = stepId => {
    const el = document.createElement("article");
    el.dataset.stepId = stepId;
    const detail = document.createElement("p");
    detail.className = "relay-step-detail";
    el.appendChild(detail);
    details[stepId] = detail;
    return el;
  };
  return {
    steps: [createStep("start"), createStep("qr"), createStep("sync")],
    details,
  };
}

describe("relay status view mapping", () => {
  it("requires a Vue runtime with h/render", () => {
    const renderer = createRelayStatusViewRenderer({
        elements: createBannerElements(),
        vueRuntime: null,
      });

    expect(() => renderer.renderBanner({ message: "x", meta: "y" })).toThrow(
      "createRelayStatusViewRenderer requires a Vue runtime with h/render",
    );
  });

  it("renders banner and onboarding copy through Vue", () => {
    const { relayBannerMessage, relayBannerMeta } = createBannerElements();
    const { details } = createOnboardingSteps();
    const renderer = createRelayStatusViewRenderer({
      elements: {
        relayBannerMessage,
        relayBannerMeta,
        relayOnboardingStepDetails: details,
      },
      vueRuntime: { h, render },
    });

    renderer.renderBanner({ message: "Relay running", meta: "Sync pending" });
    renderer.renderOnboardingDetail("start", "Relay is running.", details.start);

    expect(relayBannerMessage.textContent).toBe("Relay running");
    expect(relayBannerMeta.textContent).toBe("Sync pending");
    expect(details.start?.textContent).toBe("Relay is running.");
  });

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
    expect(relayBannerMeta.textContent).toContain("Start relay");
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
    expect(relayBannerMeta.textContent).toContain("Suyash (1234567890)");
    expect(relayBannerMeta.textContent).toContain("Synced just now");
    expect(relayBannerMeta.textContent).toContain("739 chats");
    expect(relayBannerMeta.textContent).toContain("Fallback sync");
    expect(relayBannerMeta.textContent).toContain("Primary sync unavailable: browser session stale");
    expect(relayBannerMeta.textContent).toContain("Slow sync 18s");
  });

  it("maps onboarding step states across relay lifecycle", () => {
    const { steps, details } = createOnboardingSteps();

    updateRelayOnboarding({
      status: { status: "starting" },
      relayOnboardingSteps: steps,
      relayOnboardingStepDetails: details,
    });
    expect(steps[0].dataset.state).toBe("active");
    expect(steps[1].dataset.state).toBe("pending");
    expect(steps[2].dataset.state).toBe("pending");

    updateRelayOnboarding({
      status: { status: "waiting_qr" },
      relayOnboardingSteps: steps,
      relayOnboardingStepDetails: details,
    });
    expect(steps[0].dataset.state).toBe("complete");
    expect(steps[1].dataset.state).toBe("active");
    expect(steps[2].dataset.state).toBe("pending");

    updateRelayOnboarding({
      status: { status: "running", chatCount: 0 },
      relayOnboardingSteps: steps,
      relayOnboardingStepDetails: details,
    });
    expect(steps[0].dataset.state).toBe("complete");
    expect(steps[1].dataset.state).toBe("complete");
    expect(steps[2].dataset.state).toBe("active");

    updateRelayOnboarding({
      status: { status: "running", chatCount: 5 },
      relayOnboardingSteps: steps,
      relayOnboardingStepDetails: details,
    });
    expect(steps[2].dataset.state).toBe("complete");
    expect(details.start?.textContent).toBe("Relay running.");
    expect(details.qr?.textContent).toBe("Phone linked.");
    expect(details.sync?.textContent).toBe("Chats loaded.");
  });

  it("preserves onboarding detail updates when explicit detail refs are absent or incomplete", () => {
    const { steps, details } = createOnboardingSteps();

    updateRelayOnboarding({
      status: { status: "starting" },
      relayOnboardingSteps: steps,
    });
    expect(details.start?.textContent).toBe("Starting relay.");

    updateRelayOnboarding({
      status: { status: "waiting_qr" },
      relayOnboardingSteps: steps,
      relayOnboardingStepDetails: { start: details.start, qr: null, sync: details.sync },
    });
    expect(details.qr?.textContent).toBe("Scan the QR code.");

    updateRelayOnboarding({
      status: { status: "running", chatCount: 0 },
      relayOnboardingSteps: steps,
      relayOnboardingStepDetails: { start: null, qr: details.qr, sync: null },
    });
    expect(details.start?.textContent).toBe("Relay running.");
    expect(details.sync?.textContent).toBe("Loading chats.");
  });

  it("can route relay banner and onboarding copy through an injected renderer", () => {
    const { relayBannerEl, relayBannerMessage, relayBannerMeta } = createBannerElements();
    const { steps, details } = createOnboardingSteps();
    const relayStatusViewRenderer = {
      renderBanner: vi.fn(),
      renderOnboardingDetail: vi.fn(),
    };

    updateRelayBanner({
      status: { status: "running", chatCount: 5 },
      relayBannerEl,
      relayBannerMessage,
      relayBannerMeta,
      describeRelayStatusFn: () => ({ message: "Relay live" }),
      formatRelayAccountFn: () => "",
      formatRelativeTime: () => "",
      formatDisplayDate: () => "",
      formatNumber: value => String(value),
      relayStatusViewRenderer,
    });
    updateRelayOnboarding({
      status: { status: "running", chatCount: 5 },
      relayOnboardingSteps: steps,
      relayOnboardingStepDetails: details,
      relayStatusViewRenderer,
    });

    expect(relayStatusViewRenderer.renderBanner).toHaveBeenCalledWith({
      message: "Relay live",
      meta: "Sync pending · 5 chats",
    });
    expect(relayStatusViewRenderer.renderOnboardingDetail).toHaveBeenCalledWith("start", "Relay running.", details.start);
    expect(relayStatusViewRenderer.renderOnboardingDetail).toHaveBeenCalledWith("qr", "Phone linked.", details.qr);
    expect(relayStatusViewRenderer.renderOnboardingDetail).toHaveBeenCalledWith("sync", "Chats loaded.", details.sync);
  });

  it("falls back to DOM writes when a partial renderer omits banner/detail methods", () => {
    const { relayBannerEl, relayBannerMessage, relayBannerMeta } = createBannerElements();
    const { steps, details } = createOnboardingSteps();

    updateRelayBanner({
      status: { status: "running", chatCount: 3 },
      relayBannerEl,
      relayBannerMessage,
      relayBannerMeta,
      describeRelayStatusFn: () => ({ message: "Relay running" }),
      formatRelayAccountFn: () => "",
      formatRelativeTime: () => "",
      formatDisplayDate: () => "",
      formatNumber: value => String(value),
      relayStatusViewRenderer: {},
    });
    updateRelayOnboarding({
      status: { status: "running", chatCount: 0 },
      relayOnboardingSteps: steps,
      relayOnboardingStepDetails: details,
      relayStatusViewRenderer: { renderBanner: vi.fn() },
    });

    expect(relayBannerMessage.textContent).toBe("Relay running");
    expect(relayBannerMeta.textContent).toBe("Sync pending · 3 chats");
    expect(details.start?.textContent).toBe("Relay running.");
    expect(details.qr?.textContent).toBe("Phone linked.");
    expect(details.sync?.textContent).toBe("Loading chats.");
  });
});
