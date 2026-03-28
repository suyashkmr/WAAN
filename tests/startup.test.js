import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("electron startup", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("exits non-zero when startup fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const processExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    const startup = await import("../electron/startup.js");
    expect(() => startup.__test.handleStartupFailure(new Error("bad client config"))).toThrow("process.exit");
    expect(consoleError).toHaveBeenCalledWith("[WAAN] Failed to start local services:", expect.any(Error));
    expect(processExit).toHaveBeenCalledWith(1);
  });

  it("probes the configured client host before trying to reuse or spawn the dashboard", async () => {
    process.env.WAAN_CLIENT_HOST = "192.168.1.50";
    process.env.WAAN_CLIENT_PORT = "4777";

    const startup = await import("../electron/startup.js");

    expect(startup.__test.clientUrl).toBe("http://192.168.1.50:4777");
  });

  it("brackets IPv6 client probe hosts when building reuse URLs", async () => {
    process.env.WAAN_CLIENT_HOST = "::1";
    process.env.WAAN_CLIENT_PORT = "4777";

    const startup = await import("../electron/startup.js");

    expect(startup.__test.clientProbeHost).toBe("::1");
    expect(startup.__test.clientUrl).toBe("http://[::1]:4777");
  });

  it("probes loopback instead of 0.0.0.0 when the dashboard bind host is all interfaces", async () => {
    process.env.WAAN_CLIENT_HOST = "0.0.0.0";
    process.env.WAAN_CLIENT_PORT = "4777";

    const startup = await import("../electron/startup.js");

    expect(startup.__test.clientProbeHost).toBe("127.0.0.1");
    expect(startup.__test.clientUrl).toBe("http://127.0.0.1:4777");
  });

  it("probes IPv6 loopback when the dashboard bind host is the IPv6 any-host address", async () => {
    process.env.WAAN_CLIENT_HOST = "::";
    process.env.WAAN_CLIENT_PORT = "4777";

    const startup = await import("../electron/startup.js");

    expect(startup.__test.clientProbeHost).toBe("::1");
    expect(startup.__test.clientUrl).toBe("http://[::1]:4777");
  });

  it("probes the configured backend bind host before trying to reuse the server", async () => {
    process.env.WAAN_BIND_HOST = "192.168.1.50";
    process.env.WAAN_API_PORT = "5334";
    process.env.WAAN_RELAY_PORT = "5546";

    const startup = await import("../electron/startup.js");

    expect(startup.__test.backendProbeHost).toBe("192.168.1.50");
    expect(startup.__test.apiBase).toBe("http://192.168.1.50:5334/api");
    expect(startup.__test.relayBase).toBe("http://192.168.1.50:5546");
  });

  it("brackets IPv6 backend probe hosts when building reuse URLs", async () => {
    process.env.WAAN_BIND_HOST = "::1";
    process.env.WAAN_API_PORT = "5334";
    process.env.WAAN_RELAY_PORT = "5546";

    const startup = await import("../electron/startup.js");

    expect(startup.__test.backendProbeHost).toBe("::1");
    expect(startup.__test.apiBase).toBe("http://[::1]:5334/api");
    expect(startup.__test.relayBase).toBe("http://[::1]:5546");
  });

  it("probes loopback instead of an all-interface backend bind host", async () => {
    process.env.WAAN_BIND_HOST = "0.0.0.0";
    process.env.WAAN_API_PORT = "5334";
    process.env.WAAN_RELAY_PORT = "5546";

    const startup = await import("../electron/startup.js");

    expect(startup.__test.backendProbeHost).toBe("127.0.0.1");
    expect(startup.__test.apiBase).toBe("http://127.0.0.1:5334/api");
    expect(startup.__test.relayBase).toBe("http://127.0.0.1:5546");
  });

  it("probes IPv6 loopback instead of an IPv6 any-host backend bind host", async () => {
    process.env.WAAN_BIND_HOST = "::";
    process.env.WAAN_API_PORT = "5334";
    process.env.WAAN_RELAY_PORT = "5546";

    const startup = await import("../electron/startup.js");

    expect(startup.__test.backendProbeHost).toBe("::1");
    expect(startup.__test.apiBase).toBe("http://[::1]:5334/api");
    expect(startup.__test.relayBase).toBe("http://[::1]:5546");
  });

  it("launches the current working tree frontend through vite for start-backend", async () => {
    process.env.WAAN_CLIENT_HOST = "127.0.0.1";
    process.env.WAAN_CLIENT_PORT = "4999";

    const startup = await import("../electron/startup.js");
    const launch = startup.__test.buildClientLaunchConfig();

    expect(launch.command).toBe("npm");
    expect(launch.args).toEqual(["run", "dev", "--", "--host", "127.0.0.1", "--port", "4999", "--strictPort"]);
    expect(launch.cwd).toMatch(/WAAN$/);
    expect(launch.env.WAAN_WEB_ROOT).toBeUndefined();
  });

  it("uses npm.cmd on Windows when launching the dev dashboard helper", async () => {
    const startup = await import("../electron/startup.js");

    expect(startup.__test.getNpmCommand("win32")).toBe("npm.cmd");
    expect(startup.__test.getNpmCommand("darwin")).toBe("npm");
  });

  it("expects the current repo dev-server module entries before reusing a dashboard", async () => {
    const startup = await import("../electron/startup.js");

    expect(startup.__test.getExpectedDevModuleEntries()).toEqual(["/@vite/client", "/src/main.js"]);
  });

  it("uses the current repo dev-server module entries for unpackaged dashboard reuse", async () => {
    const startup = await import("../electron/startup.js");

    expect(startup.__test.getExpectedUnpackagedDashboardEntries()).toEqual(["/@vite/client", "/src/main.js"]);
  });

  it("treats start-backend as a no-op when both services are reused", async () => {
    const startup = await import("../electron/startup.js");

    expect(startup.__test.maintainHelperLiveness({ startedClient: false, startedRelay: false })).toBe(true);

    const processExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    expect(() => startup.__test.cleanup(0)).toThrow("process.exit");
    expect(processExit).toHaveBeenCalledWith(0);
  });
});
