#!/usr/bin/env node
import fs from "node:fs";

function fail(message) {
  console.error(`[check:release-notes] ${message}`);
  process.exit(1);
}

const releaseNotesPath = process.argv[2];
if (!releaseNotesPath) {
  fail("Missing release notes file path argument.");
}

if (!fs.existsSync(releaseNotesPath)) {
  fail(`File not found: ${releaseNotesPath}`);
}

const markdown = fs.readFileSync(releaseNotesPath, "utf8");
const sectionMatch = markdown.match(
  /## Snapshot Review Notes\s*([\s\S]*?)(?=\n##\s+|\s*$)/
);

if (!sectionMatch) {
  fail("Missing required section: '## Snapshot Review Notes'.");
}

const sectionBody = sectionMatch[1];

if (!/-\s*Intentional visual diffs:\s*(yes|no)\b/i.test(sectionBody)) {
  fail("Snapshot section must include '- Intentional visual diffs: yes|no'.");
}

if (!/-\s*Notes:\s*.+/i.test(sectionBody)) {
  fail("Snapshot section must include '- Notes: ...'.");
}

if (!/-\s*Reviewer:\s*.+/i.test(sectionBody)) {
  fail("Snapshot section must include '- Reviewer: ...'.");
}

if (/(todo|tbd|<fill|<todo|placeholder)/i.test(sectionBody)) {
  fail("Snapshot section still contains placeholder text (TODO/TBD/etc).");
}

console.log(`[check:release-notes] Snapshot review notes validated: ${releaseNotesPath}`);
