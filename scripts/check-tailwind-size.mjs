#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const OUTPUT = path.resolve(process.cwd(), "styles.tailwind.css");
const MAX_BYTES = 32 * 1024;

if (!fs.existsSync(OUTPUT)) {
  console.error("[tailwind-size] Missing output file: styles.tailwind.css. Run `npm run tailwind:build` first.");
  process.exit(1);
}

const size = fs.statSync(OUTPUT).size;
if (size > MAX_BYTES) {
  console.error(`[tailwind-size] styles.tailwind.css is ${size} bytes (limit ${MAX_BYTES}). Check content globs/purge.`);
  process.exit(1);
}

console.log(`[tailwind-size] OK: styles.tailwind.css is ${size} bytes.`);
