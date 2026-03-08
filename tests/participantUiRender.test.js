import { afterEach, describe, expect, it } from "vitest";
import { Fragment, h, render } from "vue";

import { createSearchParticipantUiController } from "../js/search/participantUi.js";

describe("search participant UI rendering", () => {
  const originalVitestEnv = process.env.VITEST;

  afterEach(() => {
    if (typeof originalVitestEnv === "string") process.env.VITEST = originalVitestEnv;
    else delete process.env.VITEST;
    delete globalThis.Vue;
    document.body.innerHTML = "";
  });

  it("renders participant options with Vue runtime and clears prefilled markup", () => {
    const vueRuntime = { h, render, Fragment };
    const participantSelect = document.createElement("select");
    participantSelect.innerHTML = '<option value="">All participants</option>';

    const controller = createSearchParticipantUiController({
      participantSelect,
      getEntries: () => [
        { type: "message", sender: "Ben" },
        { type: "message", sender: "Ana" },
        { type: "system", sender: "Ignored" },
      ],
      vueRuntime,
      getDatasetFingerprint: () => "fp-1",
      getSearchState: () => ({ query: { participant: "" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint, entriesLength, selectedStateValue, selectedUiValue }) =>
        `${datasetFingerprint}|${entriesLength}|${selectedStateValue}|${selectedUiValue}`,
    });

    controller.populateParticipants();

    const options = Array.from(participantSelect.options).map(option => option.value);
    expect(options).toEqual(["", "Ana", "Ben"]);
    expect(participantSelect.disabled).toBe(false);
  });

  it("fails fast without Vue runtime outside Vitest fallback mode", () => {
    delete process.env.VITEST;
    const participantSelect = document.createElement("select");

    const controller = createSearchParticipantUiController({
      participantSelect,
      getEntries: () => [{ type: "message", sender: "Ana" }],
      getDatasetFingerprint: () => "fp-1",
      getSearchState: () => ({ query: { participant: "" } }),
      buildParticipantOptionsCacheKey: ({ datasetFingerprint }) => datasetFingerprint,
      vueRuntime: null,
    });

    expect(() => controller.populateParticipants()).toThrow(
      "Vue runtime is required for search participant rendering.",
    );
  });
});
