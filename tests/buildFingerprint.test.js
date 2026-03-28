import { describe, expect, it } from "vitest";
import { computeServerBuildFingerprint } from "../apps/server/src/buildFingerprint.js";

describe("server build fingerprint", () => {
  it("changes when the server lockfile changes even if src and package.json stay the same", () => {
    const filesA = new Map([
      ["package.json", '{"name":"server","version":"1.1.0"}'],
      ["package-lock.json", '{"name":"server","lockfileVersion":3,"packages":{"":{"dependencies":{"dep":"1.0.0"}}}}'],
      ["src/index.js", 'module.exports = "same-source";'],
    ]);
    const filesB = new Map([
      ["package.json", '{"name":"server","version":"1.1.0"}'],
      ["package-lock.json", '{"name":"server","lockfileVersion":3,"packages":{"":{"dependencies":{"dep":"1.0.1"}}}}'],
      ["src/index.js", 'module.exports = "same-source";'],
    ]);

    const createFs = files => ({
      readFileSync(filePath) {
        const normalized = filePath.split(/[/\\\\]/).slice(-2).join("/");
        if (files.has(normalized)) {
          return files.get(normalized);
        }
        const fallback = filePath.split(/[/\\\\]/).pop();
        if (files.has(fallback)) {
          return files.get(fallback);
        }
        throw new Error(`Missing fixture for ${filePath}`);
      },
      readdirSync(dirPath) {
        const normalized = dirPath.split(/[/\\\\]/).slice(-1)[0];
        if (normalized === "server") {
          return ["package-lock.json", "package.json", "src"];
        }
        if (normalized === "src") {
          return ["index.js"];
        }
        throw new Error(`Unexpected directory ${dirPath}`);
      },
      statSync(filePath) {
        const name = filePath.split(/[/\\\\]/).slice(-1)[0];
        return {
          isDirectory() {
            return name === "src";
          },
        };
      },
    });

    const fingerprintA = computeServerBuildFingerprint({
      serverRoot: "/tmp/server",
      ...createFs(filesA),
    });
    const fingerprintB = computeServerBuildFingerprint({
      serverRoot: "/tmp/server",
      ...createFs(filesB),
    });

    expect(fingerprintA).toBeTruthy();
    expect(fingerprintB).toBeTruthy();
    expect(fingerprintA).not.toBe(fingerprintB);
  });
});
