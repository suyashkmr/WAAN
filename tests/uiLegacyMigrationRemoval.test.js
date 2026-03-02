import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function collectFiles(rootDir, predicate, acc = []) {
  const entries = readdirSync(rootDir);
  entries.forEach(entry => {
    const absolute = path.join(rootDir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      collectFiles(absolute, predicate, acc);
      return;
    }
    if (predicate(absolute)) {
      acc.push(absolute);
    }
  });
  return acc;
}

describe("legacy shoelace migration removals", () => {
  it("keeps legacy migration modules removed and unreferenced from runtime code", () => {
    const root = process.cwd();
    const legacyUiMigrationPath = path.join(root, "js/ui/primitivesMigrations.js");
    const legacyFieldMigrationPath = path.join(root, "js/ui/primitivesFieldMigrations.js");

    expect(existsSync(legacyUiMigrationPath)).toBe(false);
    expect(existsSync(legacyFieldMigrationPath)).toBe(false);

    const sourceFiles = [
      path.join(root, "index.html"),
      ...collectFiles(path.join(root, "js"), filePath => filePath.endsWith(".js")),
    ];

    sourceFiles.forEach(filePath => {
      const content = readFileSync(filePath, "utf8");
      expect(content).not.toContain("primitivesMigrations");
      expect(content).not.toContain("primitivesFieldMigrations");
    });
  });
});
