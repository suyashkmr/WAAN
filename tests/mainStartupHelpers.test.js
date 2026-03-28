import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  assertReusableExistingBackend,
  assertReusableExistingClient,
  autostartReusedRelayIfNeeded,
  getServerBuildFingerprint,
  resolveReachableClientHost,
} = require("../electron/mainStartupHelpers.cjs");

describe("main startup helpers", () => {
  it("reads backend build fingerprint from the provided server root", () => {
    const computeBuildFingerprint = vi.fn(() => "fingerprint-123");

    const fingerprint = getServerBuildFingerprint({
      serverRoot: "/tmp/waan/apps/server",
      computeBuildFingerprint,
    });

    expect(computeBuildFingerprint).toHaveBeenCalledWith({ serverRoot: "/tmp/waan/apps/server" });
    expect(fingerprint).toBe("fingerprint-123");
  });

  it("returns null instead of throwing when the packaged server fingerprint is unavailable", () => {
    const computeBuildFingerprint = vi.fn(() => {
      throw new Error("missing");
    });

    expect(
      getServerBuildFingerprint({
        serverRoot: "/tmp/waan/apps/server",
        computeBuildFingerprint,
      }),
    ).toBeNull();
  });

  it("normalizes all-interface client hosts to a reachable loopback address", () => {
    expect(resolveReachableClientHost("0.0.0.0")).toBe("127.0.0.1");
    expect(resolveReachableClientHost("::")).toBe("::1");
    expect(resolveReachableClientHost("[::]")).toBe("::1");
    expect(resolveReachableClientHost("192.168.1.50")).toBe("192.168.1.50");
  });

  it("does not fail startup when reused relay auto-start returns an error", async () => {
    const onWarn = vi.fn();
    const relayStatus = { status: "stopped" };

    const result = await autostartReusedRelayIfNeeded({
      relayBase: "http://127.0.0.1:4546",
      relayStatus,
      autostart: true,
      postRelayStartImpl: vi.fn(async () => {
        throw new Error("timed out");
      }),
      onWarn,
    });

    expect(result).toBe(relayStatus);
    expect(onWarn).toHaveBeenCalledWith(expect.any(Error));
  });

  it("refuses to treat an incompatible WAAN dashboard as a free port", () => {
    expect(() =>
      assertReusableExistingClient({
        clientUrl: "http://127.0.0.1:4173",
        existingClient: { recognizedWaan: true, ok: false },
      }),
    ).toThrow(/does not match this build/i);
  });

  it("refuses to treat another HTTP listener as a free dashboard port", () => {
    expect(() =>
      assertReusableExistingClient({
        clientUrl: "http://127.0.0.1:4173",
        existingClient: { ok: false, recognizedWaan: false, body: "<html>not waan</html>" },
      }),
    ).toThrow(/already responding/i);
  });

  it("refuses to treat an empty successful HTTP response as a free dashboard port", () => {
    expect(() =>
      assertReusableExistingClient({
        clientUrl: "http://127.0.0.1:4173",
        existingClient: { ok: false, recognizedWaan: false, body: "" },
      }),
    ).toThrow(/already responding/i);
  });

  it("refuses to treat an incompatible WAAN backend as a free port", () => {
    expect(() =>
      assertReusableExistingBackend({
        apiBase: "http://127.0.0.1:3334/api",
        relayBase: "http://127.0.0.1:4546",
        existingBackend: {
          apiHealthy: true,
          relayHealthy: true,
          ok: false,
        },
      }),
    ).toThrow(/does not match this build/i);
  });

  it("refuses to treat partially occupied backend ports as free", () => {
    expect(() =>
      assertReusableExistingBackend({
        apiBase: "http://127.0.0.1:3334/api",
        relayBase: "http://127.0.0.1:4546",
        existingBackend: {
          ok: false,
          apiHealthy: true,
          apiOccupied: true,
          relayHealthy: false,
          relayOccupied: false,
        },
      }),
    ).toThrow(/already using/i);
  });

  it("refuses to treat a timed-out dashboard probe as a free port", () => {
    expect(() =>
      assertReusableExistingClient({
        clientUrl: "http://127.0.0.1:4173",
        existingClient: { ok: false, portOccupied: true, timedOut: true },
      }),
    ).toThrow(/already responding/i);
  });
});
