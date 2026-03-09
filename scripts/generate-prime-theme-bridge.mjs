import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { palette } from '@primeuix/themes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'styles', 'prime-theme-bridge.css');
const checkOnly = process.argv.includes('--check');

const SURFACE_DARK = {
  0: '#ffffff',
  50: '#eef2ff',
  100: '#dde3f5',
  200: '#c6cfeb',
  300: '#aeb9d8',
  400: '#96a1c5',
  500: '#7b86a8',
  600: '#5e6984',
  700: '#434d64',
  800: '#101723',
  900: '#161e2b',
  950: '#070b12'
};

const SURFACE_LIGHT = {
  0: '#ffffff',
  50: '#faf8f3',
  100: '#f6f1e8',
  200: '#f1ece2',
  300: '#e3ddcf',
  400: '#c9c0ae',
  500: '#a79c88',
  600: '#7c7467',
  700: '#56504a',
  800: '#383432',
  900: '#232220',
  950: '#161514'
};

const SCHEMES = {
  dark: {
    selector: ':root, :root[data-color-scheme="dark"]',
    primaryBase: '#d6b36e',
    primaryColor: '#d6b36e',
    primaryHover: '#dec18a',
    primaryActive: '#eddec1',
    primaryContrast: '#171106',
    primaryContainer: '#4f3f1d',
    primaryContainerContrast: '#f8e9c6',
    secondaryColor: '#88b7c8',
    secondaryContrast: '#07141a',
    secondaryContainer: '#1f3d49',
    secondaryContainerContrast: '#d3edf6',
    tertiaryColor: '#f07b95',
    tertiaryContrast: '#2d0911',
    tertiaryContainer: '#5a1f2d',
    tertiaryContainerContrast: '#ffd9e1',
    neutralColor: '#9ea9be',
    surface: SURFACE_DARK,
    outline: 'rgba(142, 154, 182, 0.44)',
    outlineVariant: 'rgba(96, 110, 138, 0.32)',
    textColor: '#edf1ff',
    textHoverColor: '#ffffff',
    textMutedColor: '#bcc7de',
    textMutedHoverColor: '#d7e0f5',
    formFieldBackground: '#070b12',
    formFieldBorderColor: 'rgba(96, 110, 138, 0.32)',
    contentBackground: '#161e2b',
    contentBorderColor: 'rgba(96, 110, 138, 0.32)',
    overlayBackground: '#161e2b',
    overlayBorderColor: 'rgba(96, 110, 138, 0.32)',
    surfaceTintMix: '20%',
    mdSurface: 'var(--p-surface-950)',
    mdSurfaceContainerHigh: 'var(--p-surface-900)',
    mdSurfaceContainer: 'var(--p-surface-800)',
    successColor: '#38d99d',
    successContrast: '#07150f',
    dangerColor: '#ff7c96',
    dangerContrast: '#2d0911',
    warningColor: '#f4c263',
    warningContrast: '#201506'
  },
  light: {
    selector: ':root[data-color-scheme="light"]',
    primaryBase: '#9c7332',
    primaryColor: '#9c7332',
    primaryHover: '#7f5e29',
    primaryActive: '#664b20',
    primaryContrast: '#ffffff',
    primaryContainer: '#f6e3c2',
    primaryContainerContrast: '#2f220f',
    secondaryColor: '#3f7284',
    secondaryContrast: '#ffffff',
    secondaryContainer: '#d6e8ef',
    secondaryContainerContrast: '#10242d',
    tertiaryColor: '#bb4e68',
    tertiaryContrast: '#ffffff',
    tertiaryContainer: '#ffdbe2',
    tertiaryContainerContrast: '#3b0f1a',
    neutralColor: '#565f70',
    surface: SURFACE_LIGHT,
    outline: 'rgba(83, 92, 112, 0.45)',
    outlineVariant: 'rgba(84, 94, 114, 0.22)',
    textColor: '#1c2028',
    textHoverColor: '#111418',
    textMutedColor: '#4f596c',
    textMutedHoverColor: '#2f3743',
    formFieldBackground: '#ffffff',
    formFieldBorderColor: 'rgba(84, 94, 114, 0.22)',
    contentBackground: '#ffffff',
    contentBorderColor: 'rgba(84, 94, 114, 0.22)',
    overlayBackground: '#ffffff',
    overlayBorderColor: 'rgba(84, 94, 114, 0.22)',
    surfaceTintMix: '14%',
    mdSurface: 'var(--p-surface-50)',
    mdSurfaceContainerHigh: 'var(--p-surface-200)',
    mdSurfaceContainer: 'var(--p-surface-100)',
    successColor: '#2e7d32',
    successContrast: '#ffffff',
    dangerColor: '#c62828',
    dangerContrast: '#ffffff',
    warningColor: '#da9b2e',
    warningContrast: '#ffffff'
  }
};

