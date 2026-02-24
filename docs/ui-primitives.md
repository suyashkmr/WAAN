# UI Primitives (Shoelace)

WAAN uses Shoelace as the framework-agnostic primitive layer for the Tailwind migration.

## Foundation Files

- Runtime loader: `js/ui/primitivesRuntime.js`
- Primitive API: `js/ui/primitives.js`
- Theme token bridge: `styles.shoelace.css`
- Vendored Shoelace runtime/theme:
  - `vendor/shoelace/shoelace-autoloader.js`
  - `vendor/shoelace/themes/light.css`
  - `vendor/shoelace/themes/dark.css`

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
- Drive colors/spacing/motion through existing tokens (`--accent`, `--border`, `--motion-*`), not hard-coded values.
- Respect accessibility state attributes:
  - motion: `body[data-reduce-motion="true"]`
  - contrast: `body[data-contrast="high"]`
- For dialogs/tooltips/tabs, prefer Shoelace primitives over custom JS behavior unless there is a proven gap.

## Notes

- This is a compatibility replacement for `shadcn/ui` in a vanilla JS + Electron app.
- `initShoelacePrimitives()` syncs Shoelace theme classes with `data-color-scheme` at runtime.
- Relay controls migration rollback key:
  - Set `localStorage["waan-ui-relay-legacy"]="true"` to keep legacy `<button>` controls.
- Relay status banner shell now migrates to Shoelace `sl-card` before app bootstrap (same `id` + child IDs are preserved).
- Relay status indicator internals intentionally remain custom (`#relay-status-dot.relay-banner-indicator`) to preserve existing pulse/reduced-motion/high-contrast behavior without extra runtime dependencies.
- Search/filter/saved/export controls rollback key:
  - Set `localStorage["waan-ui-controls-legacy"]="true"` to keep legacy action buttons and form fields for these surfaces.
