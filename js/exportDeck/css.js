export function buildExportDeckCss(theme, { mode = "screen" } = {}) {
  const accent = theme?.accent || "#4c6ef5";
  const accentSoft = theme?.accentSoft || "rgba(76, 110, 245, 0.2)";
  const surface = theme?.surface || "#ffffff";
  const canvas = theme?.canvas || "#f5f7fb";
  const text = theme?.text || "#0f172a";
  const muted = theme?.muted || "#475569";
  const border = theme?.border || "rgba(15, 23, 42, 0.1)";
  const coverGradient = theme?.coverGradient || `linear-gradient(135deg, ${accent}, ${accent})`;
  const coverPattern = theme?.coverPattern || "none";
  const coverText = theme?.coverText || "#f8fafc";
  const badge = theme?.badge || accentSoft;
  const shadow = theme?.cardShadow || "0 25px 60px rgba(15, 23, 42, 0.25)";
  const deckPadding = mode === "print" ? "1in 0.75in" : "3rem 2rem";
  const slideWidth = mode === "screen" ? "960px" : "100%";
  const slidePadding = mode === "print" ? "1.75rem 2rem" : "2.75rem 3rem";
  const deckGap = mode === "print" ? "1.3rem" : "3rem";
  const fontSize = mode === "print" ? "14px" : "16px";
  const colorScheme = theme?.dark ? "dark" : "light";
  return `
    :root {
      color-scheme: ${colorScheme};
      --deck-bg: ${canvas};
      --deck-surface: ${surface};
      --deck-text: ${text};
      --deck-muted: ${muted};
      --deck-border: ${border};
      --deck-accent: ${accent};
      --deck-accent-soft: ${accentSoft};
      --deck-cover-gradient: ${coverGradient};
      --deck-cover-pattern: ${coverPattern};
      --deck-cover-text: ${coverText};
      --deck-badge: ${badge};
      --deck-shadow: ${shadow};
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--deck-bg);
      color: var(--deck-text);
      font-size: ${fontSize};
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .deck {
      display: flex;
      flex-direction: column;
      gap: ${deckGap};
      padding: ${deckPadding};
      align-items: ${mode === "print" ? "stretch" : "center"};
    }
    .slide {
      width: ${slideWidth};
      max-width: 100%;
      background: var(--deck-surface);
      border-radius: 28px;
      border: 1px solid var(--deck-border);
      padding: ${slidePadding};
      box-shadow: ${mode === "print" ? "none" : "var(--deck-shadow)"};
      position: relative;
      overflow: hidden;
    }
    .cover-slide {
      background-image: var(--deck-cover-gradient);
      color: var(--deck-cover-text);
      border: none;
      box-shadow: ${mode === "print" ? "none" : "0 35px 80px rgba(0, 0, 0, 0.35)"};
    }
    .cover-slide::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: var(--deck-cover-pattern);
      opacity: 0.7;
      pointer-events: none;
    }
    .cover-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .cover-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.9rem;
      border-radius: 999px;
      background: var(--deck-badge);
      color: var(--deck-text);
      font-weight: 600;
      width: fit-content;
    }
    .cover-subtitle {
      font-size: 1.15rem;
      margin: 0;
      color: inherit;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }
    .cover-meta-item span {
      display: block;
      font-size: 0.85rem;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .cover-meta-item strong {
      display: block;
      font-size: 1.05rem;
      margin-top: 0.3rem;
    }
    .cover-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      padding: 1rem 1.2rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, ${theme?.dark ? "0.08" : "0.15"});
      border: 1px solid rgba(255, 255, 255, 0.35);
      backdrop-filter: blur(4px);
    }
    .stat-label {
      display: block;
      font-size: 0.85rem;
      opacity: 0.85;
    }
    .stat-value {
      font-size: 1.6rem;
      font-weight: 600;
      margin-top: 0.2rem;
    }
    .slide-header {
      margin-bottom: 1.5rem;
    }
    .eyebrow {
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      color: var(--deck-accent);
      margin: 0 0 0.25rem 0;
    }
    h1, h2, h3 {
      margin: 0;
      line-height: 1.2;
    }
    h1 {
      font-size: 2.8rem;
    }
    h2 {
      font-size: 2rem;
    }
    h3 {
      font-size: 1.2rem;
      margin-bottom: 0.6rem;
    }
    .split-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .panel.stack .callout {
      flex: 1;
    }
    .bullet-list {
      margin: 0;
      padding-left: 1.2rem;
    }
    .bullet-list li {
      margin-bottom: 0.6rem;
      line-height: 1.4;
    }
    .callout {
      border-radius: 20px;
      border: 1px solid var(--deck-border);
      padding: 1rem 1.2rem;
      background: color-mix(in srgb, var(--deck-surface) 85%, var(--deck-accent-soft));
    }
    .callout.note {
      background: color-mix(in srgb, var(--deck-surface) 70%, var(--deck-accent-soft));
    }
    .callout p {
      margin: 0;
      color: var(--deck-muted);
    }
    .empty {
      margin: 0;
      color: var(--deck-muted);
      font-style: italic;
    }
    .print-page {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 1rem;
    }
    .print-break {
      page-break-after: always;
      break-after: page;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ${mode === "print" ? `
    @page {
      size: A4;
      margin: 0.5in;
    }
    body {
      background: #fff;
    }` : ""}
  `;
}
