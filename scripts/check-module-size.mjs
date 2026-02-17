#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const MAX_LINES = 350;
const ROOT = process.cwd();
const SCAN_DIRS = ["js", "apps/server/src"];
const TEMP_ALLOWLIST = new Set([
  "js/exporters/createExporters.js",
  "js/analytics/summary.js",
]);

function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      acc.push(full);
    }
  }
  return acc;
}

function lineCount(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  if (!text) return 0;
  const lines = text.split(/\r?\n/);
  if (text.endsWith("\n")) {
    lines.pop();
  }
  return lines.length;
}

const breaches = [];
const allowlisted = [];

for (const relDir of SCAN_DIRS) {
  const absDir = path.join(ROOT, relDir);
  if (!fs.existsSync(absDir)) continue;
  const files = walk(absDir);
  for (const absFile of files) {
    const relFile = path.relative(ROOT, absFile).replace(/\\/g, "/");
    const lines = lineCount(absFile);
    if (lines <= MAX_LINES) continue;
    if (TEMP_ALLOWLIST.has(relFile)) {
      allowlisted.push({ file: relFile, lines });
    } else {
      breaches.push({ file: relFile, lines });
    }
  }
}

if (allowlisted.length) {
  console.log("[module-size] Allowlisted hotspots:");
  allowlisted
    .sort((a, b) => b.lines - a.lines)
    .forEach(item => console.log(`  - ${item.file}: ${item.lines}`));
}

if (breaches.length) {
  console.error(`[module-size] Files above ${MAX_LINES} lines (not allowlisted):`);
  breaches
    .sort((a, b) => b.lines - a.lines)
    .forEach(item => console.error(`  - ${item.file}: ${item.lines}`));
  process.exit(1);
}

console.log(`[module-size] OK: no non-allowlisted files above ${MAX_LINES} lines.`);
