#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const serverDir = path.join(ROOT_DIR, "apps", "server");
const modulesDir = path.join(serverDir, "node_modules");
const packageJsonPath = path.join(serverDir, "package.json");
const serverLockPath = path.join(serverDir, "package-lock.json");

if (!fs.existsSync(packageJsonPath)) {
  // eslint-disable-next-line no-console
  console.error("[WAAN] Could not find apps/server/package.json");
  process.exit(1);
}

if (!fs.existsSync(serverLockPath)) {
  // eslint-disable-next-line no-console
  console.error("[WAAN] Missing apps/server/package-lock.json. Run npm install inside apps/server.");
  process.exit(1);
}

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, "utf8"));

const lockData = readJson(serverLockPath);
const lockPackages = lockData.packages || {};

// eslint-disable-next-line global-require, import/no-dynamic-require
const serverPackageJson = require(packageJsonPath);
const dependencyNames = Object.keys(serverPackageJson.dependencies || {});

function expectedVersionFromLock(dep) {
  const entry = lockPackages[`node_modules/${dep}`];
  return entry?.version || null;
}

function isDependencySatisfied(dep) {
  const expected = expectedVersionFromLock(dep);
  const pkgJsonPath = path.join(modulesDir, dep, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return false;
  try {
    const pkg = readJson(pkgJsonPath);
    return !expected || pkg.version === expected;
  } catch (error) {
    return false;
  }
}

const missingDeps = dependencyNames.filter(dep => !isDependencySatisfied(dep));

if (missingDeps.length === 0) {
  // eslint-disable-next-line no-console
  console.log("[WAAN] Server dependencies already installed.");
  process.exit(0);
}

// eslint-disable-next-line no-console
console.log("[WAAN] Installing server dependencies to vendor correct versions...");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["install", "--omit=dev"], {
  cwd: serverDir,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if ((result.status ?? 1) !== 0) {
  process.exit(result.status);
}

process.exit(0);
