import { afterEach, describe, expect, it } from "vitest";
import { createSearchProgressUi } from "../js/search/progressUi.js";
import { getSearchProgressState, resetSearchProgressState } from "../js/state/searchProgressState.js";

describe("search progress ui", () => {
  afterEach(() => {
    resetSearchProgressState();
  });

  it("syncs DOM progress and canonical state", () => {
    const progressEl = document.createElement("div");
    const progressTrackEl = document.createElement("div");
    const progressBarEl = document.createElement("div");
    const progressLabelEl = document.createElement("div");
    const { showSearchProgress, setSearchProgress, hideSearchProgress } = createSearchProgressUi({
      progressEl,
      progressTrackEl,
      progressBarEl,
      progressLabelEl,
      formatNumber: value => Number(value).toLocaleString("en-US"),
    });

    showSearchProgress(200);
    setSearchProgress(25, 200);

    expect(progressEl.classList.contains("is-active")).toBe(true);
    expect(progressBarEl.style.width).toBe("12.5%");
    expect(progressTrackEl.getAttribute("aria-valuenow")).toBe("13");
    expect(progressLabelEl.textContent).toContain("Scanning 25 of 200 messages");
    expect(getSearchProgressState()).toMatchObject({
      active: true,
      scanned: 25,
      total: 200,
    });

    hideSearchProgress();
    expect(progressEl.classList.contains("is-active")).toBe(false);
    expect(progressBarEl.style.width).toBe("0%");
    expect(progressTrackEl.getAttribute("aria-valuenow")).toBe("0");
    expect(getSearchProgressState()).toMatchObject({
      active: false,
      scanned: 0,
      total: 0,
      percent: 0,
    });
  });

  it("updates canonical progress state without fallback DOM mounts", () => {
    const { showSearchProgress, setSearchProgress, hideSearchProgress } = createSearchProgressUi({
      progressEl: null,
      progressTrackEl: null,
      progressBarEl: null,
      progressLabelEl: null,
      formatNumber: value => Number(value).toLocaleString("en-US"),
    });

    showSearchProgress(50);
    setSearchProgress(10, 50);
    expect(getSearchProgressState()).toMatchObject({
      active: true,
      scanned: 10,
      total: 50,
      percent: 20,
    });

    hideSearchProgress();
    expect(getSearchProgressState()).toMatchObject({
      active: false,
      scanned: 0,
      total: 0,
      percent: 0,
    });
  });
});
