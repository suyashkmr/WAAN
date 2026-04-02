<template>
  <!-- Global Progress Bar -->
  <div id="global-progress" aria-live="polite" class="hidden fixed top-0 left-0 w-full h-1 bg-[var(--surface-sunken)] z-[100] overflow-hidden">
    <div class="h-full bg-[var(--accent)] w-1/3 animate-pulse transition-all"></div>
    <span class="sr-only" id="global-progress-label">Working…</span>
  </div>

  <!-- Section Navigation Rail -->
  <nav class="section-nav" aria-label="Page sections">
    <div class="section-nav-inner"></div>
  </nav>

  <main class="app-shell-layout w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
    <StageSelector
      :active-stage="workspaceStore.ui.activeStage"
      @select-stage="selectStage"
    />

    <div class="stage-shell">
      <section
        v-show="workspaceStore.ui.activeStage === 'workspace'"
        :hidden="workspaceStore.ui.activeStage !== 'workspace'"
        class="flex flex-col gap-6 w-full opacity-0 animate-fade-in-up"
        data-stage="workspace"
        aria-labelledby="workspace-stage-title"
        style="animation-delay: 50ms;"
      >
        <div class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]">
          <h2 id="workspace-stage-title" class="text-3xl font-display font-semibold text-[var(--text)] m-0">Workspace</h2>
        </div>

        <section class="workspace-stage analytics-story-card wa-card bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm flex flex-col gap-6 w-full p-6 lg:p-8" id="workspace-stage" aria-label="Workspace" data-nav-target="workspace">
          <div class="workspace-inline-strip">
            <EmptyWorkspaceCallout />
          </div>
          <div class="workspace-stage-grid workspace-stage-grid--rail workspace-stage-grid--minimal-rail w-full" id="workspace-stage-grid">
            <div class="workspace-rail-lane">
              <WorkspaceSidebar />
            </div>
          </div>
          <div id="data-status" class="hidden px-4 py-3 bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text)] text-sm rounded-lg" aria-live="polite"></div>
        </section>
      </section>

      <FindingsStage
        v-show="workspaceStore.ui.activeStage === 'findings'"
        :hidden="workspaceStore.ui.activeStage !== 'findings'"
        class="opacity-0 animate-fade-in-up"
        style="animation-delay: 150ms;"
      />
      <DeepDiveStage
        v-show="workspaceStore.ui.activeStage === 'deepdive'"
        :hidden="workspaceStore.ui.activeStage !== 'deepdive'"
        class="opacity-0 animate-fade-in-up"
        style="animation-delay: 250ms;"
      />
      <SupportStage
        v-show="workspaceStore.ui.activeStage === 'support'"
        :hidden="workspaceStore.ui.activeStage !== 'support'"
        class="opacity-0 animate-fade-in-up"
      />
    </div>
  </main>

  <!-- Global Offcanvas Utilities -->
  
  <aside class="relay-log-drawer fixed top-0 right-0 h-full w-96 max-w-[90vw] bg-[var(--card-bg)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col" id="relay-log-drawer" aria-hidden="true" aria-label="Diagnostics and relay log">
    <div class="flex flex-col gap-4 p-6 border-b border-[var(--border)] bg-[var(--surface-sunken)] shrink-0">
      <div class="flex flex-col gap-1">
        <p class="text-[var(--accent)] text-xs font-semibold uppercase tracking-wider m-0">Recovery tools</p>
        <p class="text-xl font-display font-semibold text-[var(--text)] m-0">Diagnostics</p>
        <p class="text-xs text-[var(--text-muted)] m-0" id="relay-log-connection">Connecting…</p>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-2">
        <button type="button" class="wa-button wa-button--sunken dense" id="relay-log-export" title="Download a diagnostics bundle">Export</button>
        <button type="button" class="wa-button wa-button--sunken dense" id="relay-log-report" title="Open issue report">Report</button>
        <button type="button" class="wa-button wa-button--ghost dense" id="relay-log-clear" title="Clear log entries">Clear</button>
        <button type="button" class="wa-button wa-button--ghost dense col-span-3 mt-2" id="relay-log-close" title="Close diagnostics drawer">Close</button>
      </div>
    </div>
    <div class="p-4 overflow-y-auto flex-1 text-xs font-mono text-[var(--text-muted)] bg-black/40" id="relay-log-list">
      <p class="m-0">No relay events yet.</p>
    </div>
  </aside>

  <div class="fixed bottom-6 right-6 flex flex-col gap-4 z-50 pointer-events-none" id="toast-container" aria-live="polite" aria-atomic="true"></div>

  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300" id="onboarding-overlay" aria-hidden="true" role="dialog" aria-modal="true" style="visibility: hidden;">
    <div class="bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl rounded-2xl p-8 max-w-md w-full mx-4 flex flex-col gap-6 translate-y-4 transition-transform duration-300">
      <div class="flex flex-col gap-2">
        <h2 class="text-2xl font-display font-semibold text-[var(--text)] m-0">Need a setup reminder?</h2>
        <p class="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider m-0" id="onboarding-step-label"></p>
      </div>
      <p class="text-[var(--text-muted)] text-base m-0 leading-relaxed" id="onboarding-copy">Start relay.</p>
      <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
        <button type="button" class="wa-button wa-button--ghost" id="onboarding-skip">Close</button>
        <button type="button" class="wa-button wa-button--primary" id="onboarding-next">Next tip</button>
      </div>
    </div>
  </div>

  <footer class="w-full mt-12 py-8 border-t border-[var(--border)] bg-[var(--surface-sunken)] flex flex-col items-center text-center justify-center gap-6 px-6 relative z-10">
    <div class="flex items-center gap-3 justify-center mb-2">
      <img src="/waanlogo.png" alt="WAAN logo" class="w-8 h-8 rounded-lg shadow-md" loading="lazy">
      <div class="text-left flex flex-col">
        <p class="m-0 text-lg font-display font-semibold text-[var(--text)]">WAAN Relay</p>
        <small class="m-0 text-xs text-[var(--text-muted)] uppercase tracking-wider">Local chat intelligence.</small>
      </div>
    </div>
    <div class="flex flex-col gap-2 items-center">
      <p class="text-sm text-[var(--text-muted)] flex items-center gap-2 m-0 mt-4">
        Local-first analysis
        <a href="https://github.com/suyashkmr/WAAN" class="text-[var(--text-muted)] hover:text-[#3b82f6] transition-colors" aria-label="View WAAN on GitHub" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current"><path d="M12 2C6.48 2 2 6.59 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.31 9.31 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.82-4.57 5.07.36.32.68.94.68 1.89 0 1.36-.01 2.45-.01 2.79 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.26C22 6.59 17.52 2 12 2z"/></svg>
        </a>
      </p>
      <p class="text-xs text-[var(--text-muted)] max-w-xl mx-auto m-0 opacity-70">
        WhatsApp is a trademark of Meta Platforms, Inc. WAAN is an independent project and is not affiliated with Meta or WhatsApp.
      </p>
    </div>
  </footer>
