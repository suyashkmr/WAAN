#!/usr/bin/env node

/**
 * Automatically restores the WAAN data directory from the most recent
 * `waan-data-backup-*.tgz` archive if the current data folder is missing
 * or empty. This ensures historical chat metadata and the ChatScope session
 * survive reinstallations or clean checkouts.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const DEFAULT_BACKUP_PATTERN = /^waan-data-backup-.*\.tgz$/;
const repoRoot = path.resolve(__dirname, "..");
const dataDir =
  process.env.WAAN_DATA_DIR ||
  path.join(os.homedir(), "Library", "Application Support", "WAAN");
const archiveOverride = process.env.WAAN_DATA_ARCHIVE;

function directoryHasContents(dir) {
  try {
    const entries = fs.readdirSync(dir).filter(name => !name.startsWith("."));
    return entries.length > 0;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function findLatestBackup() {
  if (archiveOverride) {
    const resolved = path.resolve(repoRoot, archiveOverride);
    if (!fs.existsSync(resolved)) {
      console.warn(
        "[restore-waandata] WAAN_DATA_ARCHIVE set to %s but file is missing.",
        resolved
      );
      return null;
    }
    return resolved;
  }

  const candidates = fs
    .readdirSync(repoRoot)
    .filter(name => DEFAULT_BACKUP_PATTERN.test(name))
    .map(name => ({
      name,
      mtime: fs.statSync(path.join(repoRoot, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!candidates.length) {
    return null;
  }
  return path.join(repoRoot, candidates[0].name);
}

function restoreFromArchive(archivePath) {
  const parentDir = path.dirname(dataDir);
  fs.mkdirSync(parentDir, { recursive: true });
  console.log(
    "[restore-waandata] Restoring %s into %s",
    path.basename(archivePath),
    parentDir
  );
  const result = spawnSync("tar", ["xzf", archivePath, "-C", parentDir], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`tar exited with code ${result.status}`);
  }
}

function main() {
  if (directoryHasContents(dataDir)) {
    return;
  }

  const archivePath = findLatestBackup();
  if (!archivePath) {
    console.warn(
      "[restore-waandata] No backup archive found. Skipping automatic restore."
    );
    return;
  }

  restoreFromArchive(archivePath);
}

main();
