#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_HTML = path.resolve(ROOT, "index.html");

const REQUIRED_CLASSES = [
  "bg-canvas",
  "text-text-base",
  "font-base",
  "bg-surface-glass",
  "border-border-glass",
  "bg-surface-base",
  "border-border-subtle",
  "shadow-card",
  "font-display",
  "text-display-hero",
];

if (!fs.existsSync(INDEX_HTML)) {
  console.error("[tailwind-adoption] Missing index.html.");
  process.exit(1);
}

const html = fs.readFileSync(INDEX_HTML, "utf8");
const missing = REQUIRED_CLASSES.filter(token => !new RegExp(`\\b${token}\\b`, "m").test(html));

if (missing.length) {
  console.error("[tailwind-adoption] Missing required Tailwind utility classes:");
  missing.forEach(token => console.error(`  - ${token}`));
  process.exit(1);
}

console.log(`[tailwind-adoption] OK: required Tailwind utility classes found (${REQUIRED_CLASSES.length}).`);
