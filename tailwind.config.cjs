/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./js/**/*.{js,mjs}", "./docs/**/*.md"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--card-bg)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        border: "var(--border)",
        positive: "var(--positive)",
        negative: "var(--negative)",
        warning: "var(--warning)",
      },
      fontFamily: {
        base: ["var(--font-family-base)"],
        display: ["var(--font-family-display)"],
      },
      borderRadius: {
        sm: "var(--shape-small)",
        md: "var(--shape-medium)",
        lg: "var(--shape-large)",
        full: "var(--shape-full)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-strong": "var(--shadow-card-strong)",
        "card-deep": "var(--shadow-card-deep)",
      },
      transitionDuration: {
        fast: "var(--motion-duration-fast)",
        medium: "var(--motion-duration-medium)",
        slow: "var(--motion-duration-slow)",
      },
      transitionTimingFunction: {
        out: "var(--motion-ease-out)",
        emphasis: "var(--motion-ease-emphasis)",
      },
    },
  },
};
