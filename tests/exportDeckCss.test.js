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
    expect(css).not.toContain("background: #fff;");
  });
});
