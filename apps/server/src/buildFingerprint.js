const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function walkFingerprintFiles(rootDir, relativeDir = "", {
  readdirSync = fs.readdirSync,
  statSync = fs.statSync,
} = {}) {
  const directoryPath = path.join(rootDir, relativeDir);
  const entries = readdirSync(directoryPath).sort((left, right) => left.localeCompare(right));
  const files = [];

  for (const entry of entries) {
    const entryRelativePath = path.join(relativeDir, entry);
    const entryPath = path.join(rootDir, entryRelativePath);
    const stat = statSync(entryPath);
    if (stat.isDirectory()) {
      files.push(...walkFingerprintFiles(rootDir, entryRelativePath, { readdirSync, statSync }));
      continue;
    }
    if (!/\.(c?js|json)$/i.test(entry)) {
      continue;
    }
    files.push(entryRelativePath);
  }

  return files;
}

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function computeServerBuildFingerprint({
  serverRoot,
  readFileSync = fs.readFileSync,
  readdirSync = fs.readdirSync,
  statSync = fs.statSync,
} = {}) {
  if (!serverRoot) {
    return null;
  }

  try {
    const hash = crypto.createHash("sha256");
    const fingerprintFiles = [
      "package.json",
      "package-lock.json",
      ...walkFingerprintFiles(serverRoot, "src", { readdirSync, statSync }),
    ];

    for (const relativePath of fingerprintFiles) {
      const content = readFileSync(path.join(serverRoot, relativePath));
      hash.update(normalizeRelativePath(relativePath));
      hash.update("\n");
      hash.update(content);
      hash.update("\n");
    }

    return hash.digest("hex");
  } catch {
    return null;
  }
}

module.exports = {
  computeServerBuildFingerprint,
};
