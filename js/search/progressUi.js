export function createSearchProgressUi({
  progressEl,
  progressTrackEl,
  progressBarEl,
  progressLabelEl,
  formatNumber,
}) {
  function setSearchProgress(scanned, total) {
    if (!progressEl) return;
    const safeTotal = Math.max(0, total || 0);
    const safeScanned = Math.min(Math.max(0, scanned), safeTotal);
    const percent = safeTotal ? Math.min(100, (safeScanned / safeTotal) * 100) : 0;
    if (progressLabelEl) {
      progressLabelEl.textContent = safeTotal
        ? `Scanning ${formatNumber(safeScanned)} of ${formatNumber(safeTotal)} messages…`
        : "Scanning messages…";
    }
    if (progressBarEl) {
      progressBarEl.style.width = `${percent}%`;
    }
    if (progressTrackEl) {
      const rounded = Math.round(percent);
      progressTrackEl.setAttribute("aria-valuenow", String(rounded));
      progressTrackEl.setAttribute("aria-valuetext", `${rounded}%`);
    }
  }

  function showSearchProgress(total) {
    if (!progressEl) return;
    progressEl.classList.add("is-active");
    setSearchProgress(0, total);
  }

  function hideSearchProgress() {
    if (!progressEl) return;
    progressEl.classList.remove("is-active");
    if (progressLabelEl) progressLabelEl.textContent = "";
    if (progressBarEl) progressBarEl.style.width = "0%";
    if (progressTrackEl) {
      progressTrackEl.setAttribute("aria-valuenow", "0");
      progressTrackEl.setAttribute("aria-valuetext", "0%");
    }
  }

  return {
    setSearchProgress,
    showSearchProgress,
    hideSearchProgress,
  };
}
