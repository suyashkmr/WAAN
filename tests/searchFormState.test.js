import { describe, expect, it } from "vitest";
import {
  applySearchStateToInputs,
  readSearchQueryFromInputs,
  resetSearchInputs,
} from "../js/search/formState.js";

describe("search form state", () => {
  it("applies search state without issuing a native bridge-value sync", () => {
    const participantSelect = document.createElement("select");
    participantSelect.innerHTML = '<option value="">All participants</option><option value="Ana">Ana</option>';
    const keywordInput = document.createElement("input");
    const startInput = document.createElement("input");
    const endInput = document.createElement("input");

    applySearchStateToInputs({
      state: { query: { text: "hello", participant: "Ana", start: "2025-01-01", end: "2025-01-02" } },
      keywordInput,
      participantSelect,
      startInput,
      endInput,
    });

    expect(keywordInput.value).toBe("hello");
    expect(participantSelect.value).toBe("Ana");
    expect(startInput.value).toBe("2025-01-01");
    expect(endInput.value).toBe("2025-01-02");
  });

  it("resets search inputs without issuing a native bridge-value sync", () => {
    const participantSelect = document.createElement("select");
    participantSelect.innerHTML = '<option value="">All participants</option><option value="Ana">Ana</option>';
    participantSelect.value = "Ana";
    const keywordInput = document.createElement("input");
    keywordInput.value = "hello";
    const startInput = document.createElement("input");
    startInput.value = "2025-01-01";
    const endInput = document.createElement("input");
    endInput.value = "2025-01-02";

    resetSearchInputs({
      keywordInput,
      participantSelect,
      startInput,
      endInput,
    });

    expect(keywordInput.value).toBe("");
    expect(participantSelect.value).toBe("");
    expect(startInput.value).toBe("");
    expect(endInput.value).toBe("");
  });

  it("reads the participant value through the Prime bridge when available", () => {
    const participantSelect = document.createElement("select");
    participantSelect.innerHTML = '<option value="">All participants</option><option value="Ana">Ana</option>';
    participantSelect.dataset.primevueInputId = "search-participant";
    const mountEl = document.createElement("div");
    document.body.appendChild(mountEl);
    document.__waanPrimeSelectBridgeRegistry = new Map([
      ["search-participant", { state: { value: "Ana" }, mountEl }],
      ["search-participant--primevue", { state: { value: "Ana" }, mountEl }],
    ]);

    expect(readSearchQueryFromInputs({
      keywordInput: { value: " hello " },
      participantSelect,
      startInput: { value: "2025-01-01" },
      endInput: { value: "2025-01-02" },
    })).toEqual({
      text: "hello",
      participant: "Ana",
      start: "2025-01-01",
      end: "2025-01-02",
    });
  });
});
