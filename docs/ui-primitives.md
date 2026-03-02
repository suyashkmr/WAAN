# UI Primitives (Vue + PrimeVue)

WAAN now uses Vue 3 islands with PrimeVue-ready primitives for interactive shell surfaces.

## Foundation Files

- Runtime loader: `js/ui/primitivesRuntime.js`
- Primitive API: `js/ui/primitives.js`
- Vue composables: `js/ui/primitivesVueComposables.js`
- Vue shell bridge: `js/vue/shellPrimitivesIsland.js`
- Vue summary bridge: `js/vue/summaryIsland.js`
- Vendored runtime assets:
  - `vendor/vue/vue.global.prod.js`
  - `vendor/primevue/primevue.min.js`

## Available Primitives

- `createUiButton`
- `createUiInput`
- `createUiSelect`
- `createUiDialog`
- `createUiTooltip`
- `createUiTabs`
- `createUiCard`

## Usage Rules

- Use primitives for all new interactive UI in migration phases; avoid adding new ad-hoc button/input/select patterns.
- Keep existing app-specific classes until each surface is fully migrated and parity-verified.
- Drive colors/spacing/motion through existing tokens (`--surface-*`, `--text-*`, `--border-*`, `--state-*`, `--motion-*`), not hard-coded values.
- Prefer shared shell/component classes for repeated UI chrome; use Tailwind utilities for local layout composition only.
- Respect accessibility state attributes:
  - motion: `body[data-reduce-motion="true"]`
  - contrast: `body[data-contrast="high"]`
- Prefer Vue shell bridges/components for dialogs/tooltips/tabs and keep native fallback primitives behaviorally aligned.

## Notes

- This remains a compatibility primitive layer for a vanilla JS + Electron app while Vue islands incrementally expand.
- `initUiPrimitives()` syncs runtime theme/motion/contrast state markers from `data-color-scheme`, `data-reduce-motion`, and `data-contrast`.
- Relay status indicator internals intentionally remain custom (`#relay-status-dot.relay-banner-indicator`) to preserve existing pulse/reduced-motion/high-contrast behavior without extra runtime dependencies.
- Summary cards, relay controls, and search/saved-view controls now run without Shoelace custom-element proxies.
- Runtime contract: do not introduce new `sl-*` custom elements in app-shell surfaces; use semantic HTML + Vue/PrimeVue wrappers/composables instead.
