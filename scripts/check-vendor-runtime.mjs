#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function fail(message) {
  console.error(`[check:vendor-runtime] ${message}`);
  process.exit(1);
}

function sha256ForFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, "package.json");
if (!fs.existsSync(packageJsonPath)) {
  fail("package.json not found in current working directory.");
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const vueVersion = packageJson?.dependencies?.vue;
const primeVueVersion = packageJson?.dependencies?.primevue;
if (!vueVersion || !primeVueVersion) {
  fail("Missing required dependencies in package.json (`vue` and `primevue`).");
}

const checks = [
  {
    label: `vue@${vueVersion}`,
    source: path.join(projectRoot, "node_modules/vue/dist/vue.global.prod.js"),
    vendor: path.join(projectRoot, "vendor/vue/vue.global.prod.js"),
  },
  {
    label: `primevue@${primeVueVersion}`,
    source: path.join(projectRoot, "node_modules/primevue/umd/primevue.min.js"),
    vendor: path.join(projectRoot, "vendor/primevue/primevue.min.js"),
  },
];

for (const item of checks) {
  if (!fs.existsSync(item.source)) {
    fail(`Source runtime file missing for ${item.label}: ${path.relative(projectRoot, item.source)}`);
  }
  if (!fs.existsSync(item.vendor)) {
    fail(`Vendored runtime file missing for ${item.label}: ${path.relative(projectRoot, item.vendor)}`);
  }

  const sourceHash = sha256ForFile(item.source);
  const vendorHash = sha256ForFile(item.vendor);
  if (sourceHash !== vendorHash) {
    fail(
      `Vendored runtime file mismatch for ${item.label}: ${path.relative(projectRoot, item.vendor)}.\n` +
        `  expected sha256 ${sourceHash}\n` +
        `  actual   sha256 ${vendorHash}\n` +
        "  recopy from node_modules to vendor and commit the updated asset."
    );
  }
}

console.log(
  `[check:vendor-runtime] Vendored runtime assets are present and match pinned dependencies (` +
    `vue@${vueVersion}, primevue@${primeVueVersion}).`
);
