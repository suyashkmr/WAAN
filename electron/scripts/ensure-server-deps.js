#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const serverDir = path.join(ROOT_DIR, "apps", "server");
const modulesDir = path.join(serverDir, "node_modules");
const rootModulesDir = path.join(ROOT_DIR, "node_modules");
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

if (missingDeps.length === 0 && fs.existsSync(modulesDir)) {
  // eslint-disable-next-line no-console
  console.log("[WAAN] Server dependencies already installed.");
  process.exit(0);
}

if (!fs.existsSync(rootModulesDir)) {
  console.error("[WAAN] Root node_modules missing. Run npm install at the repository root first.");
  process.exit(1);
}

if (fs.existsSync(modulesDir)) {
  // eslint-disable-next-line no-console
  console.log("[WAAN] Clearing existing server node_modules...");
  fs.rmSync(modulesDir, { recursive: true, force: true });
}

fs.mkdirSync(modulesDir, { recursive: true });

const packageEntries = Object.entries(lockPackages)
  .filter(([pkgPath, meta]) => pkgPath && pkgPath.startsWith("node_modules/") && !meta.dev);

if (!packageEntries.length) {
  console.warn("[WAAN] No runtime packages were found in the lockfile – skipping copy.");
  process.exit(0);
}

// Copy shallow paths first so nested dependencies have their parents
packageEntries.sort(([pathA], [pathB]) => {
  const depthA = pathA.split("/").length;
  const depthB = pathB.split("/").length;
  return depthA - depthB;
});

const missingFromRoot = [];

packageEntries.forEach(([pkgPath]) => {
  const pkgName = path.basename(pkgPath);
  const normalizedPath = pkgPath.replace(/\\/g, "/");
  const sourceCandidates = [
    path.join(ROOT_DIR, normalizedPath),
    path.join(ROOT_DIR, "node_modules", pkgName),
  ];
  const sourcePath = sourceCandidates.find(candidate => fs.existsSync(candidate));
  const targetPath = path.join(serverDir, pkgPath);
  const parentDir = path.dirname(targetPath);
  if (!sourcePath) {
    missingFromRoot.push(pkgPath);
    return;
  }
  fs.mkdirSync(parentDir, { recursive: true });
  fs.cpSync(sourcePath, targetPath, { recursive: true });
});

if (missingFromRoot.length) {
  console.warn("[WAAN] Missing packages in root node_modules:");
  missingFromRoot.forEach(pkgPath => console.warn(` - ${pkgPath}`));
  console.warn("Run npm install at the repo root, then re-run this script.");
  process.exit(1);
}

console.log("[WAAN] Server dependencies copied from workspace cache.");
process.exit(0);
