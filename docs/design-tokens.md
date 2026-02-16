# ChatScope Design Tokens

The ChatScope desktop dashboard now relies on a lightweight token system so UI layers stay cohesive across phases and themes. These tokens live in `styles.base.css` under the `:root` block, with light and dark overrides via `data-color-scheme`.

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

## Accessibility Toggles

- **Motion: Reduced** → `data-reduce-motion="true"` + `localStorage["waan-reduce-motion"]`. Used by JS helpers so animations and blurs are skipped both in CSS and JS (e.g., collapsible cards avoid animated heights).
- **Contrast: Boosted** → `data-contrast="high"` + `localStorage["waan-high-contrast"]`. Adjusts the core tokens above to deliver higher-contrast glass surfaces and stronger outlines.

These toggles live next to the theme selector in the toolbar, ensuring accessibility states persist across sessions and exports. Designers adding new components should rely on the existing tokens instead of hard-coded colors or timings so both toggles continue to work automatically.

## Font Assets

`Plus Jakarta Sans` weights (400–700) and the `Clash Display` variable face are bundled locally under `fonts/`. Reference them via the predefined CSS variables rather than additional `@font-face` declarations so the Electron bundle remains CSP-friendly and fully offline.
