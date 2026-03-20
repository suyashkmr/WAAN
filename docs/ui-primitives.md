# UI Primitives (Vue + PrimeVue)

WAAN now uses Vue 3 islands with PrimeVue-ready primitives for interactive shell surfaces.

## Current Status

- Phase 11 is complete: app-shell runtime ownership is Vue-native via bridge registry contracts (`js/vue/bridgeRegistry.js`).
- Migrated search/saved/dashboard/status surfaces render through Vue-owned paths for primary production interaction and rendering.
- Tests include Vue-rendered integration coverage for full-shell, search results, and saved-view interactions.
- Residual non-runtime compatibility helpers may still exist in isolated modules, but they are not in active production render/event paths.
- PrimeVue adoption is partial by design:
  - adopted now: buttons, radios, dialog surfaces, and selected list/data surfaces
  - deferred to later phase work: production-default `select` / `date` controls
  - explicit exception: the saved-view gallery is Vue-rendered but does not use PrimeVue `DataView` in production, because the direct-card render path is required to preserve the responsive gallery grid

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

- Use primitives for all new interactive UI; avoid adding new ad-hoc button/input/select patterns.
- Keep existing app-specific classes unless a surface is being intentionally redesigned.
- Drive colors/spacing/motion through existing tokens (`--surface-*`, `--text-*`, `--border-*`, `--state-*`, `--motion-*`), not hard-coded values.
- Prefer shared shell/component classes for repeated UI chrome; use Tailwind utilities for local layout composition only.
- Respect accessibility state attributes:
  - motion: `body[data-reduce-motion="true"]`
  - contrast: `body[data-contrast="high"]`
- Prefer Vue shell bridges/components for dialogs/tooltips/tabs.

## Notes

- This is the active primitive compatibility layer for the Vue-owned app-shell runtime.
- `initUiPrimitives()` syncs runtime theme/motion/contrast state markers from `data-color-scheme`, `data-reduce-motion`, and `data-contrast`.
- Relay status indicator internals intentionally remain custom (`#relay-status-dot.relay-banner-indicator`) to preserve existing pulse/reduced-motion/high-contrast behavior without extra runtime dependencies.
- Summary cards, relay controls, and search/saved-view controls now run without Shoelace custom-element proxies.
- Saved-view gallery cards render directly into the Vue gallery root; do not reintroduce a `DataView` wrapper there unless the layout contract is reworked at the same time.
- Runtime contract: do not introduce new `sl-*` custom elements in app-shell surfaces; use semantic HTML + Vue/PrimeVue wrappers/composables instead.
- The current theming transition is tracked in Phase 12: `styles/prime-theme-bridge.css` now feeds Prime-style token values into the WAAN alias layer while full token consolidation is still in progress.
