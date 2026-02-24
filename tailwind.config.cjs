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
        surface: {
          base: "var(--card-bg)",
          raised: "var(--surface-elevated)",
          raisedStrong: "var(--surface-elevated-strong)",
          glass: "var(--glass-bg)",
        },
        text: {
          base: "var(--text)",
          muted: "var(--muted)",
          strong: "var(--text-on-strong)",
        },
        border: {
          base: "var(--border)",
          subtle: "var(--edge-subtle)",
          strong: "var(--edge-strong)",
          glass: "var(--glass-border)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        state: {
          success: "var(--success)",
          successSoft: "var(--success-soft)",
          warning: "var(--warning)",
          warningSoft: "var(--warning-soft)",
          danger: "var(--danger)",
          dangerSoft: "var(--danger-soft)",
          neutral: "var(--neutral-tone)",
        },
      },
      fontFamily: {
        base: ["var(--font-family-base)"],
        display: ["var(--font-family-display)"],
      },
      fontSize: {
        xs: "var(--font-size-xs)",
        sm: "var(--font-size-sm)",
        md: "var(--font-size-md)",
        lg: "var(--font-size-lg)",
        xl: "var(--font-size-xl)",
        "label-xs": "var(--type-label-xs)",
        "label-sm": "var(--type-label-sm)",
        "body-sm": "var(--type-body-sm)",
        "body-md": "var(--type-body-md)",
        "body-lg": "var(--type-body-lg)",
        "title-sm": "var(--type-title-sm)",
        "title-md": "var(--type-title-md)",
        "title-lg": "var(--type-title-lg)",
        "display-hero": "var(--type-display-hero)",
        "display-hero-mobile": "var(--type-display-hero-mobile)",
      },
      lineHeight: {
        tight: "var(--leading-tight)",
        snug: "var(--leading-snug)",
        body: "var(--leading-body)",
        relaxed: "var(--leading-relaxed)",
      },
      letterSpacing: {
        tight: "var(--tracking-tight)",
        display: "var(--tracking-display)",
        label: "var(--tracking-label)",
      },
      fontWeight: {
        regular: "var(--font-weight-regular)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
      },
      spacing: {
        "space-0": "var(--space-0)",
        "space-1": "var(--space-1)",
        "space-2": "var(--space-2)",
        "space-3": "var(--space-3)",
        "space-4": "var(--space-4)",
        "space-5": "var(--space-5)",
        "space-6": "var(--space-6)",
        "space-7": "var(--space-7)",
      },
      borderRadius: {
        sm: "var(--shape-small)",
        md: "var(--shape-medium)",
        lg: "var(--shape-large)",
        full: "var(--shape-full)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        float: "var(--shadow-float)",
        card: "var(--shadow-card)",
        "card-strong": "var(--shadow-card-strong)",
        "card-deep": "var(--shadow-card-deep)",
        chip: "var(--shadow-chip)",
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
      transitionDelay: {
        hero: "var(--motion-delay-hero)",
        "card-step": "var(--motion-delay-card-step)",
      },
      translate: {
        "motion-xs": "var(--motion-distance-xs)",
        "motion-sm": "var(--motion-distance-sm)",
        "motion-md": "var(--motion-distance-md)",
      },
    },
  },
};
