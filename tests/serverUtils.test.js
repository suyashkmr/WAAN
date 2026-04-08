import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
const { formatErrorDetails, formatErrorMessage } = (await import("../apps/server/src/errorUtils.js")).default;
const { loadConfig } = (await import("../apps/server/src/config.js")).default;
const { buildLogger } = (await import("../apps/server/src/logger.js")).default;

describe("server utility modules", () => {
  const originalEnv = { ...process.env };
  const tempRoots = [];
  let homeRoot = null;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    homeRoot = await fs.mkdtemp(path.join(os.tmpdir(), "waan-server-home-"));
    tempRoots.push(homeRoot);
    vi.spyOn(os, "homedir").mockReturnValue(homeRoot);
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    await Promise.all(tempRoots.splice(0).map(target => fs.remove(target)));
    homeRoot = null;
  });

  it("formats error messages and details for error and non-error inputs", () => {
    const baseError = new Error("relay down");
    baseError.name = "RelayError";

    expect(formatErrorMessage(baseError)).toBe("relay down");
    expect(formatErrorMessage("  ")).toBe("Unknown error");
    expect(formatErrorMessage({ message: "Bad payload" })).toBe("Bad payload");
    expect(formatErrorMessage(42)).toBe("42");
    expect(formatErrorMessage(null)).toBe("Unknown error");

    const detailFromError = formatErrorDetails(baseError);
    expect(detailFromError).toContain("RelayError: relay down");

    const detailFromObject = formatErrorDetails({ code: "E_BAD", message: "" }, "Fallback");
    expect(detailFromObject).toContain("NonError(object):");
    expect(detailFromObject).toContain('"code":"E_BAD"');
  });

  it("loads config from explicit overrides and ensures required directories", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "waan-server-config-"));
    tempRoots.push(root);
    const dataDir = path.join(root, "data");
    const logDir = path.join(root, "logs");

    const config = loadConfig({
      dataDir,
      logDir,
      apiPort: "4455",
      relayPort: "invalid-port",
      host: "0.0.0.0",
      allowOrigin: "http://127.0.0.1:4173",
    });

    expect(config.dataDir).toBe(path.resolve(dataDir));
    expect(config.storageDir).toBe(path.join(path.resolve(dataDir), "storage"));
    expect(config.logDir).toBe(path.resolve(logDir));
    expect(config.apiPort).toBe(4455);
    expect(config.relayPort).toBe(4546);
    expect(config.host).toBe("0.0.0.0");
    expect(config.allowOrigin).toBe("http://127.0.0.1:4173");

    expect(await fs.pathExists(config.dataDir)).toBe(true);
    expect(await fs.pathExists(config.storageDir)).toBe(true);
    expect(await fs.pathExists(config.logDir)).toBe(true);
  });

  it("uses environment overrides when explicit overrides are not provided", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "waan-server-env-"));
    tempRoots.push(root);
    const dataDir = path.join(root, "env-data");
    const logDir = path.join(root, "env-logs");
    process.env.WAAN_DATA_DIR = dataDir;
    process.env.WAAN_LOG_DIR = logDir;
    process.env.WAAN_API_PORT = "6565";
    process.env.WAAN_RELAY_PORT = "7575";
    process.env.WAAN_BIND_HOST = "0.0.0.0";
    process.env.WAAN_ALLOW_ORIGIN = "http://localhost:4173";

    const config = loadConfig();
    expect(config.dataDir).toBe(path.resolve(dataDir));
    expect(config.logDir).toBe(path.resolve(logDir));
    expect(config.apiPort).toBe(6565);
    expect(config.relayPort).toBe(7575);
    expect(config.host).toBe("0.0.0.0");
    expect(config.allowOrigin).toBe("http://localhost:4173");
  });

  it("builds winston logger with file and console transports", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "waan-server-logger-"));
    tempRoots.push(root);
    const logger = buildLogger({ logDir: root });

    expect(logger).toBeTruthy();
    expect(Array.isArray(logger.transports)).toBe(true);
    expect(logger.transports.length).toBe(2);

    const fileTransport = logger.transports.find(
      transport => transport?.filename === "waan-server.log",
    );
    expect(fileTransport).toBeTruthy();
    expect(fileTransport.dirname).toBe(root);

    await logger.close();
  });
});