function createDeclarations(config) {
  const primaryPalette = palette(config.primaryBase);
  const declarations = [];
  const push = (name, value) => declarations.push(`  ${name}: ${value};`);

  for (const [shade, value] of Object.entries(primaryPalette)) {
    push(`--p-primary-${shade}`, value);
  }

  for (const [shade, value] of Object.entries(config.surface)) {
    push(`--p-surface-${shade}`, value);
  }

  push('--p-primary-color', config.primaryColor);
  push('--p-primary-hover-color', config.primaryHover);
  push('--p-primary-active-color', config.primaryActive);
  push('--p-primary-contrast-color', config.primaryContrast);
  push('--p-text-color', config.textColor);
  push('--p-text-hover-color', config.textHoverColor);
  push('--p-text-muted-color', config.textMutedColor);
  push('--p-text-muted-hover-color', config.textMutedHoverColor);
  push('--p-content-background', config.contentBackground);
  push('--p-content-border-color', config.contentBorderColor);
  push('--p-form-field-background', config.formFieldBackground);
  push('--p-form-field-border-color', config.formFieldBorderColor);
  push('--p-overlay-modal-background', config.overlayBackground);
  push('--p-overlay-modal-border-color', config.overlayBorderColor);
  push('--p-overlay-select-background', config.overlayBackground);
  push('--p-overlay-select-border-color', config.overlayBorderColor);
  push('--p-focus-ring-color', 'var(--p-primary-color)');
  push('--p-border-radius-sm', '12px');
  push('--p-border-radius-md', '16px');
  push('--p-border-radius-lg', '28px');
  push('--p-border-radius-xl', '36px');
  push('--p-app-secondary-color', config.secondaryColor);
  push('--p-app-secondary-contrast-color', config.secondaryContrast);
  push('--p-app-secondary-container-color', config.secondaryContainer);
  push('--p-app-secondary-container-contrast-color', config.secondaryContainerContrast);
  push('--p-app-tertiary-color', config.tertiaryColor);
  push('--p-app-tertiary-contrast-color', config.tertiaryContrast);
  push('--p-app-tertiary-container-color', config.tertiaryContainer);
  push('--p-app-tertiary-container-contrast-color', config.tertiaryContainerContrast);
  push('--p-app-success-color', config.successColor);
  push('--p-app-success-contrast-color', config.successContrast);
  push('--p-app-danger-color', config.dangerColor);
  push('--p-app-danger-contrast-color', config.dangerContrast);
  push('--p-app-warning-color', config.warningColor);
  push('--p-app-warning-contrast-color', config.warningContrast);
  push('--p-app-outline-color', config.outline);
  push('--p-app-outline-variant-color', config.outlineVariant);
  push('--p-app-neutral-color', config.neutralColor);
  push('--md-primary', 'var(--p-primary-color)');
  push('--md-on-primary', 'var(--p-primary-contrast-color)');
  push('--md-primary-container', config.primaryContainer);
  push('--md-on-primary-container', config.primaryContainerContrast);
  push('--md-secondary', 'var(--p-app-secondary-color)');
  push('--md-on-secondary', 'var(--p-app-secondary-contrast-color)');
  push('--md-secondary-container', 'var(--p-app-secondary-container-color)');
  push('--md-on-secondary-container', 'var(--p-app-secondary-container-contrast-color)');
  push('--md-tertiary', 'var(--p-app-tertiary-color)');
  push('--md-on-tertiary', 'var(--p-app-tertiary-contrast-color)');
  push('--md-tertiary-container', 'var(--p-app-tertiary-container-color)');
  push('--md-on-tertiary-container', 'var(--p-app-tertiary-container-contrast-color)');
  push('--md-neutral', 'var(--p-app-neutral-color)');
  push('--md-surface', config.mdSurface);
  push('--md-surface-container-high', config.mdSurfaceContainerHigh);
  push('--md-surface-container', config.mdSurfaceContainer);
  push('--md-outline', 'var(--p-app-outline-color)');
  push('--md-outline-variant', 'var(--p-app-outline-variant-color)');
  push('--md-on-surface', 'var(--p-text-color)');
  push('--md-on-surface-variant', 'var(--p-text-muted-color)');
  push('--surface-tint', `color-mix(in srgb, var(--p-primary-color) ${config.surfaceTintMix}, transparent)`);
  push('--positive', 'var(--p-app-success-color)');
  push('--negative', 'var(--p-app-danger-color)');
  push('--warning', 'var(--p-app-warning-color)');
  push('--shape-small', 'var(--p-border-radius-sm)');
  push('--shape-medium', 'var(--p-border-radius-md)');
  push('--shape-large', 'var(--p-border-radius-lg)');

  return declarations.join('\n');
}

function buildCss() {
  const sections = [
    '/* This file is generated by scripts/generate-prime-theme-bridge.mjs. Do not edit by hand. */',
    '/* Phase 12 bridge: Prime-style token contract feeds legacy WAAN variables until full consolidation is complete. */',
    ''
  ];

  const darkConfig = SCHEMES.dark;
  const lightConfig = SCHEMES.light;

  sections.push(`${darkConfig.selector} {`);
  sections.push(createDeclarations(darkConfig));
  sections.push('}');
  sections.push('');

  sections.push('@media (prefers-color-scheme: dark) {');
  sections.push('  :root:not([data-color-scheme]) {');
  sections.push(createDeclarations(darkConfig).replace(/^/gm, '  '));
  sections.push('  }');
  sections.push('}');
  sections.push('');

  sections.push('@media (prefers-color-scheme: light) {');
  sections.push('  :root:not([data-color-scheme]) {');
  sections.push(createDeclarations(lightConfig).replace(/^/gm, '  '));
  sections.push('  }');
  sections.push('}');
  sections.push('');

  sections.push(`${lightConfig.selector} {`);
  sections.push(createDeclarations(lightConfig));
  sections.push('}');
  sections.push('');

  return `${sections.join('\n').trim()}\n`;
}

const nextCss = buildCss();

if (checkOnly) {
  const currentCss = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  if (currentCss !== nextCss) {
    console.error('Prime theme bridge is out of date. Run: node scripts/generate-prime-theme-bridge.mjs');
    process.exit(1);
  }
  process.exit(0);
}

fs.writeFileSync(outputPath, nextCss, 'utf8');
console.log(path.relative(projectRoot, outputPath));
