#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SERVER_WORKSPACE = path.join(ROOT, "apps/server");
const BIN_DIR = path.join(ROOT, "node_modules", ".bin");

const ALLOWLISTED_UNUSED = {
  root: {
    dependencies: ["@primeuix/themes", "primevue", "vue"],
    devDependencies: ["@vitest/coverage-v8", "depcheck", "madge"],
  },
  server: {
    dependencies: [],
    devDependencies: [],
  },
};

const ALLOWLISTED_ORPHANS = new Set([
  "apps/server/src/index.js",
  "js/analyticsWorker.js",
  "js/exportWorker.js",
  "js/main.js",
  "js/ui/primitives.js",
  "js/ui/appShellPrimitives.js",
  "js/searchWorker.js",
]);

function run(command, args, { cwd = ROOT, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 && !allowFailure) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(output || `${command} exited with code ${result.status}`);
  }
  return {
    status: result.status ?? 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function localBin(name) {
  const candidate = path.join(BIN_DIR, process.platform === "win32" ? `${name}.cmd` : name);
  if (!fs.existsSync(candidate)) {
    throw new Error(
      `[dead-code] Missing local binary '${name}' at ${candidate}. Run 'npm install' to install pinned devDependencies.`,
    );
  }
  return candidate;
}

function runDepcheck(cwd) {
  const result = run(
    localBin("depcheck"),
    [
      ".",
      "--json",
      "--skip-missing",
      "--quiet",
      "--ignore-patterns",
      "vendor/**,docs/**,playwright-report/**,test-results/**,coverage/**",
    ],
    { cwd, allowFailure: true },
  );
  const output = result.stdout || result.stderr;
  const trimmed = (output || "").trim();
  try {
    return JSON.parse(trimmed || "{}");
  } catch {
    const contextLabel = cwd === ROOT ? "root workspace" : "apps/server workspace";
    const preview = trimmed.split("\n").slice(0, 12).join("\n");
    throw new Error(
      `[dead-code] depcheck failed in ${contextLabel} (exit ${result.status}) and did not return JSON.\n${preview}`,
    );
  }
}

function filterUnused(entries = [], allowlisted = []) {
  const allowed = new Set(allowlisted);
  return entries.filter(entry => !allowed.has(entry)).sort();
}

function runMadgeOrphans() {
  const { stdout } = run(localBin("madge"), ["--extensions", "js", "--orphans", "js", "apps/server/src"]);
  const jsPathPattern = /^(?:\.\/)?(?:js|apps\/server\/src)\/.+\.js$/;
  return stdout
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith("- Finding files"))
    .filter(line => !line.startsWith("Processed "))
    .filter(line => jsPathPattern.test(line));
}

function main() {
  const root = runDepcheck(ROOT);
  const server = runDepcheck(SERVER_WORKSPACE);

  const rootUnusedDeps = filterUnused(root.dependencies, ALLOWLISTED_UNUSED.root.dependencies);
  const rootUnusedDevDeps = filterUnused(root.devDependencies, ALLOWLISTED_UNUSED.root.devDependencies);
  const serverUnusedDeps = filterUnused(server.dependencies, ALLOWLISTED_UNUSED.server.dependencies);
  const serverUnusedDevDeps = filterUnused(server.devDependencies, ALLOWLISTED_UNUSED.server.devDependencies);

  const rawOrphans = runMadgeOrphans();
  const unexpectedOrphans = rawOrphans.filter(entry => !ALLOWLISTED_ORPHANS.has(entry)).sort();

  const hasIssues =
    rootUnusedDeps.length > 0 ||
    rootUnusedDevDeps.length > 0 ||
    serverUnusedDeps.length > 0 ||
    serverUnusedDevDeps.length > 0 ||
    unexpectedOrphans.length > 0;

  if (!hasIssues) {
    console.log("[dead-code] OK: no unexpected unused dependencies or orphan modules.");
    return;
  }

  if (rootUnusedDeps.length || rootUnusedDevDeps.length) {
    console.error("[dead-code] Root package unused dependencies found:");
    if (rootUnusedDeps.length) console.error(`  dependencies: ${rootUnusedDeps.join(", ")}`);
    if (rootUnusedDevDeps.length) console.error(`  devDependencies: ${rootUnusedDevDeps.join(", ")}`);
  }

  if (serverUnusedDeps.length || serverUnusedDevDeps.length) {
    console.error("[dead-code] apps/server unused dependencies found:");
    if (serverUnusedDeps.length) console.error(`  dependencies: ${serverUnusedDeps.join(", ")}`);
    if (serverUnusedDevDeps.length) console.error(`  devDependencies: ${serverUnusedDevDeps.join(", ")}`);
  }

  if (unexpectedOrphans.length) {
    console.error("[dead-code] Unexpected orphan modules found:");
    unexpectedOrphans.forEach(item => console.error(`  - ${item}`));
  }

  process.exitCode = 1;
}

main();
