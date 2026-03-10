#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILES = [
  path.resolve(ROOT, "index.html"),
  ...walk(path.resolve(ROOT, "js")).filter(file => file.endsWith(".js") || file.endsWith(".mjs")),
];

const CLASS_ATTR = /\bclass(?:Name)?\s*=\s*(["'`])([\s\S]*?)\1/g;
const CLASS_PROP_STRING = /\bclass(?:Name)?\s*:\s*(["'`])([\s\S]*?)\1/g;
const CLASS_PROP_ARRAY = /\bclass\s*:\s*\[([\s\S]*?)\]/g;
const CLASSNAME_ASSIGN = /\.className\s*=\s*(["'`])([\s\S]*?)\1/g;
const CLASSLIST_MUTATION = /\.classList\s*\.\s*(?:add|remove|toggle)\s*\(([\s\S]*?)\)/g;
const SETATTRIBUTE_CLASS = /\.setAttribute\s*\(\s*(["'])class\1\s*,\s*(["'`])([\s\S]*?)\2\s*\)/g;
const QUOTED_STRING = /(["'`])([\s\S]*?)\1/g;
const SPLIT_RESPONSIVE = /^(?:[a-z]+:)+/;
const ALLOWED_LAYOUT_EXACT = new Set([
  "grid",
  "flex",
  "inline",
  "inline-flex",
  "inline-grid",
  "block",
  "inline-block",
  "contents",
  "static",
  "relative",
  "absolute",
  "fixed",
  "sticky",
  "grow",
  "shrink",
  "flex-wrap",
  "flex-nowrap",
  "flex-wrap-reverse",
]);

const AMBIGUOUS_ALLOWED_EXACT = new Set(["hidden"]);

const ALLOWED_LAYOUT_PREFIXES = [
  "grid-cols-",
  "grid-rows-",
  "col-span-",
  "row-span-",
  "col-start-",
  "col-end-",
  "row-start-",
  "row-end-",
  "auto-cols-",
  "auto-rows-",
  "gap-",
  "gap-x-",
  "gap-y-",
  "space-x-",
  "space-y-",
  "p-",
  "px-",
  "py-",
  "pt-",
  "pr-",
  "pb-",
  "pl-",
  "m-",
  "mx-",
  "my-",
  "mt-",
  "mr-",
  "mb-",
  "ml-",
  "w-",
  "h-",
  "min-w-",
  "min-h-",
  "max-w-",
  "max-h-",
  "flex-",
  "items-",
  "justify-",
  "content-",
  "self-",
  "place-",
  "z-",
  "top-",
  "right-",
  "bottom-",
  "left-",
  "inset-",
  "overflow-",
  "overflow-x-",
  "overflow-y-",
];

const FORBIDDEN_PREFIXES = [
  "bg-",
  "text-",
  "font-",
  "tracking-",
  "leading-",
  "shadow-",
  "rounded",
  "border",
  "ring",
  "outline-",
  "fill-",
  "stroke-",
  "from-",
  "to-",
  "via-",
  "decoration-",
];

const FORBIDDEN_EXACT = new Set([
  "antialiased",
  "uppercase",
  "lowercase",
  "capitalize",
  "normal-case",
  "italic",
  "not-italic",
  "underline",
  "line-through",
  "no-underline",
  "transition",
  "blur",
  "truncate",
]);

const TAILWIND_LOOKALIKE_PREFIXES = [
  ...ALLOWED_LAYOUT_PREFIXES,
  ...FORBIDDEN_PREFIXES,
  "container",
  "aspect-",
  "object-",
  "opacity-",
  "blur-",
  "brightness-",
  "contrast-",
  "saturate-",
  "grayscale",
  "sepia",
  "mix-blend-",
  "bg-blend-",
  "backdrop-",
  "transition-",
  "duration-",
  "ease-",
  "delay-",
  "animate-",
  "origin-",
  "scale-",
  "rotate-",
  "translate-",
  "skew-",
  "order-",
  "basis-",
  "grow-",
  "shrink-",
  "whitespace-",
  "break-",
  "align-",
  "justify-items-",
  "justify-self-",
  "place-items-",
  "place-self-",
];

/** @param {string} dir */
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** @param {string} token */
function stripResponsive(token) {
  return token.replace(SPLIT_RESPONSIVE, "");
}

/** @param {string} token */
function isLayoutUtility(token) {
  return ALLOWED_LAYOUT_EXACT.has(token) || ALLOWED_LAYOUT_PREFIXES.some(prefix => token.startsWith(prefix));
}

/** @param {string} token */
function isForbiddenUtility(token) {
  return FORBIDDEN_EXACT.has(token) || FORBIDDEN_PREFIXES.some(prefix => token === prefix || token.startsWith(prefix));
}

/** @param {string} token */
function looksLikeTailwindUtility(token) {
  return ALLOWED_LAYOUT_EXACT.has(token)
    || AMBIGUOUS_ALLOWED_EXACT.has(token)
    || FORBIDDEN_EXACT.has(token)
    || TAILWIND_LOOKALIKE_PREFIXES.some(prefix => token === prefix || token.startsWith(prefix));
}

/**
 * @param {string} classValue
 * @returns {string[]}
 */
function tokenizeClassValue(classValue) {
  return classValue.split(/\s+/).filter(Boolean);
}

/**
 * @param {string} source
 * @returns {string[]}
 */
function extractClassTokens(source) {
  const tokens = [];

  for (const regex of [CLASS_ATTR, CLASS_PROP_STRING, CLASSNAME_ASSIGN, SETATTRIBUTE_CLASS]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source))) {
      const classValue = regex === SETATTRIBUTE_CLASS ? match[3] : match[2];
      tokens.push(...tokenizeClassValue(classValue));
    }
  }

  CLASS_PROP_ARRAY.lastIndex = 0;
  let arrayMatch;
  while ((arrayMatch = CLASS_PROP_ARRAY.exec(source))) {
    const arrayBody = arrayMatch[1];
    QUOTED_STRING.lastIndex = 0;
    let quotedMatch;
    while ((quotedMatch = QUOTED_STRING.exec(arrayBody))) {
      tokens.push(...tokenizeClassValue(quotedMatch[2]));
    }
  }

  CLASSLIST_MUTATION.lastIndex = 0;
  let classListMatch;
  while ((classListMatch = CLASSLIST_MUTATION.exec(source))) {
    const argsBody = classListMatch[1];
    QUOTED_STRING.lastIndex = 0;
    let quotedMatch;
    while ((quotedMatch = QUOTED_STRING.exec(argsBody))) {
      tokens.push(...tokenizeClassValue(quotedMatch[2]));
    }
  }

  return tokens;
}

const violations = [];
let foundLayoutUtility = false;

for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const tokens = extractClassTokens(source);
  for (const rawToken of tokens) {
    const token = stripResponsive(rawToken);
    if (!token) continue;
    if (isLayoutUtility(token)) {
      foundLayoutUtility = true;
      continue;
    }
    if (AMBIGUOUS_ALLOWED_EXACT.has(token)) {
      continue;
    }
    if (isForbiddenUtility(token)) {
      violations.push({ file, token: rawToken, reason: "forbidden styling utility" });
      continue;
    }
    if (looksLikeTailwindUtility(token)) {
      violations.push({ file, token: rawToken, reason: "non-layout or unknown Tailwind utility" });
    }
  }
}

if (violations.length) {
  console.error("[tailwind-layout-only] Found forbidden Tailwind utility usage in runtime markup:");
  for (const violation of violations) {
    console.error(`  - ${path.relative(ROOT, violation.file)} -> ${violation.token} (${violation.reason})`);
  }
  process.exit(1);
}

if (!foundLayoutUtility) {
  console.log("[tailwind-layout-only] OK: no runtime Tailwind utilities found in markup; no forbidden component-skinning utilities detected.");
  process.exit(0);
}

console.log("[tailwind-layout-only] OK: runtime markup uses Tailwind for layout glue only.");
