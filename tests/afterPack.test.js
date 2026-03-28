import { describe, it, expect } from "vitest";

const { __test } = require("../electron/scripts/after-pack.js");

describe("after-pack launcher wrapper", () => {
  it("preserves ELECTRON_RUN_AS_NODE helper launches", () => {
    const script = __test.APP_WRAPPER_TEMPLATE("WAAN-bin");

    expect(script).toContain('if [ "${ELECTRON_RUN_AS_NODE:-}" = "1" ]; then');
    expect(script).toContain('exec "$(dirname "$0")/WAAN-bin" "$@"');
  });

  it("still unsets ELECTRON_RUN_AS_NODE for normal GUI launches", () => {
    const script = __test.APP_WRAPPER_TEMPLATE("WAAN-bin");

    expect(script).toContain("unset ELECTRON_RUN_AS_NODE");
  });

  it("only installs the launcher wrapper for mac packaging", () => {
    expect(__test.shouldInstallMacLauncherWrapper({ electronPlatformName: "darwin" })).toBe(true);
    expect(__test.shouldInstallMacLauncherWrapper({ electronPlatformName: "linux" })).toBe(false);
    expect(__test.shouldInstallMacLauncherWrapper({ electronPlatformName: "win32" })).toBe(false);
  });
});
