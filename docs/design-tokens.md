# WAAN Design Tokens

The WAAN desktop dashboard now relies on a lightweight token system so UI layers stay cohesive across phases and themes. These tokens live in `styles.base.css` under the `:root` block, with light and dark overrides via `data-color-scheme`.

Phase 12 note: the base token layer is now fed by a generated Prime-token bridge in `styles/prime-theme-bridge.css`, produced by `scripts/generate-prime-theme-bridge.mjs`. `styles.base.css` still contains the WAAN-facing aliases and derived values, but the underlying source values are moving to Prime-style semantic tokens.

## Phase 10 Architecture Note

- Tokenized styling is consumed by Vue-owned UI surfaces (search/saved/dashboard/status) as the default runtime path.
- Legacy DOM fallback branches are no longer the default rendering contract for migrated surfaces, but scoped compatibility and non-render fallback paths still exist in the shipped runtime where later cleanup phases have not removed them yet.
- Tailwind remains a token bridge and layout utility layer; component behavior contracts are owned by Vue/PrimeVue runtime modules.

## Color & Surface Tokens

| Token | Purpose |
| --- | --- |
| `--bg` | Base canvas color (auto-switches with light/dark themes) |
| `--card-bg` | Semi-transparent glass surface used on cards, hero, toolbars |
| `--text` / `--muted` | Primary and secondary text colors |
| `--accent` / `--accent-soft` | Pill buttons, icons, nav states |
| `--border` / `--glass-border` | Outline for glass panels and nav pills |
| `--glass-bg` | Backdrop-filter fill used for hero shell, nav, snackbar |
| `--positive`, `--negative`, `--neutral-tone` | Semantic status colors |

Setting the body attribute `data-contrast="high"` boosts these tokens for users who request a high-contrast palette (stronger borders, brighter text, higher accent saturation).

## Elevation & Glassmorphism

| Token | Description |
| --- | --- |
| `--shape-small`, `--shape-medium`, `--shape-large`, `--shape-full` | Corner radii used for buttons, cards, nav pills, banners |
| `--glass-blur` | Shared blur radius for glass panels; drops to `8px` when `data-reduce-motion="true"` is set to reduce GPU work |
| Drop shadows | Cards/nav/snackbar use the same layered shadow recipe declared near `.card` / `.section-nav` so depth feels consistent |

## Motion Tokens

| Token | Description |
| --- | --- |
| `--motion-duration-fast` (`180ms`) | Hover states, pill focus |
| `--motion-duration-medium` (`320ms`) | Card hover/expand, nav transitions |
| `--motion-duration-slow` (`560ms`) | Hero/ambient elements |
| `--motion-ease-out`, `--motion-ease-emphasis` | Bezier curves shared by buttons, navs, and the relay indicator |

The app respects both system `prefers-reduced-motion` and the in-app toggle. Enabling **Motion: Reduced** sets `data-reduce-motion="true"` on `<body>`, zeroing out motion durations, lowering blur, disabling the ambient gradient animation, and snapping snackbar/nav/card transitions.

## Typography Tokens

| Token | Description |
| --- | --- |
| `--font-family-base` | Friendly humanist sans (Plus Jakarta Sans) for body copy, forms, and long reads |
| `--font-family-display` | Contrast display family (Clash Display) for hero headings, nav pills, stats, and CTA labels |

`h1`, `h2`, `.card-header h2`, `.section-nav a`, `.stat-value`, and footer branding elements automatically pull from the display stack, while every other surface inherits the base family. When adding new modules, prefer `var(--font-family-display)` for short, high-impact labels (navs, hero badges) and stick with the base token for paragraphs and descriptions so the UI keeps its approachable tone.

## Tailwind Token Bridge

Tailwind is configured as a thin bridge over CSS variables in `tailwind.config.cjs` so theme switching, high-contrast mode, and reduced-motion mode remain automatic.

Phase 13 decision (2026-03-10): Tailwind remains available for layout composition only. Runtime markup must not use Tailwind for component skinning; CI enforces this with `npm run check:tailwind-layout-only`.

Runtime styling contract:

- Prime theme tokens plus WAAN base aliases own component colors, borders, shadows, typography, and shape.
- PrimeVue and class-owned CSS own component chrome and interaction visuals.
- Tailwind in runtime markup is limited to layout orchestration only:
  - display
  - grid/flex structure
  - spacing
  - sizing
  - overflow
  - positioning/z-index
  - responsive layout variants
- Tailwind must not be used in runtime markup for:
  - colors
  - borders/rings/outlines
  - shadows
  - gradients
  - typography casing/tracking/leading/font styling
  - blur/transition/animation skinning

`npm run check:tailwind-layout-only` is the release gate for this contract and scans runtime HTML plus JS/Vue class assignment patterns (`class=`, `class:`, `className:`, `.className =`, `classList.*(...)`, `setAttribute("class", ...)`).

### Semantic Color Utilities

- `bg-surface-base`, `bg-surface-raised`, `bg-surface-raisedStrong`, `bg-surface-glass`
- `text-text-base`, `text-text-muted`, `text-text-strong`
- `border-border-base`, `border-border-subtle`, `border-border-strong`, `border-border-glass`
- `text-state-success|warning|danger|neutral` and matching soft backgrounds

### Typography Utilities

