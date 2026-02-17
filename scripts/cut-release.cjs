#!/usr/bin/env node
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function run(cmd, options = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...options }).trim();
}

function runInherit(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpVersion(version, kind) {
  const parsed = parseVersion(version);
  if (!parsed) return null;
  if (kind === "patch") return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  if (kind === "minor") return `${parsed.major}.${parsed.minor + 1}.0`;
  if (kind === "major") return `${parsed.major + 1}.0.0`;
  return null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function printUsage() {
  console.log(
    "Usage: npm run release:cut -- <version|patch|minor|major> [--no-push]\n" +
      "Examples:\n" +
      "  npm run release:cut -- 1.1.4\n" +
      "  npm run release:cut -- patch\n"
  );
}

const args = process.argv.slice(2);
if (!args.length || args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(args.length ? 0 : 1);
}

const versionArg = args[0];
const noPush = args.includes("--no-push");

const rootPackagePath = path.resolve(process.cwd(), "package.json");
const electronPackagePath = path.resolve(process.cwd(), "electron", "package.json");

if (!fs.existsSync(rootPackagePath) || !fs.existsSync(electronPackagePath)) {
  console.error("[release:cut] Run this script from the repo root.");
  process.exit(1);
}

const rootVersion = readJson(rootPackagePath).version;
const electronVersion = readJson(electronPackagePath).version;
if (rootVersion !== electronVersion) {
  console.error(
    `[release:cut] Version mismatch before cut: root=${rootVersion}, electron=${electronVersion}`
  );
  process.exit(1);
}

const targetVersion =
  versionArg === "patch" || versionArg === "minor" || versionArg === "major"
    ? bumpVersion(rootVersion, versionArg)
    : versionArg;

if (!targetVersion || !parseVersion(targetVersion)) {
  console.error(`[release:cut] Invalid target version: ${versionArg}`);
  printUsage();
  process.exit(1);
}

if (targetVersion === rootVersion) {
  console.error(`[release:cut] Target version equals current version (${rootVersion}).`);
  process.exit(1);
}

const dirty = run("git status --porcelain");
if (dirty) {
  console.error("[release:cut] Working tree is not clean. Commit/stash changes first.");
  process.exit(1);
}

const tagName = `v${targetVersion}`;
let tagExists = false;
try {
  run(`git rev-parse --verify --quiet refs/tags/${tagName}`);
  tagExists = true;
} catch {
  tagExists = false;
}
if (tagExists) {
  console.error(`[release:cut] Tag already exists locally: ${tagName}`);
  process.exit(1);
}

console.log(`[release:cut] Bumping versions to ${targetVersion}`);
runInherit(`npm version ${targetVersion} --no-git-tag-version`);
runInherit(`npm version ${targetVersion} --no-git-tag-version --prefix electron`);

console.log("[release:cut] Committing version bump");
runInherit("git add package.json package-lock.json electron/package.json electron/package-lock.json");
runInherit(`git commit -m "chore(release): bump version to ${targetVersion}"`);

console.log(`[release:cut] Creating tag ${tagName}`);
runInherit(`git tag -a ${tagName} -m "WAAN ${tagName}"`);

if (!noPush) {
  const branch = run("git branch --show-current");
  console.log(`[release:cut] Pushing branch ${branch}`);
  runInherit(`git push origin ${branch}`);
  console.log(`[release:cut] Pushing tag ${tagName}`);
  runInherit(`git push origin ${tagName}`);
} else {
  console.log("[release:cut] --no-push set, branch/tag not pushed.");
}

console.log(
  `[release:cut] Done. Tag ${tagName} will trigger .github/workflows/macos-release.yml after push.`
);
