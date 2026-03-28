import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { postRelayStart, shouldAutostartExistingRelay } = require("../electron/reuseLogic.cjs");

describe("reuse logic", () => {
  it("preserves autostart when a reusable backend reports a stopped relay", () => {
    expect(
      shouldAutostartExistingRelay({
        relayStatus: { status: "stopped" },
        autostart: true,
      }),
    ).toBe(true);
  });

  it("does not autostart when preference is off or relay is already running", () => {
    expect(
      shouldAutostartExistingRelay({
        relayStatus: { status: "stopped" },
        autostart: false,
      }),
    ).toBe(false);
    expect(
      shouldAutostartExistingRelay({
        relayStatus: { status: "running" },
        autostart: true,
      }),
    ).toBe(false);
  });

  it("auto-starts a stopped reusable relay via the running backend endpoint", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: "running" }),
    }));

    const status = await postRelayStart("http://127.0.0.1:4546", { fetchImpl, timeoutMs: 50 });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:4546/relay/start",
      expect.objectContaining({ method: "POST" }),
    );
    expect(status).toEqual({ status: "running" });
  });

  it("times out relay auto-start requests instead of hanging indefinitely", async () => {
    const fetchImpl = vi.fn((_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason ?? new Error("aborted")), { once: true });
      }),
    );

    await expect(postRelayStart("http://127.0.0.1:4546", { fetchImpl, timeoutMs: 10 })).rejects.toThrow(
      /timed out|aborted/i,
    );
  });
});