</template>

<script setup>
import StageSelector from './components/StageSelector.vue';
import SupportStage from './components/SupportStage.vue';
import DeepDiveStage from './components/DeepDiveStage.vue';
import EmptyWorkspaceCallout from './components/EmptyWorkspaceCallout.vue';
import FindingsStage from './components/FindingsStage.vue';
import WorkspaceSidebar from './components/WorkspaceSidebar.vue';
import { onBeforeUnmount, onMounted, watch } from "vue";
import { ACTIVE_STAGE_CHANGED_EVENT, SECTION_NAV_ITEMS_BY_STAGE } from "../js/appConstants.js";
import { useWorkspaceStore, useWorkspaceStoreActions } from "./store/useWorkspaceStore.js";

const workspaceStore = useWorkspaceStore();
const workspaceStoreActions = useWorkspaceStoreActions();
const stageHashById = {
  workspace: "workspace-stage",
  findings: "guided-findings-stage",
  deepdive: "deep-dive-stage",
  support: "faq-card",
};

/** @type {Record<string, string>} */
const stageByHashId = Object.entries(SECTION_NAV_ITEMS_BY_STAGE).reduce(
  (acc, [stageId, items]) => {
    items.forEach(item => {
      if (!item?.id) return;
      acc[item.id] = stageId;
    });
    return acc;
  },
  {
    "faq-macos-gatekeeper": "support",
    "faq-account-safety": "support",
    "weekly-trend": "deepdive",
    "daily-activity": "deepdive",
    "weekday-trend": "deepdive",
    "timeofday-trend": "deepdive",
    "sentiment-overview": "deepdive",
  },
);

