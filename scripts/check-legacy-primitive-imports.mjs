#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const JS_ROOT = path.join(ROOT, "js");

const FORBIDDEN_MODULES = [
  "js/ui/primitives.js",
  "js/ui/appShellPrimitives.js",
];

const SELF_ALLOWLIST = new Set(FORBIDDEN_MODULES);

/**
 * @param {string} filePath
 */
function toPosixRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

/**
 * @param {string} filePath
 * @returns {string[]}
 */
function collectJsFiles(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.isFile()) return filePath.endsWith(".js") ? [filePath] : [];
  if (!stat.isDirectory()) return [];
  return fs.readdirSync(filePath).flatMap(name => collectJsFiles(path.join(filePath, name)));
}

/**
 * @param {string} fromFile
 * @param {string} specifier
 */
function resolveImportTarget(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const resolved = path.resolve(path.dirname(fromFile), specifier);
  if (!resolved.startsWith(ROOT)) return null;
  const withExt = resolved.endsWith(".js") ? resolved : `${resolved}.js`;
  return toPosixRelative(withExt);
}

function main() {
  const files = collectJsFiles(JS_ROOT);
  /** @type {Array<{ file: string, target: string, specifier: string }>} */
  const violations = [];
  files.forEach(filePath => {
    const file = toPosixRelative(filePath);
    if (SELF_ALLOWLIST.has(file)) return;
    const source = fs.readFileSync(filePath, "utf8");
    // Use a fresh matcher per file so lastIndex cannot leak between iterations.
    const importPattern = /\b(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["'`]([^"'`]+)["'`]|import\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
    let match = importPattern.exec(source);
    while (match) {
      const specifier = String(match[1] || match[2] || "");
      const target = resolveImportTarget(filePath, specifier);
      if (target && FORBIDDEN_MODULES.includes(target)) {
        violations.push({ file, target, specifier });
      }
      match = importPattern.exec(source);
    }
  });

  if (!violations.length) {
    console.log("[legacy-primitives] OK: no runtime imports reference legacy primitive builders.");
    return;
  }

  console.error("[legacy-primitives] Forbidden legacy primitive imports found:");
  violations
    .sort((a, b) => `${a.file}:${a.specifier}`.localeCompare(`${b.file}:${b.specifier}`))
    .forEach(item => {
      console.error(`  - ${item.file} imports ${item.specifier} -> ${item.target}`);
    });
  process.exitCode = 1;
}

main();