- Families: `font-base`, `font-display`
- Sizes: `text-label-xs`, `text-label-sm`, `text-body-sm`, `text-body-md`, `text-body-lg`, `text-title-sm`, `text-title-md`, `text-title-lg`, `text-display-hero`
- Line heights: `leading-tight`, `leading-snug`, `leading-body`, `leading-relaxed`
- Letter spacing: `tracking-tight`, `tracking-display`, `tracking-label`
- Weights: `font-regular`, `font-medium`, `font-semibold`

### Spatial + Motion Utilities

- Spacing scale: `*-space-0` through `*-space-7` (for `margin`, `padding`, `gap`, etc.)
- Radius: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`
- Elevation: `shadow-soft`, `shadow-float`, `shadow-card`, `shadow-card-strong`, `shadow-card-deep`, `shadow-chip`
- Motion: `duration-fast|medium|slow`, `ease-out|emphasis`, delay + translate utilities mapped to motion tokens

## Token Usage Rules

- Use semantic tokens, not raw color names, for app UI (`surface`, `text`, `border`, `state`).
- Keep primitives framework-neutral (native or Vue/PrimeVue wrappers) and style them via tokens only.
- Use shared component classes for repeated shells (panel headers, section intros, status badges). Use direct utilities only for one-off layout composition.
- Avoid hard-coded pixel/rgb values on migrated surfaces unless there is a documented exception in the same PR.
- Any new state style must support both `data-contrast="high"` and `data-reduce-motion="true"` automatically through tokens.

## Intentional Component-Local Aliases

Phase 12 does not require every component stylesheet to become a flat list of root tokens. A small number of component-local aliases are still acceptable when they are semantic wrappers over the shared token contract rather than a parallel palette system.

Current intentional aliases:

- none in runtime component stylesheets

Not acceptable:

- component-local aliases that simply restate global or shared-shell tokens with no semantic transformation
- component-local raw palette definitions that introduce new independent color/shadow systems
- render helpers or Vue islands embedding raw visual values instead of consuming the shared token contract

Current audit status (2026-03-09):

- component stylesheets no longer carry a parallel raw palette system
- analytics surfaces now use the shared `--section-accent` contract again after shell card chrome was moved onto a separate `--shell-section-accent` variable in `styles.components.css`
- shell card chrome is now consistently sourced from `--shell-section-accent`, including shared section-card and section-icon shadow tokens in `styles.base.css` plus descendant shell icon halo/fill rules in `styles.components.css`, so analytics-local `--section-accent` overrides no longer leak into shell chrome
- message-type stat accents are no longer owned by `styles.components.css`; they now resolve through shared base semantic tokens (`--stat-accent-*`) defined in `styles.base.css`
- shared-shell overlay, tooltip, FAQ card, snackbar, and weekly-bar visual recipes now resolve through base tokens in `styles.base.css`; `styles.components.css` no longer carries those raw shadow/overlay/gradient values inline
- shared primary/danger button chrome now resolves through base control tokens in `styles.base.css`; `styles.components.css` no longer owns separate default/dark button fill, border, and shadow recipes inline
- shared-shell card/select/empty-state/footer/stat elevations now resolve through base tokens in `styles.base.css`; `styles.components.css` no longer carries those shadow recipes inline for accent cards, poll items, native selects, notifications, dataset/empty states, summary cards, sticky table headers, stat cards, or footer marks
- shared-shell hero celebration glints, dark ghost/theme/card-toggle shadows, sentiment/list/summary/stat surface shadows, empty-illustration sheen, table inset sheen, and mobile table-row elevation now also resolve through base tokens instead of inline recipes in `styles.components.css`
- remaining raw visual values in runtime UI code are confined to the shared base token layer and intentional platform-specific shadow composition, not per-component skinning islands
- the remaining raw values in `styles.base.css` are now classified as legitimate foundation definitions rather than migration debt:
  - base semantic palette and light/dark/high-contrast overrides
  - alpha-backed semantic helpers such as `--positive-soft` / `--negative-soft`
  - calendar heatmap intensity levels and their foreground contrast tokens
  - shared shadow RGB/alpha definitions used by composed shadow tokens
  - shared logo/footer/backdrop primitives used by the shell chrome
- remaining raw values outside the runtime token layer are limited to:
  - print-only overrides in `styles.components.css`
  - export-only theme definitions in `js/theme.js` and `js/exportDeck/css.js`

## Accessibility Toggles

- **Motion: Reduced** → `data-reduce-motion="true"` + `localStorage["waan-reduce-motion"]`. Used by JS helpers so animations and blurs are skipped both in CSS and JS (e.g., collapsible cards avoid animated heights).
- **Contrast: Boosted** → `data-contrast="high"` + `localStorage["waan-high-contrast"]`. Adjusts the core tokens above to deliver higher-contrast glass surfaces and stronger outlines.

These toggles live next to the theme selector in the toolbar, ensuring accessibility states persist across sessions and exports. Designers adding new components should rely on the existing tokens instead of hard-coded colors or timings so both toggles continue to work automatically.

## Font Assets

`Plus Jakarta Sans` weights (400–700) and the `Clash Display` variable face are bundled locally under `fonts/`. Reference them via the predefined CSS variables rather than additional `@font-face` declarations so the Electron bundle remains CSP-friendly and fully offline.