function normalizeStageMarker(stageMarker) {
  if (stageMarker === "deep-dive") return "deepdive";
  return stageMarker;
}

/**
 * @param {string} hash
 */
function resolveHashTargetId(hash) {
  return String(hash || "").replace(/^#/, "");
}

/**
 * @param {string} hash
 */
function scrollToHashTarget(hash) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const targetId = resolveHashTargetId(hash);
  if (!targetId) return;
  const tryScroll = () => {
    const target = document.getElementById(targetId);
    if (!(target instanceof HTMLElement)) return false;
    target.scrollIntoView({ behavior: "auto", block: "start" });
    return true;
  };
  const raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : callback => window.setTimeout(callback, 16);
  raf(() => {
    if (tryScroll()) return;
    raf(() => {
      if (tryScroll()) return;
      window.setTimeout(() => {
        tryScroll();
      }, 60);
    });
  });
}

/**
 * @param {string} hash
 * @param {{ allowDomLookup?: boolean }} [options]
 * @returns {string | null}
 */
function resolveStageFromHash(hash, { allowDomLookup = true } = {}) {
  const id = String(hash || "").replace(/^#/, "");
  if (!id) return null;
  const mapped = stageByHashId[id];
  if (mapped) return mapped;
  if (!allowDomLookup || typeof document === "undefined") return null;
  const target = document.getElementById(id);
  if (!(target instanceof HTMLElement)) return null;
  const stageHost = target.closest("[data-stage]");
  const stageMarker = normalizeStageMarker(stageHost?.getAttribute("data-stage"));
  if (stageMarker === "workspace" || stageMarker === "findings" || stageMarker === "deepdive" || stageMarker === "support") {
    return stageMarker;
  }
  return null;
}

/**
 * @param {{ allowDomLookup?: boolean }} [options]
 */
function applyStageFromHash({ allowDomLookup = true } = {}) {
  if (typeof window === "undefined") return;
  const hash = window.location.hash;
  const stage = resolveStageFromHash(hash, { allowDomLookup });
  if (!stage) return;
  workspaceStoreActions.setActiveStage(stage);
  scrollToHashTarget(hash);
}

if (typeof window !== "undefined") {
  applyStageFromHash({ allowDomLookup: false });
}

function selectStage(stageId) {
  workspaceStoreActions.setActiveStage(stageId);
  if (typeof window === "undefined") return;
  const targetId = stageHashById[stageId];
  if (!targetId) return;
  const targetHash = `#${targetId}`;
  if (window.location.hash === targetHash) return;
  window.location.hash = targetHash;
}

function handleHashChange() {
  applyStageFromHash({ allowDomLookup: true });
}

onMounted(() => {
  handleHashChange();
  if (typeof window === "undefined") return;
  window.addEventListener("hashchange", handleHashChange);
});

onBeforeUnmount(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("hashchange", handleHashChange);
});

watch(
  () => workspaceStore.ui.activeStage,
  stage => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(ACTIVE_STAGE_CHANGED_EVENT, {
        detail: { stage },
      }),
    );
  },
  { immediate: true, flush: "post" },
);
</script>

<style>
.stage-fade-enter-active,
.stage-fade-leave-active {
  transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.stage-fade-enter-from,
.stage-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
