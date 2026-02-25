import { describe, it, expect } from "vitest";
import { buildExportDeckCss } from "../js/exportDeck/css.js";

describe("export deck css", () => {
  it("preserves dark theme colors in print mode", () => {
    const css = buildExportDeckCss(
      {
        dark: true,
        canvas: "#020617",
        text: "#e2e8f0",
      },
      { mode: "print" },
    );

    expect(css).toContain("--deck-bg: #020617;");
    expect(css).toContain("--deck-text: #e2e8f0;");
    expect(css).toContain("body {");
    expect(css).toContain("background: var(--deck-bg);");
    expect(css).toContain("print-color-adjust: exact;");
    expect(css).toContain("html, body {");
    expect(css).toContain("background: var(--deck-bg) !important;");
    expect(css).toContain("color: var(--deck-text) !important;");
    expect(css).not.toContain("background: #fff;");
  });

  it("preserves light theme colors in print mode", () => {
    const css = buildExportDeckCss(
      {
        dark: false,
        canvas: "#f8fafc",
        text: "#0f172a",
      },
      { mode: "print" },
    );

    expect(css).toContain("color-scheme: light;");
    expect(css).toContain("--deck-bg: #f8fafc;");
    expect(css).toContain("--deck-text: #0f172a;");
    expect(css).toContain("html, body {");
  });

  it("resolves dark color-scheme from theme id when dark flag is absent", () => {
    const css = buildExportDeckCss(
      {
        id: "dark",
        canvas: "#020617",
        text: "#e2e8f0",
      },
      { mode: "print" },
    );

    expect(css).toContain("color-scheme: dark;");
  });

  it("resolves dark color-scheme for case-insensitive and night-style ids", () => {
    const darkCss = buildExportDeckCss(
      {
        id: "Dark",
      },
      { mode: "print" },
    );
    const midnightCss = buildExportDeckCss(
      {
        id: "midnight",
      },
      { mode: "print" },
    );

    expect(darkCss).toContain("color-scheme: dark;");
    expect(midnightCss).toContain("color-scheme: dark;");
  });
});
