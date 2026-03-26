import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildRelayLaunchConfig } = require("../electron/relayLaunchConfig.cjs");

describe("relay launch config", () => {
  it("enables autostart args and env when autostart is true", () => {
    const config = buildRelayLaunchConfig({
      autostart: true,
      getServerRoot: () => "/tmp/waan/apps/server",
      apiPort: 3334,
      relayPort: 4546,
    });

    expect(config.entry).toBe("/tmp/waan/apps/server/src/index.js");
    expect(config.cwd).toBe("/tmp/waan/apps/server");
    expect(config.args).toEqual(["--auto-start"]);
    expect(config.env.WAAN_AUTOSTART).toBe("1");
    expect(config.env.WAAN_API_PORT).toBe("3334");
    expect(config.env.WAAN_RELAY_PORT).toBe("4546");
    expect(config.env.WAAN_RELAY_HEADLESS).toBe("false");
  });

  it("omits autostart args and disables env autostart when preference is off", () => {
    const config = buildRelayLaunchConfig({
      autostart: false,
      getServerRoot: () => "/tmp/waan/apps/server",
      apiPort: 3334,
      relayPort: 4546,
    });

    expect(config.entry).toBe("/tmp/waan/apps/server/src/index.js");
    expect(config.cwd).toBe("/tmp/waan/apps/server");
    expect(config.args).toEqual([]);
    expect(config.env.WAAN_AUTOSTART).toBe("0");
  });
});
