import { describe, it, expect } from "vitest";
import { buildPdfDocumentHtml } from "../js/exportShared.js";

describe("export shared pdf html", () => {
  it("stamps dark export metadata when dark theme id is provided", () => {
    const html = buildPdfDocumentHtml({
      analytics: {},
      theme: {
        id: "dark",
        label: "Night mode",
        canvas: "#020617",
        text: "#e2e8f0",
      },
      datasetLabel: "Team chat",
      filterDetails: [],
      brandName: "ChatScope",
    });

    expect(html).toContain('data-export-mode="print"');
    expect(html).toContain('data-export-theme="dark"');
    expect(html).toContain('<meta name="color-scheme" content="dark" />');
    expect(html).toContain("color-scheme: dark;");
  });

  it("uses shared dark resolver for case-insensitive and night-style ids", () => {
    const darkCaseHtml = buildPdfDocumentHtml({
      analytics: {},
      theme: {
        id: "Dark",
      },
      datasetLabel: "Team chat",
      filterDetails: [],
      brandName: "ChatScope",
    });
    const midnightHtml = buildPdfDocumentHtml({
      analytics: {},
      theme: {
        id: "midnight",
      },
      datasetLabel: "Team chat",
      filterDetails: [],
      brandName: "ChatScope",
    });

    expect(darkCaseHtml).toContain('data-export-theme="dark"');
    expect(darkCaseHtml).toContain('<meta name="color-scheme" content="dark" />');
    expect(midnightHtml).toContain('data-export-theme="dark"');
    expect(midnightHtml).toContain('<meta name="color-scheme" content="dark" />');
  });

  it("stamps light export metadata when light theme is provided", () => {
    const html = buildPdfDocumentHtml({
      analytics: {},
      theme: {
        id: "light",
        dark: false,
        label: "Light mode",
        canvas: "#f8fafc",
        text: "#0f172a",
      },
      datasetLabel: "Team chat",
      filterDetails: [],
      brandName: "ChatScope",
    });

    expect(html).toContain('data-export-theme="light"');
    expect(html).toContain('<meta name="color-scheme" content="light" />');
    expect(html).toContain("color-scheme: light;");
  });
});
